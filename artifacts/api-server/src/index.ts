import express from "express";
import cors from "cors";
import { Innertube } from "youtubei.js";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Download endpoint
app.get("/api/download", async (req, res) => {
  try {
    const url = req.query.url as string;
    const title = (req.query.title as string) || "track";
    
    if (!url) {
      return res.status(400).json({ error: "URL required" });
    }

    // Extract video ID from URL
    const match = url.match(/(?:v=|\/embed\/|\/v\/|https:\/\/youtu\.be\/|\/shorts\/)([^"&?\/\s]{11})/);
    if (!match) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }
    
    const videoId = match[1];
    const clients = ["IOS", "ANDROID", "WEB"];
    
    for (const client of clients) {
      try {
        const yt = await Innertube.create({ client_type: client as any });
        const info = await yt.getInfo(videoId);
        const fmts = (info.streaming_data?.adaptive_formats || []).filter((f: any) => f.has_audio && !f.has_video);
        
        if (fmts.length > 0) {
          const best = fmts.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          const audioUrl = best.url || (best.signature_cipher ? best.decipher(yt.session.player) : null);
          
          if (audioUrl) {
            return res.json({
              success: true,
              downloadUrl: audioUrl,
              title: info.basic_info.title || title,
              engine: `youtubei-${client.toLowerCase()}`
            });
          }
        }
      } catch (e: any) {
        console.error(`Client ${client} failed:`, e?.message);
      }
    }

    return res.status(500).json({ 
      error: "Failed to extract audio stream from all clients"
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
