from __future__ import annotations

import logging
import os
import time
import uuid

import anthropic
from sqlalchemy.sql import text

from ..db import SessionLocal
from .actions import hide_and_notify, log_moderation
from .prompts import SECOND_PASS_SYSTEM_PROMPT

logger = logging.getLogger("bakbak.moderation.second_pass")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.environ.get("MODERATION_MODEL", "claude-sonnet-4-20250514")

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
    if not ANTHROPIC_API_KEY:
        logger.debug("ANTHROPIC_API_KEY not set, skipping second-pass")
        return

    start = time.monotonic()
    db = SessionLocal()
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=150,
            system=SECOND_PASS_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": content},
            ],
            temperature=0.0,
        )

        raw_output = message.content[0].text
        usage = message.usage
        latency_ms = int((time.monotonic() - start) * 1000)

        result = parse_moderation_response(raw_output)

        log_moderation(
            post_id=post_id,
            pass_type="second_pass",
            verdict=result["verdict"],
            category=result["category"],
            reason=result["reason"],
            confidence=result["confidence"],
            model=CLAUDE_MODEL,
            db=db,
            prompt_tokens=usage.input_tokens if usage else None,
            completion_tokens=usage.output_tokens if usage else None,
            latency_ms=latency_ms,
        )

        if result["verdict"] in ACTIONABLE_VERDICTS:
            hide_and_notify(post_id, device_id, result["verdict"], result["reason"], db)

        db.commit()
        logger.info(f"Second-pass complete for post {post_id}: {result['verdict']}")

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
                model=CLAUDE_MODEL,
                db=db,
                latency_ms=latency_ms,
                error=str(e),
            )
            db.commit()
        except Exception:
            pass
    finally:
        db.close()
