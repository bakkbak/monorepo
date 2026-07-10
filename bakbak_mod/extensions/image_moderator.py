from __future__ import annotations

from typing import Any

from bakbak_mod.extensions.base import BaseExtension
from bakbak_mod.models import ModerationResult


class ImageModerator(BaseExtension):
    """Placeholder for future image moderation (ResNet/VGG classifier integration).

    To implement:
        1. Load a trained model (e.g. from Content-Moderation-for-Social-Media)
        2. Override moderate() to run inference
        3. Map model classes (neutral/nsfw/violence) to Category + Verdict
    """

    @property
    def content_type(self) -> str:
        return "image"

    def moderate(self, content: Any, **kwargs) -> ModerationResult:
        raise NotImplementedError(
            "Image moderation not yet implemented. "
            "See extensions/image_moderator.py for integration guide."
        )
