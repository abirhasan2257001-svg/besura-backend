import { Router, type IRouter } from "express";
import healthRouter from "./health";
import searchRouter from "./search";
import streamsRouter from "./streams";

const router: IRouter = Router();

router.use(healthRouter);
router.use(searchRouter);
router.use("/streams", streamsRouter);

export default router;
