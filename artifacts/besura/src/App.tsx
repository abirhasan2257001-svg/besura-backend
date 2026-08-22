import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Disc3,
  Headphones,
  Heart,
  Instagram,
  Library,
  ListMusic,
  Menu,
  MoreHorizontal,
  Moon,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Repeat2,
  Search,
  Send,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Twitter,
  Volume2,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();

type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  cover: string;
  accent: string;
  mood: string;
};

const tracks: Track[] = [
  {
    id: 'still-water',
    title: 'Still Water',
    artist: 'Mara Kline',
    album: 'A Room With No Clock',
    duration: '4:21',
    cover: 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg?auto=compress&cs=tinysrgb&w=700',
    accent: '#d36b46',
    mood: 'After hours',
  },
  {
    id: 'soft-focus',
    title: 'Soft Focus',
    artist: 'Nell Mescal',
    album: 'In The Margins',
    duration: '3:48',
    cover: 'https://images.pexels.com/photos/1671325/pexels-photo-1671325.jpeg?auto=compress&cs=tinysrgb&w=700',
    accent: '#7c9b85',
    mood: 'Slow mornings',
  },
  {
    id: 'north-window',
    title: 'North Window',
    artist: 'Rituals',
    album: 'Small Hours',
    duration: '5:02',
    cover: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=700',
    accent: '#6b76a4',
    mood: 'Inward',
  },
  {
    id: 'borrowed-light',
    title: 'Borrowed Light',
    artist: 'Juniper Vale',
    album: 'The Long Way Home',
    duration: '3:16',
    cover: 'https://images.pexels.com/photos/1626481/pexels-photo-1626481.jpeg?auto=compress&cs=tinysrgb&w=700',
    accent: '#c47f63',
    mood: 'Open road',
  },
  {
    id: 'blue-hour',
    title: 'Blue Hour',
    artist: 'Lumen',
    album: 'Blue Hour',
    duration: '4:09',
    cover: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=700',
    accent: '#747da6',
    mood: 'After hours',
  },
  {
    id: 'almost-home',
    title: 'Almost Home',
    artist: 'The Wild Eden',
    album: 'Field Notes',
    duration: '3:54',
    cover: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=700',
    accent: '#bb7450',
    mood: 'Open road',
  },
  {
    id: 'tender-machine',
    title: 'Tender Machine',
    artist: 'Orla Niamh',
    album: 'Tender Machine',
    duration: '4:46',
    cover: 'https://images.pexels.com/photos/1699030/pexels-photo-1699030.jpeg?auto=compress&cs=tinysrgb&w=700',
    accent: '#ae8799',
    mood: 'Inward',
  },
  {
    id: 'far-from-sure',
    title: 'Far From Sure',
    artist: 'Ilya March',
    album: 'Coordinates',
    duration: '3:38',
    cover: 'https://images.pexels.com/photos/154147/pexels-photo-154147.jpeg?auto=compress&cs=tinysrgb&w=700',
    accent: '#b08a4f',
    mood: 'Slow mornings',
  },
];

const moodTiles = [
  { label: 'After hours', count: '184 records', color: '#28304f', image: tracks[0].cover },
  { label: 'Slow mornings', count: '209 records', color: '#718878', image: tracks[1].cover },
  { label: 'Inward', count: '97 records', color: '#ad6c55', image: tracks[6].cover },
  { label: 'Open road', count: '151 records', color: '#7d6685', image: tracks[3].cover },
];

const artists = [
  { name: 'Mara Kline', detail: 'quietly electric', image: tracks[0].cover },
  { name: 'Juniper Vale', detail: 'folk for the in-between', image: tracks[3].cover },
  { name: 'Orla Niamh', detail: 'a little left of pop', image: tracks[6].cover },
  { name: 'Rituals', detail: 'instrumental weather', image: tracks[2].cover },
];

const navItems = [
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'library', label: 'Your library', icon: Library },
  { id: 'made-for-you', label: 'Made for you', icon: Sparkles },
];

