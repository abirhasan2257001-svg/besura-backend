import { Router } from "express";
import { exec } from "child_process";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const videoId = req.body.videoId || (req.body.url ? (req.body.url.includes("v=") ? req.body.url.split("v=")[1]?.split("&")[0] : req.body.url.split("/").pop()) : null);
    const targetUrl = req.body.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null);

    if (!targetUrl) {
      return res.status(400).json({ error: "URL or videoId required" });
    }

    exec(`yt-dlp -g -f bestaudio "${targetUrl}"`, { timeout: 12000 }, (error: any, stdout: any, stderr: any) => {
      if (error || !stdout) {
        console.error("yt-dlp error:", stderr || error);
        return res.status(502).json({ error: "Download link generation failed" });
      }
      const audioUrl = stdout.trim().split(String.fromCharCode(10))[0];
      return res.json({ url: audioUrl });
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
