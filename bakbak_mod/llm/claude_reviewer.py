"""Claude API-based moderation reviewer.

Calls Claude to review borderline/ambiguous content that rule-based
detectors are not confident about. Supports both sync (Tier 2) and
async (Tier 1) review modes.
"""

from __future__ import annotations

import json
import logging
import re
from typing import List, Optional, Tuple

from bakbak_mod import config
from bakbak_mod.llm.prompts import (
    MODERATION_SYSTEM_PROMPT,
    REVIEW_USER_PROMPT,
    build_rule_summary,
)
from bakbak_mod.models import Category, DetectorResult, Verdict

logger = logging.getLogger("bakbak_mod.llm")

_CATEGORY_MAP = {c.value: c for c in Category}

_VERDICT_MAP = {
    "CLEAN": Verdict.CLEAN,
    "FLAG": Verdict.FLAG,
    "TAKEDOWN": Verdict.TAKEDOWN,
}


class ClaudeReviewer:

    def __init__(
        self,
        api_key: str,
        tier2_model: str = "claude-haiku-4-5",
        tier1_model: str = "claude-haiku-4-5",
        timeout: int = 10,
        max_retries: int = 1,
    ):
        self._api_key = api_key
        self._tier2_model = tier2_model
        self._tier1_model = tier1_model
        self._timeout = timeout
        self._max_retries = max_retries
        self._sync_client = None
        self._async_client = None

    def _get_sync_client(self):
        if self._sync_client is None:
            import anthropic
            self._sync_client = anthropic.Anthropic(api_key=self._api_key)
        return self._sync_client

    def _get_async_client(self):
        if self._async_client is None:
            import anthropic
            self._async_client = anthropic.AsyncAnthropic(api_key=self._api_key)
        return self._async_client

    def _build_messages(
        self, text: str, rule_based_results: List[DetectorResult]
    ) -> Tuple[str, str]:
        """Build system and user messages for the API call."""
        truncated = text[: config.LLM_MAX_TEXT_LENGTH]
        rule_summary = build_rule_summary(rule_based_results)
        user_msg = REVIEW_USER_PROMPT.format(
            text=truncated, rule_based_summary=rule_summary
        )
        return MODERATION_SYSTEM_PROMPT, user_msg

    def _call_api_sync(
        self, text: str, rule_based_results: List[DetectorResult], model: str
    ) -> Optional[Tuple[str, dict]]:
        """Call Claude API synchronously. Returns (response_text, usage_dict) or None."""
        system_msg, user_msg = self._build_messages(text, rule_based_results)
        client = self._get_sync_client()
        last_error = None

        for attempt in range(1 + self._max_retries):
            try:
                response = client.messages.create(
                    model=model,
                    max_tokens=512,
                    system=system_msg,
                    messages=[{"role": "user", "content": user_msg}],
                    timeout=self._timeout,
                )
                response_text = response.content[0].text
                usage = {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                }
                if hasattr(response.usage, "cache_read_input_tokens"):
                    usage["cache_read_input_tokens"] = response.usage.cache_read_input_tokens
                if hasattr(response.usage, "cache_creation_input_tokens"):
                    usage["cache_creation_input_tokens"] = response.usage.cache_creation_input_tokens
                return response_text, usage
            except Exception as e:
                last_error = e
                if attempt < self._max_retries:
                    logger.info("Claude API error, retrying: %s", e)
                    continue

        logger.warning("Claude API error after retries: %s", last_error)
        return None

    async def _call_api_async(
        self, text: str, rule_based_results: List[DetectorResult], model: str
    ) -> Optional[Tuple[str, dict]]:
        """Call Claude API asynchronously. Returns (response_text, usage_dict) or None."""
        system_msg, user_msg = self._build_messages(text, rule_based_results)
        client = self._get_async_client()
        last_error = None

        for attempt in range(1 + self._max_retries):
            try:
                response = await client.messages.create(
                    model=model,
                    max_tokens=512,
                    system=system_msg,
                    messages=[{"role": "user", "content": user_msg}],
                    timeout=self._timeout,
                )
                response_text = response.content[0].text
                usage = {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                }
                if hasattr(response.usage, "cache_read_input_tokens"):
                    usage["cache_read_input_tokens"] = response.usage.cache_read_input_tokens
                if hasattr(response.usage, "cache_creation_input_tokens"):
                    usage["cache_creation_input_tokens"] = response.usage.cache_creation_input_tokens
                return response_text, usage
            except Exception as e:
                last_error = e
                if attempt < self._max_retries:
                    logger.info("Claude API async error, retrying: %s", e)
                    continue

        logger.warning("Claude API async error after retries: %s", last_error)
        return None

    def _parse_response(self, response_text: str) -> Tuple[List[DetectorResult], Verdict]:
        """Parse Claude's JSON response into DetectorResults and a Verdict.

        Returns (results, verdict). On parse failure returns ([], Verdict.CLEAN).
        """
        text = response_text.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                try:
                    data = json.loads(match.group())
                except json.JSONDecodeError:
                    logger.warning("Failed to parse Claude response as JSON")
                    return [], Verdict.CLEAN
            else:
                logger.warning("No JSON found in Claude response")
                return [], Verdict.CLEAN

        results = []
        for cat_entry in data.get("categories", []):
            cat_name = cat_entry.get("category", "").upper()
            flagged = cat_entry.get("flagged", False)
            if not flagged or cat_name not in _CATEGORY_MAP:
                continue

            category = _CATEGORY_MAP[cat_name]
            tier = config.TIER_MAP.get(category, 1)
            confidence = float(cat_entry.get("confidence", 0.5))
            reasoning = cat_entry.get("reasoning", "")

            results.append(DetectorResult(
                category=category,
                tier=tier,
                confidence=confidence,
                matched=True,
                matched_patterns=[f"llm:{cat_name.lower()}"],
                detector_name="ClaudeReviewer",
                detail=reasoning,
            ))

        overall = data.get("overall_assessment", "CLEAN").upper()
        verdict = _VERDICT_MAP.get(overall, Verdict.CLEAN)

        return results, verdict

    def review_sync(
        self, text: str, rule_based_results: List[DetectorResult]
    ) -> Tuple[List[DetectorResult], Verdict, dict]:
        """Synchronous review for Tier 2 borderline cases.

        Returns (llm_results, llm_verdict, token_usage).
        On failure returns ([], Verdict.CLEAN, {}).
        """
        result = self._call_api_sync(text, rule_based_results, self._tier2_model)
        if result is None:
            return [], Verdict.CLEAN, {}

        response_text, usage = result
        llm_results, verdict = self._parse_response(response_text)
        return llm_results, verdict, usage

    async def review_async(
        self, text: str, rule_based_results: List[DetectorResult]
    ) -> Tuple[List[DetectorResult], Verdict, dict]:
        """Async review for Tier 1 cases.

        Returns (llm_results, llm_verdict, token_usage).
        On failure returns ([], Verdict.CLEAN, {}).
        """
        result = await self._call_api_async(text, rule_based_results, self._tier1_model)
        if result is None:
            return [], Verdict.CLEAN, {}

        response_text, usage = result
        llm_results, verdict = self._parse_response(response_text)
        return llm_results, verdict, usage
