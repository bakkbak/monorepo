from __future__ import annotations

import logging
import os
from dataclasses import dataclass

logger = logging.getLogger("bakbak.moderation.first_pass")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

CATEGORY_MAP = {
    "CASTE": "POLITICAL",
    "RELIGIOUS": "POLITICAL",
    "THREATS": "SAFETY",
    "SEXUAL": "SAFETY",
    "DOXXING": "DOXXING",
    "SELF_HARM": "SAFETY",
    "LEGAL": "SAFETY",
    "REGIONAL": "POLITICAL",
    "GENDER": "SAFETY",
    "POLITICAL": "POLITICAL",
}

VERDICT_MAP = {
    "CLEAN": "PASS",
    "FLAG": "STRESS",
    "TAKEDOWN": "TAKEDOWN",
}


@dataclass
class FirstPassResult:
    verdict: str  # PASS | STRESS | TAKEDOWN
    category: str  # DOXXING | MOBILISATION | POLITICAL | CODED_HARM | SAFETY | NONE
    reason: str
    confidence: str  # HIGH | MEDIUM | LOW
    model: str
    tier: int


def _confidence_to_label(score: float) -> str:
    if score >= 0.8:
        return "HIGH"
    if score >= 0.5:
        return "MEDIUM"
    return "LOW"


def run_first_pass(content: str) -> FirstPassResult:
    try:
        import bakbak_mod
    except ImportError:
        logger.warning("bakbak-mod not installed, skipping first-pass")
        return FirstPassResult(
            verdict="PASS",
            category="NONE",
            reason="No harm detected.",
            confidence="LOW",
            model="none",
            tier=0,
        )

    if ANTHROPIC_API_KEY and not bakbak_mod.config.LLM_ENABLED:
        bakbak_mod.config.configure(claude_api_key=ANTHROPIC_API_KEY)

    result = bakbak_mod.moderate(content)

    verdict = VERDICT_MAP.get(result.verdict.value, "PASS")

    if verdict == "PASS":
        return FirstPassResult(
            verdict="PASS",
            category="NONE",
            reason="No harm detected.",
            confidence="LOW",
            model="bakbak-mod",
            tier=0,
        )

    categories = [c.value for c in result.categories]
    mapped_category = (
        CATEGORY_MAP.get(categories[0], "SAFETY") if categories else "SAFETY"
    )

    reason = ""
    if result.details:
        matched = [d for d in result.details if d.matched]
        if matched:
            reason = f"Detected: {matched[0].category.value.lower()}"
            if matched[0].matched_patterns:
                reason += f" ({matched[0].matched_patterns[0]})"

    model = "bakbak-mod"
    if result.llm_reviewed:
        model = "bakbak-mod+claude"

    return FirstPassResult(
        verdict=verdict,
        category=mapped_category,
        reason=reason or f"Flagged by {model}",
        confidence=_confidence_to_label(result.confidence),
        model=model,
        tier=result.tier,
    )
