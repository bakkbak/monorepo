from __future__ import annotations

from typing import Callable, Optional

from bakbak_mod import config
from bakbak_mod.detectors import (
    CasteDetector,
    DoxxingDetector,
    GenderDetector,
    LegalDetector,
    PoliticalDetector,
    RegionalDetector,
    ReligiousDetector,
    SelfHarmDetector,
    SexualDetector,
    ThreatsDetector,
)
from bakbak_mod.models import LLMReviewResult, ModerationResult
from bakbak_mod.pipeline import Pipeline

_pipeline: Optional[Pipeline] = None


def _get_pipeline() -> Pipeline:
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    p = Pipeline()

    p.register_detector(CasteDetector())
    p.register_detector(ReligiousDetector())
    p.register_detector(ThreatsDetector())
    p.register_detector(SexualDetector())
    p.register_detector(DoxxingDetector())
    p.register_detector(SelfHarmDetector())
    p.register_detector(LegalDetector())

    p.register_detector(RegionalDetector())
    p.register_detector(GenderDetector())
    p.register_detector(PoliticalDetector())

    if config.LLM_ENABLED and config.CLAUDE_API_KEY:
        from bakbak_mod.llm.claude_reviewer import ClaudeReviewer
        p.set_claude_reviewer(
            ClaudeReviewer(
                api_key=config.CLAUDE_API_KEY,
                tier2_model=config.LLM_TIER2_MODEL,
                tier1_model=config.LLM_TIER1_MODEL,
                timeout=config.LLM_TIMEOUT,
                max_retries=config.LLM_MAX_RETRIES,
            )
        )

    _pipeline = p
    return _pipeline


def moderate(
    text: str,
    debug: bool = False,
    llm_callback: Optional[Callable[[LLMReviewResult], None]] = None,
) -> ModerationResult:
    pipeline = _get_pipeline()
    return pipeline.moderate(text, debug=debug or config.DEBUG, llm_callback=llm_callback)


def reset():
    global _pipeline
    _pipeline = None
