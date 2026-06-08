from __future__ import annotations

from bakbak_mod.config import DATA_DIR
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import Category, DetectorResult


class LegalDetector(BaseDetector):

    def __init__(self):
        data = self._load_json(DATA_DIR / "legal_terms.json")
        self._defamation_patterns = data.get("defamation_patterns", [])
        self._patterns = data.get("patterns", [])
        self._impersonation = set(t.lower() for t in data.get("impersonation", []))
        self._obscenity = set(t.lower() for t in data.get("obscenity_keywords", []))
        self._illegal = set(t.lower() for t in data.get("illegal_activity", []))
        self._all_terms = self._impersonation | self._obscenity | self._illegal

    @property
    def category(self) -> Category:
        return Category.LEGAL

    @property
    def tier(self) -> int:
        return 2

    def detect(self, text: str) -> DetectorResult:
        found_words = self._scan_words(text, self._all_terms)
        found_defamation = self._scan_patterns(text, self._defamation_patterns)
        found_patterns = self._scan_patterns(text, self._patterns)
        all_matches = found_words + found_defamation + found_patterns

        if not all_matches:
            return self._no_match()

        has_impersonation = any(m in self._impersonation for m in found_words)
        has_defamation = len(found_defamation) > 0

        confidence = 0.5
        if has_impersonation:
            confidence = 0.8
        elif has_defamation:
            confidence = 0.7

        confidence = min(confidence + len(all_matches) * 0.1, 1.0)

        return self._match(
            confidence=confidence,
            patterns=all_matches,
            detail=f"Legal violation detected: {', '.join(all_matches[:5])}",
        )
