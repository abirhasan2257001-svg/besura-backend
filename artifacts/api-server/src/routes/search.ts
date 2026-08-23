import { Router, type IRouter } from "express";
import { SearchSongsQueryParams, SearchSongsResponse } from "@workspace/api-zod";

type PipedSearchItem = {
  url?: unknown;
  title?: unknown;
  uploaderName?: unknown;
  uploaderUrl?: unknown;
  duration?: unknown;
  thumbnail?: unknown;
};

type SongResult = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds: number | null;
  cover: string;
  streamUrl: string | null;
};

const router: IRouter = Router();

// Keep the list ordered by generally reliable instances. The fallback helper
// below skips unavailable, rate-limited, and malformed instances automatically.
export const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.reallyaweso.me",
  "https://pipedapi.drgns.space",
  "https://pipedapi-libre.kavin.rocks",
  "https://api.piped.yt",
] as const;

const UPSTREAM_TIMEOUT_MS = 4_000;

export async function fetchWithFallback<T>(
  path: string,
  parse: (payload: unknown) => T,
): Promise<T> {
  let lastError: unknown;

  for (const instance of PIPED_INSTANCES) {
    try {
      const response = await fetch(`${instance}${path}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Besura/1.0",
        },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`${instance} returned HTTP ${response.status}`);
      }

      const payload: unknown = await response.json();
      return parse(payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Piped API instances failed");
}

function durationLabel(seconds: unknown): string {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return "--:--";
  const minutes = Math.floor(total / 60);
  const remainder = Math.floor(total % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function videoIdFromUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.match(/\/watch\?v=([^&]+)/);
  return match?.[1] ?? "";
}

function normalizePipedSearch(payload: unknown): SongResult[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((raw, index) => {
      const item = (raw ?? {}) as PipedSearchItem;
      const id = videoIdFromUrl(item.url);
      const title = String(item.title ?? "Untitled track");
      const artist = String(item.uploaderName ?? "Unknown artist");
      const seconds = Number(item.duration);

      return {
        id: id || `piped-${index}-${title}-${artist}`.replace(/\s+/g, "-").toLowerCase(),
        title,
        artist,
        album: "Piped search",
        duration: durationLabel(seconds),
        durationSeconds: Number.isFinite(seconds) && seconds > 0 ? seconds : null,
        cover: typeof item.thumbnail === "string" ? item.thumbnail : "",
        // Piped search results do not contain playable URLs. The streams route
        // is available to callers that need the selected video's formats.
        streamUrl: null,
      };
    })
    .filter((song) => song.title !== "Untitled track" || song.id.startsWith("piped-"));
}

router.get("/search", async (req, res) => {
  const parsed = SearchSongsQueryParams.safeParse(req.query);
  if (!parsed.success || !parsed.data.q.trim()) {
    res.status(400).json({ error: "A search query is required." });
    return;
  }

  const query = parsed.data.q.trim();

  try {
    const songs = await fetchWithFallback(
      `/search?q=${encodeURIComponent(query)}`,
      normalizePipedSearch,
    );
    res.json(SearchSongsResponse.parse(songs));
  } catch (error) {
    req.log.error({ err: error, query }, "All Piped search instances failed");
    res.status(502).json({
      error: "Music search is temporarily unavailable. Please try again.",
    });
  }
});

export default router;