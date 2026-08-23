import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Heart,
  Link2,
  ListMusic,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Video,
  Volume2,
  X,
} from 'lucide-react';

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  durationSeconds?: number;
  cover: string;
  streamUrl?: string;
};

type Playlist = {
  id: string;
  name: string;
  songs: Track[];
};

type Tab = 'search' | 'downloader' | 'favorites' | 'playlist';
type DownloadFormat = 'mp3' | 'mp4';

const FAVORITES_KEY = 'besura-favorites-v2';
const PLAYLISTS_KEY = 'besura-playlists-v2';
const ACCEPTED_HOSTS = ['youtube.com', 'youtu.be', 'facebook.com', 'fb.watch', 'instagram.com', 'tiktok.com'];

type YoutubePlayer = {
  destroy: () => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  loadVideoById: (videoId: string) => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
};

type YoutubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      height: string;
      width: string;
      videoId?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YoutubePlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; CUED: number };
};

declare global {
  interface Window {
    YT?: YoutubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYoutubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    let existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };
    existingScript ??= document.createElement('script');
    if (!existingScript.src) {
      existingScript.src = 'https://www.youtube.com/iframe_api';
      existingScript.async = true;
      existingScript.onerror = () => reject(new Error('Could not load YouTube player'));
      document.head.appendChild(existingScript);
    }
  });
  return youtubeApiPromise;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const value = JSON.parse(raw) as T;
    if (Array.isArray(fallback) && !Array.isArray(value)) return fallback;
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in private browsing. The session still works.
  }
}

