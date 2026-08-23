import { Router, type IRouter } from "express";
import { SearchSongsQueryParams, SearchSongsResponse } from "@workspace/api-zod";

type YoutubeSearchItem = {
  id?: { videoId?: unknown };
  snippet?: {
    title?: unknown;
    channelTitle?: unknown;
    thumbnails?: {
      high?: { url?: unknown };
      medium?: { url?: unknown };
      default?: { url?: unknown };
    };
  };
};

type SongResult = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds: number | null;
  cover: string;
  streamUrl: string;
};

const router: IRouter = Router();
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

function youtubeSearchItems(payload: unknown): YoutubeSearchItem[] {
  const items = (payload as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as YoutubeSearchItem[]) : [];
}

function normalizeYoutubeSearch(payload: unknown): SongResult[] {
  return youtubeSearchItems(payload)
    .map((item) => {
      const videoId = typeof item.id?.videoId === "string" ? item.id.videoId : "";
      const snippet = item.snippet ?? {};
      const thumbnails = snippet.thumbnails ?? {};
      const cover =
        (typeof thumbnails.high?.url === "string" && thumbnails.high.url) ||
        (typeof thumbnails.medium?.url === "string" && thumbnails.medium.url) ||
        (typeof thumbnails.default?.url === "string" && thumbnails.default.url) ||
        "";

      return {
        id: videoId,
        title: String(snippet.title ?? "Untitled video"),
        artist: String(snippet.channelTitle ?? "Unknown channel"),
        album: "YouTube",
        duration: "--:--",
        durationSeconds: null,
        cover,
        streamUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    })
    .filter((song) => song.id);
}

router.get("/search", async (req, res) => {
  const parsed = SearchSongsQueryParams.safeParse(req.query);
  if (!parsed.success || !parsed.data.q.trim()) {
    res.status(400).json({ error: "A search query is required." });
    return;
  }

  const apiKey = process.env["YOUTUBE_API_KEY"];
  if (!apiKey) {
    req.log.error("YOUTUBE_API_KEY is not configured");
    res.status(503).json({
      error: "YouTube search is not configured on this server.",
    });
    return;
  }

  const query = parsed.data.q.trim();
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "25",
    q: query,
    key: apiKey,
  });

  try {
    const response = await fetch(`${YOUTUBE_SEARCH_URL}?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`YouTube API returned HTTP ${response.status}`);
    }

    const songs = normalizeYoutubeSearch(await response.json());
    res.json(SearchSongsResponse.parse(songs));
  } catch (error) {
    req.log.error({ err: error, query }, "YouTube search failed");
    res.status(502).json({
      error: "YouTube search is temporarily unavailable. Please try again.",
    });
  }
});

export default router;