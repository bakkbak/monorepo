import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Home, Binoculars, User, Plus, Flame } from 'lucide-react';
import { PostFeed } from './components/PostFeed';
import { SplashScreen } from './components/SplashScreen';
import { UniversityVerifyPrompt } from './components/UniversityVerifyPrompt';

// Code-split the screens that aren't part of the first (home) paint so they
// don't bloat the initial bundle. Named exports → map to default for React.lazy.
const ProfilePage = lazy(() => import('./components/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const DiscoverPage = lazy(() => import('./components/DiscoverPage').then((m) => ({ default: m.DiscoverPage })));
const ThreadView = lazy(() => import('./components/ThreadView').then((m) => ({ default: m.ThreadView })));
const PostComposer = lazy(() => import('./components/PostComposer').then((m) => ({ default: m.PostComposer })));
const TrendingPage = lazy(() => import('./components/TrendingPage').then((m) => ({ default: m.TrendingPage })));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow').then((m) => ({ default: m.OnboardingFlow })));

// Fallback shown for the brief moment a lazy screen chunk is fetched.
function ScreenFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
import { getOrCreateDeviceId, isOnboardingComplete, setOnboardingComplete } from './device';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useTheme } from './theme';
import { getLocation, DEFAULT_LOCATION, type Location } from './location';
import { getFeed, createPost, repostPost, unrepostPost, getMyReposts, getJoinedHerds, joinHerd, getNotifications, getDeviceStatus, getOnboardingStatus } from './api';
import { feedPostToPost, buildFeedOptions, buildCommunities, getFeedParams, getPostParams, isUniversityFeed, getHerdInfoByDisplayName, DEFAULT_HERD_IDS, type Post } from './utils';
export type { Post } from './utils';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedFeed, setSelectedFeed] = useState('For you');
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  // Start with a default location so the feed can load immediately. The feed
  // query ignores lat/lng entirely; real GPS resolves in the background (used
  // only when composing a post) and must never gate the first render.
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [repostedPosts, setRepostedPosts] = useState<Post[]>([]);
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());

  // Per-herd feed cache for instant switching
  const feedCache = useRef<Record<string, Post[]>>({});
  // Tracks the in-flight feed request so a fast tab switch (A→B→A) can cancel a
  // stale request instead of letting it overwrite the newer feed.
  const feedAbort = useRef<AbortController | null>(null);

  // Joined herds
  const [joinedHerdIds, setJoinedHerdIds] = useState<string[]>([]);

  // Unread notification count
  const [unreadCount, setUnreadCount] = useState(0);

  // University verification
  const [isUniversityVerified, setIsUniversityVerified] = useState(false);

  const feedOptions = buildFeedOptions(joinedHerdIds);
  const communities = buildCommunities(joinedHerdIds, isUniversityVerified);

  // Load joined herds + auto-join defaults
  const refreshJoinedHerds = useCallback(async () => {
    if (!deviceId) return;
    try {
      let ids = await getJoinedHerds(deviceId);

      // Auto-join default herds if not already joined
      const missing = DEFAULT_HERD_IDS.filter((d) => !ids.includes(d));
      if (missing.length > 0) {
        await Promise.all(missing.map((hid) => joinHerd({ device_id: deviceId, herd_id: hid })));
        ids = await getJoinedHerds(deviceId);
      }

      setJoinedHerdIds(ids);
    } catch {
      // Fallback to defaults
      setJoinedHerdIds(DEFAULT_HERD_IDS);
    }
  }, [deviceId]);

  useEffect(() => {
    refreshJoinedHerds();
  }, [refreshJoinedHerds]);

  // Poll unread notification count
  const refreshUnreadCount = useCallback(async () => {
    if (!deviceId) return;
    try {
      const notifs = await getNotifications(deviceId);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
    } catch {
      // ignore
    }
  }, [deviceId]);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  // Check university verification status
  useEffect(() => {
    if (!deviceId) return;
    getDeviceStatus(deviceId)
      .then((s) => { if (s.verified_university) setIsUniversityVerified(true); })
      .catch(() => {});
  }, [deviceId]);

  // Load reposts from backend on init
  useEffect(() => {
    if (!deviceId) return;
    getMyReposts(deviceId)
      .then((data) => {
        const posts = data.map(feedPostToPost);
        setRepostedPosts(posts);
        setRepostedIds(new Set(posts.map((p) => p.id)));
      })
      .catch(() => {});
  }, [deviceId]);

  const handleRepost = async (post: Post) => {
    if (!deviceId) return;
    const alreadyReposted = repostedIds.has(post.id);

    // Optimistic update
    if (alreadyReposted) {
      setRepostedIds((prev) => { const next = new Set(prev); next.delete(post.id); return next; });
      setRepostedPosts((prev) => prev.filter((p) => p.id !== post.id));
    } else {
      setRepostedIds((prev) => new Set(prev).add(post.id));
      setRepostedPosts((prev) => [post, ...prev]);
    }

    try {
      if (alreadyReposted) {
        await unrepostPost({ post_id: post.id, device_id: deviceId });
      } else {
        await repostPost({ post_id: post.id, device_id: deviceId });
      }
      loadFeed();
    } catch {
      // Rollback on failure
      if (alreadyReposted) {
        setRepostedIds((prev) => new Set(prev).add(post.id));
        setRepostedPosts((prev) => [post, ...prev]);
      } else {
        setRepostedIds((prev) => { const next = new Set(prev); next.delete(post.id); return next; });
        setRepostedPosts((prev) => prev.filter((p) => p.id !== post.id));
      }
    }
  };

  const isReposted = (postId: string) => repostedIds.has(postId);

  useEffect(() => {
    // Resolve identity as fast as possible — this gates the feed. Do NOT wait on
    // geolocation (which can block up to 5s on the OS prompt) since the feed
    // doesn't use coordinates; fetch GPS separately in the background.
    getOrCreateDeviceId().then(
      async (did) => {
        setDeviceId(did);
        if (!(await isOnboardingComplete())) {
          try {
            const { completed } = await getOnboardingStatus(did);
            if (!completed) {
              setShowOnboarding(true);
            } else {
              await setOnboardingComplete();
            }
          } catch {
            setShowOnboarding(true);
          }
        }
      },
      (err) => setFeedError(err.message),
    );
    // Background: refine location for post composition; never blocks the feed.
    getLocation().then(setLocation).catch(() => {});
  }, []);

  const loadFeed = useCallback(async () => {
    if (!deviceId) return;
    const feed = selectedFeed;
    // Cancel any in-flight feed request; keep this one as the current one.
    feedAbort.current?.abort();
    const controller = new AbortController();
    feedAbort.current = controller;

    const cached = feedCache.current[feed];
    if (cached) {
      setPosts(cached);
    } else {
      setPosts([]);
      setFeedLoading(true);
    }
    setFeedError(null);
    try {
      const herdParams = getFeedParams(feed);
      const data = await getFeed(
        {
          device_id: deviceId,
          lat: location.lat,
          lng: location.lng,
          ...herdParams,
        },
        controller.signal,
      );
      // A newer request superseded this one — drop the stale result.
      if (controller.signal.aborted) return;
      const mapped = data.map(feedPostToPost);
      feedCache.current[feed] = mapped;
      setPosts(mapped);
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // superseded/cancelled, ignore
      if (!cached) setFeedError(err.message);
    } finally {
      if (!controller.signal.aborted) setFeedLoading(false);
    }
  }, [deviceId, location, selectedFeed]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!deviceId) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && activeTab === 'home') {
        loadFeed();
      }
    }, 30_000);

    const handleVisibilityChange = () => {
      // On foreground, refresh in the background but keep the cached feed on
      // screen — don't wipe feedCache (that caused a blank flash + full reload
      // every time the app returned to the foreground, which is constant on
      // mobile). loadFeed() will overwrite the current tab's cache in place.
      if (document.visibilityState === 'visible' && activeTab === 'home') {
        loadFeed();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [deviceId, location, activeTab, loadFeed]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY) {
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Android hardware back button: unwind overlays/tabs before letting the OS
  // background the app (matching iOS back-swipe semantics as closely as we can).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = CapacitorApp.addListener('backButton', () => {
      if (composerOpen) {
        setComposerOpen(false);
      } else if (viewingPost) {
        setViewingPost(null);
      } else if (activeTab !== 'home') {
        setActiveTab('home');
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => {
      void sub.then((s) => s.remove());
    };
  }, [composerOpen, viewingPost, activeTab]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (showOnboarding && deviceId) {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-yellow-400" />}>
        <OnboardingFlow
          deviceId={deviceId}
          onFinish={(firstExperience) => {
            void setOnboardingComplete();
            setShowOnboarding(false);
            refreshJoinedHerds();
            if (firstExperience === 'browse_trending') setActiveTab('trending');
            else if (firstExperience === 'explore_circles') setActiveTab('discover');
            else if (firstExperience === 'make_first_post') {
              setActiveTab('home');
              setComposerOpen(true);
            }
          }}
        />
      </Suspense>
    );
  }

  if (viewingPost) {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto relative">
        <Suspense fallback={<ScreenFallback />}>
          <ThreadView post={viewingPost} deviceId={deviceId} onBack={() => setViewingPost(null)} onRepost={handleRepost} isReposted={isReposted} />
        </Suspense>
      </div>
    );
  }

  const handleNewPost = async (text: string, community: string, imageBase64?: string, imageContentType?: string) => {
    if (!deviceId || !location) return;
    const herdParams = getPostParams(community);
    if (!herdParams) return;
    setComposerOpen(false);
    setActiveTab('home');
    try {
      await createPost({
        device_id: deviceId,
        content: text,
        lat: location.lat,
        lng: location.lng,
        ...herdParams,
        image_base64: imageBase64,
        image_content_type: imageContentType,
      });
      loadFeed();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1a] pb-nav-safe max-w-md mx-auto relative">
      {/* Header */}
      {activeTab === 'home' && (
        <div
          className={`safe-top bg-yellow-400 border-b-2 border-black sticky top-0 z-10 transition-transform duration-300 ${
            showHeader ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 px-4 py-3 min-w-max">
              {feedOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedFeed(option)}
                  className={`px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap active:scale-95 ${
                    selectedFeed === option
                      ? 'bg-black text-yellow-400 border-2 border-black'
                      : 'bg-white dark:bg-gray-900 text-black dark:text-white border-2 border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pb-4">
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {isUniversityFeed(selectedFeed) && !isUniversityVerified && (
              <UniversityVerifyPrompt
                deviceId={deviceId}
                onVerified={() => setIsUniversityVerified(true)}
              />
            )}
            {(() => {
              // Sidechat-style context banner: shown only for a specific
              // non-university circle (not "For you", not RVU/OPJ).
              const info = getHerdInfoByDisplayName(selectedFeed);
              return info?.description && !info.isUniversityHerd ? (
                <div className="px-4 pt-3 pb-1 flex items-start gap-3">
                  <span className="text-2xl leading-none">{info.emoji}</span>
                  <div>
                    <h2 className="font-bold text-black dark:text-white leading-tight">
                      {info.displayName}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {info.description}
                    </p>
                  </div>
                </div>
              ) : null;
            })()}
            <PostFeed
              posts={posts}
              loading={feedLoading}
              error={feedError}
              deviceId={deviceId}
              onPostClick={(post: Post) => setViewingPost(post)}
              onRetry={loadFeed}
              onRepost={handleRepost}
              isReposted={isReposted}
            />
          </div>
        )}
        <Suspense fallback={<ScreenFallback />}>
          {activeTab === 'trending' && <TrendingPage deviceId={deviceId} onPostClick={(post: Post) => setViewingPost(post)} onRepost={handleRepost} isReposted={isReposted} />}
          {activeTab === 'discover' && <DiscoverPage deviceId={deviceId} onHerdsChanged={refreshJoinedHerds} />}
          {activeTab === 'profile' && <ProfilePage deviceId={deviceId} onPostClick={(post: Post) => setViewingPost(post)} repostedPosts={repostedPosts} onRepost={handleRepost} isReposted={isReposted} unreadCount={unreadCount} onNotificationsRead={refreshUnreadCount} theme={theme} onToggleTheme={toggleTheme} />}
        </Suspense>
      </div>

      {/* FAB */}
      {activeTab === 'home' && !composerOpen && (
        <button
          onClick={() => setComposerOpen(true)}
          className="fixed bottom-24 right-6 z-40 w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <Plus className="w-7 h-7 text-yellow-400" />
        </button>
      )}

      {composerOpen && (
        <Suspense fallback={null}>
          <PostComposer
            onClose={() => setComposerOpen(false)}
            onPost={handleNewPost}
            communities={communities}
          />
        </Suspense>
      )}

      {/* Bottom Nav */}
      <div className="safe-bottom fixed bottom-0 left-0 right-0 bg-yellow-400 dark:bg-yellow-400 border-t-2 border-black dark:border-black max-w-md mx-auto z-50">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors active:scale-95 ${
              activeTab === 'home' ? 'text-black' : 'text-gray-700'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">Home</span>
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors active:scale-95 ${
              activeTab === 'trending' ? 'text-black' : 'text-gray-700'
            }`}
          >
            <Flame className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">Trending</span>
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors active:scale-95 ${
              activeTab === 'discover' ? 'text-black' : 'text-gray-700'
            }`}
          >
            <Binoculars className="w-6 h-6" />
            <span className="text-xs mt-1 font-medium">Discover</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors active:scale-95 relative ${
              activeTab === 'profile' ? 'text-black' : 'text-gray-700'
            }`}
          >
            <div className="relative">
              <User className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-xs mt-1 font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}

