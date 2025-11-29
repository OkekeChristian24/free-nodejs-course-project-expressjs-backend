import "dotenv/config";
import app from "./app";
import appConfig from "./configs/app.config";
import { SuccessMessages } from "./common/messages/success.message";
import {
	NewsProducer,
	newsConsumer,
	waitForKafka,
} from "./providers/kafka.provider";

app.listen(appConfig.port, async () => {
	console.log(SuccessMessages.APP_RUNNING(appConfig.port));

	setTimeout(async () => {
		try {
			const isKafkaReady = await waitForKafka();

			if (!isKafkaReady) {
				console.error(
					"Kafka failed to become ready. Consumer may not work properly.",
				);
				return;
			}

			const producer = NewsProducer.getInstance();
			await producer.connect();

			await newsConsumer.start();
		} catch (err) {
			console.error("Failed to initialize Kafka services:", err);
		}
	}, 4000);
});

process.on("SIGTERM", async () => {
	console.log("SIGTERM received, shutting down gracefully...");
	await NewsProducer.getInstance().disconnect();
	await newsConsumer.disconnect();
	process.exit(0);
});
