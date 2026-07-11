from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from .routes import posts, devices, verify, comments, herds, notifications, images, onboarding


class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        if request.url.path.startswith("/api/") and not request.url.path.startswith(
            "/api/images/"
        ):
            response.headers["Cache-Control"] = "no-store"
        return response


app = FastAPI(title="BakBak API")

app.add_middleware(NoCacheMiddleware)
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
