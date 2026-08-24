import { Router } from "express";
import downloadRouter from "./download.js";

const router = Router();

router.use("/", downloadRouter);

export default router;
