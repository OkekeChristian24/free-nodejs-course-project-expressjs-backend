import { Router } from "express";
import authRoutes from "../modules/auth/routes/auth.route";
import userRoutes from "../modules/users/routes/user.route";
import postRoutes from "../modules/posts/routes/post.route";
import newsRoutes from "../modules/news/routes/news.route";

const router = Router();

router.use("/v1/auth", authRoutes);
router.use("/v1/users", userRoutes);
router.use("/v1/posts", postRoutes);
router.use("/v1/news", newsRoutes);

export default router;
