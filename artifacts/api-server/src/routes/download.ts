import { Router } from "express";
import { Innertube } from "youtubei.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const videoId = req.body.videoId || (req.body.url ? (req.body.url.includes("v=") ? req.body.url.split("v=")[1]?.split("&")[0] : req.body.url.split("/").pop()) : null);

    if (!videoId) {
      return res.status(400).json({ error: "URL or videoId required" });
    }

    let data: any = null;
    const errors: string[] = [];
    const clients = ["IOS", "ANDROID", "WEB"];

    for (const client of clients) {
      try {
        const yt = await Innertube.create({ client_type: client as any });
        const info = await yt.getInfo(videoId);
        const fmts = (info.streaming_data?.adaptive_formats || []).filter((f: any) => f.has_audio && !f.has_video);
        if (fmts.length > 0) {
          const best = fmts.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          const url = best.url || (best.signature_cipher ? best.decipher(yt.session.player) : null);
          if (url) {
            data = { url, title: info.basic_info.title, thumbnail: (info.basic_info.thumbnail || [])[0]?.url };
            break;
          } else {
            errors.push(`${client}: formats found but no url`);
          }
        } else {
          errors.push(`${client}: no audio formats`);
        }
      } catch (e: any) {
        errors.push(`${client}: ${e?.message || e}`);
      }
    }

    if (!data) {
      return res.status(502).json({ error: "Download link generation failed", debug: errors });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: "Download link generation failed", debug: [err?.message || String(err)] });
  }
});

export default router;
