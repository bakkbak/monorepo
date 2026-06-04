import { useState } from 'react';
import { X, Image } from 'lucide-react';

const communities = ['University', 'IPL', 'Bollywood'];

interface PostComposerProps {
  onClose: () => void;
  onPost: (text: string, community: string) => void;
}

export function PostComposer({ onClose, onPost }: PostComposerProps) {
  const [text, setText] = useState('');
  const [community, setCommunity] = useState('University');
  const maxChars = 280;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl animate-slide-up">
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-3" />

        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2
            className="text-xl font-bold text-black"
            style={{ fontFamily: "'Rozha One', serif" }}
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

        <p className="px-5 text-sm text-gray-500 italic mb-3">
          Bol de, koi nahi janega 🙊
        </p>

        {/* Community selector */}
        <div className="px-5 flex gap-2 overflow-x-auto scrollbar-hide pb-3">
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
        <div className="px-5">
          <textarea
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= maxChars) setText(e.target.value);
            }}
            placeholder="What's happening on campus?"
            className="w-full h-32 bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-black resize-none focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-colors"
            autoFocus
          />
          <div className="flex justify-between items-center mt-1 mb-4">
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

        {/* Post button */}
        <div className="px-5 pb-8">
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
            Post Anonymously 🙊
          </button>
        </div>
      </div>
    </div>
  );
}
