from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from ..deps import get_db
import uuid

router = APIRouter()


@router.get("/")
def get_comments(
    post_id: str,
    db: Session = Depends(get_db)
):
    rows = db.execute(
        text("""
            SELECT id, post_id, device_id, parent_comment_id,
                   content, created_at, upvotes, downvotes
            FROM comments
            WHERE post_id = :post_id
            ORDER BY created_at ASC
        """),
        {"post_id": post_id}
    ).fetchall()

    return [dict(r._mapping) for r in rows]


@router.get("/my-comments")
def get_my_comments(
    device_id: str,
    db: Session = Depends(get_db)
):
    rows = db.execute(
        text("""
            SELECT
                c.id,
                c.post_id,
                c.content AS comment_content,
                c.created_at AS comment_created_at,
                c.upvotes AS comment_upvotes,
                c.downvotes AS comment_downvotes,
                p.content AS post_content,
                p.herd_type AS post_herd_type,
                p.herd_id AS post_herd_id,
                p.created_at AS post_created_at,
                p.upvotes AS post_upvotes,
                p.downvotes AS post_downvotes,
                COALESCE(cc.cnt, 0) AS post_comment_count
            FROM comments c
            JOIN posts p ON c.post_id = p.id
            LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) cc
                ON p.id = cc.post_id
            WHERE c.device_id = :device_id
            ORDER BY c.created_at DESC
        """),
        {"device_id": device_id}
    ).fetchall()

    return [dict(r._mapping) for r in rows]


@router.post("/")
def create_comment(
    post_id: str,
    device_id: str,
    content: str,
    parent_comment_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    banned = db.execute(
        text("SELECT is_banned FROM devices WHERE id = :id"),
        {"id": device_id}
    ).scalar()

    if banned:
        raise HTTPException(status_code=403, detail="Device banned")

    post_exists = db.execute(
        text("SELECT 1 FROM posts WHERE id = :id"),
        {"id": post_id}
    ).fetchone()

    if not post_exists:
        raise HTTPException(status_code=404, detail="Post not found")

    if parent_comment_id:
        parent = db.execute(
            text("SELECT 1 FROM comments WHERE id = :id AND post_id = :post_id"),
            {"id": parent_comment_id, "post_id": post_id}
        ).fetchone()

        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comment_id = str(uuid.uuid4())

    db.execute(
        text("""
            INSERT INTO comments (id, post_id, device_id, parent_comment_id, content)
            VALUES (:id, :post_id, :device_id, :parent_comment_id, :content)
        """),
        {
            "id": comment_id,
            "post_id": post_id,
            "device_id": device_id,
            "parent_comment_id": parent_comment_id,
            "content": content,
        }
    )
    db.commit()

    return {"status": "ok", "comment_id": str(comment_id)}
