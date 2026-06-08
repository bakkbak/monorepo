from __future__ import annotations

import logging
import os
import time
import uuid

import httpx
from sqlalchemy.sql import text

from ..db import SessionLocal
from .actions import hide_and_notify, log_moderation
from .prompts import SECOND_PASS_SYSTEM_PROMPT

logger = logging.getLogger("bakbak.moderation.second_pass")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODERATION_MODEL", "gpt-4o-mini")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

ACTIONABLE_VERDICTS = {"STRESS", "TAKEDOWN"}


def parse_moderation_response(raw: str) -> dict:
    result = {"verdict": "PASS", "category": "NONE", "reason": "No harm detected.", "confidence": "LOW"}

    for line in raw.strip().splitlines():
        line = line.strip()
        if line.upper().startswith("VERDICT:"):
            val = line.split(":", 1)[1].strip().upper()
            if val in ("PASS", "STRESS", "TAKEDOWN"):
                result["verdict"] = val
        elif line.upper().startswith("CATEGORY:"):
            result["category"] = line.split(":", 1)[1].strip().upper()
        elif line.upper().startswith("REASON:"):
            result["reason"] = line.split(":", 1)[1].strip()
        elif line.upper().startswith("CONFIDENCE:"):
            result["confidence"] = line.split(":", 1)[1].strip().upper()

    return result


async def trigger_second_pass(post_id: str, content: str, device_id: str) -> None:
    if not OPENAI_API_KEY:
        logger.debug("OPENAI_API_KEY not set, skipping second-pass")
        return

    start = time.monotonic()
    db = SessionLocal()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OPENAI_MODEL,
                    "messages": [
                        {"role": "system", "content": SECOND_PASS_SYSTEM_PROMPT},
                        {"role": "user", "content": content},
                    ],
                    "temperature": 0.0,
                    "max_tokens": 150,
                },
            )
            response.raise_for_status()

        data = response.json()
        raw_output = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        latency_ms = int((time.monotonic() - start) * 1000)

        result = parse_moderation_response(raw_output)

        log_moderation(
            post_id=post_id,
            pass_type="second_pass",
            verdict=result["verdict"],
            category=result["category"],
            reason=result["reason"],
            confidence=result["confidence"],
            model=OPENAI_MODEL,
            db=db,
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            latency_ms=latency_ms,
        )

        if result["verdict"] in ACTIONABLE_VERDICTS:
            hide_and_notify(post_id, device_id, result["verdict"], result["reason"], db)

        db.commit()

    except Exception as e:
        logger.error(f"Second-pass moderation failed for post {post_id}: {e}")
        try:
            latency_ms = int((time.monotonic() - start) * 1000)
            log_moderation(
                post_id=post_id,
                pass_type="second_pass",
                verdict="ERROR",
                category="NONE",
                reason="API call failed",
                confidence="LOW",
                model=OPENAI_MODEL,
                db=db,
                latency_ms=latency_ms,
                error=str(e),
            )
            db.commit()
        except Exception:
            pass
    finally:
        db.close()
