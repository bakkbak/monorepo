import { resolveImageUrl, type FeedPost } from './api';

export type Post = {
  id: string;
  community: string;
  content: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  reposts: number;
  image_url?: string | null;
};

// Master registry of all herds — single source of truth
export type HerdInfo = {
  displayName: string;
  emoji: string;
  herdId: string; // backend herd_id
  logo?: string;
  isUniversityHerd?: boolean;
};

export const HERD_REGISTRY: Record<string, HerdInfo> = {
  'ipl':                { displayName: 'IPL',                emoji: '🏏', herdId: 'ipl' },
  'nba':                { displayName: 'NBA',                emoji: '🏀', herdId: 'nba' },
  'premier-league':     { displayName: 'Premier League',     emoji: '⚽', herdId: 'premier-league' },
  'gaming':             { displayName: 'Gaming',             emoji: '🎮', herdId: 'gaming' },
  'music':              { displayName: 'Music',              emoji: '🎵', herdId: 'music' },
  'movies':             { displayName: 'Movies',             emoji: '🎬', herdId: 'movies' },
  'confessions':        { displayName: 'Confessions',        emoji: '🤫', herdId: 'confessions' },
  'relationship-advice':{ displayName: 'Relationship Advice',emoji: '💕', herdId: 'relationship-advice' },
  'meme-central':       { displayName: 'Meme Central',       emoji: '😂', herdId: 'meme-central' },
  'hot-takes':          { displayName: 'Hot Takes',          emoji: '🔥', herdId: 'hot-takes' },
  'study-hacks':        { displayName: 'Study Hacks',        emoji: '📚', herdId: 'study-hacks' },
  'computer-science':   { displayName: 'Computer Science',   emoji: '💻', herdId: 'computer-science' },
  'business-street':    { displayName: 'Business Street',    emoji: '💰', herdId: 'business-street' },
  'rvu':                { displayName: 'RVU',                emoji: '🎓', herdId: 'rvu', logo: '/herds/rvu.svg', isUniversityHerd: true },
  'opj':                { displayName: 'OPJ',                emoji: '🏫', herdId: 'opj', logo: '/herds/opj.svg', isUniversityHerd: true },
};

// No hardcoded default herds — users get circles from onboarding choices
export const DEFAULT_HERD_IDS: string[] = [];

// All herds flagged as university/school herds (used by Trending page)
export function getUniversityHerdIds(): string[] {
  return Object.values(HERD_REGISTRY).filter((h) => h.isUniversityHerd).map((h) => h.herdId);
}

// Convert herd_id to display name
export function herdIdToDisplayName(herdId: string): string {
  return HERD_REGISTRY[herdId]?.displayName ?? herdId;
}

// Build feed options from joined herd IDs
export function buildFeedOptions(joinedHerdIds: string[]): string[] {
  const tabs = ['For you'];
  for (const hid of joinedHerdIds) {
    if (hid === 'university') continue;
    const info = HERD_REGISTRY[hid];
    if (info) tabs.push(info.displayName);
  }
  return tabs;
}

export function isUniversityFeed(displayName: string): boolean {
  const entry = Object.values(HERD_REGISTRY).find((h) => h.displayName === displayName);
  return entry?.isUniversityHerd ?? false;
}

// Build community list for post composer from joined herd IDs
// University is excluded unless the device is verified
export function buildCommunities(joinedHerdIds: string[], isUniversityVerified = false): string[] {
  return joinedHerdIds
    .filter((hid) => !HERD_REGISTRY[hid]?.isUniversityHerd || isUniversityVerified)
    .map((hid) => {
      const info = HERD_REGISTRY[hid];
      return info ? info.displayName : hid;
    });
}

// Get feed query params for a display name
export function getFeedParams(displayName: string): { herd_type: string; herd_id?: string } {
  if (displayName === 'For you') return { herd_type: 'local' };
  if (displayName === 'University') return { herd_type: 'university' };
  const entry = Object.values(HERD_REGISTRY).find((h) => h.displayName === displayName);
  if (entry) return { herd_type: 'global', herd_id: entry.herdId };
  return { herd_type: 'local' };
}

// Get post creation params for a community display name
export function getPostParams(displayName: string): { herd_type: string; herd_id?: string } {
  if (displayName === 'University') return { herd_type: 'university' };
  const entry = Object.values(HERD_REGISTRY).find((h) => h.displayName === displayName);
  if (entry) return { herd_type: 'global', herd_id: entry.herdId };
  return { herd_type: 'local' };
}

// Build emoji map from joined herd IDs (plus always include defaults)
export function buildCommunityEmojis(joinedHerdIds: string[]): Record<string, string> {
  const emojis: Record<string, string> = {};
  for (const [, info] of Object.entries(HERD_REGISTRY)) {
    emojis[info.displayName] = info.emoji;
  }
  return emojis;
}

// Get logo path for a community display name (if it has one)
export function getCommunityLogo(displayName: string): string | undefined {
  const entry = Object.values(HERD_REGISTRY).find((h) => h.displayName === displayName);
  return entry?.logo;
}

// Legacy exports — still used by components that import these directly
export const communityEmojis: Record<string, string> = buildCommunityEmojis([]);

// Legacy static maps — kept for backward compat but prefer the dynamic functions
export const FEED_HERD_MAP: Record<string, { herd_type?: string; herd_id?: string }> = {
  'For you': { herd_type: 'local' },
};

export const COMMUNITY_HERD_MAP: Record<string, { herd_type: string; herd_id?: string }> = {};

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
    community = herdIdToDisplayName(fp.herd_id);
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
    reposts: fp.repost_count ?? 0,
    image_url: resolveImageUrl(fp.image_url),
  };
}
