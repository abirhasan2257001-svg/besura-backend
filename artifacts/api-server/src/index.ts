import express from "express";
import cors from "cors";
import { Innertube } from "youtubei.js";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// Health check
app.get("/api/healthz", (req, res) => {
  res.json({ status: "ok" });
});

// Download endpoint - GET request with query params
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

    // Try multiple YouTube clients
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

// Search endpoint (existing functionality preserved)
app.get("/api/search", async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "Query required" });
    }

    const yt = await Innertube.create();
    const results = await yt.search(query, { type: "video" });
    
    const videos = results.contents
      ?.filter((item: any) => item.type === "Video")
      ?.slice(0, 20)
      ?.map((item: any) => ({
        id: item.id,
        title: item.title?.text,
        author: item.author?.name,
        duration: item.duration?.text,
        thumbnail: item.thumbnails?.[0]?.url,
        url: `https://www.youtube.com/watch?v=${item.id}`
      })) || [];

    res.json({ results: videos });
  } catch (err: any) {
    console.error("Search error:", err?.message || err);
    res.status(500).json({ error: "Search failed" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("API Server running on port " + PORT));
