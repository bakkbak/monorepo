from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Optional

from bakbak_mod.models import ModerationResult

logger = logging.getLogger("bakbak_mod.audit")


def build_audit_entry(
    result: ModerationResult, duration_ms: float, text_length: int = 0
) -> dict:
    return {
        "timestamp": time.time(),
        "verdict": result.verdict.value,
        "tier": result.tier,
        "categories": [c.value for c in result.categories],
        "confidence": round(result.confidence, 4),
        "duration_ms": round(duration_ms, 2),
        "detectors_fired": [
            {
                "detector": d.detector_name,
                "category": d.category.value,
                "matched": d.matched,
                "confidence": round(d.confidence, 4),
                "patterns": d.matched_patterns,
            }
            for d in result.details
            if d.matched
        ],
        "text_length": text_length,
        "llm_reviewed": result.llm_reviewed,
        "llm_pending": result.llm_pending,
        **(
            {"llm_token_usage": result.llm_token_usage}
            if result.llm_token_usage
            else {}
        ),
        **(
            {
                "llm_detectors": [
                    {
                        "category": d.category.value,
                        "confidence": round(d.confidence, 4),
                        "detail": d.detail,
                    }
                    for d in result.llm_details
                ]
            }
            if result.llm_details
            else {}
        ),
    }


def write_audit_log(entry: dict, log_path: Optional[str] = None) -> None:
    line = json.dumps(entry, ensure_ascii=False)
    logger.info(line)

    if log_path:
        p = Path(log_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "a", encoding="utf-8") as f:
            f.write(line + "\n")
