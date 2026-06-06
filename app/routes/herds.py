from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from ..deps import get_db

router = APIRouter()


@router.post("/join")
def join_herd(device_id: str, herd_id: str, db: Session = Depends(get_db)):
    db.execute(
        text("""
            INSERT INTO herd_memberships (device_id, herd_id)
            VALUES (:device_id, :herd_id)
            ON CONFLICT (device_id, herd_id) DO NOTHING
        """),
        {"device_id": device_id, "herd_id": herd_id},
    )
    db.commit()
    return {"status": "joined"}


@router.post("/leave")
def leave_herd(device_id: str, herd_id: str, db: Session = Depends(get_db)):
    db.execute(
        text("""
            DELETE FROM herd_memberships
            WHERE device_id = :device_id AND herd_id = :herd_id
        """),
        {"device_id": device_id, "herd_id": herd_id},
    )
    db.commit()
    return {"status": "left"}


@router.get("/joined")
def get_joined_herds(device_id: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT herd_id FROM herd_memberships
            WHERE device_id = :device_id
            ORDER BY joined_at DESC
        """),
        {"device_id": device_id},
    ).fetchall()
    return [row.herd_id for row in rows]
