from __future__ import annotations

from bakbak_mod.config import DATA_DIR
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import Category, DetectorResult


class SelfHarmDetector(BaseDetector):
    def __init__(self):
        data = self._load_json(DATA_DIR / "self_harm_terms.json")
        self._patterns = data.get("patterns", [])
        self._crisis = set(t.lower() for t in data.get("crisis_keywords", []))
        self._glorification = set(t.lower() for t in data.get("glorification", []))
        self._methods = set(t.lower() for t in data.get("method_terms", []))
        self._all_terms = self._crisis | self._glorification | self._methods

    @property
    def category(self) -> Category:
        return Category.SELF_HARM

    @property
    def tier(self) -> int:
        return 2

    def detect(self, text: str) -> DetectorResult:
        found_words = self._scan_words(text, self._all_terms)
        found_patterns = self._scan_patterns(text, self._patterns)
        all_matches = found_words + found_patterns

        if not all_matches:
            return self._no_match()

        has_method = any(m in self._methods for m in found_words)
        has_crisis = any(m in self._crisis for m in found_words)

        confidence = 0.6
        if has_method:
            confidence = 0.9
        elif has_crisis:
            confidence = 0.8

        confidence = min(confidence + len(all_matches) * 0.05, 1.0)

        return self._match(
            confidence=confidence,
            patterns=all_matches,
            detail=f"Self-harm/suicide content detected: {', '.join(all_matches[:5])}",
        )
