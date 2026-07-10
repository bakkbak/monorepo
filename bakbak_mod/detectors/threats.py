from __future__ import annotations

from bakbak_mod.config import DATA_DIR
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import Category, DetectorResult


class ThreatsDetector(BaseDetector):
    def __init__(self):
        data = self._load_json(DATA_DIR / "threat_terms.json")
        self._patterns = data.get("patterns", [])
        direct = set(t.lower() for t in data.get("direct_threats", []))
        mob = set(t.lower() for t in data.get("mob_incitement", []))
        self._terms = direct | mob
        self._direct = direct
        self._mob = mob

    @property
    def category(self) -> Category:
        return Category.THREATS

    @property
    def tier(self) -> int:
        return 2

    def detect(self, text: str) -> DetectorResult:
        found_words = self._scan_words(text, self._terms)
        found_patterns = self._scan_patterns(text, self._patterns)
        all_matches = found_words + found_patterns

        if not all_matches:
            return self._no_match()

        has_direct = any(m in self._direct for m in found_words)
        confidence = 0.7 if has_direct else 0.5
        confidence = min(confidence + len(all_matches) * 0.1, 1.0)

        return self._match(
            confidence=confidence,
            patterns=all_matches,
            detail=f"Threat/incitement detected: {', '.join(all_matches[:5])}",
        )
