const https = require('https');
const videoId = '1-xGerv5FOk';
const instances = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.leptons.xyz', 
  'https://pipedapi.r4fo.com',
  'https://pipedapi.adminforge.de'
];

function tryInstance(i) {
  if (i >= instances.length) {
    console.log("All instances failed.");
    return;
  }
  const inst = instances[i];
  const url = `${inst}/streams/${videoId}`;
  console.log(`Trying ${inst}...`);
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const json = JSON.parse(data);
          console.log("Title:", json.title);
          const audio = json.audioStreams.sort((a,b) => b.bitrate - a.bitrate)[0];
          if (audio) {
            console.log("SUCCESS! Audio URL:", audio.url.substring(0, 80) + "...");
            console.log("Bitrate:", audio.bitrate, "Format:", audio.mimeType);
          } else {
            console.log("No audio found.");
            tryInstance(i + 1);
          }
        } catch (e) {
          console.log("JSON Parse error:", e.message);
          tryInstance(i + 1);
        }
      } else {
        console.log(`Failed with status ${res.statusCode}`);
        tryInstance(i + 1);
      }
    });
  }).on('error', (e) => {
    console.log(`Network Error: ${e.message}`);
    tryInstance(i + 1);
  });
}

tryInstance(0);
