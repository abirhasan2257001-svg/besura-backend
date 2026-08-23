import { Router, type IRouter } from "express";
import { fetchWithFallback } from "./search";

const router: IRouter = Router();

router.get("/:videoId", async (req, res) => {
  const videoId = req.params.videoId;

  if (!/^[A-Za-z0-9_-]{1,30}$/.test(videoId)) {
    res.status(400).json({ error: "A valid video ID is required." });
    return;
  }

  try {
    const streams = await fetchWithFallback(
      `/streams/${encodeURIComponent(videoId)}`,
      (payload) => payload,
    );
    res.json(streams);
  } catch (error) {
    req.log.error({ err: error, videoId }, "All Piped stream instances failed");
    res.status(502).json({
      error: "Video streams are temporarily unavailable. Please try again.",
    });
  }
});

export default router;