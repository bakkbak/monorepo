from __future__ import annotations

from bakbak_mod.config import DATA_DIR
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import Category, DetectorResult


class PoliticalDetector(BaseDetector):

    def __init__(self):
        data = self._load_json(DATA_DIR / "political_terms.json")
        self._patterns = data.get("patterns", [])
        org_attacks = set(t.lower() for t in data.get("org_attacks", []))
        incitement = set(t.lower() for t in data.get("incitement", []))
        targeted = set(t.lower() for t in data.get("targeted_harassment", []))
        self._incitement = incitement
        self._targeted = targeted
        self._all_terms = org_attacks | incitement | targeted

    @property
    def category(self) -> Category:
        return Category.POLITICAL

    @property
    def tier(self) -> int:
        return 1

    def detect(self, text: str) -> DetectorResult:
        found_words = self._scan_words(text, self._all_terms)
        found_patterns = self._scan_patterns(text, self._patterns)
        all_matches = found_words + found_patterns

        if not all_matches:
            return self._no_match()

        has_targeted = any(m in self._targeted for m in found_words)
        has_incitement = any(m in self._incitement for m in found_words)
        base = 0.7 if has_targeted else (0.6 if has_incitement else 0.5)
        confidence = min(base + len(all_matches) * 0.1, 1.0)

        return self._match(
            confidence=confidence,
            patterns=all_matches,
            detail=f"Political harassment detected: {', '.join(all_matches[:5])}",
        )
