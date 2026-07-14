import { Settings, ArrowUp, ArrowDown, MessageCircle, Repeat2, Share2, ChevronRight, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getMyPosts, getMyComments, getNotifications, markNotificationsRead, votePost } from '../api';
import type { MyComment, Notification } from '../api';
import { SettingsSheet } from './SettingsSheet';
import { feedPostToPost, getTimeAgo, communityEmojis, getCommunityLogo } from '../utils';
import type { Post } from '../utils';

type TabType = 'posts' | 'comments' | 'saved';

interface ProfilePageProps {
  deviceId: string | null;
  onPostClick?: (post: Post) => void;
  repostedPosts?: Post[];
  onRepost?: (post: Post) => void;
  isReposted?: (postId: string) => boolean;
  unreadCount?: number;
  onNotificationsRead?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function ProfilePage({ deviceId, onPostClick, repostedPosts = [], onRepost, isReposted, unreadCount = 0, onNotificationsRead, theme, onToggleTheme }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myComments, setMyComments] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postVotes, setPostVotes] = useState<Record<string, 'up' | 'down' | null>>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  useEffect(() => {
    if (!deviceId || !showNotifications) return;
    setNotificationsLoading(true);
    getNotifications(deviceId)
      .then((data) => {
        setNotifications(data);
        const unreadIds = data.filter((n) => !n.is_read).map((n) => n.id);
        if (unreadIds.length > 0) {
          markNotificationsRead(deviceId, unreadIds)
            .then(() => onNotificationsRead?.())
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setNotificationsLoading(false));
  }, [deviceId, showNotifications]);

  const HERD_ID_DISPLAY: Record<string, string> = {
    rvu: 'RVU',
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
            <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
              {getCommunityLogo(community) ? (
                <img src={getCommunityLogo(community)} alt={community} className="w-full h-full object-cover" />
              ) : (
                communityEmojis[community] || '📍'
              )}
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
      <div key={`${post._isRepost ? 'repost-' : ''}${post.id}`} className="bg-white dark:bg-[#1a1a1a] rounded-xl border-2 border-black dark:border-white">
        {post._isRepost && (
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
            <Repeat2 className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600">You reposted</span>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 cursor-pointer" onClick={() => onPostClick?.(post)}>
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-lg overflow-hidden">
            {getCommunityLogo(post.community) ? (
              <img src={getCommunityLogo(post.community)} alt={post.community} className="w-full h-full object-cover" />
            ) : (
              communityEmojis[post.community] || '🛠️'
            )}
          </div>
          <div className="flex-1">
            <div className="font-bold text-black dark:text-white">{post.community}</div>
            <div className="text-sm text-gray-400">{post.timestamp}</div>
          </div>
        </div>

        <div className="px-4 pb-3 cursor-pointer" onClick={() => onPostClick?.(post)}>
          <p className="text-black dark:text-gray-200 leading-relaxed">{post.content}</p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
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

  const renderNotifications = () => {
    if (notificationsLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <p className="text-gray-400 text-lg">Nothing here yet</p>
          <p className="text-gray-300 text-sm mt-1">Notifications will show up here</p>
        </div>
      );
    }

    return notifications.map((n) => (
      <div
        key={n.id}
        className={`bg-white rounded-xl border-2 overflow-hidden ${
          n.is_read ? 'border-black' : 'border-yellow-400'
        }`}
      >
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Bell className={`w-4 h-4 ${n.is_read ? 'text-gray-400' : 'text-yellow-500'}`} />
            <span className={`text-xs font-medium ${n.is_read ? 'text-gray-400' : 'text-yellow-600'}`}>
              {n.title}
            </span>
            <span className="text-xs text-gray-400">{getTimeAgo(n.created_at)}</span>
          </div>
          <p className="text-black leading-relaxed">{n.body}</p>
        </div>
      </div>
    ));
  };

  return (
    <>
    <div className="min-h-screen bg-white dark:bg-[#1a1a1a] pb-4">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold text-black dark:text-white leading-tight" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}>
            Hey there<br />stranger!
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-3 rounded-full border-2 transition-colors relative ${
                showNotifications
                  ? 'border-yellow-400 bg-yellow-400 hover:bg-yellow-300'
                  : 'border-black dark:border-white bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-gray-900'
              }`}
            >
              <Bell className="w-6 h-6 text-black dark:text-white" />
              {!showNotifications && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 rounded-full border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <Settings className="w-6 h-6 text-black dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      {showNotifications ? (
        <>
          <div className="px-6 mb-4">
            <h2 className="text-lg font-bold text-black dark:text-white">Notifications</h2>
          </div>
          <div className="space-y-4 px-3">
            {renderNotifications()}
          </div>
        </>
      ) : (
        <>
          {/* Tabs */}
          <div className="px-6 mb-6">
            <div className="flex gap-6 border-b-2 border-gray-200 dark:border-gray-700">
              <button onClick={() => setActiveTab('posts')} className="pb-3 relative">
                <span className={`font-medium ${activeTab === 'posts' ? 'text-black dark:text-white' : 'text-gray-500'}`}>
                  My Posts
                </span>
                {activeTab === 'posts' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400"></div>
                )}
              </button>

              <button onClick={() => setActiveTab('comments')} className="pb-3 relative">
                <span className={`font-medium ${activeTab === 'comments' ? 'text-black dark:text-white' : 'text-gray-500'}`}>
                  My Comments
                </span>
                {activeTab === 'comments' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400"></div>
                )}
              </button>

              <button onClick={() => setActiveTab('saved')} className="pb-3 relative">
                <span className={`font-medium ${activeTab === 'saved' ? 'text-black dark:text-white' : 'text-gray-500'}`}>
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
        </>
      )}
    </div>

    {showSettings && (
      <SettingsSheet deviceId={deviceId} onClose={() => setShowSettings(false)} theme={theme} onToggleTheme={onToggleTheme} />
    )}
    </>
  );
}
