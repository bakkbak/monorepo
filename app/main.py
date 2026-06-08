from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import posts, devices, verify, comments, herds, notifications
from .db import init_db

app = FastAPI(title="BakBak API")

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
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])

@app.on_event("startup")
def startup():
    init_db()

@app.get("/api")
def root():
    return {"status": "ok"}
