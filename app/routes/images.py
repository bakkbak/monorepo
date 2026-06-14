import base64
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.sql import text

from ..deps import get_db

router = APIRouter()

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


class ImageUpload(BaseModel):
    post_id: str
    image_base64: str
    content_type: str = "image/jpeg"


@router.post("/upload")
def upload_image(body: ImageUpload, db: Session = Depends(get_db)):
    try:
        image_bytes = base64.b64decode(body.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image too large (max 5 MB)")

    if body.content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(status_code=400, detail="Unsupported image type")

    db.execute(
        text("""
            INSERT INTO post_images (post_id, data, content_type)
            VALUES (:post_id, :data, :content_type)
            ON CONFLICT (post_id) DO UPDATE SET data = :data, content_type = :content_type
        """),
        {"post_id": body.post_id, "data": image_bytes, "content_type": body.content_type},
    )
    db.execute(
        text("UPDATE posts SET image_url = :url WHERE id = :id"),
        {"url": f"/api/images/{body.post_id}", "id": body.post_id},
    )
    db.commit()
    return {"status": "uploaded", "image_url": f"/api/images/{body.post_id}"}


@router.get("/{post_id}")
def get_image(post_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT data, content_type FROM post_images WHERE post_id = :post_id"),
        {"post_id": post_id},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Image not found")

    return Response(
        content=bytes(row.data),
        media_type=row.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
