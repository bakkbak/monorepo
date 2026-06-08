from __future__ import annotations

from bakbak_mod.config import DATA_DIR
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import Category, DetectorResult


class GenderDetector(BaseDetector):

    def __init__(self):
        data = self._load_json(DATA_DIR / "gender_terms.json")
        self._patterns = data.pop("patterns", [])
        moral = set(t.lower() for t in data.get("moral_policing", []))
        shaming = set(t.lower() for t in data.get("slut_shaming", []))
        honour = set(t.lower() for t in data.get("honour_harassment", []))
        discrimination = set(t.lower() for t in data.get("gender_discrimination", []))
        self._shaming = shaming
        self._honour = honour
        self._all_terms = moral | shaming | honour | discrimination

    @property
    def category(self) -> Category:
        return Category.GENDER

    @property
    def tier(self) -> int:
        return 1

    def detect(self, text: str) -> DetectorResult:
        found_words = self._scan_words(text, self._all_terms)
        found_patterns = self._scan_patterns(text, self._patterns)
        all_matches = found_words + found_patterns

        if not all_matches:
            return self._no_match()

        has_shaming = any(m in self._shaming for m in found_words)
        has_honour = any(m in self._honour for m in found_words)
        base = 0.7 if has_shaming else (0.6 if has_honour else 0.5)
        confidence = min(base + len(all_matches) * 0.1, 1.0)

        return self._match(
            confidence=confidence,
            patterns=all_matches,
            detail=f"Gender/honour harassment detected: {', '.join(all_matches[:5])}",
        )
