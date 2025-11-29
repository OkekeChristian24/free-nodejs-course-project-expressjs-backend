import { Kafka, Partitioners } from "kafkajs";

const nodeEnv = process.env.NODE_ENV || "development";
function resolveDefaultBrokers(): string[] {
	if (process.env.KAFKA_BROKERS) {
		return process.env.KAFKA_BROKERS.split(",");
	}

	if (nodeEnv === "production") {
		return ["kafka:9092"];
	}

	return ["localhost:9092"];
}

const brokers = resolveDefaultBrokers();

const kafka = new Kafka({
	// clientId: process.env.KAFKA_CLIENT_ID || "news-data",
	// brokers,
	//  clientId: "news-data",
	brokers: ["localhost:9092"],
});

export const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "news-ingest";
export const KAFKA_GROUP_ID =
	process.env.KAFKA_GROUP_ID || "news-consumer-group";

export default kafka;
