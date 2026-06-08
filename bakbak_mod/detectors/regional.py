from __future__ import annotations

from bakbak_mod.config import DATA_DIR
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import Category, DetectorResult


class RegionalDetector(BaseDetector):

    def __init__(self):
        data = self._load_json(DATA_DIR / "regional_terms.json")
        self._patterns = data.pop("patterns", [])
        chauvinism = set(t.lower() for t in data.get("language_chauvinism", []))
        stereotypes = set(t.lower() for t in data.get("regional_stereotypes", []))
        migration = set(t.lower() for t in data.get("migration_hate", []))
        self._chauvinism = chauvinism
        self._migration = migration
        self._all_terms = chauvinism | stereotypes | migration

    @property
    def category(self) -> Category:
        return Category.REGIONAL

    @property
    def tier(self) -> int:
        return 1

    def detect(self, text: str) -> DetectorResult:
        found_words = self._scan_words(text, self._all_terms)
        found_patterns = self._scan_patterns(text, self._patterns)
        all_matches = found_words + found_patterns

        if not all_matches:
            return self._no_match()

        has_migration = any(m in self._migration for m in found_words)
        has_slur = any(m in self._chauvinism for m in found_words)
        base = 0.6 if (has_migration or has_slur) else 0.5
        confidence = min(base + len(all_matches) * 0.1, 1.0)

        return self._match(
            confidence=confidence,
            patterns=all_matches,
            detail=f"Regional friction detected: {', '.join(all_matches[:5])}",
        )
