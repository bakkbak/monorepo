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

    Triggers when:
    1. Any detector fired (Tier 1 or Tier 2) — always review matched content
    2. No detectors fired but text is long (>500 chars) — possible evasion
    """
    matched = [r for r in rule_results if r.matched]

    # Any detector match → always trigger LLM
    if matched:
        return True

    # Long clean text → possible evasion
    if _is_long_unmatched(matched, text):
        return True

    return False


def _is_long_unmatched(
    matched: List[DetectorResult],
    text: str,
    min_length: int = 500,
) -> bool:
    """Long text passed rule-based — possible evasion."""
    return len(matched) == 0 and len(text) > min_length
