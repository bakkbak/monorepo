import { useState, useRef } from 'react';
import { X, Image } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface PostComposerProps {
  onClose: () => void;
  onPost: (text: string, community: string, imageBase64?: string, imageContentType?: string) => void;
  communities?: string[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PostComposer({ onClose, onPost, communities = ['RVU'] }: PostComposerProps) {
  const [text, setText] = useState('');
  const [community, setCommunity] = useState(communities[0] || 'University');
  // We hold the encoded image directly (base64 + content type) so the web file
  // input and the native camera/gallery flow converge on one representation.
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageContentType, setImageContentType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxChars = 280;

  const imagePreview = imageBase64 ? `data:${imageContentType};base64,${imageBase64}` : null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5 MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      alert('Unsupported image type. Use JPEG, PNG, WebP, or GIF.');
      return;
    }

    setImageBase64(await fileToBase64(file));
    setImageContentType(file.type);
  };

  // Native: open the OS prompt to pick camera or photo library. The Camera
  // plugin returns base64, which is exactly what /api/images/posts expect.
  const handleNativePickImage = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        quality: 80,
        correctOrientation: true,
      });
      if (!photo.base64String) return;
      setImageBase64(photo.base64String);
      setImageContentType(`image/${photo.format || 'jpeg'}`);
    } catch {
      // User cancelled the picker — no-op.
    }
  };

  const handleImageButton = () => {
    if (Capacitor.isNativePlatform()) {
      void handleNativePickImage();
    } else {
      fileInputRef.current?.click();
    }
  };

  const removeImage = () => {
    setImageBase64(null);
    setImageContentType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if (!text.trim() && !imageBase64) return;
    if (submitting) return;
    setSubmitting(true);

    try {
      onPost(text.trim(), community, imageBase64 ?? undefined, imageContentType ?? undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const canPost = text.trim() || imageBase64;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-900 rounded-t-3xl animate-slide-up flex flex-col" style={{ maxHeight: '85vh' }}>
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-3 flex-shrink-0" />

        <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
          <h2
            className="text-xl font-bold text-black dark:text-white"
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
        <div className="px-5 flex-1 min-h-0 overflow-y-auto">
          <textarea
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= maxChars) setText(e.target.value);
            }}
            placeholder="What's happening on campus?"
            className="w-full h-32 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 text-black dark:text-white resize-none focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-colors"
            autoFocus
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-2 mb-2">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-48 object-cover rounded-xl border-2 border-gray-200"
              />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mt-1 mb-2">
            <button
              onClick={handleImageButton}
              className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${imageBase64 ? 'text-yellow-500' : 'text-gray-500'}`}
            >
              <Image className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageSelect}
              className="hidden"
            />
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
            onClick={handlePost}
            disabled={!canPost || submitting}
            className={`w-full py-3.5 rounded-xl font-bold text-base border-2 border-black transition-all active:scale-[0.98] ${
              canPost && !submitting
                ? 'bg-yellow-400 text-black hover:bg-yellow-500'
                : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
