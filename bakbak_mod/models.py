from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List


class Verdict(Enum):
    CLEAN = "CLEAN"
    FLAG = "FLAG"
    TAKEDOWN = "TAKEDOWN"


class Category(Enum):
    CASTE = "CASTE"
    RELIGIOUS = "RELIGIOUS"
    THREATS = "THREATS"
    SEXUAL = "SEXUAL"
    DOXXING = "DOXXING"
    SELF_HARM = "SELF_HARM"
    LEGAL = "LEGAL"
    REGIONAL = "REGIONAL"
    GENDER = "GENDER"
    POLITICAL = "POLITICAL"


TIER_2_CATEGORIES = frozenset({
    Category.CASTE,
    Category.RELIGIOUS,
    Category.THREATS,
    Category.SEXUAL,
    Category.DOXXING,
    Category.SELF_HARM,
    Category.LEGAL,
})

TIER_1_CATEGORIES = frozenset({
    Category.REGIONAL,
    Category.GENDER,
    Category.POLITICAL,
})


@dataclass
class DetectorResult:
    category: Category
    tier: int
    confidence: float
    matched: bool
    matched_patterns: List[str] = field(default_factory=list)
    detector_name: str = ""
    detail: str = ""


@dataclass
class ModerationResult:
    verdict: Verdict
    tier: int
    categories: List[Category]
    confidence: float
    details: List[DetectorResult]
    audit_trail: dict = field(default_factory=dict)
    original_text: str = ""
    preprocessed_text: str = ""
    llm_reviewed: bool = False
    llm_pending: bool = False
    llm_details: List[DetectorResult] = field(default_factory=list)
    llm_token_usage: dict = field(default_factory=dict)


@dataclass
class LLMReviewResult:
    original_verdict: Verdict
    llm_verdict: Verdict
    llm_categories: List[Category]
    llm_confidence: float
    llm_details: List[DetectorResult]
    token_usage: dict
    changed: bool
