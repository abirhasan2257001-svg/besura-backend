import { Router, type IRouter } from "express";
import healthRouter from "./health";
import searchRouter from "./search";
import downloadRouter from "./download";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/search", searchRouter);
router.use("/download", downloadRouter);

export default router;
