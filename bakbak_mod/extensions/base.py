from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from bakbak_mod.models import ModerationResult


class BaseExtension(ABC):
    """Interface for future content-type extensions (image, video, audio)."""

    @property
    @abstractmethod
    def content_type(self) -> str: ...

    @abstractmethod
    def moderate(self, content: Any, **kwargs) -> ModerationResult: ...
