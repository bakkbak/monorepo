import type { FeedPost } from './api';

export type Post = {
  id: string;
  community: string;
  content: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  reposts: number;
};

export function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function feedPostToPost(fp: FeedPost): Post {
  const ago = getTimeAgo(fp.created_at);

  let community: string;
  if (fp.herd_id) {
    community = HERD_ID_DISPLAY[fp.herd_id] ?? fp.herd_id;
  } else if (fp.herd_type === 'university') {
    community = 'University';
  } else {
    community = fp.herd_type ?? 'Unknown';
  }

  return {
    id: fp.id,
    community,
    content: fp.content,
    timestamp: ago,
    upvotes: fp.upvotes ?? 0,
    downvotes: fp.downvotes ?? 0,
    comments: fp.comment_count ?? 0,
    reposts: 0,
  };
}

// Feed tab → backend query params (For you is a curated view, not a community)
export const FEED_HERD_MAP: Record<string, { herd_type?: string; herd_id?: string }> = {
  'For you': { herd_type: 'local' },
  'University': { herd_type: 'university' },
  'IPL': { herd_type: 'local', herd_id: 'ipl' },
  'Bollywood': { herd_type: 'local', herd_id: 'bollywood' },
};

// Community → backend params for post creation (no "For you" — posts must go in a community)
export const COMMUNITY_HERD_MAP: Record<string, { herd_type: string; herd_id?: string }> = {
  'University': { herd_type: 'university' },
  'IPL': { herd_type: 'local', herd_id: 'ipl' },
  'Bollywood': { herd_type: 'local', herd_id: 'bollywood' },
};

// Backend herd_id → display name
const HERD_ID_DISPLAY: Record<string, string> = {
  'ipl': 'IPL',
  'bollywood': 'Bollywood',
};

export const communityEmojis: Record<string, string> = {
  'IPL': '🏏',
  'University': '🏛️',
  'Bollywood': '🎬',
  'Pokemon': '⚡',
};
