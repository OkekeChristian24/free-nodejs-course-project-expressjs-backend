import { Pool } from "mysql2/promise";
import {
	NewsEntity,
	NewsItemDto,
	NewsProducer,
} from "../../../providers/kafka.provider";

export class NewsService {
	constructor(
		private readonly producer: NewsProducer,
		private readonly pool: Pool,
	) {}

	async ingestNewsBulk(data: NewsItemDto[]): Promise<{
		received: number;
		published: number;
		discarded: number;
	}> {
		if (data.length === 0) {
			return { received: data.length, published: 0, discarded: 0 };
		}

		const { total, published, discarded } = await this.producer.sendNewsBatch(
			data,
		);

		return {
			received: total,
			published,
			discarded,
		};
	}

	// NEW: Get paginated list of news
	async getNews(page: number, limit: number): Promise<NewsEntity[]> {
		const offset = (page - 1) * limit;

		const [rows] = await this.pool.query(
			`
				SELECT id, title, content, publisher, created_at, updated_at
				FROM news
				ORDER BY created_at DESC, id DESC
				LIMIT ? OFFSET ?
    		`,
			[limit, offset],
		);

		const news = rows as NewsEntity[];

		const [countRows] = await this.pool.query(
			`SELECT COUNT(*) as total FROM news`,
		);
		const total = (countRows as any)[0].total as number;

		return news;
	}

	async getNewsById(id: number): Promise<NewsEntity | null> {
		const [rows] = await this.pool.query(
			`
				SELECT id, title, content, publisher, created_at, updated_at
				FROM news
				WHERE id = ?
				LIMIT 1
			`,
			[id],
		);

		const list = rows as NewsEntity[];
		if (!list.length) return null;
		return list[0];
	}
}
