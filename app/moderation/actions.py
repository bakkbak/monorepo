import uuid

from sqlalchemy.orm import Session
from sqlalchemy.sql import text


def hide_and_notify(post_id: str, device_id: str, verdict: str, reason: str, db: Session):
    db.execute(
        text("UPDATE posts SET is_hidden = TRUE WHERE id = :id"),
        {"id": post_id},
    )
    db.execute(
        text("""
            INSERT INTO notifications (id, device_id, type, title, body, post_id)
            VALUES (:id, :device_id, 'moderation', :title, :body, :post_id)
        """),
        {
            "id": str(uuid.uuid4()),
            "device_id": device_id,
            "title": "Post removed",
            "body": "Your post was removed for violating community guidelines.",
            "post_id": post_id,
        },
    )


def log_moderation(
    post_id: str,
    pass_type: str,
    verdict: str,
    category: str,
    reason: str,
    confidence: str,
    model: str,
    db: Session,
    prompt_tokens: int = None,
    completion_tokens: int = None,
    latency_ms: int = None,
    error: str = None,
):
    db.execute(
        text("""
            INSERT INTO moderation_logs
                (id, post_id, pass_type, verdict, category, reason, confidence, model,
                 prompt_tokens, completion_tokens, latency_ms, error)
            VALUES
                (:id, :post_id, :pass_type, :verdict, :category, :reason, :confidence, :model,
                 :prompt_tokens, :completion_tokens, :latency_ms, :error)
        """),
        {
            "id": str(uuid.uuid4()),
            "post_id": post_id,
            "pass_type": pass_type,
            "verdict": verdict,
            "category": category,
            "reason": reason,
            "confidence": confidence,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "latency_ms": latency_ms,
            "error": error,
        },
    )
