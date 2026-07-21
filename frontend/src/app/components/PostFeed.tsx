import { MessageCircle, Share2, ArrowUp, ArrowDown, Repeat2, RefreshCw, MoreHorizontal, Flag, X } from 'lucide-react';
import { useState, useRef, useEffect, memo } from 'react';
import type { Post } from '../utils';
import { communityEmojis, getCommunityLogo } from '../utils';
import { votePost, reportPost } from '../api';

const REPORT_REASONS = ['Spam', 'Harassment', 'Hate speech', 'Inappropriate content', 'Other'];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function PostCardInner({ post, deviceId, onClick, onRepost, isReposted }: { post: Post; deviceId: string | null; onClick: () => void; onRepost?: (post: Post) => void; isReposted?: (postId: string) => boolean }) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const reposted = isReposted?.(post.id) ?? false;
  const [bouncing, setBouncing] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);
  const { ref, visible } = useScrollReveal();

  const handleReport = async (reason: string) => {
    if (!deviceId) return;
    try {
      await reportPost({ post_id: post.id, device_id: deviceId, reason });
      setReported(true);
    } catch {}
    setShowReport(false);
  };

  const voteCount =
    post.upvotes - post.downvotes + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);

  const handleBounce = (key: string) => {
    setBouncing(key);
    setTimeout(() => setBouncing(null), 250);
  };

  const handleVote = async (direction: 'up' | 'down') => {
    const newVote = vote === direction ? null : direction;
    setVote(newVote);
    handleBounce(direction);

    if (deviceId && newVote) {
      try {
        await votePost({
          post_id: post.id,
          device_id: deviceId,
          vote: newVote === 'up' ? 1 : -1,
        });
      } catch {
        setVote(vote);
      }
    }
  };

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-white dark:bg-[#1a1a1a] rounded-lg shadow-sm border-2 border-black dark:border-white mx-3">
        <div className="cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <div className="w-12 h-12 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
              {getCommunityLogo(post.community) ? (
                <img src={getCommunityLogo(post.community)} alt={post.community} className="w-full h-full object-cover" />
              ) : (
                communityEmojis[post.community] || '🛠️'
              )}
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 dark:text-white">{post.community}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{post.timestamp}</div>
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReport(!showReport);
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              {showReport && (
                <div className="absolute right-0 top-10 bg-white dark:bg-gray-900 border-2 border-black dark:border-white rounded-xl shadow-lg z-20 w-56 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Report post</span>
                    <button onClick={(e) => { e.stopPropagation(); setShowReport(false); }} className="p-1 rounded-full hover:bg-gray-100">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={(e) => { e.stopPropagation(); handleReport(reason); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 flex items-center gap-2 transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {reported && (
            <div className="mx-4 mb-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
              Thanks for reporting. We'll review this post.
            </div>
          )}
          <div className="px-4 pb-3">
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{post.content}</p>
            {post.image_url && (
              // Reserve space with a fixed aspect ratio so the image doesn't
              // shift layout (CLS) when it finishes loading.
              <div className="mt-3 w-full aspect-[4/3] max-h-80 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={post.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 px-4 py-3 border-t-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote('up')}
              className={`p-1.5 rounded transition-colors ${
                vote === 'up' ? 'bg-yellow-400 text-black' : 'text-gray-600 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
              } ${bouncing === 'up' ? 'animate-snap-bounce' : ''}`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold min-w-[32px] text-center">{voteCount}</span>
            <button
              onClick={() => handleVote('down')}
              className={`p-1.5 rounded transition-colors ${
                vote === 'down' ? 'bg-black text-yellow-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              } ${bouncing === 'down' ? 'animate-snap-bounce' : ''}`}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={onClick}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{post.comments}</span>
          </button>

          <button
            onClick={() => {
              onRepost?.(post);
              handleBounce('repost');
            }}
            className={`flex items-center gap-2 transition-colors ${
              reposted ? 'text-yellow-600' : 'text-gray-600 hover:text-yellow-600'
            } ${bouncing === 'repost' ? 'animate-snap-bounce' : ''}`}
          >
            <Repeat2 className="w-5 h-5" />
            <span className="text-sm font-medium">{post.reposts + (reposted ? 1 : 0)}</span>
          </button>

          <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors ml-auto mr-2">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// The 30s feed poll rebuilds the Post[] array (new object refs) even when
// nothing changed, so reference-equality memo won't help. Compare the fields
// that actually affect the rendered card; skip the re-render when they match.
const PostCard = memo(PostCardInner, (prev, next) =>
  prev.deviceId === next.deviceId &&
  prev.post.id === next.post.id &&
  prev.post.content === next.post.content &&
  prev.post.timestamp === next.post.timestamp &&
  prev.post.upvotes === next.post.upvotes &&
  prev.post.downvotes === next.post.downvotes &&
  prev.post.comments === next.post.comments &&
  prev.post.reposts === next.post.reposts &&
  prev.post.image_url === next.post.image_url &&
  (prev.isReposted?.(prev.post.id) ?? false) === (next.isReposted?.(next.post.id) ?? false),
);

interface PostFeedProps {
  posts: Post[];
  loading: boolean;
  error: string | null;
  deviceId: string | null;
  onPostClick?: (post: Post) => void;
  onRetry?: () => void;
  onRepost?: (post: Post) => void;
  isReposted?: (postId: string) => boolean;
}

function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-lg border-2 border-black dark:border-white mx-3 animate-pulse">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
      <div className="px-4 pb-4 space-y-2">
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-800 rounded" />
        <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
      <div className="h-11 border-t-2 border-gray-200 dark:border-gray-700" />
    </div>
  );
}

export function PostFeed({ posts, loading, error, deviceId, onPostClick, onRetry, onRepost, isReposted }: PostFeedProps) {
  if (loading && posts.length === 0) {
    return (
      <div className="space-y-3 pt-3">
        {[0, 1, 2, 3].map((i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-black font-medium rounded-full border-2 border-black active:scale-95 transition-transform"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <p className="text-gray-500 text-lg">No posts yet</p>
        <p className="text-gray-400 text-sm mt-1">Be the first to post something!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} deviceId={deviceId} onClick={() => onPostClick?.(post)} onRepost={onRepost} isReposted={isReposted} />
      ))}
    </div>
  );
}
