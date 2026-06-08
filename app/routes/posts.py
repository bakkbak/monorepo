from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from ..deps import get_db
from ..moderation.first_pass import run_first_pass
from ..moderation.actions import hide_and_notify, log_moderation
from ..moderation.openai_second_pass import trigger_second_pass
import uuid

router = APIRouter()

def auto_hide_if_needed(post_id: str, db: Session):
    db.execute(
        text("""
            UPDATE posts
            SET is_hidden = TRUE
            WHERE id = :id
              AND (reports >= 2 OR downvotes >= 5)
        """),
        {"id": post_id}
    )


@router.post("/")
def create_post(
    device_id: str,
    content: str,
    lat: float,
    lng: float,
    herd_type: str = "local",
    herd_id: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    banned = db.execute(
        text("SELECT is_banned FROM devices WHERE id = :id"),
        {"id": device_id}
    ).scalar()

    if banned:
        raise HTTPException(status_code=403, detail="Device banned")

    university_domain = None

    if herd_id:
        herd_type = "global"
    elif herd_type == "university":
        record = db.execute(
            text("""
                SELECT verified_university, university_domain
                FROM devices
                WHERE id = :id
            """),
            {"id": device_id}
        ).fetchone()

        if not record or not record.verified_university:
            raise HTTPException(
                status_code=403,
                detail="University verification required"
            )

        university_domain = record.university_domain
    elif herd_type != "local":
        raise HTTPException(status_code=400, detail="Invalid herd type")

    mod_result = run_first_pass(content)

    post_id = str(uuid.uuid4())

    db.execute(
        text("""
            INSERT INTO posts (id, content, lat, lng, device_id, herd_type, herd_id, university_domain)
            VALUES (:id, :content, :lat, :lng, :device_id, :herd_type, :herd_id, :university_domain)
        """),
        {
            "id": post_id,
            "content": content,
            "lat": lat,
            "lng": lng,
            "device_id": device_id,
            "herd_type": herd_type,
            "herd_id": herd_id,
            "university_domain": university_domain
        }
    )

    if mod_result.verdict != "PASS":
        hide_and_notify(post_id, device_id, mod_result.verdict, mod_result.reason, db)
        log_moderation(
            post_id=post_id,
            pass_type="first_pass",
            verdict=mod_result.verdict,
            category=mod_result.category,
            reason=mod_result.reason,
            confidence=mod_result.confidence,
            model=mod_result.model,
            db=db,
        )
        db.commit()
        return {"status": "moderated", "post_id": post_id}

    db.commit()
    background_tasks.add_task(trigger_second_pass, post_id, content, device_id)
    return {"status": "posted", "post_id": post_id}

@router.get("/feed")
def get_feed(
    device_id: str,
    lat: float,
    lng: float,
    herd_type: str = "local",
    herd_id: Optional[str] = None,
    db: Session = Depends(get_db)
):

    # GLOBAL HERD FEED
    if herd_id:
        posts = db.execute(
            text("""
                SELECT
                    p.id,
                    p.content,
                    p.created_at,
                    p.upvotes,
                    p.downvotes,
                    p.herd_type,
                    p.herd_id,
                    CAST((p.upvotes - p.downvotes) AS FLOAT) /
                    (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2) AS score,
                    COALESCE(cc.cnt, 0) AS comment_count,
                    COALESCE(rc.cnt, 0) AS repost_count
                FROM posts p
                LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) cc
                    ON p.id = cc.post_id
                LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM reposts GROUP BY post_id) rc
                    ON p.id = rc.post_id
                WHERE p.herd_id = :herd_id
                  AND p.is_hidden = FALSE
                ORDER BY score DESC
                LIMIT 50
            """),
            {"herd_id": herd_id}
        ).fetchall()

        return [dict(p._mapping) for p in posts]

    if herd_type == "local":
        # "For you" feed — posts from herds the user has joined
        posts = db.execute(
        text("""
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.upvotes,
                p.downvotes,
                p.herd_type,
                p.herd_id,
                CAST((p.upvotes - p.downvotes) AS FLOAT) /
                (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2) AS score,
                COALESCE(cc.cnt, 0) AS comment_count,
                COALESCE(rc.cnt, 0) AS repost_count
            FROM posts p
            INNER JOIN herd_memberships hm
                ON p.herd_id = hm.herd_id AND hm.device_id = :device_id
            LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) cc
                ON p.id = cc.post_id
            LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM reposts GROUP BY post_id) rc
                ON p.id = rc.post_id
            WHERE p.is_hidden = FALSE
              AND p.herd_id IS NOT NULL
            ORDER BY score DESC
            LIMIT 50
        """),
        {"device_id": device_id}
        ).fetchall()

    elif herd_type == "university":
        record = db.execute(
            text("""
                SELECT verified_university, university_domain
                FROM devices
                WHERE id = :id
            """),
            {"id": device_id}
        ).fetchone()

        if not record or not record.verified_university:
            raise HTTPException(
                status_code=403,
                detail="University verification required"
            )

        posts = db.execute(
            text("""
                SELECT
                    p.id,
                    p.content,
                    p.created_at,
                    p.upvotes,
                    p.downvotes,
                    p.herd_type,
                    p.herd_id,
                    CAST((p.upvotes - p.downvotes) AS FLOAT) /
                    (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 + 2) AS score,
                    COALESCE(cc.cnt, 0) AS comment_count,
                    COALESCE(rc.cnt, 0) AS repost_count
                FROM posts p
                LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) cc
                    ON p.id = cc.post_id
                LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM reposts GROUP BY post_id) rc
                    ON p.id = rc.post_id
                WHERE p.herd_type = 'university'
                  AND p.university_domain = :domain
                  AND p.is_hidden = FALSE
                ORDER BY score DESC
                LIMIT 50
                """),
            {"domain": record.university_domain}
        ).fetchall()

    else:
        raise HTTPException(status_code=400, detail="Invalid herd type")

    return [dict(p._mapping) for p in posts]

@router.post("/vote")
def vote_post(
    post_id: str,
    device_id: str,
    vote: int,
    db: Session = Depends(get_db)
):
    if vote not in (-1, 1):
        raise HTTPException(status_code=400, detail="Invalid vote")

    banned = db.execute(
        text("SELECT is_banned FROM devices WHERE id = :id"),
        {"id": device_id}
    ).scalar()

    if banned:
        raise HTTPException(status_code=403, detail="Device banned")

    existing = db.execute(
        text("""
            SELECT vote FROM votes
            WHERE post_id = :post_id AND device_id = :device_id
        """),
        {"post_id": post_id, "device_id": device_id}
    ).fetchone()

    if existing:
        if existing.vote == vote:
            return {"status": "unchanged"}

        if existing.vote == 1:
            db.execute(
                text("UPDATE posts SET upvotes = upvotes - 1 WHERE id = :id"),
                {"id": post_id}
            )
        else:
            db.execute(
                text("UPDATE posts SET downvotes = downvotes - 1 WHERE id = :id"),
                {"id": post_id}
            )

        db.execute(
            text("""
                UPDATE votes
                SET vote = :vote
                WHERE post_id = :post_id AND device_id = :device_id
            """),
            {"vote": vote, "post_id": post_id, "device_id": device_id}
        )

    else:
        db.execute(
            text("""
                INSERT INTO votes (post_id, device_id, vote)
                VALUES (:post_id, :device_id, :vote)
            """),
            {"post_id": post_id, "device_id": device_id, "vote": vote}
        )

    if vote == 1:
        db.execute(
            text("UPDATE posts SET upvotes = upvotes + 1 WHERE id = :id"),
            {"id": post_id}
        )
    else:
        db.execute(
            text("UPDATE posts SET downvotes = downvotes + 1 WHERE id = :id"),
            {"id": post_id}
        )

    auto_hide_if_needed(post_id, db)

    db.commit()
    return {"status": "voted"}

@router.get("/my-posts")
def get_my_posts(
    device_id: str,
    db: Session = Depends(get_db)
):
    posts = db.execute(
        text("""
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.upvotes,
                p.downvotes,
                p.herd_type,
                p.herd_id,
                COALESCE(cc.cnt, 0) AS comment_count,
                COALESCE(rc.cnt, 0) AS repost_count
            FROM posts p
            LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) cc
                ON p.id = cc.post_id
            LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM reposts GROUP BY post_id) rc
                ON p.id = rc.post_id
            WHERE p.device_id = :device_id
              AND p.is_hidden = FALSE
            ORDER BY p.created_at DESC
        """),
        {"device_id": device_id}
    ).fetchall()

    return [dict(p._mapping) for p in posts]


@router.post("/repost")
def repost_post(
    post_id: str,
    device_id: str,
    db: Session = Depends(get_db),
):
    existing = db.execute(
        text("""
            SELECT 1 FROM reposts
            WHERE post_id = :post_id AND device_id = :device_id
        """),
        {"post_id": post_id, "device_id": device_id},
    ).fetchone()

    if existing:
        return {"status": "already_reposted"}

    db.execute(
        text("""
            INSERT INTO reposts (post_id, device_id)
            VALUES (:post_id, :device_id)
        """),
        {"post_id": post_id, "device_id": device_id},
    )
    db.commit()
    return {"status": "reposted"}


@router.delete("/repost")
def unrepost_post(
    post_id: str,
    device_id: str,
    db: Session = Depends(get_db),
):
    db.execute(
        text("""
            DELETE FROM reposts
            WHERE post_id = :post_id AND device_id = :device_id
        """),
        {"post_id": post_id, "device_id": device_id},
    )
    db.commit()
    return {"status": "unreposted"}


@router.get("/reposts")
def get_my_reposts(
    device_id: str,
    db: Session = Depends(get_db),
):
    posts = db.execute(
        text("""
            SELECT
                p.id,
                p.content,
                p.created_at,
                p.upvotes,
                p.downvotes,
                p.herd_type,
                p.herd_id,
                COALESCE(cc.cnt, 0) AS comment_count,
                COALESCE(rc.cnt, 0) AS repost_count
            FROM reposts r
            JOIN posts p ON p.id = r.post_id
            LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) cc
                ON p.id = cc.post_id
            LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM reposts GROUP BY post_id) rc
                ON p.id = rc.post_id
            WHERE r.device_id = :device_id
              AND p.is_hidden = FALSE
            ORDER BY r.created_at DESC
        """),
        {"device_id": device_id},
    ).fetchall()
    return [dict(p._mapping) for p in posts]


@router.post("/report")
def report_post(
    post_id: str,
    device_id: str,
    reason: str,
    db: Session = Depends(get_db)
):
    banned = db.execute(
        text("SELECT is_banned FROM devices WHERE id = :id"),
        {"id": device_id}
    ).scalar()

    if banned:
        raise HTTPException(status_code=403, detail="Device banned")

    existing = db.execute(
        text("""
            SELECT 1 FROM reports
            WHERE post_id = :post_id AND device_id = :device_id
        """),
        {"post_id": post_id, "device_id": device_id}
    ).fetchone()

    if existing:
        return {"status": "already_reported"}

    db.execute(
        text("""
            INSERT INTO reports (post_id, device_id, reason)
            VALUES (:post_id, :device_id, :reason)
        """),
        {"post_id": post_id, "device_id": device_id, "reason": reason}
    )

    db.execute(
        text("""
            UPDATE posts
            SET reports = reports + 1
            WHERE id = :id
        """),
        {"id": post_id}
    )

    auto_hide_if_needed(post_id, db)

    db.commit()
    return {"status": "reported"}
