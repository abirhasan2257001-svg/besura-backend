import express from "express";
import cors from "cors";
import { Innertube } from "youtubei.js";

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
    const clients = ["WEB", "ANDROID", "IOS", "TV_EMBEDDED"];
    const errors: string[] = [];

    for (const client of clients) {
      try {
        const yt = await Innertube.create({ client_type: client as any });
        const info = await yt.getInfo(videoId);
        
        // Try multiple format sources
        let fmts: any[] = [];
        
        // Method 1: streaming_data.adaptive_formats
        if (info.streaming_data?.adaptive_formats?.length) {
          fmts = info.streaming_data.adaptive_formats;
        }
        // Method 2: formats array
        else if ((info as any).formats?.length) {
          fmts = (info as any).formats;
        }
        // Method 3: streaming_data.formats
        else if (info.streaming_data?.formats?.length) {
          fmts = info.streaming_data.formats;
        }

        if (fmts.length === 0) {
          errors.push(`${client}: kono format pai ni (streaming_data: ${!!info.streaming_data})`);
          continue;
        }

        // Filter audio formats - multiple detection methods
        const audioFormats = fmts.filter((f: any) => {
          const hasAudio = f.has_audio !== false && 
                          f.acodec && 
                          f.acodec !== 'none';
          const noVideo = !f.has_video || f.vcodec === 'none';
          return hasAudio && noVideo;
        });

        if (audioFormats.length === 0) {
          errors.push(`${client}: ${fmts.length} formats ache, kintu kono audio nei (sample: ${JSON.stringify(fmts[0]).substring(0, 100)})`);
          continue;
        }

        // Sort by bitrate and get best
        const best = audioFormats.sort((a: any, b: any) => (b.bitrate || b.audioBitrate || 0) - (a.bitrate || a.audioBitrate || 0))[0];
        
        // Get URL - handle signature cipher if needed
        let audioUrl = best.url;
        if (!audioUrl && best.signature_cipher) {
          audioUrl = best.decipher(yt.session.player);
        }

        if (audioUrl) {
          return res.json({
            success: true,
            downloadUrl: audioUrl,
            title: (info.basic_info as any)?.title || title,
            engine: client,
            bitrate: best.bitrate || best.audioBitrate || 0,
            mimeType: best.mime_type || best.mimeType || 'audio/webm'
          });
        }

        errors.push(`${client}: audio format peyechi kintu url nei`);
      } catch (e: any) {
        errors.push(`${client}: ${e?.message || e}`);
      }
    }

    return res.status(500).json({ error: "Failed to extract audio stream", debug: errors });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed", debug: [err?.message || String(err)] });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("API Server running on port " + PORT));
