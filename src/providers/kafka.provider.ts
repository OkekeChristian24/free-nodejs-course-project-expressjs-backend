import { RowDataPacket } from "mysql2";
import pool from "../configs/database.config";
import kafka, { KAFKA_GROUP_ID, KAFKA_TOPIC } from "../configs/kafka.config";

export interface NewsEntity extends RowDataPacket {
	id?: number;
	title: string;
	content: string;
	publisher: string;
	created_at?: Date;
	updated_at?: Date;
}

export class NewsItemDto {
	title!: string;
	content!: string;
	publisher!: string;
}

export function isValidNews(news: NewsItemDto): boolean {
	return (
		news.title.length > 0 &&
		news.content.length > 0 &&
		news.publisher.length > 0
	);
}

export function getValidNews(data: NewsItemDto[]): NewsItemDto[] {
	return data.filter((item) => isValidNews(item));
}

export async function waitForKafka(maxRetries = 10): Promise<boolean> {
	const admin = kafka.admin();

	for (let i = 0; i < maxRetries; i++) {
		try {
			await admin.connect();

			await admin.listTopics();

			await admin.disconnect();
			console.log("Kafka is ready");
			return true;
		} catch (error) {
			console.log(`Waiting for Kafka to be ready... (${i + 1}/${maxRetries})`);
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}
	}

	return false;
}

export class NewsProducer {
	private static instance: NewsProducer;
	private producer = kafka.producer();
	private isConnected = false;

	private constructor() {}

	static getInstance(): NewsProducer {
		if (!this.instance) {
			this.instance = new NewsProducer();
		}
		return this.instance;
	}

	async connect(): Promise<void> {
		if (this.isConnected) return;

		let retries = 5;
		while (retries > 0) {
			try {
				await this.producer.connect();
				this.isConnected = true;
				console.log("Kafka producer connected successfully");
				return;
			} catch (error) {
				retries--;
				console.log(
					`Producer connection attempt failed. Retries left: ${retries}`,
				);

				if (retries === 0) {
					throw error;
				}

				await new Promise((resolve) => setTimeout(resolve, 3000));
			}
		}
	}

	async sendNewsBatch(
		news: NewsItemDto[],
		batchSize = 1000,
	): Promise<{ total: number; published: number; discarded: number }> {
		if (!this.isConnected) {
			await this.connect();
		}

		let currentBatch: NewsItemDto[] = [];
		let published = 0;
		let discarded = 0;

		const sendBatch = async () => {
			if (currentBatch.length === 0) return;

			await this.producer.send({
				topic: KAFKA_TOPIC,
				compression: 1,
				messages: [{ value: JSON.stringify(currentBatch) }],
			});

			published += currentBatch.length;
			currentBatch = [];
		};

		for (const item of news) {
			if (!isValidNews(item)) {
				discarded++;
				continue;
			}

			currentBatch.push(item);

			if (currentBatch.length >= batchSize) {
				await sendBatch();
			}
		}

		await sendBatch();

		return { total: news.length, published, discarded };
	}

	async disconnect(): Promise<void> {
		if (this.isConnected) {
			await this.producer.disconnect();
			this.isConnected = false;
		}
	}
}

class NewsConsumer {
	private consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
	private isConnected = false;

	async connect(): Promise<void> {
		if (this.isConnected) return;

		let retries = 5;
		while (retries > 0) {
			try {
				await this.consumer.connect();
				this.isConnected = true;
				console.log("Kafka consumer connected successfully");
				return;
			} catch (error) {
				retries--;
				console.log(
					`Consumer connection attempt failed. Retries left: ${retries}`,
				);

				if (retries === 0) {
					throw error;
				}

				await new Promise((resolve) => setTimeout(resolve, 3000));
			}
		}
	}

	async start(): Promise<void> {
		await this.connect();
		await this.consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });

		console.log("News consumer started and listening for messages...");

		await this.consumer.run({
			eachMessage: async ({ message }) => {
				if (!message.value) return;

				try {
					const items: NewsEntity[] = JSON.parse(message.value.toString());

					if (!Array.isArray(items) || items.length === 0) return;

					const chunkSize = 1000;
					for (let i = 0; i < items.length; i += chunkSize) {
						const chunk = items.slice(i, i + chunkSize);

						const values = chunk.map((n) => [n.title, n.content, n.publisher]);

						const sql = `
							INSERT INTO news (title, content, publisher)
							VALUES ${values.map(() => "(?, ?, ?)").join(",")}
						`;

						const flatValues = values.flat();

						await pool.query(sql, flatValues);
					}

					console.log(`Processed ${items.length} news items`);
				} catch (error) {
					console.error("Error processing Kafka message:", error);
				}
			},
		});
	}

	async disconnect(): Promise<void> {
		if (this.isConnected) {
			await this.consumer.disconnect();
			this.isConnected = false;
		}
	}
}

// Export singleton instances
export const newsConsumer = new NewsConsumer();
