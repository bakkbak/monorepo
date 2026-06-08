from __future__ import annotations

from bakbak_mod.config import DATA_DIR
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import Category, DetectorResult


class ReligiousDetector(BaseDetector):

    def __init__(self):
        data = self._load_json(DATA_DIR / "religious_terms.json")
        self._patterns = data.get("patterns", [])
        slurs = set(s.lower() for s in data.get("slurs", []))
        phrases = set(p.lower() for p in data.get("communal_phrases", []))
        self._terms = slurs | phrases

    @property
    def category(self) -> Category:
        return Category.RELIGIOUS

    @property
    def tier(self) -> int:
        return 2

    def detect(self, text: str) -> DetectorResult:
        found_words = self._scan_words(text, self._terms)
        found_patterns = self._scan_patterns(text, self._patterns)
        all_matches = found_words + found_patterns

        if not all_matches:
            return self._no_match()

        confidence = min(0.5 + len(all_matches) * 0.15, 1.0)
        return self._match(
            confidence=confidence,
            patterns=all_matches,
            detail=f"Religious/communal content detected: {', '.join(all_matches[:5])}",
        )
