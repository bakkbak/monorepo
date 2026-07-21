"""
One-time / idempotent migration: create all tables and the indexes the hot
queries need. Run this against Neon whenever the schema changes.

    DATABASE_URL=... python scripts/migrate.py

This is the single source of truth for schema now that init_db() no longer runs
on the serverless cold path. It is safe to re-run: every statement uses
IF NOT EXISTS.
"""

import os
import sys

# Make the `app` package importable when run as `python scripts/migrate.py`.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text  # noqa: E402

from app.db import engine, init_db  # noqa: E402

if not os.environ.get("DATABASE_URL"):
    print("ERROR: Set DATABASE_URL environment variable")
    sys.exit(1)

# Indexes for every column the feed / trending / profile / comment queries
# filter or sort on. Without these the feed does full sequential scans + sorts.
INDEXES = [
    # Feed filters on herd_id (global feed) and joins herd_memberships.
    "CREATE INDEX IF NOT EXISTS idx_posts_herd_id_not_hidden ON posts (herd_id) WHERE is_hidden = FALSE",
    "CREATE INDEX IF NOT EXISTS idx_posts_univ_domain_not_hidden ON posts (university_domain) WHERE is_hidden = FALSE",
    # University feed filters on herd_type.
    "CREATE INDEX IF NOT EXISTS idx_posts_herd_type_not_hidden ON posts (herd_type) WHERE is_hidden = FALSE",
    # my-posts sorts by created_at; the recency window also uses created_at.
    "CREATE INDEX IF NOT EXISTS idx_posts_device_id ON posts (device_id)",
    "CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at)",
    # Comment count aggregate + get_comments sort within a post.
    "CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at ON comments (post_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_comments_device_id ON comments (device_id)",
    # Repost count aggregate + my-reposts.
    "CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON reposts (post_id)",
    "CREATE INDEX IF NOT EXISTS idx_reposts_device_id ON reposts (device_id)",
    # Joined-herds lookup + onboarding writes.
    "CREATE INDEX IF NOT EXISTS idx_herd_memberships_device_id ON herd_memberships (device_id)",
    # Unread-notification poll runs on every device on a 30s interval.
    "CREATE INDEX IF NOT EXISTS idx_notifications_device_id ON notifications (device_id)",
]


def main() -> None:
    print("Creating tables (idempotent)...")
    init_db()

    print("Creating indexes...")
    with engine.connect() as conn:
        for stmt in INDEXES:
            name = stmt.split("idx_", 1)[1].split(" ON", 1)[0]
            print(f"  idx_{name}...", end=" ", flush=True)
            conn.execute(text(stmt))
            print("ok")
        conn.commit()

    print("Migration complete.")


if __name__ == "__main__":
    main()
