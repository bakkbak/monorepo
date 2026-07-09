import { useState, useEffect, useCallback } from 'react';
import { PostFeed } from './PostFeed';
import { getTrendingFeed } from '../api';
import { feedPostToPost, type Post } from '../utils';

type TrendingPageProps = {
  deviceId: string | null;
  onPostClick: (post: Post) => void;
  onRepost: (post: Post) => void;
  isReposted: (postId: string) => boolean;
};

export function TrendingPage({ deviceId, onPostClick, onRepost, isReposted }: TrendingPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrending = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTrendingFeed(deviceId);
      setPosts(data.map(feedPostToPost));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    if (!deviceId) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadTrending();
    }, 30_000);
    return () => clearInterval(interval);
  }, [deviceId, loadTrending]);

  return (
    <div>
      <div className="bg-yellow-400 border-b-2 border-black sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-black">Trending</h1>
        </div>
      </div>
      <PostFeed
        posts={posts}
        loading={loading}
        error={error}
        deviceId={deviceId}
        onPostClick={onPostClick}
        onRetry={loadTrending}
        onRepost={onRepost}
        isReposted={isReposted}
      />
    </div>
  );
}
