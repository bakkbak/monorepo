import { useState } from 'react';
import { X, Image } from 'lucide-react';

interface PostComposerProps {
  onClose: () => void;
  onPost: (text: string, community: string) => void;
  communities?: string[];
}

export function PostComposer({ onClose, onPost, communities = ['University', 'IPL', 'Bollywood'] }: PostComposerProps) {
  const [text, setText] = useState('');
  const [community, setCommunity] = useState(communities[0] || 'University');
  const maxChars = 280;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl animate-slide-up flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-3 flex-shrink-0" />

        <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <h2
            className="text-xl font-bold text-black"
            style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}
          >
            New Post
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="px-5 text-sm text-gray-500 italic mb-3 flex-shrink-0">
          The tea your campus didn't serve ☕
        </p>

        {/* Community selector */}
        <div className="px-5 flex gap-2 overflow-x-auto scrollbar-hide pb-3 flex-shrink-0">
          {communities.map((c) => (
            <button
              key={c}
              onClick={() => setCommunity(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 whitespace-nowrap transition-all active:scale-95 ${
                community === c
                  ? 'bg-yellow-400 border-black text-black'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Text area */}
        <div className="px-5 flex-1 min-h-0">
          <textarea
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= maxChars) setText(e.target.value);
            }}
            placeholder="What's happening on campus?"
            className="w-full h-32 bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-black resize-none focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-colors"
            autoFocus
          />
          <div className="flex justify-between items-center mt-1 mb-2">
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
              <Image className="w-5 h-5" />
            </button>
            <span
              className={`text-sm font-medium ${
                text.length > 250 ? 'text-red-500' : 'text-gray-400'
              }`}
            >
              {text.length}/{maxChars}
            </span>
          </div>
        </div>

        {/* Post button — pinned to bottom */}
        <div className="px-5 pt-2 pb-24 flex-shrink-0">
          <button
            onClick={() => {
              if (text.trim()) onPost(text.trim(), community);
            }}
            disabled={!text.trim()}
            className={`w-full py-3.5 rounded-xl font-bold text-base border-2 border-black transition-all active:scale-[0.98] ${
              text.trim()
                ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
            }`}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
