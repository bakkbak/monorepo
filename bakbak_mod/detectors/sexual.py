from __future__ import annotations

from bakbak_mod.config import DATA_DIR
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import Category, DetectorResult


class SexualDetector(BaseDetector):
    def __init__(self):
        data = self._load_json(DATA_DIR / "sexual_terms.json")
        self._patterns = data.get("patterns", [])
        self._explicit = set(t.lower() for t in data.get("explicit", []))
        self._csam = set(t.lower() for t in data.get("csam_indicators", []))
        self._non_consensual = set(t.lower() for t in data.get("non_consensual", []))
        self._all_terms = self._explicit | self._csam | self._non_consensual

    @property
    def category(self) -> Category:
        return Category.SEXUAL

    @property
    def tier(self) -> int:
        return 2

    def detect(self, text: str) -> DetectorResult:
        found_words = self._scan_words(text, self._all_terms)
        found_patterns = self._scan_patterns(text, self._patterns)
        all_matches = found_words + found_patterns

        if not all_matches:
            return self._no_match()

        has_csam = any(m in self._csam for m in found_words)
        has_nc = any(m in self._non_consensual for m in found_words)

        confidence = 0.6
        if has_csam:
            confidence = 0.95
        elif has_nc:
            confidence = 0.85

        confidence = min(confidence + len(all_matches) * 0.05, 1.0)

        detail_parts = []
        if has_csam:
            detail_parts.append("CSAM indicators")
        if has_nc:
            detail_parts.append("non-consensual content")
        detail_parts.append(f"matches: {', '.join(all_matches[:5])}")

        return self._match(
            confidence=confidence,
            patterns=all_matches,
            detail="; ".join(detail_parts),
        )
