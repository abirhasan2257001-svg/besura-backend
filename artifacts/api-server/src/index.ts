import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Innertube API direct call
async function fetchFromInnertube(videoId: string, clientName: string, clientVersion: string) {
  const url = "https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w&prettyPrint=false";
  
  const payload = {
    videoId,
    context: {
      client: {
        clientName,
        clientVersion,
        hl: "en",
        gl: "US",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Innertube failed: ${response.status}`);
  }

  return await response.json();
}

app.get("/api/download", async (req, res) => {
  try {
    const url = req.query.url as string;
    const title = (req.query.title as string) || "track";

    if (!url) return res.status(400).json({ error: "URL required" });

    const match = url.match(/(?:v=|\/embed\/|\/v\/|https:\/\/youtu\.be\/|\/shorts\/)([^"&?\/\s]{11})/);
    if (!match) return res.status(400).json({ error: "Invalid YouTube URL" });

    const videoId = match[1];

    // Multiple clients try করবো
    const clients = [
      { name: "WEB", version: "2.20241126.00.00" },
      { name: "ANDROID", version: "19.44.38" },
      { name: "IOS", version: "19.45.4" },
      { name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", version: "2.0" },
    ];

    const errors: string[] = [];

    for (const client of clients) {
      try {
        const data = await fetchFromInnertube(videoId, client.name, client.version);

        // Check playability
        if (data.playabilityStatus?.status !== "OK") {
          errors.push(`${client.name}: ${data.playabilityStatus?.status || "unknown"}`);
          continue;
        }

        const streamingData = data.streamingData;
        if (!streamingData) {
          errors.push(`${client.name}: no streamingData`);
          continue;
        }

        // Combine formats
        const allFormats = [
          ...(streamingData.adaptiveFormats || []),
          ...(streamingData.formats || []),
        ];

        if (allFormats.length === 0) {
          errors.push(`${client.name}: no formats`);
          continue;
        }

        // Filter audio formats
        const audioFormats = allFormats.filter((f: any) => {
          const mime = f.mimeType || "";
          return mime.startsWith("audio/");
        });

        if (audioFormats.length === 0) {
          errors.push(`${client.name}: ${allFormats.length} formats, 0 audio`);
          continue;
        }

        // Get best quality
        const best = audioFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        // Handle signature cipher
        let audioUrl = best.url;
        if (!audioUrl && best.signatureCipher) {
          const params = new URLSearchParams(best.signatureCipher);
          audioUrl = params.get("url");
          // Note: signature deciphering complex, skip for now
          if (audioUrl) {
            return res.json({
              success: true,
              downloadUrl: audioUrl,
              title: data.videoDetails?.title || title,
              engine: `innertube-${client.name}`,
              bitrate: best.bitrate || 0,
              mimeType: best.mimeType || "audio/webm",
              note: "signature may need deciphering"
            });
          }
          errors.push(`${client.name}: signature cipher, no direct url`);
          continue;
        }

        if (audioUrl) {
          return res.json({
            success: true,
            downloadUrl: audioUrl,
            title: data.videoDetails?.title || title,
            duration: parseInt(data.videoDetails?.lengthSeconds) || 0,
            engine: `innertube-${client.name}`,
            bitrate: best.bitrate || 0,
            mimeType: best.mimeType || "audio/webm"
          });
        }

        errors.push(`${client.name}: audio found but no url`);
      } catch (e: any) {
        errors.push(`${client.name}: ${e?.message || String(e)}`);
      }
    }

    return res.status(500).json({ 
      error: "All Innertube clients failed",
      debug: errors
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed", details: err?.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("API Server running on port " + PORT));
