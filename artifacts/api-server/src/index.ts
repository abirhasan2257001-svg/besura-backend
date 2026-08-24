import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const tmpDir = path.join(process.cwd(), "tmp");
const termuxTmp = "/data/data/com.termux/files/usr/tmp";

// Ensure temporary directories exist
[tmpDir, termuxTmp].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
});

process.env.TMPDIR = termuxTmp;
process.env.TEMP = termuxTmp;
process.env.TMP = termuxTmp;

app.get("/api/download", async (req, res) => {
  const url = req.query.url as string;
  const title = (req.query.title as string) || "track";
  if (!url) return res.status(400).json({ error: "URL required" });

  const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const tempFilePath = path.join(tmpDir, `${sanitizedTitle}.mp3`);

  let ytDlpError = "";
  try {
    await new Promise((resolve, reject) => {
      const ytdlpExecutable = "/data/data/com.termux/files/usr/bin/yt-dlp";
      const customEnv = {
        ...process.env,
        PATH: `${process.env.PATH || ""}:/data/data/com.termux/files/usr/bin`,
        TMPDIR: termuxTmp,
        TEMP: termuxTmp,
        TMP: termuxTmp,
        HOME: termuxTmp,
        XDG_CACHE_HOME: termuxTmp,
        XDG_CONFIG_HOME: termuxTmp
      };

      const ytdlp = spawn(
        ytdlpExecutable,
        [
          "-x",
          "--audio-format", "mp3",
          "--audio-quality", "0",
          "--no-cache-dir",
          "--compat-options", "no-tmp-files",
          "-P", tmpDir,
          "-o", `${sanitizedTitle}.%(ext)s`,
          url
        ],
        { env: customEnv }
      );

      let stderr = "";
      ytdlp.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      ytdlp.on("close", (code) => {
        if (code === 0 && fs.existsSync(tempFilePath)) {
          resolve(null);
        } else {
          reject(new Error(stderr || `yt-dlp exited with code ${code}`));
        }
      });

      ytdlp.on("error", (err) => reject(err));
    });

    if (fs.existsSync(tempFilePath)) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Disposition", `attachment; filename="${sanitizedTitle}.mp3"`);
      const stream = fs.createReadStream(tempFilePath);
      stream.pipe(res);
      stream.on("end", () => {
        if (fs.existsSync(tempFilePath)) {
          try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
      });
      return;
    }
  } catch (e: any) {
    ytDlpError = e.message || String(e);
    console.error("Local yt-dlp failed:", ytDlpError);
  }

  // Fallback: Piped API
  try {
    const match = url.match(/(?:v=|\/embed\/|\/v\/|https:\/\/youtu\.be\/|\/shorts\/)([^"&?\/\s]{11})/);
    if (match) {
      const r = await fetch("https://pipedapi.kavin.rocks/streams/" + match[1]);
      if (r.ok) {
        const data = await r.json();
        if (data?.audioStreams?.[0]?.url) {
          return res.json({
            success: true,
            downloadUrl: data.audioStreams[0].url,
            title,
            engine: "piped"
          });
        }
      }
    }
  } catch (err) {}

  return res.status(500).json({
    error: "Failed to extract audio stream.",
    ytDlpError: ytDlpError
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("API Server running on port " + PORT));
