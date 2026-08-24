export async function searchSongs(q) {
  try {
    const host = window.location.hostname || "localhost";
    const res = await fetch('http://' + host + ':5010/api/search?q=' + encodeURIComponent(q));
    const data = await res.json();
    return data?.data?.results || data?.results || [];
  } catch (e) { return []; }
}
export async function getSongDetails() { return null; }
export async function getSongLyrics() { return ''; }