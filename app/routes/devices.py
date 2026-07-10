from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from ..deps import get_db
import hashlib
import uuid

router = APIRouter()


@router.get("/me")
def get_device_status(device_id: str, db: Session = Depends(get_db)):
    from fastapi import HTTPException

    row = db.execute(
        text("""
            SELECT verified_university, university_domain, verification_status
            FROM devices WHERE id = :id
        """),
        {"id": device_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Device not found")
    return {
        "verified_university": row.verified_university,
        "university_domain": row.university_domain,
        "verification_status": row.verification_status,
    }


@router.post("/register")
def register_device(device_fingerprint: str, db: Session = Depends(get_db)):
    device_hash = hashlib.sha256(device_fingerprint.encode()).hexdigest()

    result = db.execute(
        text("select id, is_banned from devices where device_hash = :h"),
        {"h": device_hash},
    ).fetchone()

    if result:
        return {"device_id": str(result.id), "banned": result.is_banned}

    device_id = str(uuid.uuid4())
    db.execute(
        text("insert into devices (id, device_hash) values (:id, :h)"),
        {"id": device_id, "h": device_hash},
    )
    db.commit()

    return {"device_id": str(device_id), "banned": False}
