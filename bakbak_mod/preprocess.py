from __future__ import annotations

import re
import json
from pathlib import Path

from emoji import demojize

_DATA_DIR = Path(__file__).parent / "data"

_ALLOWLIST: set = set()
_SLANG_MAP: dict = {}


def _load_allowlist() -> set:
    global _ALLOWLIST
    if _ALLOWLIST:
        return _ALLOWLIST
    path = _DATA_DIR / "allowlist.json"
    if path.exists():
        with open(path, encoding="utf-8") as f:
            _ALLOWLIST = set(json.load(f))
    return _ALLOWLIST


def _load_slang_map() -> dict:
    global _SLANG_MAP
    if _SLANG_MAP:
        return _SLANG_MAP
    path = _DATA_DIR / "slang_map.json"
    if path.exists():
        with open(path, encoding="utf-8") as f:
            _SLANG_MAP = json.load(f)
    return _SLANG_MAP


_LEET_MAP = str.maketrans({
    "@": "a",
    "0": "o",
    "1": "i",
    "3": "e",
    "$": "s",
    "!": "i",
    "+": "t",
})


def normalize(text: str) -> str:
    text = text.strip()
    text = demojize(text, delimiters=(" :", ": "))
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)
    text = text.translate(_LEET_MAP)
    text = re.sub(r"[​‌‍﻿]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def expand_slang(text: str) -> str:
    slang = _load_slang_map()
    if not slang:
        return text
    words = text.split()
    out = []
    for w in words:
        key = w.lower()
        out.append(slang.get(key, w))
    return " ".join(out)


def preprocess(text: str) -> str:
    text = normalize(text)
    text = expand_slang(text)
    return text


def is_allowlisted(text: str) -> bool:
    allowlist = _load_allowlist()
    lower = text.lower().strip()
    for phrase in allowlist:
        if phrase.lower() in lower:
            return True
    return False
