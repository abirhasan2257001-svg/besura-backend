import { Router } from 'express';
const router = Router();
router.get('/', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const q = req.query.q as string;
  if (!q) return res.status(400).json({ error: 'Query required' });
  try {
    const r = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await r.text();
    const m = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (m) {
      const p = JSON.parse(m[1]);
      const contents = p.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents || [];
      const results = [];
      for (const item of contents) {
        if (item.videoRenderer) {
          const v = item.videoRenderer;
          const thumb = v.thumbnail?.thumbnails?.[0]?.url || '';
          results.push({
            id: v.videoId,
            name: v.title?.runs?.[0]?.text || 'Unknown',
            primaryArtists: v.ownerText?.runs?.[0]?.text || 'Unknown',
            duration: v.lengthText?.simpleText || '03:00',
            cover: thumb, thumbnail: thumb, image: [{ quality: '500x500', url: thumb }],
            url: 'https://www.youtube.com/watch?v=' + v.videoId,
            downloadUrl: [{ quality: '320kbps', url: 'https://www.youtube.com/watch?v=' + v.videoId }]
          });
        }
      }
      return res.json({ status: 'SUCCESS', data: { results }, results });
    }
  } catch (e) {}
  return res.status(500).json({ error: 'Failed' });
});
export default router;