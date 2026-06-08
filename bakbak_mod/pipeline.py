from __future__ import annotations

import logging
import time
from typing import Callable, List, Optional

from bakbak_mod import config
from bakbak_mod.audit import build_audit_entry, write_audit_log
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import (
    Category,
    DetectorResult,
    LLMReviewResult,
    ModerationResult,
    Verdict,
)
from bakbak_mod.preprocess import is_allowlisted, preprocess

logger = logging.getLogger("bakbak_mod.pipeline")


class Pipeline:

    def __init__(self):
        self._detectors: List[BaseDetector] = []
        self._claude_reviewer = None  # Optional[ClaudeReviewer]

    def register_detector(self, detector: BaseDetector) -> None:
        self._detectors.append(detector)

    def set_claude_reviewer(self, reviewer) -> None:
        self._claude_reviewer = reviewer

    def _run_tier2_sync(self, text: str) -> List[DetectorResult]:
        results = []
        for d in self._detectors:
            if d.tier == 2 and config.ACTIVE_DETECTORS.get(d.category, False):
                results.append(d.detect(text))
        return results

    def _run_tier1(self, text: str) -> List[DetectorResult]:
        results = []
        for d in self._detectors:
            if d.tier == 1 and config.ACTIVE_DETECTORS.get(d.category, False):
                results.append(d.detect(text))
        return results

    def _apply_llm_tier2_sync(
        self,
        text: str,
        matched: List[DetectorResult],
        all_results: List[DetectorResult],
        verdict: Verdict,
        tier: int,
        categories: List[Category],
        confidence: float,
    ) -> tuple:
        """Run LLM sync review for Tier 2 borderline cases.

        Returns updated (verdict, tier, categories, confidence, llm_reviewed,
        llm_details, llm_token_usage).
        """
        llm_results, llm_verdict, token_usage = self._claude_reviewer.review_sync(
            text, all_results
        )

        if not llm_results:
            if not token_usage:
                # API failed — keep rule-based result
                return verdict, tier, categories, confidence, True, [], token_usage
            # LLM explicitly found no violations — disagrees with rule-based
            if verdict == Verdict.TAKEDOWN:
                logger.info("LLM found no violations, downgrading TAKEDOWN to FLAG")
                return Verdict.FLAG, 1, categories, confidence, True, [], token_usage
            return verdict, tier, categories, confidence, True, [], token_usage

        llm_categories = {r.category for r in llm_results}
        rule_categories = {r.category for r in matched}

        if rule_categories & llm_categories:
            # LLM confirms at least one rule-based category
            llm_confidence = max(r.confidence for r in llm_results)
            merged_confidence = max(confidence, (confidence + llm_confidence) / 2)
            merged_categories = list(rule_categories | llm_categories)
            return verdict, tier, merged_categories, merged_confidence, True, llm_results, token_usage
        else:
            # LLM disagrees — downgrade TAKEDOWN to FLAG
            if verdict == Verdict.TAKEDOWN:
                logger.info("LLM disagrees with TAKEDOWN, downgrading to FLAG")
                return Verdict.FLAG, 1, categories, confidence, True, llm_results, token_usage
            return verdict, tier, categories, confidence, True, llm_results, token_usage

    def moderate(
        self,
        text: str,
        debug: bool = False,
        llm_callback: Optional[Callable[[LLMReviewResult], None]] = None,
    ) -> ModerationResult:
        start = time.monotonic()

        preprocessed = preprocess(text)

        allowlisted = is_allowlisted(preprocessed)
        if allowlisted and not config.LLM_FORCE_REVIEW:
            result = ModerationResult(
                verdict=Verdict.CLEAN,
                tier=0,
                categories=[],
                confidence=0.0,
                details=[],
                original_text=text if debug else "",
                preprocessed_text=preprocessed if debug else "",
            )
            duration_ms = (time.monotonic() - start) * 1000
            if config.AUDIT_LOG_ENABLED:
                entry = build_audit_entry(result, duration_ms, text_length=len(text))
                entry["allowlisted"] = True
                write_audit_log(entry, config.AUDIT_LOG_PATH)
            return result

        tier2_results = self._run_tier2_sync(preprocessed)
        tier1_results = self._run_tier1(preprocessed)

        all_results = tier2_results + tier1_results

        matched = [r for r in all_results if r.matched]

        if not matched:
            verdict = Verdict.CLEAN
            tier = 0
            categories = []
            confidence = 0.0
        else:
            has_tier2 = any(r.tier == 2 for r in matched)
            if has_tier2:
                verdict = Verdict.TAKEDOWN
                tier = 2
            else:
                verdict = Verdict.FLAG
                tier = 1

            categories = list({r.category for r in matched})
            confidence = max(r.confidence for r in matched)

        # --- LLM Review Decision ---
        llm_reviewed = False
        llm_pending = False
        llm_details: List[DetectorResult] = []
        llm_token_usage: dict = {}

        if self._claude_reviewer and config.LLM_ENABLED:
            from bakbak_mod.llm.triggers import should_trigger_llm_review

            should_review = config.LLM_FORCE_REVIEW or should_trigger_llm_review(
                all_results,
                preprocessed,
                config.LLM_REVIEW_THRESHOLD_LOW,
                config.LLM_REVIEW_THRESHOLD_HIGH,
            )
            if should_review:
                if matched:
                    # Detectors fired (Tier 1 or Tier 2) — sync LLM review
                    (
                        verdict, tier, categories, confidence,
                        llm_reviewed, llm_details, llm_token_usage,
                    ) = self._apply_llm_tier2_sync(
                        preprocessed, matched, all_results,
                        verdict, tier, categories, confidence,
                    )
                else:
                    # Clean but suspicious (long text, possible evasion)
                    # Sync LLM review to catch what rules missed
                    llm_results_sync, llm_verdict_sync, token_usage_sync = (
                        self._claude_reviewer.review_sync(preprocessed, all_results)
                    )
                    llm_reviewed = True
                    llm_details = llm_results_sync
                    llm_token_usage = token_usage_sync

                    if llm_results_sync:
                        # LLM found something rules missed
                        llm_matched = [r for r in llm_results_sync if r.matched]
                        if llm_matched:
                            has_llm_tier2 = any(r.tier == 2 for r in llm_matched)
                            if has_llm_tier2:
                                verdict = Verdict.TAKEDOWN
                                tier = 2
                            else:
                                verdict = Verdict.FLAG
                                tier = 1
                            categories = list({r.category for r in llm_matched})
                            confidence = max(r.confidence for r in llm_matched)
                            matched = llm_matched

        result = ModerationResult(
            verdict=verdict,
            tier=tier,
            categories=categories,
            confidence=confidence,
            details=all_results if debug else matched,
            original_text=text if debug else "",
            preprocessed_text=preprocessed if debug else "",
            llm_reviewed=llm_reviewed,
            llm_pending=llm_pending,
            llm_details=llm_details,
            llm_token_usage=llm_token_usage,
        )

        duration_ms = (time.monotonic() - start) * 1000
        if config.AUDIT_LOG_ENABLED:
            entry = build_audit_entry(result, duration_ms, text_length=len(text))
            write_audit_log(entry, config.AUDIT_LOG_PATH)

        return result

    def _schedule_async_review(
        self,
        text: str,
        all_results: List[DetectorResult],
        original_verdict: Verdict,
        callback: Callable[[LLMReviewResult], None],
    ) -> None:
        """Schedule an async LLM review in a background thread.

        Calls the callback with an LLMReviewResult when done.
        """
        import threading

        def _run():
            try:
                import asyncio
                llm_results, llm_verdict, token_usage = asyncio.run(
                    self._claude_reviewer.review_async(text, all_results)
                )
            except Exception:
                # Fall back to sync if async fails
                try:
                    llm_results, llm_verdict, token_usage = (
                        self._claude_reviewer.review_sync(text, all_results)
                    )
                except Exception as e:
                    logger.warning("Async LLM review failed: %s", e)
                    return

            llm_categories = [r.category for r in llm_results]
            llm_confidence = max((r.confidence for r in llm_results), default=0.0)

            review_result = LLMReviewResult(
                original_verdict=original_verdict,
                llm_verdict=llm_verdict,
                llm_categories=llm_categories,
                llm_confidence=llm_confidence,
                llm_details=llm_results,
                token_usage=token_usage,
                changed=llm_verdict != original_verdict,
            )
            try:
                callback(review_result)
            except Exception as e:
                logger.warning("LLM review callback error: %s", e)

        thread = threading.Thread(target=_run, daemon=True)
        thread.start()
