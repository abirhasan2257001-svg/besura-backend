import { Router, type IRouter } from "express";

type DownloadItem = { url?: unknown; type?: unknown };
type CobaltResponse = {
  url?: unknown;
  picker?: unknown;
  data?: { url?: unknown; picker?: unknown };
};

const router: IRouter = Router();
const COBALT_ENDPOINTS = [
  "https://api.cobalt.tools/",
  "https://cobalt-api.kwiatekmiki.com/",
] as const;

function extractDownloadUrl(payload: unknown): string {
  const response = payload as CobaltResponse;
  if (typeof response.url === "string") return response.url;
  if (typeof response.data?.url === "string") return response.data.url;

  const picker = Array.isArray(response.picker)
    ? response.picker
    : Array.isArray(response.data?.picker)
      ? response.data.picker
      : [];
  const audioItem = (picker as DownloadItem[]).find(
    (item) => typeof item?.url === "string" && item.type !== "image",
  );
  return typeof audioItem?.url === "string" ? audioItem.url : "";
}

router.post("/download", async (req, res) => {
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  const format = req.body?.format === "mp4" ? "mp4" : "mp3";
  if (!url) {
    res.status(400).json({ error: "A source URL is required." });
    return;
  }

  let lastError: unknown;
  for (const endpoint of COBALT_ENDPOINTS) {
    try {
      const payload = format === "mp3"
        ? { url, downloadMode: "audio", audioFormat: "mp3" }
        : { url, downloadMode: "video", videoQuality: "720" };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Besura/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Cobalt returned HTTP ${response.status}`);
      const downloadUrl = extractDownloadUrl(await response.json());
      if (!downloadUrl) throw new Error("Cobalt returned no downloadable URL");
      res.json({ url: downloadUrl });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  req.log.error({ err: lastError, url }, "All Cobalt download endpoints failed");
  res.status(502).json({
    error: "The download service is temporarily unavailable. Please try again.",
  });
});

export default router;