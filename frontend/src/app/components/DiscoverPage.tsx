import { Search, Settings, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { joinHerd, leaveHerd, getJoinedHerds } from '../api';
import { HERD_REGISTRY } from '../utils';

interface DiscoverPageProps {
  deviceId: string | null;
  onHerdsChanged?: () => void;
}

export function DiscoverPage({ deviceId, onHerdsChanged }: DiscoverPageProps) {
  const [joinedHerdIds, setJoinedHerdIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showRvuDialog, setShowRvuDialog] = useState(false);

  const discoverCircles = Object.values(HERD_REGISTRY).filter(
    (h) => !h.isUniversityHerd
  );

  const filteredCircles = searchQuery
    ? discoverCircles.filter((c) =>
        c.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : discoverCircles;

  useEffect(() => {
    if (!deviceId) return;
    getJoinedHerds(deviceId)
      .then((ids) => setJoinedHerdIds(new Set(ids)))
      .catch(() => {});
  }, [deviceId]);

  const handleJoin = async (herdId: string) => {
    if (!deviceId) return;
    const isJoined = joinedHerdIds.has(herdId);

    setJoinedHerdIds((prev) => {
      const next = new Set(prev);
      if (isJoined) next.delete(herdId);
      else next.add(herdId);
      return next;
    });

    try {
      if (isJoined) {
        await leaveHerd({ device_id: deviceId, herd_id: herdId });
      } else {
        await joinHerd({ device_id: deviceId, herd_id: herdId });
      }
      onHerdsChanged?.();
    } catch {
      setJoinedHerdIds((prev) => {
        const next = new Set(prev);
        if (isJoined) next.add(herdId);
        else next.delete(herdId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1a] pb-20">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1
          className="text-4xl font-bold text-black dark:text-white mb-2"
          style={{
            fontFamily:
              "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 700,
          }}
        >
          Discover
        </h1>
        <p className="text-gray-500">find your vibe</p>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="search circles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      {/* Circles Grid */}
      <div className="px-4 space-y-3">
        {filteredCircles.map((circle) => (
          <div
            key={circle.herdId}
            className="relative rounded-2xl border-2 border-black dark:border-white overflow-hidden bg-white dark:bg-[#1a1a1a]"
          >
            <div className="relative flex items-center gap-4 p-4">
              {/* Emoji Icon */}
              <div className="w-14 h-14 rounded-2xl border-2 border-black bg-yellow-400 flex items-center justify-center text-2xl flex-shrink-0">
                {circle.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-black dark:text-white truncate">
                  {circle.displayName}
                </h3>
                {circle.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                    {circle.description}
                  </p>
                )}
              </div>

              {/* Join Button */}
              <button
                onClick={() => handleJoin(circle.herdId)}
                className={`px-5 py-2 rounded-full font-bold text-sm border-2 border-black transition-all flex-shrink-0 ${
                  joinedHerdIds.has(circle.herdId)
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white text-black hover:bg-gray-50 active:scale-95'
                }`}
              >
                {joinedHerdIds.has(circle.herdId) ? '✓ Joined' : 'Join'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Hidden gear for RVU access */}
      <div className="flex justify-center py-6">
        <button
          onClick={() => setShowRvuDialog(true)}
          className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* RVU Dialog */}
      {showRvuDialog && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowRvuDialog(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl border-2 border-black w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-black">
                    <img
                      src="/herds/rvu.svg"
                      alt="RVU"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-black">RVU</h3>
                </div>
                <button
                  onClick={() => setShowRvuDialog(false)}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="px-5 pb-4 text-sm text-gray-500">
                Join the RVU campus circle to see and post with your college
                community.
              </p>
              <div className="px-5 pb-5">
                <button
                  onClick={async () => {
                    if (!deviceId) return;
                    const isJoined = joinedHerdIds.has('rvu');
                    setJoinedHerdIds((prev) => {
                      const next = new Set(prev);
                      if (isJoined) next.delete('rvu');
                      else next.add('rvu');
                      return next;
                    });
                    try {
                      if (isJoined) {
                        await leaveHerd({
                          device_id: deviceId,
                          herd_id: 'rvu',
                        });
                      } else {
                        await joinHerd({
                          device_id: deviceId,
                          herd_id: 'rvu',
                        });
                      }
                      onHerdsChanged?.();
                    } catch {
                      setJoinedHerdIds((prev) => {
                        const next = new Set(prev);
                        if (isJoined) next.add('rvu');
                        else next.delete('rvu');
                        return next;
                      });
                    }
                    setShowRvuDialog(false);
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-sm border-2 border-black transition-all ${
                    joinedHerdIds.has('rvu')
                      ? 'bg-gray-100 text-black'
                      : 'bg-yellow-400 text-black'
                  }`}
                >
                  {joinedHerdIds.has('rvu') ? 'Leave RVU' : 'Join RVU'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
