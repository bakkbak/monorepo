from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, Optional

from bakbak_mod.models import Category

DATA_DIR = Path(__file__).parent / "data"

ACTIVE_DETECTORS: Dict[Category, bool] = {
    Category.CASTE: True,
    Category.RELIGIOUS: True,
    Category.THREATS: True,
    Category.SEXUAL: True,
    Category.DOXXING: True,
    Category.SELF_HARM: True,
    Category.LEGAL: True,
    Category.REGIONAL: True,
    Category.GENDER: True,
    Category.POLITICAL: True,
}

TIER_MAP: Dict[Category, int] = {
    Category.CASTE: 2,
    Category.RELIGIOUS: 2,
    Category.THREATS: 2,
    Category.SEXUAL: 2,
    Category.DOXXING: 2,
    Category.SELF_HARM: 2,
    Category.LEGAL: 2,
    Category.REGIONAL: 1,
    Category.GENDER: 1,
    Category.POLITICAL: 1,
}

CONFIDENCE_THRESHOLDS: Dict[Category, float] = {
    Category.CASTE: 0.5,
    Category.RELIGIOUS: 0.5,
    Category.THREATS: 0.5,
    Category.SEXUAL: 0.5,
    Category.DOXXING: 0.6,
    Category.SELF_HARM: 0.5,
    Category.LEGAL: 0.5,
    Category.REGIONAL: 0.6,
    Category.GENDER: 0.6,
    Category.POLITICAL: 0.6,
}

# --- LLM (Claude) Review ---
CLAUDE_API_KEY: Optional[str] = os.environ.get("ANTHROPIC_API_KEY")
LLM_ENABLED: bool = bool(CLAUDE_API_KEY)
LLM_TIER2_MODEL: str = "claude-haiku-4-5-20251001"
LLM_TIER1_MODEL: str = "claude-haiku-4-5-20251001"
LLM_REVIEW_THRESHOLD_LOW: float = 0.5
LLM_REVIEW_THRESHOLD_HIGH: float = 0.85
LLM_TIMEOUT: int = 10
LLM_MAX_RETRIES: int = 1
LLM_MAX_TEXT_LENGTH: int = 2000
LLM_FORCE_REVIEW: bool = False  # When True, LLM reviews ALL messages (ignores trigger logic)

AUDIT_LOG_ENABLED: bool = True
AUDIT_LOG_PATH: Optional[str] = None

DEBUG: bool = False


def configure(
    claude_api_key: Optional[str] = None,
    audit_log_path: Optional[str] = None,
    debug: bool = False,
    **overrides,
):
    global AUDIT_LOG_PATH, DEBUG
    global CLAUDE_API_KEY, LLM_ENABLED

    if claude_api_key:
        CLAUDE_API_KEY = claude_api_key
        LLM_ENABLED = True

    if audit_log_path:
        AUDIT_LOG_PATH = audit_log_path

    DEBUG = debug

    for cat_name, enabled in overrides.items():
        try:
            cat = Category(cat_name.upper())
            ACTIVE_DETECTORS[cat] = enabled
        except ValueError:
            pass
