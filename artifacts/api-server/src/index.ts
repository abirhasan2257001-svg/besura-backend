import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/download", async (req, res) => {
  try {
    const url = req.query.url as string;
    const title = (req.query.title as string) || "track";

    if (!url) return res.status(400).json({ error: "URL required" });

    const match = url.match(/(?:v=|\/embed\/|\/v\/|https:\/\/youtu\.be\/|\/shorts\/)([^"&?\/\s]{11})/);
    if (!match) return res.status(400).json({ error: "Invalid YouTube URL" });

    const videoId = match[1];
    const patterns = [
      `https://www.youtube.com/watch?v=${videoId}`,
      `https://m.youtube.com/watch?v=${videoId}`,
    ];

    const debug: any[] = [];
    let playerResponse: any = null;
    let usedPattern = "";

    for (const pattern of patterns) {
      try {
        const response = await fetch(pattern, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        });

        const html = await response.text();
        
        debug.push({
          pattern,
          status: response.status,
          htmlLength: html.length,
          preview: html.substring(0, 300)
        });

        // Extract ytInitialPlayerResponse
        const regexes = [
          /var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var\s+|<\/script>)/s,
          /ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var\s+|<\/script>)/s,
          /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s,
        ];

        for (const regex of regexes) {
          const m = html.match(regex);
          if (m && m[1]) {
            try {
              const parsed = JSON.parse(m[1]);
              if (parsed?.streamingData) {
                playerResponse = parsed;
                usedPattern = pattern;
                break;
              }
            } catch (e: any) {
              debug.push({ error: `JSON parse failed: ${e.message}` });
            }
          }
        }

        if (playerResponse) break;
      } catch (e: any) {
        debug.push({ pattern, error: e?.message || String(e) });
      }
    }

    if (!playerResponse) {
      return res.status(500).json({ 
        error: "Failed to fetch video data",
        debug
      });
    }

    const streamingData = playerResponse.streamingData;
    const allFormats = [
      ...(streamingData.adaptiveFormats || []),
      ...(streamingData.formats || []),
    ];

    const audioFormats = allFormats.filter((f: any) => {
      const mime = f.mimeType || "";
      const hasAudio = mime.startsWith("audio/") || f.audioCodec;
      const noVideo = !f.videoCodec || f.videoCodec === "none";
      return hasAudio && noVideo && f.url;
    });

    if (audioFormats.length === 0) {
      return res.status(500).json({ 
        error: "No playable audio formats",
        totalFormats: allFormats.length,
        sampleMimes: allFormats.slice(0, 5).map((f: any) => f.mimeType)
      });
    }

    const best = audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    return res.json({
      success: true,
      downloadUrl: best.url,
      title: playerResponse.videoDetails?.title || title,
      engine: "direct-fetch",
      pattern: usedPattern
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed", details: err?.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("API Server running on port " + PORT));
