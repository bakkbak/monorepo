import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Repeat2,
  Share2,
  Send,
  MoreHorizontal,
  Flag,
  X,
} from 'lucide-react';
import type { Post } from '../utils';
import { getTimeAgo, communityEmojis, getCommunityLogo } from '../utils';
import { votePost, getComments, createComment, reportPost, type ApiComment } from '../api';

type CommentTree = ApiComment & { replies: CommentTree[] };

function buildCommentTree(flat: ApiComment[]): CommentTree[] {
  const map = new Map<string, CommentTree>();
  const roots: CommentTree[] = [];

  for (const c of flat) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const REPORT_REASONS = ['Spam', 'Harassment', 'Hate speech', 'Inappropriate content', 'Other'];

function CommentItem({
  comment,
  depth = 0,
  deviceId,
  onReply,
}: {
  comment: CommentTree;
  depth?: number;
  deviceId: string | null;
  onReply: (commentId: string) => void;
}) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const upvotes = comment.upvotes - comment.downvotes + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);
  const emojis = ['🐵', '🦁', '🐼', '🐨', '🐸', '🦊', '🐙', '🦋'];
  const emoji = emojis[comment.content.length % emojis.length];

  return (
    <div className={depth > 0 ? 'ml-10 border-l-2 border-gray-200 pl-3' : ''}>
      <div className="py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-full bg-yellow-400 border border-black flex items-center justify-center text-sm">
            {emoji}
          </div>
          <span className="text-sm font-medium text-gray-700">Anon</span>
          <span className="text-xs text-gray-400">{getTimeAgo(comment.created_at)}</span>
        </div>
        <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed mb-2">{comment.content}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setVote(vote === 'up' ? null : 'up')}
              className={`p-1 rounded transition-colors ${
                vote === 'up' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-gray-500 min-w-[20px] text-center">
              {upvotes}
            </span>
            <button
              onClick={() => setVote(vote === 'down' ? null : 'down')}
              className={`p-1 rounded transition-colors ${
                vote === 'down' ? 'bg-black text-yellow-400' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
          {depth === 0 && (
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium"
            >
              Reply
            </button>
          )}
        </div>
      </div>
      {comment.replies.map((reply) => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} deviceId={deviceId} onReply={onReply} />
      ))}
    </div>
  );
}

interface ThreadViewProps {
  post: Post;
  deviceId: string | null;
  onBack: () => void;
  onRepost?: (post: Post) => void;
  isReposted?: (postId: string) => boolean;
}

export function ThreadView({ post, deviceId, onBack, onRepost, isReposted }: ThreadViewProps) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [replyText, setReplyText] = useState('');
  const reposted = isReposted?.(post.id) ?? false;
  const [comments, setComments] = useState<CommentTree[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reported, setReported] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const voteCount =
    post.upvotes - post.downvotes + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);

  const totalComments = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0);

  useEffect(() => {
    setLoadingComments(true);
    getComments(post.id)
      .then((data) => setComments(buildCommentTree(data)))
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [post.id]);

  const handleReply = async () => {
    if (!replyText.trim() || !deviceId || submitting) return;
    setSubmitting(true);
    try {
      await createComment({
        post_id: post.id,
        device_id: deviceId,
        content: replyText.trim(),
        parent_comment_id: replyingTo ?? undefined,
      });
      setReplyText('');
      setReplyingTo(null);
      const data = await getComments(post.id);
      setComments(buildCommentTree(data));
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (reason: string) => {
    if (!deviceId) return;
    try {
      await reportPost({ post_id: post.id, device_id: deviceId, reason });
      setReported(true);
    } catch {
      // silently fail
    }
    setShowReport(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1a] pb-nav-safe">
      {/* Header */}
      <div className="safe-top sticky top-0 bg-white dark:bg-[#1a1a1a] border-b-2 border-gray-200 dark:border-gray-700 z-10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-6 h-6 dark:text-white" />
        </button>
        <span className="font-bold text-lg dark:text-white">Thread</span>
      </div>

      {/* Original post */}
      <div className="px-4 pt-4 pb-3 border-b-2 border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center text-2xl overflow-hidden">
            {getCommunityLogo(post.community) ? (
              <img src={getCommunityLogo(post.community)} alt={post.community} className="w-full h-full object-cover" />
            ) : (
              communityEmojis[post.community] || '🛠️'
            )}
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 dark:text-white">{post.community}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{post.timestamp}</div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowReport(!showReport)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            {showReport && (
              <div className="absolute right-0 top-10 bg-white border-2 border-black rounded-xl shadow-lg z-20 w-56 overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-700">Report post</span>
                  <button onClick={() => setShowReport(false)} className="p-1 rounded-full hover:bg-gray-100">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => handleReport(reason)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
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
          <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg text-sm text-yellow-800">
            Thanks for reporting. We'll review this post.
          </div>
        )}

        <p className="text-gray-900 dark:text-gray-200 text-lg leading-relaxed mb-4">{post.content}</p>

        {post.image_url && (
          <div className="w-full aspect-[4/3] max-h-96 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
            <img
              src={post.image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex items-center gap-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                const newVote = vote === 'up' ? null : 'up';
                setVote(newVote);
                if (deviceId && newVote) {
                  try {
                    await votePost({ post_id: post.id, device_id: deviceId, vote: 1 });
                  } catch { setVote(vote); }
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                vote === 'up' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:bg-yellow-100'
              }`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold min-w-[32px] text-center">{voteCount}</span>
            <button
              onClick={async () => {
                const newVote = vote === 'down' ? null : 'down';
                setVote(newVote);
                if (deviceId && newVote) {
                  try {
                    await votePost({ post_id: post.id, device_id: deviceId, vote: -1 });
                  } catch { setVote(vote); }
                }
              }}
              className={`p-1.5 rounded transition-colors ${
                vote === 'down' ? 'bg-black text-yellow-400' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{totalComments} replies</span>
          </div>
          <button
            onClick={() => onRepost?.(post)}
            className={`flex items-center gap-2 transition-colors ${
              reposted ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <Repeat2 className="w-5 h-5" />
            <span className="text-sm font-medium">{post.reposts + (reposted ? 1 : 0)}</span>
          </button>
          <button className="text-gray-600 ml-auto">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Comments */}
      <div className="px-4">
        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mt-4 mb-2">
          Replies
        </h3>
        {loadingComments ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">No replies yet. Be the first!</p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              deviceId={deviceId}
              onReply={(id) => setReplyingTo(id)}
            />
          ))
        )}
      </div>

      {/* Reply input */}
      <div className="safe-bottom fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-[#1a1a1a] border-t-2 border-gray-200 dark:border-gray-700 px-4 py-3 z-50">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs text-gray-500">Replying to a comment</span>
            <button onClick={() => setReplyingTo(null)} className="text-xs text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !submitting && handleReply()}
            placeholder={replyingTo ? 'Reply to comment...' : 'Reply anonymously...'}
            className="flex-1 bg-gray-100 dark:bg-gray-800 dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 border-2 border-transparent focus:border-yellow-400"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || submitting}
            className={`p-2.5 rounded-full transition-all active:scale-90 ${
              replyText.trim() && !submitting
                ? 'bg-yellow-400 text-black'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
