import { Router, type IRouter } from "express";
import { SearchSongsQueryParams, SearchSongsResponse } from "@workspace/api-zod";

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
const YOUTUBE_SEARCH_URLS = [
  "https://www.youtube.com/results",
  "https://m.youtube.com/results",
] as const;

function textFromRuns(value: unknown): string {
  const runs = (value as { runs?: unknown } | null)?.runs;
  if (Array.isArray(runs)) {
    return runs
      .map((run) => String((run as { text?: unknown }).text ?? ""))
      .join("");
  }
  return String((value as { simpleText?: unknown } | null)?.simpleText ?? "");
}

function extractInitialData(html: string): unknown {
  const marker = "ytInitialData";
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = html.indexOf("{", markerIndex);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, index + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function collectVideoRenderers(value: unknown, results: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return results;
  if (Array.isArray(value)) {
    for (const item of value) collectVideoRenderers(item, results);
    return results;
  }

  const object = value as Record<string, unknown>;
  if (object.videoRenderer && typeof object.videoRenderer === "object") {
    results.push(object.videoRenderer as Record<string, unknown>);
  }
  for (const child of Object.values(object)) collectVideoRenderers(child, results);
  return results;
}

function normalizeYoutubeSearch(payload: unknown): SongResult[] {
  return collectVideoRenderers(payload)
    .map((item) => {
      const videoId = typeof item.videoId === "string" ? item.videoId : "";
      const thumbnails = (item.thumbnail as { thumbnails?: unknown } | undefined)?.thumbnails;
      const thumbnailList = Array.isArray(thumbnails) ? thumbnails : [];
      const cover = String(
        (thumbnailList[thumbnailList.length - 1] as { url?: unknown } | undefined)?.url ?? "",
      );
      return {
        id: videoId,
        title: textFromRuns(item.title),
        artist: textFromRuns(item.ownerText) || textFromRuns(item.longBylineText) || "Unknown channel",
        album: "YouTube",
        duration: textFromRuns(item.lengthText) || "--:--",
        durationSeconds: null,
        cover,
        streamUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    })
    .filter((song) => song.id && song.title);
}

async function fetchYoutubeSearch(query: string): Promise<SongResult[]> {
  let lastError: unknown;
  for (const url of YOUTUBE_SEARCH_URLS) {
    try {
      const params = new URLSearchParams({ search_query: query, hl: "en" });
      const response = await fetch(`${url}?${params}`, {
        headers: {
          Accept: "text/html",
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`YouTube search returned HTTP ${response.status}`);
      const results = normalizeYoutubeSearch(extractInitialData(await response.text()));
      if (results.length > 0) return results;
      throw new Error("YouTube returned no parseable video results");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("YouTube search failed");
}

router.get("/search", async (req, res) => {
  const parsed = SearchSongsQueryParams.safeParse(req.query);
  if (!parsed.success || !parsed.data.q.trim()) {
    res.status(400).json({ error: "A search query is required." });
    return;
  }

  const query = parsed.data.q.trim();

  try {
    const songs = await fetchYoutubeSearch(query);
    res.json(SearchSongsResponse.parse(songs));
  } catch (error) {
    req.log.error({ err: error, query }, "YouTube search failed");
    res.status(502).json({
      error: "YouTube search is temporarily unavailable. Please try again.",
    });
  }
});

export default router;