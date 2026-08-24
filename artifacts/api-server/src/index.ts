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

    // Multiple consent/client patterns try করব
    const patterns = [
      `https://www.youtube.com/watch?v=${videoId}`,
      `https://m.youtube.com/watch?v=${videoId}`,
      `https://www.youtube.com/embed/${videoId}`,
    ];

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

        // Try multiple patterns to extract ytInitialPlayerResponse
        const extractPatterns = [
          /var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var\s+|<\/script>)/s,
          /ytInitialPlayerResponse\s*=\s*(\{.+?\});\s*(?:var\s+|<\/script>)/s,
          /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s,
        ];

        for (const regex of extractPatterns) {
          const m = html.match(regex);
          if (m && m[1]) {
            try {
              const parsed = JSON.parse(m[1]);
              if (parsed?.streamingData?.adaptiveFormats?.length) {
                playerResponse = parsed;
                usedPattern = pattern;
                break;
              }
              if (parsed?.streamingData?.formats?.length) {
                playerResponse = parsed;
                usedPattern = pattern;
                break;
              }
            } catch (e) {}
          }
        }

        if (playerResponse) break;
      } catch (e: any) {
        console.error(`Pattern ${pattern} failed:`, e?.message);
      }
    }

    if (!playerResponse) {
      return res.status(500).json({ error: "Failed to fetch video data from any source" });
    }

    const streamingData = playerResponse.streamingData;
    if (!streamingData) {
      return res.status(500).json({ error: "No streaming data found" });
    }

    // Combine adaptiveFormats + formats
    const allFormats = [
      ...(streamingData.adaptiveFormats || []),
      ...(streamingData.formats || []),
    ];

    // Filter audio formats
    const audioFormats = allFormats.filter((f: any) => {
      const mime = f.mimeType || "";
      const hasAudio = mime.startsWith("audio/") || (f.audioCodec && f.audioCodec !== "none");
      const noVideo = !f.videoCodec || f.videoCodec === "none" || !mime.includes("video");
      return hasAudio && noVideo && f.url;
    });

    if (audioFormats.length === 0) {
      return res.status(500).json({ 
        error: "No playable audio formats found",
        debug: {
          totalFormats: allFormats.length,
          sampleMimes: allFormats.slice(0, 3).map((f: any) => f.mimeType)
        }
      });
    }

    // Get best quality audio
    const best = audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    return res.json({
      success: true,
      downloadUrl: best.url,
      title: playerResponse.videoDetails?.title || title,
      duration: parseInt(playerResponse.videoDetails?.lengthSeconds) || 0,
      engine: "direct-fetch",
      pattern: usedPattern,
      bitrate: best.bitrate || 0,
      mimeType: best.mimeType || "audio/webm"
    });
  } catch (err: any) {
    console.error("Download error:", err?.message || err);
    return res.status(500).json({ 
      error: "Failed to extract audio stream", 
      details: err?.message || String(err)
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("API Server running on port " + PORT));
