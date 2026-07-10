from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import text

from ..deps import get_db

router = APIRouter()


@router.get("/")
def get_notifications(device_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT id, type, title, body, post_id, is_read, created_at
            FROM notifications
            WHERE device_id = :device_id
            ORDER BY created_at DESC
            LIMIT 50
        """),
        {"device_id": device_id},
    ).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/count")
def get_unread_count(device_id: str, db: Session = Depends(get_db)):
    count = db.execute(
        text("""
            SELECT COUNT(*) FROM notifications
            WHERE device_id = :device_id AND is_read = FALSE
        """),
        {"device_id": device_id},
    ).scalar()
    return {"unread_count": count}


@router.post("/read")
def mark_read(device_id: str, notification_ids: List[str], db: Session = Depends(get_db)):
    if not notification_ids:
        return {"status": "ok"}

    db.execute(
        text("""
            UPDATE notifications
            SET is_read = TRUE
            WHERE device_id = :device_id AND id = ANY(:ids)
        """),
        {"device_id": device_id, "ids": notification_ids},
    )
    db.commit()
    return {"status": "ok"}
