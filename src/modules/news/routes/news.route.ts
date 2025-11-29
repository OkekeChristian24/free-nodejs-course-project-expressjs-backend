// src/routes/news.routes.ts
import { Router } from "express";
import { NewsController } from "../controllers/news.controller";
import { NewsService } from "../services/news.service";
import { NewsProducer } from "../../../providers/kafka.provider";
import pool from "../../../configs/database.config";

const router = Router();

const kafkaNewsProducer = NewsProducer.getInstance();
const newsService = new NewsService(kafkaNewsProducer, pool);
const controller = new NewsController(newsService);

router.post("/bulk", controller.ingestNews);

router.get("/", controller.getNewsList);

router.get("/:id", controller.getNewsById);

export default router;
