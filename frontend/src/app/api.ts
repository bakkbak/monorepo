const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// --- Devices ---

export async function registerDevice(fingerprint: string) {
  const params = new URLSearchParams({ device_fingerprint: fingerprint });
  return request<{ device_id: string; banned: boolean }>(
    `/devices/register?${params}`,
    { method: 'POST' },
  );
}

// --- Posts ---

export type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  score: number;
  upvotes?: number;
  downvotes?: number;
  herd_type?: string;
  herd_id?: string;
  comment_count?: number;
  repost_count?: number;
};

export async function getFeed(params: {
  device_id: string;
  lat: number;
  lng: number;
  herd_type?: string;
  herd_id?: string;
}) {
  const qs = new URLSearchParams({
    device_id: params.device_id,
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.herd_type) qs.set('herd_type', params.herd_type);
  if (params.herd_id) qs.set('herd_id', params.herd_id);
  return request<FeedPost[]>(`/posts/feed?${qs}`);
}

export async function createPost(params: {
  device_id: string;
  content: string;
  lat: number;
  lng: number;
  herd_type?: string;
  herd_id?: string;
}) {
  const qs = new URLSearchParams({
    device_id: params.device_id,
    content: params.content,
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.herd_type) qs.set('herd_type', params.herd_type);
  if (params.herd_id) qs.set('herd_id', params.herd_id);
  return request<{ status: string }>(`/posts/?${qs}`, { method: 'POST' });
}

export async function votePost(params: {
  post_id: string;
  device_id: string;
  vote: 1 | -1;
}) {
  const qs = new URLSearchParams({
    post_id: params.post_id,
    device_id: params.device_id,
    vote: String(params.vote),
  });
  return request<{ status: string }>(`/posts/vote?${qs}`, { method: 'POST' });
}

export async function getMyPosts(device_id: string) {
  const qs = new URLSearchParams({ device_id });
  return request<FeedPost[]>(`/posts/my-posts?${qs}`);
}

// --- Comments ---

export type ApiComment = {
  id: string;
  post_id: string;
  device_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
};

export async function getComments(post_id: string) {
  const qs = new URLSearchParams({ post_id });
  return request<ApiComment[]>(`/comments/?${qs}`);
}

export async function createComment(params: {
  post_id: string;
  device_id: string;
  content: string;
  parent_comment_id?: string;
}) {
  const qs = new URLSearchParams({
    post_id: params.post_id,
    device_id: params.device_id,
    content: params.content,
  });
  if (params.parent_comment_id) qs.set('parent_comment_id', params.parent_comment_id);
  return request<{ status: string; comment_id: string }>(`/comments/?${qs}`, { method: 'POST' });
}

export async function voteComment(params: {
  comment_id: string;
  device_id: string;
  vote: 1 | -1;
}) {
  const qs = new URLSearchParams({
    comment_id: params.comment_id,
    device_id: params.device_id,
    vote: String(params.vote),
  });
  return request<{ status: string }>(`/comments/vote?${qs}`, { method: 'POST' });
}

export type MyComment = {
  id: string;
  post_id: string;
  comment_content: string;
  comment_created_at: string;
  comment_upvotes: number;
  comment_downvotes: number;
  post_content: string;
  post_herd_type: string;
  post_herd_id: string | null;
  post_created_at: string;
  post_upvotes: number;
  post_downvotes: number;
  post_comment_count: number;
};

export async function getMyComments(device_id: string) {
  const qs = new URLSearchParams({ device_id });
  return request<MyComment[]>(`/comments/my-comments?${qs}`);
}

// --- Reposts ---

export async function repostPost(params: { post_id: string; device_id: string }) {
  const qs = new URLSearchParams({ post_id: params.post_id, device_id: params.device_id });
  return request<{ status: string }>(`/posts/repost?${qs}`, { method: 'POST' });
}

export async function unrepostPost(params: { post_id: string; device_id: string }) {
  const qs = new URLSearchParams({ post_id: params.post_id, device_id: params.device_id });
  return request<{ status: string }>(`/posts/repost?${qs}`, { method: 'DELETE' });
}

export async function getMyReposts(device_id: string) {
  const qs = new URLSearchParams({ device_id });
  return request<FeedPost[]>(`/posts/reposts?${qs}`);
}

// --- Herds ---

export async function joinHerd(params: { device_id: string; herd_id: string }) {
  const qs = new URLSearchParams({ device_id: params.device_id, herd_id: params.herd_id });
  return request<{ status: string }>(`/herds/join?${qs}`, { method: 'POST' });
}

export async function leaveHerd(params: { device_id: string; herd_id: string }) {
  const qs = new URLSearchParams({ device_id: params.device_id, herd_id: params.herd_id });
  return request<{ status: string }>(`/herds/leave?${qs}`, { method: 'POST' });
}

export async function getJoinedHerds(device_id: string) {
  const qs = new URLSearchParams({ device_id });
  return request<string[]>(`/herds/joined?${qs}`);
}

// --- Reports ---

export async function reportPost(params: {
  post_id: string;
  device_id: string;
  reason: string;
}) {
  const qs = new URLSearchParams({
    post_id: params.post_id,
    device_id: params.device_id,
    reason: params.reason,
  });
  return request<{ status: string }>(`/posts/report?${qs}`, { method: 'POST' });
}
