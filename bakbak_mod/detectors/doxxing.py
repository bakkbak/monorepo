from __future__ import annotations

import re
from typing import List

from bakbak_mod.config import DATA_DIR
from bakbak_mod.detectors.base import BaseDetector
from bakbak_mod.models import Category, DetectorResult


class DoxxingDetector(BaseDetector):
    def __init__(self):
        data = self._load_json(DATA_DIR / "pii_patterns.json")
        self._pii_regexes = {
            name: re.compile(pattern, re.IGNORECASE)
            for name, pattern in data.get("regex_patterns", {}).items()
        }
        self._deanon_phrases = set(p.lower() for p in data.get("deanon_phrases", []))
        self._identity_patterns = data.get("identity_combo_patterns", [])

    @property
    def category(self) -> Category:
        return Category.DOXXING

    @property
    def tier(self) -> int:
        return 2

    def _find_pii(self, text: str) -> List[str]:
        found = []
        for name, regex in self._pii_regexes.items():
            if regex.search(text):
                found.append(f"pii:{name}")
        return found

    def detect(self, text: str) -> DetectorResult:
        pii_matches = self._find_pii(text)
        phrase_matches = self._scan_words(text, self._deanon_phrases)
        pattern_matches = self._scan_patterns(text, self._identity_patterns)

        has_pii = len(pii_matches) > 0
        has_deanon = len(phrase_matches) > 0 or len(pattern_matches) > 0

        all_matches = pii_matches + phrase_matches + pattern_matches

        if not all_matches:
            return self._no_match()

        if has_pii and has_deanon:
            confidence = 0.9
        elif has_pii:
            confidence = 0.6
        elif has_deanon:
            confidence = 0.5
        else:
            confidence = 0.4

        confidence = min(confidence + len(all_matches) * 0.05, 1.0)

        return self._match(
            confidence=confidence,
            patterns=all_matches,
            detail=f"Doxxing/de-anonymisation detected: {', '.join(all_matches[:5])}",
        )
