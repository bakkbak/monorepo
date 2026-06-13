import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from datetime import datetime, timedelta
import hashlib
import uuid
import random

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from ..deps import get_db

SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
SENDGRID_FROM = os.environ.get("SENDGRID_FROM_EMAIL", "noreply@bakkbak.com")


def _send_otp_email(to_email: str, otp: str):
    if not SENDGRID_API_KEY:
        print(f"[DEV OTP] {to_email} → {otp}")
        return
    message = Mail(
        from_email=SENDGRID_FROM,
        to_emails=to_email,
        subject="Your BakBak verification code",
        html_content=(
            f"<p>Your BakBak university verification code is:</p>"
            f"<h2 style='letter-spacing:4px'>{otp}</h2>"
            f"<p>This code expires in 10 minutes. Do not share it with anyone.</p>"
        ),
    )
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
    except Exception as e:
        print(f"[SendGrid error] {e}")
        raise HTTPException(status_code=500, detail="Failed to send OTP email")

router = APIRouter()

@router.post("/request")
def request_verification(
    device_id: str,
    email: str,
    db: Session = Depends(get_db)
):
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    domain = email.split("@")[1].lower()

    allowed = db.execute(
        text("""
            SELECT 1 FROM university_domains
            WHERE domain = :d AND active = TRUE
        """),
        {"d": domain}
    ).fetchone()

    if not allowed:
        raise HTTPException(
            status_code=403,
            detail="University not supported yet"
        )

    # (OPTIONAL) restrict allowed domains later
    # if domain not in ALLOWED_DOMAINS: ...

    otp = str(random.randint(100000, 999999))
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()

    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # delete old attempts
    db.execute(
        text("DELETE FROM email_verifications WHERE device_id = :d"),
        {"d": device_id}
    )

    db.execute(
        text("""
            INSERT INTO email_verifications
            (id, device_id, email, domain, otp, expires_at)
            VALUES (:id, :device_id, :email, :domain, :otp, :exp)
        """),
        {
            "id": uuid.uuid4(),
            "device_id": device_id,
            "email": email,
            "domain": domain,
            "otp": otp_hash,
            "exp": expires_at
        }
    )

    db.execute(
        text("""
            UPDATE devices
            SET verification_status = 'pending'
            WHERE id = :id
        """),
        {"id": device_id}
    )

    db.commit()

    _send_otp_email(email, otp)

    return {"status": "otp_sent"}

@router.post("/confirm")
def confirm_verification(
    device_id: str,
    otp: str,
    db: Session = Depends(get_db)
):
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()

    record = db.execute(
        text("""
            SELECT domain, expires_at
            FROM email_verifications
            WHERE device_id = :d AND otp = :otp
        """),
        {"d": device_id, "otp": otp_hash}
    ).fetchone()

    if not record:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    # mark device verified
    db.execute(
        text("""
            UPDATE devices
            SET verified_university = TRUE,
                university_domain = :domain,
                verification_status = 'verified'
            WHERE id = :id
        """),
        {"id": device_id, "domain": record.domain}
    )

    # cleanup sensitive data
    db.execute(
        text("DELETE FROM email_verifications WHERE device_id = :d"),
        {"d": device_id}
    )

    db.commit()

    return {
        "status": "verified",
        "university_domain": record.domain
    }

