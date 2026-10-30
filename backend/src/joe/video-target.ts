import type { PlayableVideo } from '../../../shared/video-playback';

// Video IDs are YouTube protocol identifiers, not application-generated IDs.
export function videoFromLink(input: string): PlayableVideo | undefined {
  const links = input.match(/https?:\/\/[^\s<>"“”]+/g) ?? [];
  const ids = new Set<string>();
  for (const link of links) {
    let url: URL;
    try { url = new URL(link.replace(/[。，、！!？?）)\]】]+$/, '')); } catch { continue; }
    const host = url.hostname.toLowerCase();
    let id: string | null | undefined;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(shorts|embed|live)\/([^/]+)\/?$/.exec(url.pathname)?.[2];
    }
    if (id && /^[\w-]{11}$/.test(id)) ids.add(id);
  }
  if (ids.size !== 1) return;
  const id = [...ids][0];
  return { id, title: `YouTube · ${id}`, channel: '', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
}

export function uniqueTitleMatch(query: string, videos: PlayableVideo[]) {
  const normalize = (text: string) => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const matches = [...new Map(videos.filter(video => normalize(video.title) === normalize(query)).map(video => [video.id, video])).values()];
  return matches.length === 1 ? matches[0] : undefined;
}
