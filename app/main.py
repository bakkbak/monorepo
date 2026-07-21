from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from .routes import (
    posts,
    devices,
    verify,
    comments,
    herds,
    notifications,
    images,
    onboarding,
)

# GET read-feed paths that can tolerate a few seconds of shared-CDN caching.
# The device_id in the query string keeps caching per-device, and the feed is
# already eventually-consistent (optimistic UI + 30s polling).
_CACHEABLE_FEED_PATHS = ("/api/posts/feed", "/api/posts/trending")


class CacheHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        path = request.url.path
        if not path.startswith("/api/"):
            return response
        # Images set their own long-lived immutable cache in the route.
        if path.startswith("/api/images/"):
            return response
        # Short shared-cache window on read feeds so repeat/near-simultaneous
        # loads are served from Vercel's CDN instead of re-hitting Postgres.
        if request.method == "GET" and path in _CACHEABLE_FEED_PATHS:
            response.headers["Cache-Control"] = (
                "public, s-maxage=15, stale-while-revalidate=60"
            )
        else:
            response.headers["Cache-Control"] = "no-store"
        return response


app = FastAPI(title="BakBak API")

app.add_middleware(CacheHeaderMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router, prefix="/api/devices", tags=["devices"])
app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
app.include_router(verify.router, prefix="/api/verify", tags=["verify"])
app.include_router(comments.router, prefix="/api/comments", tags=["comments"])
app.include_router(herds.router, prefix="/api/herds", tags=["herds"])
app.include_router(
    notifications.router, prefix="/api/notifications", tags=["notifications"]
)
app.include_router(images.router, prefix="/api/images", tags=["images"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["onboarding"])


@app.get("/api")
def root():
    return {"status": "ok"}
