import ytdl from "@distube/ytdl-core";

async function test() {
  try {
    console.log("Testing with videoId: 1-xGerv5FOk");
    const targetUrl = "https://www.youtube.com/watch?v=1-xGerv5FOk";
    
    console.log("Getting info...");
    const info = await ytdl.getInfo(targetUrl);
    console.log("Got info! Title:", info.videoDetails.title);
    
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
    console.log("Found audio formats:", audioFormats.length);
    
    if (audioFormats.length > 0) {
      const bestAudio = audioFormats[0];
      console.log("Best audio URL:", bestAudio.url ? bestAudio.url.substring(0, 50) + "..." : "No URL");
    }
  } catch (err) {
    console.error("ERROR:", err.message);
    console.error("Full error:", err);
  }
}

test();
