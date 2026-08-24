import { Router } from "express";
import downloadRouter from "./download.js";
import healthRouter from "./health.js";
import searchRouter from "./search.js";

const router = Router();

router.use("/", healthRouter);
router.use("/download", downloadRouter);
router.use("/search", searchRouter);

export default router;
