"""LLM review trigger logic.

Pure functions that decide whether the LLM should review a moderation result.
Kept separate from Pipeline for testability.
"""

from __future__ import annotations

from typing import List

from bakbak_mod.models import DetectorResult


def should_trigger_llm_review(
    rule_results: List[DetectorResult],
    text: str,
    threshold_low: float = 0.5,
    threshold_high: float = 0.85,
) -> bool:
    """Determine if LLM review is warranted.

    Always returns True when called — every message should be reviewed by
    the LLM so that content which slips past keyword detectors is still
    caught.  The caller already gates on ``config.LLM_ENABLED``.
    """
    return True


def _is_long_unmatched(
    matched: List[DetectorResult],
    text: str,
    min_length: int = 500,
) -> bool:
    """Long text passed rule-based — possible evasion."""
    return len(matched) == 0 and len(text) > min_length
