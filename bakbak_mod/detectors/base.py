from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Set

from bakbak_mod.models import Category, DetectorResult


class BaseDetector(ABC):

    @property
    @abstractmethod
    def category(self) -> Category:
        ...

    @property
    @abstractmethod
    def tier(self) -> int:
        ...

    @abstractmethod
    def detect(self, text: str) -> DetectorResult:
        ...

    def _no_match(self) -> DetectorResult:
        return DetectorResult(
            category=self.category,
            tier=self.tier,
            confidence=0.0,
            matched=False,
            detector_name=self.__class__.__name__,
        )

    def _match(self, confidence: float, patterns: List[str], detail: str = "") -> DetectorResult:
        return DetectorResult(
            category=self.category,
            tier=self.tier,
            confidence=confidence,
            matched=True,
            matched_patterns=patterns,
            detector_name=self.__class__.__name__,
            detail=detail,
        )

    @staticmethod
    def _load_json(path: Path) -> dict | list:
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def _build_word_set(data: dict) -> Set[str]:
        words = set()
        if isinstance(data, list):
            words.update(w.lower() for w in data)
        elif isinstance(data, dict):
            for values in data.values():
                if isinstance(values, list):
                    words.update(w.lower() for w in values)
                elif isinstance(values, str):
                    words.add(values.lower())
        return words

    @staticmethod
    def _scan_words(text: str, word_set: Set[str]) -> List[str]:
        lower = text.lower()
        tokens = set(re.findall(r"[\wऀ-ॿ஀-௿ఀ-౿]+", lower))
        found = []
        for w in word_set:
            if " " in w:
                if w in lower:
                    found.append(w)
            elif w in tokens:
                found.append(w)
        return found

    @staticmethod
    def _scan_patterns(text: str, patterns: List[str]) -> List[str]:
        lower = text.lower()
        found = []
        for p in patterns:
            if re.search(p, lower):
                found.append(p)
        return found
