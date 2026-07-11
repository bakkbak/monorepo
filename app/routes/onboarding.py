from typing import Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from ..deps import get_db

router = APIRouter()


class OnboardingPayload(BaseModel):
    device_id: str
    university: Optional[str] = None
    university_other: Optional[str] = None
    interests: List[str] = []
    interest_categories: Dict[str, str] = {}
    date_of_birth: Optional[str] = None
    gender: str = "prefer_not_to_say"
    gender_self_describe: Optional[str] = None
    academic_year: str = "other"
    circle_ids: List[str] = []
    first_experience: str = "browse_trending"


@router.post("/complete")
def complete_onboarding(payload: OnboardingPayload, db: Session = Depends(get_db)):
    db.execute(
        text("""
            INSERT INTO device_profiles (
                device_id, university, university_other, date_of_birth,
                gender, gender_self_describe, academic_year, first_experience
            ) VALUES (
                :device_id, :university, :university_other, :date_of_birth,
                :gender, :gender_self_describe, :academic_year, :first_experience
            )
            ON CONFLICT (device_id) DO UPDATE SET
                university = EXCLUDED.university,
                university_other = EXCLUDED.university_other,
                date_of_birth = EXCLUDED.date_of_birth,
                gender = EXCLUDED.gender,
                gender_self_describe = EXCLUDED.gender_self_describe,
                academic_year = EXCLUDED.academic_year,
                first_experience = EXCLUDED.first_experience,
                onboarding_completed_at = NOW()
        """),
        {
            "device_id": payload.device_id,
            "university": payload.university,
            "university_other": payload.university_other,
            "date_of_birth": payload.date_of_birth,
            "gender": payload.gender,
            "gender_self_describe": payload.gender_self_describe,
            "academic_year": payload.academic_year,
            "first_experience": payload.first_experience,
        },
    )

    db.execute(
        text("DELETE FROM device_interests WHERE device_id = :device_id"),
        {"device_id": payload.device_id},
    )
    for interest in payload.interests:
        category = payload.interest_categories.get(interest, "unknown")
        db.execute(
            text("""
                INSERT INTO device_interests (device_id, interest, category)
                VALUES (:device_id, :interest, :category)
                ON CONFLICT (device_id, interest) DO NOTHING
            """),
            {
                "device_id": payload.device_id,
                "interest": interest,
                "category": category,
            },
        )

    for herd_id in payload.circle_ids:
        db.execute(
            text("""
                INSERT INTO herd_memberships (device_id, herd_id)
                VALUES (:device_id, :herd_id)
                ON CONFLICT (device_id, herd_id) DO NOTHING
            """),
            {"device_id": payload.device_id, "herd_id": herd_id},
        )

    db.commit()
    return {"status": "ok"}


@router.get("/status")
def get_onboarding_status(device_id: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT 1 FROM device_profiles WHERE device_id = :device_id"),
        {"device_id": device_id},
    ).fetchone()
    return {"completed": row is not None}
