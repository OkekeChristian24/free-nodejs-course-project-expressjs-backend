// src/controllers/news.controller.ts
import { Request, Response, NextFunction } from "express";
import { NewsService } from "../services/news.service";
import { NewsItemDto } from "../../../providers/kafka.provider";

export class NewsController {
	constructor(private newsService: NewsService) {}

	// POST /api/news/bulk
	ingestNews = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { data } = req.body as { data: NewsItemDto[] };

			if (!data.length) {
				return res.status(400).json({
					message: "Invalid payload. `data` must be a non-empty array.",
				});
			}

			const result = await this.newsService.ingestNewsBulk(data);

			return res.status(202).json({
				message: "News data accepted for processing.",
				...result,
			});
		} catch (err) {
			next(err);
		}
	};

	// GET /api/news?page=&limit=
	getNewsList = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const page = Number(req.query.page as string) || 1;
			const limit = Number(req.query.limit as string) || 50;
			const result = await this.newsService.getNews(page, limit);

			return res.json(result);
		} catch (err) {
			next(err);
		}
	};

	// GET /api/news/:id
	getNewsById = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const id = parseInt(req.params.id, 10);
			if (!Number.isFinite(id) || id <= 0) {
				return res.status(400).json({ message: "Invalid id parameter." });
			}

			const news = await this.newsService.getNewsById(id);

			if (!news) {
				return res.status(404).json({ message: "News not found." });
			}

			return res.json(news);
		} catch (err) {
			next(err);
		}
	};
}