function formatDuration(seconds: number | string | undefined): string {
  const total = typeof seconds === 'string' ? Number(seconds) : seconds;
  if (!total || Number.isNaN(total)) return '--:--';
  const minutes = Math.floor(total / 60);
  const remainder = Math.floor(total % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

type MediaEntry = { url?: unknown; quality?: unknown; bitrate?: unknown };

function mediaEntries(value: unknown): Array<string | MediaEntry> {
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string | MediaEntry =>
    typeof item === 'string' || Boolean(item && typeof item === 'object' && 'url' in item),
  );
}

function mediaUrl(entry: string | MediaEntry): string {
  return typeof entry === 'string' ? entry : typeof entry.url === 'string' ? entry.url : '';
}

function mediaQuality(entry: string | MediaEntry): number {
  if (typeof entry === 'string') return 0;
  const quality = String(entry.quality ?? entry.bitrate ?? '');
  const numericQuality = Number.parseInt(quality.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(numericQuality) ? numericQuality : 0;
}

function getBestMediaUrl(value: unknown): string {
  return mediaEntries(value)
    .map((entry) => ({ entry, url: mediaUrl(entry), quality: mediaQuality(entry) }))
    .filter((item) => item.url)
    .sort((left, right) => right.quality - left.quality)[0]?.url ?? '';
}

function normalizeSongs(payload: unknown): Track[] {
  if (!Array.isArray(payload)) return [];
  return payload.map((raw, index) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const title = String(item.name ?? item.title ?? 'Untitled track');
    const artistValue = item.primaryArtists ?? item.artist ?? item.artists ?? 'Unknown artist';
    const artist = Array.isArray(artistValue)
      ? artistValue.map((entry) => typeof entry === 'string' ? entry : String((entry as Record<string, unknown>).name ?? '')).filter(Boolean).join(', ')
      : String(artistValue);
    const seconds = Number(item.durationSeconds ?? item.duration);
    const id = String(item.id ?? '').trim() || `youtube-${index}`;
    return {
      id,
      title,
      artist: artist || 'Unknown artist',
      album: String(item.album ?? 'YouTube'),
      duration: typeof item.duration === 'string' && item.duration.includes(':')
        ? item.duration
        : formatDuration(seconds || String(item.duration ?? '')),
      durationSeconds: seconds || undefined,
      cover: String(item.cover ?? item.thumbnail ?? ''),
      streamUrl: String(item.streamUrl ?? `https://www.youtube.com/watch?v=${id}`),
    };
  });
}

async function searchSongsFromBackend(term: string): Promise<Track[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Search request failed with ${response.status}`);
  const payload: unknown = await response.json();
  const songs = normalizeSongs(payload);
  if (songs.length === 0) throw new Error('The search response did not contain any songs');
  return songs;
}

function hostIsAccepted(urlValue: string): boolean {
  try {
    const hostname = new URL(urlValue).hostname.replace(/^www\./, '').toLowerCase();
    return ACCEPTED_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

function formatClock(seconds: number): string {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  return formatDuration(Math.floor(seconds));
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [favorites, setFavorites] = useState<Track[]>(() => readStorage<Track[]>(FAVORITES_KEY, []));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => readStorage<Playlist[]>(PLAYLISTS_KEY, []));
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(() => {
    const saved = readStorage<Playlist[]>(PLAYLISTS_KEY, []);
    return saved[0]?.id ?? null;
  });
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [playlistAddSelection, setPlaylistAddSelection] = useState('');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [notice, setNotice] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('mp3');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const youtubeMountRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YoutubePlayer | null>(null);
  const [youtubeReady, setYoutubeReady] = useState(false);

  useEffect(() => writeStorage(FAVORITES_KEY, favorites), [favorites]);
  useEffect(() => writeStorage(PLAYLISTS_KEY, playlists), [playlists]);
  useEffect(() => {
    if (!selectedPlaylistId && playlists[0]) setSelectedPlaylistId(playlists[0].id);
    if (selectedPlaylistId && !playlists.some((playlist) => playlist.id === selectedPlaylistId)) {
      setSelectedPlaylistId(playlists[0]?.id ?? null);
    }
  }, [playlists, selectedPlaylistId]);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2600);
  };

  const searchSongs = async (event?: FormEvent) => {
    event?.preventDefault();
    const term = query.trim();
    if (!term) {
      setSearchError('Enter a song, artist, or album to search.');
      setResults([]);
      setSearchedQuery('');
      return;
    }
    setActiveTab('search');
    setIsSearching(true);
    setSearchError('');
    setSearchedQuery(term);
    try {
      setResults(await searchSongsFromBackend(term));
    } catch {
      setResults([]);
      setSearchError('We could not reach the music search. Check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFavorite = (track: Track) => {
    setFavorites((current) => current.some((item) => item.id === track.id)
      ? current.filter((item) => item.id !== track.id)
      : [track, ...current]);
  };

  const playTrack = (track: Track) => {
    if (!/^[A-Za-z0-9_-]{1,30}$/.test(track.id)) {
      notify('This result has no playable YouTube video.');
      setCurrentTrack(track);
      setIsPlaying(false);
      return;
    }
    setQueue((current) => current.some((item) => item.id === track.id) ? current : [...current, track]);
    if (currentTrack?.id === track.id) {
      const player = youtubePlayerRef.current;
      if (!player) {
        notify('The YouTube player is still loading.');
        return;
      }
      if (player.getPlayerState() === window.YT?.PlayerState.PLAYING) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        player.playVideo();
        setIsPlaying(true);
      }
      return;
    }
    setCurrentTrack(track);
  };

  const nextTrack = () => {
    if (!queue.length) return;
    const index = currentTrack ? queue.findIndex((track) => track.id === currentTrack.id) : -1;
    const next = queue[(index + 1) % queue.length];
    if (next) setCurrentTrack(next);
  };

  const previousTrack = () => {
    if (!queue.length) return;
    const index = currentTrack ? queue.findIndex((track) => track.id === currentTrack.id) : 0;
    const previous = queue[(index - 1 + queue.length) % queue.length];
    if (previous) setCurrentTrack(previous);
  };

  useEffect(() => {
    const mount = youtubeMountRef.current;
    if (!mount) return;
    let cancelled = false;

    void loadYoutubeIframeApi()
      .then(() => {
        if (cancelled || !window.YT?.Player) return;
        youtubePlayerRef.current = new window.YT.Player(mount, {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            playsinline: 1,
          },
          events: {
            onReady: () => setYoutubeReady(true),
            onStateChange: (event) => {
              if (event.data === window.YT?.PlayerState.PLAYING) setIsPlaying(true);
              if (event.data === window.YT?.PlayerState.PAUSED) setIsPlaying(false);
              if (event.data === window.YT?.PlayerState.ENDED) {
                setIsPlaying(false);
                nextTrack();
              }
            },
            onError: () => {
              setIsPlaying(false);
              notify('YouTube could not play this video.');
            },
          },
        });
      })
      .catch(() => notify('The YouTube player could not load.'));

    return () => {
      cancelled = true;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const player = youtubePlayerRef.current;
    if (!player || !youtubeReady || !currentTrack) return;
    if (!/^[A-Za-z0-9_-]{1,30}$/.test(currentTrack.id)) {
      setIsPlaying(false);
      return;
    }
    setCurrentTime(0);
    setAudioDuration(currentTrack.durationSeconds ?? 0);
    player.loadVideoById(currentTrack.id);
    setIsPlaying(true);
  }, [currentTrack, youtubeReady]);

  useEffect(() => {
    if (!youtubeReady || !currentTrack) return;
    const updateTime = () => {
      const player = youtubePlayerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime() || 0);
      setAudioDuration(player.getDuration() || currentTrack.durationSeconds || 0);
    };
    const interval = window.setInterval(updateTime, 500);
    updateTime();
    return () => {
      window.clearInterval(interval);
    };
  }, [currentTrack, youtubeReady]);

  const seekTo = (percent: number) => {
    const player = youtubePlayerRef.current;
    if (!player || !progressDuration) return;
    const seconds = progressDuration * Math.max(0, Math.min(1, percent));
    player.seekTo(seconds, true);
    setCurrentTime(seconds);
  };

  const requestCobaltDownload = async (url: string, format: DownloadFormat): Promise<string> => {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format }),
    });
    if (!response.ok) throw new Error(`Download request failed with ${response.status}`);
    const payload = await response.json() as { url?: string };
    const returnedUrl = payload.url;
    if (!returnedUrl) throw new Error('Cobalt did not return a file URL');
    return returnedUrl;
  };

  const downloadTrack = async (track: Track) => {
    if (!/^[A-Za-z0-9_-]{1,30}$/.test(track.id)) {
      notify('There is no YouTube source available for this track.');
      return;
    }
    try {
      const returnedUrl = await requestCobaltDownload(`https://www.youtube.com/watch?v=${track.id}`, 'mp3');
      const anchor = document.createElement('a');
      anchor.href = returnedUrl;
      anchor.download = `${track.title} - ${track.artist}.mp3`;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      notify('Your MP3 download is ready.');
    } catch {
      notify('The MP3 download could not be created right now.');
    }
  };

  const createPlaylist = (event: FormEvent) => {
    event.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;
    const playlist = { id: `playlist-${Date.now()}`, name, songs: [] };
    setPlaylists((current) => [...current, playlist]);
    setSelectedPlaylistId(playlist.id);
    setNewPlaylistName('');
    notify(`Created ${name}`);
  };

  const addToPlaylist = (track: Track, playlistId: string) => {
    if (!playlistId) {
      notify('Create a playlist before adding songs.');
      return;
    }
    setPlaylists((current) => current.map((playlist) => {
      if (playlist.id !== playlistId || playlist.songs.some((song) => song.id === track.id)) return playlist;
      return { ...playlist, songs: [...playlist.songs, track] };
    }));
    setPlaylistAddSelection(playlistId);
    const playlist = playlists.find((item) => item.id === playlistId);
    notify(playlist?.name ? `Added to ${playlist.name}` : 'Added to playlist');
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((current) => current.map((playlist) => playlist.id === playlistId
      ? { ...playlist, songs: playlist.songs.filter((song) => song.id !== trackId) }
      : playlist));
  };

  const deletePlaylist = (playlistId: string) => {
    const playlist = playlists.find((item) => item.id === playlistId);
    setPlaylists((current) => current.filter((item) => item.id !== playlistId));
    if (playlist?.name) notify(`Deleted ${playlist.name}`);
  };

  const runDownloader = async (event: FormEvent) => {
    event.preventDefault();
    setDownloadError('');
    setDownloadUrl('');
    const url = downloadUrlInput.trim();
    if (!url) {
      setDownloadError('Paste a supported social video link first.');
      return;
    }
    if (!hostIsAccepted(url)) {
      setDownloadError('Use a YouTube, Facebook, Instagram, or TikTok link.');
      return;
    }
    setIsDownloading(true);
    try {
      const returnedUrl = await requestCobaltDownload(url, downloadFormat);
      setDownloadUrl(returnedUrl);
    } catch {
      setDownloadError('The downloader could not create a file. The source may be private or temporarily unavailable.');
    } finally {
      setIsDownloading(false);
    }
  };

  const [downloadUrlInput, setDownloadUrlInput] = useState('');
  const activePlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId);
  const progressDuration = audioDuration || currentTrack?.durationSeconds || 0;
  const progress = progressDuration ? Math.min(100, (currentTime / progressDuration) * 100) : 0;

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="besura-shell grain">
      <header className="topbar">
        <button className="wordmark" onClick={() => switchTab('search')} data-testid="button-logo" aria-label="Go to search">
          <span className="wordmark-mark"><Music2 size={16} strokeWidth={2.6} /></span>
          <span>besura</span>
        </button>
        <span className="topbar-caption">your small listening room</span>
        <div className="eyebrow" style={{ fontSize: 9 }}>ready when you are</div>
      </header>

      <main className="content">
        {activeTab === 'search' && (
          <section aria-labelledby="search-heading">
            <div className="hero">
              <div className="eyebrow">music utility / 01</div>
              <h1 id="search-heading">Find the song.<br /><span>Keep the feeling.</span></h1>
              <p className="hero-copy">Search JioSaavn, save what stays with you, and keep a few good songs close. Besura does less so you can listen faster.</p>
              <form className="search-box" onSubmit={searchSongs}>
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search songs, artists, albums..."
                  aria-label="Search songs, artists, albums"
                  data-testid="input-search"
                />
                {query && <button type="button" className="icon-button" onClick={() => setQuery('')} data-testid="button-clear-search" aria-label="Clear search"><X size={15} /></button>}
                <button className="primary-button" type="submit" disabled={isSearching} data-testid="button-search">
                  {isSearching ? <LoaderCircle className="loading-icon" size={15} /> : 'Search'}
                </button>
              </form>
              {searchError && !searchedQuery && <div style={{ marginTop: 16 }}><StateCard error title="Search needs a little more" message={searchError} /></div>}
            </div>

            {!searchedQuery && !searchError && (
              <div className="feature-strip">
                <div className="feature-card accent">
                  <Volume2 className="feature-icon" size={19} />
                  <h3>A quiet place to start.</h3>
                  <p>One search, clean results, and no feed to fight through. Bring a song to the room.</p>
                </div>
                <div className="feature-card">
                  <ListMusic className="feature-icon" size={19} />
                  <h3>Keep the good ones.</h3>
                  <p>Favorites and small playlists stay on this device, ready for the next listen.</p>
                </div>
              </div>
            )}

            {searchedQuery && (
              <div>
                <div className="section-head">
                  <div>
                    <div className="section-kicker">search results</div>
                    <h2>{results.length ? `For “${searchedQuery}”` : 'No close matches'}</h2>
                  </div>
                  {results.length > 0 && <span className="section-kicker">{results.length} found</span>}
                </div>
                {isSearching && <div className="result-list" aria-label="Loading search results"><div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" /><div className="skeleton-row" /></div>}
                {!isSearching && searchError && <StateCard error title="Search unavailable" message={searchError} actionLabel="Try again" onAction={() => void searchSongs()} />}
                {!isSearching && !searchError && results.length === 0 && <StateCard title="Nothing in the room yet" message="Try a different spelling, an artist name, or a line from the title." />}
                {!isSearching && !searchError && results.length > 0 && (
                  <div className="result-list">
                    {results.map((track) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        liked={favorites.some((item) => item.id === track.id)}
                        active={currentTrack?.id === track.id && isPlaying}
                        playlists={playlists}
                        selectedPlaylistId={playlistAddSelection}
                        onSelectedPlaylist={setPlaylistAddSelection}
                        onPlay={() => playTrack(track)}
                        onLike={() => toggleFavorite(track)}
                        onDownload={() => downloadTrack(track)}
                        onAdd={(playlistId) => addToPlaylist(track, playlistId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'downloader' && (
          <section className="hero" aria-labelledby="downloader-heading">
            <div className="eyebrow">download utility / 02</div>
            <h1 id="downloader-heading">Bring it<br /><span>offline.</span></h1>
            <p className="hero-copy">Drop a link from the platforms you already use. Choose audio for listening or video for keeping.</p>
            <form className="surface downloader-panel" onSubmit={runDownloader}>
              <p className="downloader-intro">Supports public links from YouTube, Facebook, Instagram, and TikTok.</p>
              <div className="url-input-wrap">
                <Link2 size={17} />
                <input
                  className="url-input"
                  value={downloadUrlInput}
                  onChange={(event) => setDownloadUrlInput(event.target.value)}
                  placeholder="Paste a video link"
                  aria-label="Video URL"
                  data-testid="input-downloader-url"
                />
              </div>
              <div className="format-grid" role="radiogroup" aria-label="Download format">
                <div className="format-option">
                  <input id="format-mp3" type="radio" name="format" value="mp3" checked={downloadFormat === 'mp3'} onChange={() => setDownloadFormat('mp3')} />
                  <label htmlFor="format-mp3" data-testid="option-format-mp3"><Music2 size={17} /><span>MP3<small>audio only</small></span></label>
                </div>
                <div className="format-option">
                  <input id="format-mp4" type="radio" name="format" value="mp4" checked={downloadFormat === 'mp4'} onChange={() => setDownloadFormat('mp4')} />
                  <label htmlFor="format-mp4" data-testid="option-format-mp4"><Video size={17} /><span>MP4<small>video file</small></span></label>
                </div>
              </div>
              <button className="primary-button downloader-submit" type="submit" disabled={isDownloading} data-testid="button-start-download">
                {isDownloading ? <><LoaderCircle className="loading-icon" size={16} /> Preparing file...</> : <><Download size={16} /> Create download</>}
              </button>
              {downloadError && <p className="form-error" role="alert" data-testid="status-downloader-error">{downloadError}</p>}
              {downloadUrl && (
                <div className="download-result" data-testid="status-download-ready">
                  <Check size={18} />
                  <p>Your {downloadFormat.toUpperCase()} is ready.</p>
                  <a className="icon-button" href={downloadUrl} target="_blank" rel="noreferrer" download data-testid="button-download-file" aria-label="Download file"><Download size={16} /></a>
                  <a className="icon-button" href={downloadUrl} target="_blank" rel="noreferrer" data-testid="button-open-file" aria-label="Open file"><ExternalLink size={16} /></a>
                </div>
              )}
            </form>
          </section>
        )}

        {activeTab === 'favorites' && (
          <section className="hero" aria-labelledby="favorites-heading">
            <div className="eyebrow">your saved room / 03</div>
            <h1 id="favorites-heading">The ones<br /><span>you kept.</span></h1>
            <p className="hero-copy">A private shelf for songs that made it past the first listen. Stored locally, yours to take anywhere.</p>
            <div className="surface favorite-summary">
              <p><strong>{favorites.length}</strong><br />saved {favorites.length === 1 ? 'track' : 'tracks'}</p>
              <Heart size={22} fill={favorites.length ? 'currentColor' : 'none'} color={favorites.length ? '#1ed760' : '#666'} />
            </div>
            {favorites.length === 0
              ? <StateCard title="Your favorites are waiting" message="Tap the heart beside a search result and it will live here on this device." />
              : <div className="result-list">{favorites.map((track) => <TrackRow
                key={track.id}
                track={track}
                liked
                active={currentTrack?.id === track.id && isPlaying}
                playlists={playlists}
                selectedPlaylistId={playlistAddSelection}
                onSelectedPlaylist={setPlaylistAddSelection}
                onPlay={() => playTrack(track)}
                onLike={() => toggleFavorite(track)}
                onDownload={() => downloadTrack(track)}
                onAdd={(playlistId) => addToPlaylist(track, playlistId)}
              />)}</div>}
          </section>
        )}

        {activeTab === 'playlist' && (
          <section className="hero" aria-labelledby="playlist-heading">
            <div className="eyebrow">your small collections / 04</div>
            <h1 id="playlist-heading">Make a little<br /><span>room for it.</span></h1>
            <p className="hero-copy">Build playlists without a profile, a feed, or a sign-in. Just names and songs you want nearby.</p>
            <div className="playlist-layout">
              <aside className="surface playlist-sidebar">
                <form className="playlist-create" onSubmit={createPlaylist}>
                  <input value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)} placeholder="New playlist name" aria-label="New playlist name" data-testid="input-new-playlist" />
                  <button className="small-button" type="submit" data-testid="button-create-playlist" aria-label="Create playlist"><Plus size={17} /></button>
                </form>
                <div className="playlist-list" aria-label="Your playlists">
                  {playlists.map((playlist) => (
                    <div key={playlist.id} className={`playlist-item ${selectedPlaylistId === playlist.id ? 'selected' : ''}`}>
                      <button onClick={() => setSelectedPlaylistId(playlist.id)} data-testid={`button-select-playlist-${playlist.id}`}><span>{playlist.name}</span></button>
                      <em>{playlist.songs.length}</em>
                      <button className="icon-button" onClick={() => deletePlaylist(playlist.id)} data-testid={`button-delete-playlist-${playlist.id}`} aria-label={`Delete ${playlist.name}`}><Trash2 size={13} /></button>
                    </div>
                  ))}
                  {!playlists.length && <p className="playlist-empty">Create your first playlist above.</p>}
                </div>
              </aside>
              <div className="surface playlist-content">
                {activePlaylist ? (
                  <>
                    <h3>{activePlaylist.name}</h3>
                    <p>{activePlaylist.songs.length} {activePlaylist.songs.length === 1 ? 'song' : 'songs'} saved here</p>
                    {activePlaylist.songs.length
                      ? activePlaylist.songs.map((track) => <div className="playlist-song" key={track.id}>
                        <img className="track-art" src={track.cover} alt="" />
                        <div className="track-meta"><div className="track-title">{track.title}</div><div className="track-artist">{track.artist}</div></div>
                        <button className="icon-button play" onClick={() => playTrack(track)} data-testid={`button-play-playlist-${track.id}`} aria-label={`Play ${track.title}`}>{currentTrack?.id === track.id && isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button>
                        <button className="icon-button" onClick={() => removeFromPlaylist(activePlaylist.id, track.id)} data-testid={`button-remove-playlist-song-${track.id}`} aria-label={`Remove ${track.title}`}><X size={15} /></button>
                      </div>)
                      : <div className="playlist-empty">This list is clear. Add songs from Search or Favorites.</div>}
                  </>
                ) : <StateCard title="No playlist selected" message="Create a named playlist to start collecting." />}
              </div>
            </div>
          </section>
        )}
      </main>

      <div
        ref={youtubeMountRef}
        aria-hidden="true"
        style={{ position: 'fixed', width: 1, height: 1, left: -10000, top: -10000, opacity: 0, pointerEvents: 'none' }}
      />
      {currentTrack && <Player
        track={currentTrack}
        playing={isPlaying}
        currentTime={currentTime}
        duration={progressDuration}
        progress={progress}
        onToggle={() => playTrack(currentTrack)}
        onPrevious={previousTrack}
        onNext={nextTrack}
        onSeek={seekTo}
        expanded={isPlayerExpanded}
        onExpand={() => setIsPlayerExpanded(true)}
        onMinimize={() => setIsPlayerExpanded(false)}
      />}

      <nav className="bottom-nav" aria-label="Primary navigation">
        <NavItem tab="search" active={activeTab} label="Search" icon={Search} onClick={switchTab} />
        <NavItem tab="downloader" active={activeTab} label="Downloader" icon={Download} onClick={switchTab} />
        <NavItem tab="favorites" active={activeTab} label="Favorites" icon={Heart} onClick={switchTab} />
        <NavItem tab="playlist" active={activeTab} label="Playlist" icon={ListMusic} onClick={switchTab} />
      </nav>

      {notice && <div className="toast" role="status" data-testid="status-notice">{notice}</div>}
    </div>
  );
}

function NavItem({ tab, active, label, icon: Icon, onClick }: { tab: Tab; active: Tab; label: string; icon: typeof Search; onClick: (tab: Tab) => void }) {
  return <button className={`nav-item ${active === tab ? 'active' : ''}`} onClick={() => onClick(tab)} data-testid={`button-nav-${tab}`} aria-current={active === tab ? 'page' : undefined}><Icon size={19} strokeWidth={active === tab ? 2.4 : 1.8} /><span>{label}</span></button>;
}

function TrackRow({
  track, liked, active, playlists, selectedPlaylistId, onSelectedPlaylist, onPlay, onLike, onDownload, onAdd,
}: {
  track: Track;
  liked: boolean;
  active: boolean;
  playlists: Playlist[];
  selectedPlaylistId: string;
  onSelectedPlaylist: (value: string) => void;
  onPlay: () => void;
  onLike: () => void;
  onDownload: () => void;
  onAdd: (playlistId: string) => void;
}) {
  return (
    <article className="track-row" data-testid={`row-track-${track.id}`}>
      {track.cover ? <img className="track-art" src={track.cover} alt="" data-testid={`img-cover-${track.id}`} /> : <div className="track-art" aria-hidden="true" />}
      <div className="track-meta">
        <div className="track-title" data-testid={`text-track-title-${track.id}`}>{track.title}</div>
        <div className="track-artist">{track.artist}</div>
      </div>
      <div className="track-album">{track.album}</div>
      <div className="track-duration">{track.duration}</div>
      <div className="row-actions">
        <button className={`icon-button ${active ? 'play' : ''}`} onClick={onPlay} data-testid={`button-play-${track.id}`} aria-label={`${active ? 'Pause' : 'Play'} ${track.title}`}><span>{active ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</span></button>
        <button className={`icon-button ${liked ? 'liked' : ''}`} onClick={onLike} data-testid={`button-favorite-${track.id}`} aria-label={`${liked ? 'Remove' : 'Add'} ${track.title} ${liked ? 'from favorites' : 'to favorites'}`}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /></button>
        <button className="icon-button" onClick={onDownload} disabled={!track.streamUrl} data-testid={`button-download-${track.id}`} aria-label={`Download ${track.title}`}><Download size={15} /></button>
        {playlists.length > 0 && <div className="add-to-playlist">
          <select value={selectedPlaylistId} onChange={(event) => { onSelectedPlaylist(event.target.value); onAdd(event.target.value); }} aria-label={`Add ${track.title} to playlist`} data-testid={`select-playlist-${track.id}`}>
            <option value="">Add</option>
            {playlists.map((playlist) => <option value={playlist.id} key={playlist.id}>{playlist.name}</option>)}
          </select>
        </div>}
      </div>
    </article>
  );
}

function StateCard({ title, message, error = false, actionLabel, onAction }: { title: string; message: string; error?: boolean; actionLabel?: string; onAction?: () => void }) {
  return <div className={`surface state-card ${error ? 'error' : ''}`} data-testid={error ? 'status-error' : 'status-empty'}>{error ? <AlertCircle size={22} /> : <Music2 size={22} />}<div><h3>{title}</h3><p>{message}</p>{actionLabel && onAction && <button className="primary-button" style={{ marginTop: 15 }} onClick={onAction} data-testid="button-state-action">{actionLabel}</button>}</div></div>;
}

function Player({ track, playing, currentTime, duration, progress, onToggle, onPrevious, onNext, onSeek, expanded, onExpand, onMinimize }: { track: Track; playing: boolean; currentTime: number; duration: number; progress: number; onToggle: () => void; onPrevious: () => void; onNext: () => void; onSeek: (percent: number) => void; expanded: boolean; onExpand: () => void; onMinimize: () => void }) {
  const seek = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    onSeek((event.clientX - bounds.left) / bounds.width);
  };
  return <>
    <section className="player" aria-label="Audio player" data-testid="player" onClick={onExpand} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onExpand(); }}>
    <div className="player-main">
      {track.cover ? <img className="player-art" src={track.cover} alt="" /> : <div className="player-art" />}
      <div className="player-meta"><strong>{track.title}</strong><span>{track.artist}</span></div>
      <div className="player-controls" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button" onClick={onPrevious} data-testid="button-player-previous" aria-label="Previous track"><SkipBack size={15} fill="currentColor" /></button>
        <button className="icon-button play" onClick={onToggle} data-testid="button-player-toggle" aria-label={playing ? 'Pause track' : 'Play track'}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
        <button className="icon-button" onClick={onNext} data-testid="button-player-next" aria-label="Next track"><SkipForward size={15} fill="currentColor" /></button>
      </div>
    </div>
    <div className="player-progress" onClick={(event) => { event.stopPropagation(); seek(event); }}><span>{formatClock(currentTime)}</span><div className="progress-track" role="slider" aria-label="Seek track" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} tabIndex={0}><div className="progress-fill" style={{ width: `${progress}%` }} /></div><span>{formatClock(duration)}</span></div>
    {!track.streamUrl && <p className="player-notice">This result has no playable source.</p>}
    </section>
    {expanded && <section className="player-expanded" role="dialog" aria-modal="true" aria-label="Expanded audio player" data-testid="expanded-player">
      <button className="player-collapse" onClick={onMinimize} aria-label="Minimize player" data-testid="button-minimize-player"><ChevronDown size={25} /></button>
      {track.cover ? <img className="player-expanded-art" src={track.cover} alt="" /> : <div className="player-expanded-art" />}
      <div className="player-expanded-meta"><strong>{track.title}</strong><span>{track.artist}</span></div>
      <div className="player-progress player-expanded-progress" onClick={seek}><span>{formatClock(currentTime)}</span><div className="progress-track" role="slider" aria-label="Seek track" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} tabIndex={0}><div className="progress-fill" style={{ width: `${progress}%` }} /></div><span>{formatClock(duration)}</span></div>
      <div className="player-expanded-controls">
        <button className="icon-button" onClick={onPrevious} data-testid="button-expanded-previous" aria-label="Previous track"><SkipBack size={22} fill="currentColor" /></button>
        <button className="icon-button play" onClick={onToggle} data-testid="button-expanded-toggle" aria-label={playing ? 'Pause track' : 'Play track'}>{playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</button>
        <button className="icon-button" onClick={onNext} data-testid="button-expanded-next" aria-label="Next track"><SkipForward size={22} fill="currentColor" /></button>
      </div>
    </section>}
  </>;
}

export default App;