const shelfItems = [
  { label: 'Recently played', icon: Clock3 },
  { label: 'Liked songs', icon: Heart },
  { label: 'Albums', icon: Disc3 },
];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary resetKey="besura">
          <BesuraApp />
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function BesuraApp() {
  const [activeNav, setActiveNav] = useState('discover');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mood, setMood] = useState('All');
  const [playingId, setPlayingId] = useState('still-water');
  const [isPlaying, setIsPlaying] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(['soft-focus', 'borrowed-light']);
  const [queue, setQueue] = useState<Track[]>([tracks[0], tracks[1], tracks[2], tracks[4]]);
  const [showQueue, setShowQueue] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [toast, setToast] = useState('');

  const activeTrack = tracks.find((track) => track.id === playingId) ?? tracks[0];
  const filteredTracks = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return tracks.filter((track) => {
      const matchesMood = mood === 'All' || track.mood === mood;
      const matchesQuery =
        !cleanQuery ||
        `${track.title} ${track.artist} ${track.album} ${track.mood}`.toLowerCase().includes(cleanQuery);
      return matchesMood && matchesQuery;
    });
  }, [mood, query]);

  const setNotice = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2300);
  };

  const chooseTrack = (track: Track, addToQueue = false) => {
    setPlayingId(track.id);
    setIsPlaying(true);
    if (addToQueue && !queue.some((item) => item.id === track.id)) {
      setQueue((current) => [...current, track]);
      setNotice(`${track.title} added to your queue`);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const removeFromQueue = (id: string) => {
    setQueue((current) => current.filter((track) => track.id !== id));
    setNotice('Removed from queue');
  };

  const jumpTo = (id: string) => {
    setActiveNav(id);
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const nextTrack = () => {
    const currentIndex = queue.findIndex((track) => track.id === playingId);
    const next = queue[(currentIndex + 1) % queue.length] ?? tracks[1];
    chooseTrack(next);
  };

  const previousTrack = () => {
    const currentIndex = queue.findIndex((track) => track.id === playingId);
    const previous = queue[(currentIndex - 1 + queue.length) % queue.length] ?? tracks[0];
    chooseTrack(previous);
  };

  return (
    <div className="noise min-h-[100dvh] bg-[#f4f0e8] text-[#252a40]">
      <div className="flex min-h-[100dvh]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-[#252a40] px-7 py-7 text-[#f6f1e8] transition-transform duration-300 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between">
            <button
              className="group flex items-center gap-3"
              onClick={() => jumpTo('discover')}
              data-testid="button-logo"
              aria-label="Back to discover"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e56d4d] text-[#252a40] transition-transform duration-300 group-hover:rotate-12">
                <Music2 size={18} strokeWidth={2.5} />
              </span>
              <span className="font-serif text-[28px] italic leading-none tracking-[-0.04em]">besura</span>
            </button>
            <button
              className="rounded-full p-2 text-[#a9adbd] hover:bg-[#303650] hover:text-[#f6f1e8] lg:hidden"
              onClick={() => setMobileOpen(false)}
              data-testid="button-close-mobile-nav"
              aria-label="Close menu"
            >
              <X size={19} />
            </button>
          </div>

          <div className="mt-14">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#858ba3]">Listen around</p>
            <nav className="space-y-1" aria-label="Primary navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const selected = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${selected ? 'bg-[#303650] text-[#f6f1e8]' : 'text-[#a9adbd] hover:bg-[#2b3048] hover:text-[#f6f1e8]'}`}
                    onClick={() => jumpTo(item.id)}
                    data-testid={`button-nav-${item.id}`}
                  >
                    <Icon size={17} strokeWidth={selected ? 2.2 : 1.7} />
                    <span>{item.label}</span>
                    {selected && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e56d4d]" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-11">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#858ba3]">Your shelves</p>
            <div className="space-y-1">
              {shelfItems.map(({ label, icon: Icon }) => (
                <button
                  key={String(label)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#a9adbd] transition-colors hover:bg-[#2b3048] hover:text-[#f6f1e8]"
                  onClick={() => setNotice(`${label} is ready for your next listening session`)}
                  data-testid={`button-shelf-${String(label).toLowerCase().replaceAll(' ', '-')}`}
                >
                  <Icon size={17} strokeWidth={1.7} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto rounded-2xl border border-[#444960] bg-[#2b3048] p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9fa5b8]">Besura radio</span>
              <span className="flex items-center gap-1.5 text-[10px] text-[#d6cfc2]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e56d4d] soft-pulse" /> Live
              </span>
            </div>
            <p className="font-serif text-[20px] italic leading-tight text-[#f6f1e8]">A little less obvious.</p>
            <button
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#e56d4d] hover:text-[#f38c6b]"
              onClick={() => setNotice('Radio is tuned to your curious side')}
              data-testid="button-tune-radio"
            >
              Tune in <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="mt-6 flex items-center justify-between text-[#7f859c]">
            <button onClick={() => setNotice('Help is on its way')} data-testid="button-help" aria-label="Help">
              <CircleHelp size={17} />
            </button>
            <button onClick={() => setNotice('Theme settings are coming with the next record')} data-testid="button-theme" aria-label="Theme">
              <Moon size={16} />
            </button>
            <span className="font-mono text-[9px] uppercase tracking-[0.13em]">v. 01 / 24</span>
          </div>
        </aside>

        {mobileOpen && (
          <button
            className="fixed inset-0 z-30 bg-[#252a40]/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            data-testid="button-mobile-backdrop"
            aria-label="Close navigation"
          />
        )}

        <main className="min-w-0 flex-1 pb-32">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#dfd9cf]/80 bg-[#f4f0e8]/90 px-5 backdrop-blur-md sm:px-8 lg:px-12">
            <div className="flex items-center gap-3">
              <button
                className="rounded-full p-2 text-[#252a40] hover:bg-[#e8e2d8] lg:hidden"
                onClick={() => setMobileOpen(true)}
                data-testid="button-open-mobile-nav"
                aria-label="Open navigation"
              >
                <Menu size={21} />
              </button>
              <div className="hidden items-center gap-2.5 text-xs text-[#898879] sm:flex">
                <Radio size={15} className="text-[#e56d4d]" />
                <span>Good evening, curious listener</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-4">
              <label className="group flex w-[170px] items-center gap-2 rounded-full border border-[#d9d3c9] bg-[#faf8f3] px-3 py-2 transition-colors focus-within:border-[#e56d4d] sm:w-[220px] lg:w-[270px]">
                <Search size={16} className="shrink-0 text-[#8d8b83] group-focus-within:text-[#e56d4d]" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search a feeling, artist..."
                  className="min-w-0 flex-1 bg-transparent text-xs text-[#252a40] outline-none placeholder:text-[#aaa79d]"
                  data-testid="input-search"
                />
                {query && (
                  <button onClick={() => setQuery('')} data-testid="button-clear-search" aria-label="Clear search">
                    <X size={14} className="text-[#8d8b83]" />
                  </button>
                )}
              </label>
              <button
                className="relative rounded-full p-2 text-[#6d6f76] transition-colors hover:bg-[#e8e2d8] hover:text-[#252a40]"
                onClick={() => setNotice('No new notes from the listening room')}
                data-testid="button-notifications"
                aria-label="Notifications"
              >
                <Bell size={18} strokeWidth={1.7} />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#e56d4d]" />
              </button>
              <button
                className="grid h-8 w-8 place-items-center rounded-full bg-[#d2a85d] font-serif text-sm italic text-[#252a40] transition-transform hover:scale-105"
                onClick={() => setNotice('Your profile is just for you')}
                data-testid="button-profile"
                aria-label="Open profile"
              >
                R
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1450px] px-5 sm:px-8 lg:px-12">
            <section id="discover" className="scroll-mt-24 pb-14 pt-10 sm:pt-14 lg:pb-20 lg:pt-16">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(340px,.82fr)] lg:items-end">
                <div className="reveal-up">
                  <div className="mb-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#e56d4d]">
                    <span className="h-px w-8 bg-[#e56d4d]" />
                    The evening edit / 04
                  </div>
                  <h1 className="max-w-[740px] font-serif text-[clamp(4.25rem,9vw,8.5rem)] leading-[.8] tracking-[-0.055em] text-[#252a40]">
                    Music for the
                    <br />
                    <em className="text-[#e56d4d]">in-between.</em>
                  </h1>
                  <p className="mt-9 max-w-[470px] text-[15px] leading-7 text-[#77766f]">
                    A handpicked corner for songs that stay with you. No endless scroll, no same five artists — just a considered place to find your next favorite.
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => chooseTrack(tracks[0])}
                      className="group flex items-center gap-3 rounded-full bg-[#e56d4d] px-5 py-3 text-sm font-semibold text-[#fff7eb] transition-all hover:bg-[#d95c3d] hover:shadow-[0_10px_22px_rgba(211,107,70,.2)]"
                      data-testid="button-start-listening"
                    >
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#fff7eb]/20">
                        <Play size={12} fill="currentColor" />
                      </span>
                      Start listening
                    </button>
                    <button
                      onClick={() => jumpTo('moods')}
                      className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-[#555762] transition-colors hover:bg-[#e8e2d8] hover:text-[#252a40]"
                      data-testid="button-browse-moods"
                    >
                      Browse by mood <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
                <div className="relative min-h-[260px] overflow-hidden rounded-[2rem] bg-[#303650] p-6 text-[#f6f1e8] sm:min-h-[300px] lg:min-h-[350px]">
                  <img src={tracks[0].cover} alt="Abstract record sleeve texture" className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-screen" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#252a40]/90 via-[#303650]/45 to-[#d36b46]/70" />
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[.18em] text-[#cbc3b4]">Featured release</span>
                      <span className="rounded-full border border-[#f6f1e8]/30 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.15em] text-[#e9dfd0]">01 / 04</span>
                    </div>
                    <div className="mt-20 sm:mt-24">
                      <p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#f3c0ab]">Mara Kline</p>
                      <h2 className="mt-1 font-serif text-5xl italic leading-none tracking-[-.04em] sm:text-6xl">Still Water</h2>
                      <div className="mt-5 flex items-center gap-4">
                        <button
                          className="grid h-11 w-11 place-items-center rounded-full bg-[#f6f1e8] text-[#252a40] transition-transform hover:scale-105"
                          onClick={() => chooseTrack(tracks[0])}
                          data-testid="button-play-featured"
                          aria-label="Play Still Water"
                        >
                          {playingId === tracks[0].id && isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
                        </button>
                        <div>
                          <p className="text-xs text-[#f6f1e8]/80">A room with no clock</p>
                          <p className="mt-1 font-mono text-[10px] text-[#f6f1e8]/55">4 tracks · 17 min</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-[#dfd9cf] py-12 sm:py-14" aria-labelledby="new-discoveries-heading">
              <div className="mb-7 flex items-end justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#e56d4d]">Picked this week</p>
                  <h2 id="new-discoveries-heading" className="mt-2 font-serif text-4xl tracking-[-.035em] text-[#252a40] sm:text-5xl">New discoveries</h2>
                </div>
                <button
                  className="hidden items-center gap-1 text-xs font-semibold text-[#77766f] transition-colors hover:text-[#e56d4d] sm:flex"
                  onClick={() => setNotice('You are all caught up — more curious finds tomorrow')}
                  data-testid="button-see-all-discoveries"
                >
                  See all <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
                {filteredTracks.slice(0, 4).map((track, index) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    index={index}
                    active={playingId === track.id && isPlaying}
                    liked={favorites.includes(track.id)}
                    onPlay={() => chooseTrack(track, true)}
                    onLike={() => toggleFavorite(track.id)}
                    onMore={() => setNotice(`${track.artist} saved to your listening notes`)}
                  />
                ))}
              </div>
              {filteredTracks.length === 0 && <EmptySearch query={query} onClear={() => { setQuery(''); setMood('All'); }} />}
            </section>

            <section id="moods" className="scroll-mt-24 border-t border-[#dfd9cf] py-12 sm:py-14" aria-labelledby="moods-heading">
              <div className="mb-7 flex items-end justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#e56d4d]">Follow the feeling</p>
                  <h2 id="moods-heading" className="mt-2 font-serif text-4xl tracking-[-.035em] text-[#252a40] sm:text-5xl">Where are you headed?</h2>
                </div>
                <SlidersHorizontal size={18} className="mb-2 text-[#97948c]" />
              </div>
              <div className="hide-scrollbar -mx-1 flex gap-3 overflow-x-auto pb-2">
                {['All', ...moodTiles.map((tile) => tile.label)].map((item) => (
                  <button
                    key={item}
                    onClick={() => setMood(item)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs transition-all ${mood === item ? 'border-[#252a40] bg-[#252a40] text-[#f6f1e8]' : 'border-[#d8d2c8] bg-[#faf8f3] text-[#77766f] hover:border-[#a5a19a] hover:text-[#252a40]'}`}
                    data-testid={`button-mood-filter-${item.toLowerCase().replaceAll(' ', '-')}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {moodTiles.map((tile) => (
                  <button
                    key={tile.label}
                    onClick={() => { setMood(tile.label); jumpTo('new-discoveries-heading'); }}
                    className="group relative h-[185px] overflow-hidden rounded-2xl text-left"
                    data-testid={`button-mood-${tile.label.toLowerCase().replaceAll(' ', '-')}`}
                  >
                    <img src={tile.image} alt="" className="absolute inset-0 h-full w-full object-cover grayscale-[.15] transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 opacity-90 transition-opacity group-hover:opacity-75" style={{ backgroundColor: tile.color, mixBlendMode: 'multiply' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#252a40]/75 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 text-[#f7f1e8]">
                      <p className="font-serif text-2xl italic">{tile.label}</p>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-[.15em] text-[#f7f1e8]/65">{tile.count}</p>
                    </div>
                    <span className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border border-[#f7f1e8]/35 text-[#f7f1e8] opacity-0 transition-opacity group-hover:opacity-100">
                      <ArrowUpRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section id="made-for-you" className="scroll-mt-24 border-t border-[#dfd9cf] py-12 sm:py-14" aria-labelledby="for-you-heading">
              <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#e56d4d]">A note from the curators</p>
                  <h2 id="for-you-heading" className="mt-3 max-w-[420px] font-serif text-5xl leading-[.9] tracking-[-.045em] text-[#252a40]">
                    For your <em className="text-[#e56d4d]">unhurried</em> side.
                  </h2>
                  <p className="mt-6 max-w-[360px] text-sm leading-6 text-[#77766f]">
                    The records we return to when the day has finally gone quiet. A soft landing, assembled by people who listen past the first chorus.
                  </p>
                  <button
                    className="mt-7 flex items-center gap-2 text-sm font-semibold text-[#252a40] underline decoration-[#e56d4d] decoration-2 underline-offset-4 transition-colors hover:text-[#e56d4d]"
                    onClick={() => chooseTrack(tracks[1], true)}
                    data-testid="button-play-curated-set"
                  >
                    Play the whole set <Play size={14} fill="currentColor" />
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#ded8cd] bg-[#faf8f3]">
                  {tracks.slice(0, 4).map((track, index) => (
                    <button
                      key={track.id}
                      className={`group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-[#f0ebe3] ${index !== 3 ? 'border-b border-[#e4ded4]' : ''}`}
                      onClick={() => chooseTrack(track, true)}
                      data-testid={`button-curated-track-${track.id}`}
                    >
                      <span className="w-5 font-mono text-[10px] text-[#aaa69d]">{String(index + 1).padStart(2, '0')}</span>
                      <img src={track.cover} alt="" className="h-11 w-11 rounded-lg object-cover saturate-[.8]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#303349]">{track.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-[#89877e]">{track.artist}</span>
                      </span>
                      <span className="font-mono text-[10px] text-[#aaa69d]">{track.duration}</span>
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ebe5db] text-[#252a40] opacity-0 transition-opacity group-hover:opacity-100">
                        {playingId === track.id && isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section id="library" className="scroll-mt-24 border-t border-[#dfd9cf] py-12 sm:py-14" aria-labelledby="artists-heading">
              <div className="mb-8 flex items-end justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[#e56d4d]">Worth a closer look</p>
                  <h2 id="artists-heading" className="mt-2 font-serif text-4xl tracking-[-.035em] text-[#252a40] sm:text-5xl">Artists to keep close</h2>
                </div>
                <button
                  className="flex items-center gap-1 text-xs font-semibold text-[#77766f] transition-colors hover:text-[#e56d4d]"
                  onClick={() => setNotice('A new artist index is being printed')}
                  data-testid="button-artist-index"
                >
                  Artist index <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4">
                {artists.map((artist, index) => (
                  <button
                    key={artist.name}
                    className="group text-left"
                    onClick={() => { chooseTrack(tracks[index + 1], true); setNotice(`${artist.name} is now in your queue`); }}
                    data-testid={`button-artist-${artist.name.toLowerCase().replaceAll(' ', '-')}`}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-full bg-[#ddd5c8]">
                      <img src={artist.image} alt="" className="h-full w-full object-cover saturate-[.65] transition duration-500 group-hover:scale-110 group-hover:saturate-100" />
                      <div className="absolute inset-0 rounded-full border-[6px] border-[#f4f0e8]/25" />
                      <span className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-[#f6f1e8] text-[#252a40] opacity-0 shadow-sm transition-all group-hover:opacity-100">
                        <Play size={13} fill="currentColor" />
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-[#303349]">{artist.name}</p>
                    <p className="mt-1 text-xs text-[#89877e]">{artist.detail}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <footer className="mt-4 border-t border-[#dfd9cf] px-5 py-10 sm:px-8 lg:px-12">
            <div className="mx-auto flex max-w-[1450px] flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e56d4d] text-[#252a40]"><Music2 size={14} /></span>
                <span className="font-serif text-xl italic">besura</span>
                <span className="ml-2 text-xs text-[#98948a]">For the beautifully curious.</span>
              </div>
              <div className="flex items-center gap-4 text-[#929087]">
                <button onClick={() => setNotice('Share a little Besura with a friend')} data-testid="button-share" aria-label="Share"><Send size={15} /></button>
                <button onClick={() => setNotice('Besura on Instagram')} data-testid="button-instagram" aria-label="Instagram"><Instagram size={15} /></button>
                <button onClick={() => setNotice('Besura on Twitter')} data-testid="button-twitter" aria-label="Twitter"><Twitter size={15} /></button>
                <span className="ml-2 font-mono text-[9px] uppercase tracking-[.14em]">Made slowly / 2024</span>
              </div>
            </div>
          </footer>
        </main>

        <aside className={`fixed bottom-0 right-0 z-30 w-full border-t border-[#d7d0c5] bg-[#faf8f3] shadow-[0_-10px_35px_rgba(56,50,42,.08)] transition-transform duration-300 lg:bottom-0 lg:top-0 lg:w-[300px] lg:border-l lg:border-t-0 lg:translate-x-0 ${showQueue ? 'translate-y-0 lg:translate-x-0' : 'translate-y-[calc(100%-70px)] lg:translate-x-full'}`}>
          <div className="flex h-[70px] items-center justify-between border-b border-[#e4ded4] px-5 lg:h-[76px]">
            <button className="flex items-center gap-2.5" onClick={() => setShowQueue((value) => !value)} data-testid="button-toggle-queue">
              <ListMusic size={17} className="text-[#e56d4d]" />
              <span className="text-sm font-semibold text-[#303349]">Up next</span>
              <span className="rounded-full bg-[#eee8de] px-2 py-0.5 font-mono text-[10px] text-[#89877e]">{queue.length}</span>
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => { setQueue([]); setNotice('Queue cleared'); }} className="text-xs text-[#9a968c] hover:text-[#e56d4d]" data-testid="button-clear-queue">Clear</button>
              <button onClick={() => setShowQueue((value) => !value)} className="rounded-full p-1.5 text-[#8f8b82] hover:bg-[#eee8de] lg:hidden" data-testid="button-collapse-queue" aria-label="Collapse queue"><ChevronRight size={17} className={showQueue ? 'rotate-90' : '-rotate-90'} /></button>
            </div>
          </div>
          <div className="max-h-[210px] overflow-y-auto px-3 py-3 lg:max-h-[calc(100vh-250px)]">
            {queue.length === 0 ? (
              <div className="grid min-h-[180px] place-items-center px-8 text-center">
                <div>
                  <Headphones size={24} className="mx-auto text-[#d1c8ba]" />
                  <p className="mt-3 font-serif text-xl italic text-[#5c5b62]">Your queue is quiet.</p>
                  <p className="mt-1 text-xs leading-5 text-[#9a968c]">Press play on any record to bring it back to life.</p>
                </div>
              </div>
            ) : queue.map((track, index) => (
              <div key={`${track.id}-${index}`} className={`group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[#f0ebe3] ${playingId === track.id ? 'bg-[#f0ebe3]' : ''}`}>
                <button className="relative shrink-0" onClick={() => chooseTrack(track)} data-testid={`button-queue-play-${track.id}`} aria-label={`Play ${track.title}`}>
                  <img src={track.cover} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  {playingId === track.id && isPlaying && <span className="absolute inset-0 grid place-items-center rounded-lg bg-[#252a40]/55 text-[#f6f1e8]"><span className="flex h-3.5 items-end gap-0.5"><i className="equalizer-bar h-2 w-0.5 bg-[#f6f1e8]" /><i className="equalizer-bar h-3 w-0.5 bg-[#f6f1e8]" /><i className="equalizer-bar h-2.5 w-0.5 bg-[#f6f1e8]" /></span></span>}
                </button>
                <button className="min-w-0 flex-1 text-left" onClick={() => chooseTrack(track)} data-testid={`button-queue-track-${track.id}`}>
                  <span className={`block truncate text-xs font-semibold ${playingId === track.id ? 'text-[#e56d4d]' : 'text-[#3c3d50]'}`}>{track.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-[#99958b]">{track.artist}</span>
                </button>
                <span className="font-mono text-[9px] text-[#aaa59a]">{track.duration}</span>
                <button className="rounded-full p-1 text-[#aaa59a] opacity-0 transition-opacity hover:text-[#e56d4d] group-hover:opacity-100" onClick={() => removeFromQueue(track.id)} data-testid={`button-remove-queue-${track.id}`} aria-label={`Remove ${track.title} from queue`}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 hidden border-t border-[#e4ded4] bg-[#f5f0e7] p-4 lg:block">
            <p className="font-mono text-[9px] uppercase tracking-[.17em] text-[#aaa59a]">Queue mood</p>
            <div className="mt-3 flex gap-1.5">
              {['Warm', 'Open', 'Still'].map((label, index) => <button key={label} onClick={() => setNotice(`${label} queue selected`)} className={`rounded-full px-2.5 py-1 text-[10px] ${index === 0 ? 'bg-[#e56d4d] text-[#fff7eb]' : 'bg-[#e7e0d5] text-[#858177]'}`} data-testid={`button-queue-mood-${label.toLowerCase()}`}>{label}</button>)}
            </div>
          </div>
        </aside>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#3a3f56] bg-[#252a40] px-4 py-3 text-[#f6f1e8] shadow-[0_-8px_30px_rgba(37,42,64,.18)] sm:px-8 lg:left-[248px] lg:right-[300px] lg:px-6">
          <div className="mx-auto flex max-w-[1200px] items-center gap-3 sm:gap-5">
            <img src={activeTrack.cover} alt="" className="h-11 w-11 rounded-lg object-cover sm:h-12 sm:w-12" />
            <div className="hidden min-w-0 w-[180px] sm:block">
              <p className="truncate text-xs font-semibold">{activeTrack.title}</p>
              <p className="mt-1 truncate text-[11px] text-[#a9adbd]">{activeTrack.artist}</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={previousTrack} className="hidden text-[#a9adbd] transition-colors hover:text-[#f6f1e8] sm:block" data-testid="button-previous-track" aria-label="Previous track"><SkipBack size={16} fill="currentColor" /></button>
              <button onClick={() => setIsPlaying((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full bg-[#f6f1e8] text-[#252a40] transition-transform hover:scale-105" data-testid="button-toggle-play" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              </button>
              <button onClick={nextTrack} className="text-[#a9adbd] transition-colors hover:text-[#f6f1e8]" data-testid="button-next-track" aria-label="Next track"><SkipForward size={16} fill="currentColor" /></button>
            </div>
            <div className="hidden flex-1 items-center gap-3 md:flex">
              <span className="font-mono text-[9px] text-[#898fa7]">1:42</span>
              <div className="h-1 flex-1 rounded-full bg-[#4a4f66]"><div className="h-full w-[38%] rounded-full bg-[#e56d4d]" /></div>
              <span className="font-mono text-[9px] text-[#898fa7]">{activeTrack.duration}</span>
            </div>
            <div className="ml-auto flex items-center gap-3 text-[#a9adbd]">
              <button onClick={() => setNotice('Shuffle is on for this session')} className="hidden hover:text-[#f6f1e8] sm:block" data-testid="button-shuffle" aria-label="Shuffle"><Shuffle size={16} /></button>
              <button onClick={() => setNotice('Repeat is on for this session')} className="hidden hover:text-[#f6f1e8] sm:block" data-testid="button-repeat" aria-label="Repeat"><Repeat2 size={16} /></button>
              <button onClick={() => toggleFavorite(activeTrack.id)} className={`transition-colors ${favorites.includes(activeTrack.id) ? 'text-[#e56d4d]' : 'hover:text-[#f6f1e8]'}`} data-testid="button-player-favorite" aria-label="Favorite current track"><Heart size={17} fill={favorites.includes(activeTrack.id) ? 'currentColor' : 'none'} /></button>
              <button onClick={() => setShowMore((value) => !value)} className="hidden hover:text-[#f6f1e8] sm:block" data-testid="button-player-more" aria-label="More player options"><MoreHorizontal size={18} /></button>
              <Volume2 size={17} className="hidden sm:block" />
            </div>
          </div>
          {showMore && <div className="absolute bottom-[68px] right-5 rounded-xl border border-[#444960] bg-[#303650] p-2 text-xs shadow-xl sm:right-8"><button onClick={() => { chooseTrack(activeTrack, true); setShowMore(false); }} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-[#3b4059]" data-testid="button-add-current-to-queue"><Plus size={14} /> Add to queue</button><button onClick={() => { setNotice('Link copied to your notes'); setShowMore(false); }} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-[#3b4059]" data-testid="button-copy-track-link"><Send size={14} /> Copy track link</button></div>}
        </div>

        {toast && <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#252a40] px-4 py-2.5 text-xs text-[#f6f1e8] shadow-xl"><Check size={14} className="text-[#e56d4d]" /> {toast}</div>}
      </div>
    </div>
  );
}

function TrackCard({
  track,
  index,
  active,
  liked,
  onPlay,
  onLike,
  onMore,
}: {
  track: Track;
  index: number;
  active: boolean;
  liked: boolean;
  onPlay: () => void;
  onLike: () => void;
  onMore: () => void;
}) {
  return (
    <article className="group reveal-up" style={{ animationDelay: `${index * 70}ms` }} data-testid={`card-track-${track.id}`}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#dfd7cb]">
        <img src={track.cover} alt={`${track.title} by ${track.artist}`} className="h-full w-full object-cover saturate-[.72] transition duration-500 group-hover:scale-105 group-hover:saturate-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#252a40]/60 via-transparent to-transparent opacity-80" />
        <div className="absolute left-3 top-3 rounded-full bg-[#f6f1e8]/85 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.12em] text-[#555762]">{track.mood}</div>
        <button
          onClick={onPlay}
          className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-[#f6f1e8] text-[#252a40] opacity-0 shadow-md transition-all duration-300 hover:scale-105 group-hover:opacity-100"
          data-testid={`button-play-track-${track.id}`}
          aria-label={`Play ${track.title}`}
        >
          {active ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
        </button>
        <button
          onClick={onLike}
          className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#f6f1e8]/85 transition-all hover:scale-105 ${liked ? 'text-[#e56d4d]' : 'text-[#77766f] opacity-0 group-hover:opacity-100'}`}
          data-testid={`button-favorite-track-${track.id}`}
          aria-label={liked ? `Remove ${track.title} from favorites` : `Favorite ${track.title}`}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <button onClick={onPlay} className="min-w-0 text-left" data-testid={`button-select-track-${track.id}`}>
          <p className="truncate text-sm font-semibold text-[#303349] transition-colors group-hover:text-[#e56d4d]">{track.title}</p>
          <p className="mt-1 truncate text-xs text-[#89877e]">{track.artist}</p>
        </button>
        <button onClick={onMore} className="shrink-0 rounded-full p-1 text-[#aaa69d] hover:bg-[#e8e2d8] hover:text-[#252a40]" data-testid={`button-more-track-${track.id}`} aria-label={`More options for ${track.title}`}><MoreHorizontal size={16} /></button>
      </div>
    </article>
  );
}

function EmptySearch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-[#cfc7ba] bg-[#f9f6f0] px-6 py-12 text-center" data-testid="empty-search-state">
      <Search size={25} className="mx-auto text-[#d1a18e]" />
      <h3 className="mt-4 font-serif text-2xl italic text-[#4a4b58]">Nothing quite like “{query}”.</h3>
      <p className="mt-2 text-sm text-[#929087]">Try a feeling, a first name, or leave the search open.</p>
      <button onClick={onClear} className="mt-5 rounded-full bg-[#252a40] px-4 py-2 text-xs font-semibold text-[#f6f1e8] hover:bg-[#303650]" data-testid="button-clear-empty-search">Clear search</button>
    </div>
  );
}

export default App;