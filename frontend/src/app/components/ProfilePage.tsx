import { Settings, ArrowUp, ArrowDown, MessageCircle, Repeat2, Share2, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getMyPosts, getMyComments, votePost } from '../api';
import type { MyComment } from '../api';
import { feedPostToPost, getTimeAgo, communityEmojis } from '../utils';
import type { Post } from '../utils';

type TabType = 'posts' | 'comments' | 'saved';

interface ProfilePageProps {
  deviceId: string | null;
  onPostClick?: (post: Post) => void;
  repostedPosts?: Post[];
  onRepost?: (post: Post) => void;
  isReposted?: (postId: string) => boolean;
}

export function ProfilePage({ deviceId, onPostClick, repostedPosts = [], onRepost, isReposted }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myComments, setMyComments] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postVotes, setPostVotes] = useState<Record<string, 'up' | 'down' | null>>({});

  useEffect(() => {
    if (!deviceId) return;
    setLoading(true);
    getMyPosts(deviceId)
      .then((data) => setMyPosts(data.map(feedPostToPost)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId || activeTab !== 'comments') return;
    setCommentsLoading(true);
    getMyComments(deviceId)
      .then((data) => setMyComments(data))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [deviceId, activeTab]);

  const HERD_ID_DISPLAY: Record<string, string> = {
    ipl: 'IPL',
    bollywood: 'Bollywood',
  };

  const commentToCommunity = (c: MyComment): string => {
    if (c.post_herd_id) return HERD_ID_DISPLAY[c.post_herd_id] ?? c.post_herd_id;
    if (c.post_herd_type === 'university') return 'University';
    return c.post_herd_type ?? 'Unknown';
  };

  const handleCommentTap = (c: MyComment) => {
    if (!onPostClick) return;
    const community = commentToCommunity(c);
    const post: Post = {
      id: c.post_id,
      community,
      content: c.post_content,
      timestamp: getTimeAgo(c.post_created_at),
      upvotes: c.post_upvotes,
      downvotes: c.post_downvotes,
      comments: c.post_comment_count,
      reposts: 0,
    };
    onPostClick(post);
  };

  const renderComments = () => {
    if (commentsLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (myComments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <p className="text-gray-400 text-lg">Nothing here yet</p>
          <p className="text-gray-300 text-sm mt-1">Your comments will show up here</p>
        </div>
      );
    }

    return myComments.map((c) => {
      const community = commentToCommunity(c);
      return (
        <button
          key={c.id}
          onClick={() => handleCommentTap(c)}
          className="w-full text-left bg-white rounded-xl border-2 border-black overflow-hidden hover:border-yellow-500 transition-colors"
        >
          {/* Your comment */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-medium text-yellow-600">Your comment</span>
              <span className="text-xs text-gray-400">{getTimeAgo(c.comment_created_at)}</span>
            </div>
            <p className="text-black leading-relaxed">{c.comment_content}</p>
          </div>

          {/* Parent post context */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-sm flex-shrink-0">
              {communityEmojis[community] || '📍'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500">{community}</p>
              <p className="text-sm text-gray-700 truncate">{c.post_content}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>
        </button>
      );
    });
  };

  const handleVote = async (postId: string, voteType: 'up' | 'down') => {
    const prev = postVotes[postId];
    const newVote = prev === voteType ? null : voteType;
    setPostVotes((p) => ({ ...p, [postId]: newVote }));

    if (deviceId && newVote) {
      try {
        await votePost({ post_id: postId, device_id: deviceId, vote: newVote === 'up' ? 1 : -1 });
      } catch {
        setPostVotes((p) => ({ ...p, [postId]: prev }));
      }
    }
  };

  const handleRepost = (post: Post) => {
    onRepost?.(post);
  };

  const getVoteCount = (post: Post) => {
    const userVote = postVotes[post.id];
    return post.upvotes - post.downvotes + (userVote === 'up' ? 1 : userVote === 'down' ? -1 : 0);
  };

  const renderPosts = (posts: Post[], reposted: Post[] = []) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    // Merge own posts + reposted posts, deduped, reposted ones tagged
    const ownIds = new Set(posts.map((p) => p.id));
    const repostOnly = reposted.filter((p) => !ownIds.has(p.id));
    const allPosts: Array<Post & { _isRepost?: boolean }> = [
      ...posts.map((p) => ({ ...p, _isRepost: false })),
      ...repostOnly.map((p) => ({ ...p, _isRepost: true })),
    ];

    if (allPosts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <p className="text-gray-400 text-lg">Nothing here yet</p>
          <p className="text-gray-300 text-sm mt-1">Your posts will show up here</p>
        </div>
      );
    }

    return allPosts.map((post) => (
      <div key={`${post._isRepost ? 'repost-' : ''}${post.id}`} className="bg-white rounded-xl border-2 border-black">
        {post._isRepost && (
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
            <Repeat2 className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600">You reposted</span>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 cursor-pointer" onClick={() => onPostClick?.(post)}>
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-lg">
            {communityEmojis[post.community] || '🛠️'}
          </div>
          <div className="flex-1">
            <div className="font-bold text-black">{post.community}</div>
            <div className="text-sm text-gray-400">{post.timestamp}</div>
          </div>
        </div>

        <div className="px-4 pb-3 cursor-pointer" onClick={() => onPostClick?.(post)}>
          <p className="text-black leading-relaxed">{post.content}</p>
        </div>

        <div className="border-t border-gray-200 px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleVote(post.id, 'up')}
                className={`p-1 rounded transition-colors ${
                  postVotes[post.id] === 'up'
                    ? 'bg-yellow-400 text-black'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium min-w-[32px] text-center text-black">
                {getVoteCount(post)}
              </span>
              <button
                onClick={() => handleVote(post.id, 'down')}
                className={`p-1 rounded transition-colors ${
                  postVotes[post.id] === 'down'
                    ? 'bg-black text-yellow-400'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>

            <button onClick={() => onPostClick?.(post)} className="flex items-center gap-1.5 text-gray-600 hover:text-black transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{post.comments}</span>
            </button>

            <button
              onClick={() => handleRepost(post)}
              className={`flex items-center gap-1.5 transition-colors ${
                isReposted?.(post.id) ? 'text-yellow-600' : 'text-gray-600 hover:text-yellow-600'
              }`}
            >
              <Repeat2 className="w-4 h-4" />
              <span className="text-sm font-medium">
                {post.reposts + (isReposted?.(post.id) ? 1 : 0)}
              </span>
            </button>

            <button className="flex items-center gap-1.5 text-gray-600 hover:text-black transition-colors ml-auto">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-white pb-4">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold text-black leading-tight" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}>
            Hey there<br />stranger!
          </h1>
          <button className="p-3 rounded-full border-2 border-black bg-white hover:bg-gray-50 transition-colors">
            <Settings className="w-6 h-6 text-black" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-6">
        <div className="flex gap-6 border-b-2 border-gray-200">
          <button onClick={() => setActiveTab('posts')} className="pb-3 relative">
            <span className={`font-medium ${activeTab === 'posts' ? 'text-black' : 'text-gray-500'}`}>
              My Posts
            </span>
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400"></div>
            )}
          </button>

          <button onClick={() => setActiveTab('comments')} className="pb-3 relative">
            <span className={`font-medium ${activeTab === 'comments' ? 'text-black' : 'text-gray-500'}`}>
              My Comments
            </span>
            {activeTab === 'comments' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400"></div>
            )}
          </button>

          <button onClick={() => setActiveTab('saved')} className="pb-3 relative">
            <span className={`font-medium ${activeTab === 'saved' ? 'text-black' : 'text-gray-500'}`}>
              Saved Posts
            </span>
            {activeTab === 'saved' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 px-3">
        {activeTab === 'posts' && renderPosts(myPosts, repostedPosts)}
        {activeTab === 'comments' && renderComments()}
        {activeTab === 'saved' && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <p className="text-gray-400 text-lg">Coming soon</p>
            <p className="text-gray-300 text-sm mt-1">Saved posts will show up here</p>
          </div>
        )}
      </div>
    </div>
  );
}
