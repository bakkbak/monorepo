import { Search, TrendingUp, Flame } from 'lucide-react';
import { useState, useEffect } from 'react';
import { joinHerd, leaveHerd, getJoinedHerds } from '../api';

const circles = [
  {
    id: 1,
    name: 'IPL',
    emoji: '🏏',
    members: '45K',
    trending: true,
    color: 'bg-blue-500',
    image: 'https://images.unsplash.com/photo-1624194611924-bb02300dad6c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwYmF0JTIwYmFsbHxlbnwxfHx8fDE3NjgwMTM5MTZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 2,
    name: 'NBA',
    emoji: '🏀',
    members: '38K',
    trending: false,
    color: 'bg-orange-500',
    image: 'https://images.unsplash.com/photo-1503525523076-ca4aa2e47535?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNrZXRiYWxsJTIwaG9vcHxlbnwxfHx8fDE3Njc3MDQ0ODl8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 3,
    name: 'Premier League',
    emoji: '⚽',
    members: '52K',
    trending: true,
    color: 'bg-purple-500',
    image: 'https://images.unsplash.com/photo-1625187538367-6a8483a79cc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NjZXIlMjBiYWxsJTIwZmllbGR8ZW58MXx8fHwxNjc3NzAzNDY2fDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 4,
    name: 'RCB',
    emoji: '🔥',
    members: '67K',
    trending: true,
    color: 'bg-red-500',
    image: 'https://images.unsplash.com/photo-1593766821405-f605e0f9535f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmlja2V0JTIwaGVsbWV0JTIwYmF0fGVufDF8fHx8MTc2NzgwODgxN3ww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 5,
    name: 'Pokemon',
    emoji: '⚡',
    members: '91K',
    trending: true,
    color: 'bg-yellow-500',
    image: 'https://images.unsplash.com/photo-1638964758061-117853a20865?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxQaWthY2h1JTIwcG9rZW1vbnxlbnwxfHx8fDE3NjgwNTU2MzN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 6,
    name: 'Music',
    emoji: '🎵',
    members: '29K',
    trending: false,
    color: 'bg-teal-500',
    image: 'https://images.unsplash.com/photo-1677533606085-f01c472408e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMG5vdGVzJTIwaW5zdHJ1bWVudHN8ZW58MXx8fHwxNjc3ODA4ODE3fDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 7,
    name: 'Bollywood',
    emoji: '🎬',
    members: '73K',
    trending: true,
    color: 'bg-pink-500',
    image: 'https://images.unsplash.com/photo-1695866648647-ab341ee14b7c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyMHRoZWF0ZXIlMjBwb3Bjb3JufGVufDF8fHx8MTc2NzcyNDQ5MHww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 8,
    name: 'Swifties',
    emoji: '💜',
    members: '84K',
    trending: true,
    color: 'bg-purple-400',
    image: 'https://images.unsplash.com/photo-1648260029310-5f1da359af9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBsaWdodHN8ZW58MXx8fHwxNzY3NzEwMjU0fDA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 9,
    name: 'University',
    emoji: '🏛️',
    members: '156K',
    trending: true,
    color: 'bg-indigo-500',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwY2FtcHVzfGVufDF8fHx8MTY3NzgwODgxN3ww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 10,
    name: 'Gaming',
    emoji: '🎮',
    members: '112K',
    trending: true,
    color: 'bg-green-500',
    image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBzZXR1cHxlbnwxfHx8fDE2Nzc4MDg4MTd8MA&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    id: 11,
    name: 'RVU',
    emoji: '🎓',
    logo: '/herds/rvu.svg',
    members: '2K',
    trending: false,
    color: 'bg-amber-600',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwY2FtcHVzfGVufDF8fHx8MTY3NzgwODgxN3ww&ixlib=rb-4.1.0&q=80&w=1080'
  }
];

interface DiscoverPageProps {
  deviceId: string | null;
  onHerdsChanged?: () => void;
}

export function DiscoverPage({ deviceId, onHerdsChanged }: DiscoverPageProps) {
  const [joinedHerdIds, setJoinedHerdIds] = useState<Set<string>>(new Set());

  // Load joined herds from backend
  useEffect(() => {
    if (!deviceId) return;
    getJoinedHerds(deviceId)
      .then((ids) => setJoinedHerdIds(new Set(ids)))
      .catch(() => {});
  }, [deviceId]);

  const handleJoin = async (circle: typeof circles[0]) => {
    if (!deviceId) return;
    const herdId = circle.name.toLowerCase().replace(/\s+/g, '-');
    const isJoined = joinedHerdIds.has(herdId);

    // Optimistic update
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
      // Rollback
      setJoinedHerdIds((prev) => {
        const next = new Set(prev);
        if (isJoined) next.add(herdId);
        else next.delete(herdId);
        return next;
      });
    }
  };

  const isCircleJoined = (circle: typeof circles[0]) => {
    const herdId = circle.name.toLowerCase().replace(/\s+/g, '-');
    return joinedHerdIds.has(herdId);
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-4xl font-bold text-black mb-2" style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}>Discover</h1>
        <p className="text-gray-500">find your vibe ✨</p>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="search circles..."
            className="w-full pl-12 pr-4 py-3 rounded-full border-2 border-black bg-white text-base focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      {/* Circles Grid */}
      <div className="px-4 space-y-3">
        {circles.map((circle) => (
          <div
            key={circle.id}
            className="relative rounded-2xl border-2 border-black overflow-hidden bg-white"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <img
                src={circle.image}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="relative flex items-center gap-4 p-4">
              {/* Icon */}
              <div className={`${circle.color} w-14 h-14 rounded-2xl border-2 border-black flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden`}>
                {'logo' in circle && circle.logo ? (
                  <img src={circle.logo} alt={circle.name} className="w-full h-full object-cover" />
                ) : (
                  circle.emoji
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-black truncate">
                    {circle.name}
                  </h3>
                  {circle.trending && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400 rounded-full border border-black">
                      <Flame className="w-3 h-3" />
                      <span className="text-xs font-bold">HOT</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  {circle.members} members
                </p>
              </div>

              {/* Join Button */}
              <button
                onClick={() => handleJoin(circle)}
                className={`px-5 py-2 rounded-full font-bold text-sm border-2 border-black transition-all flex-shrink-0 ${
                  isCircleJoined(circle)
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white text-black hover:bg-gray-50 active:scale-95'
                }`}
              >
                {isCircleJoined(circle) ? '✓ Joined' : 'Join'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}