"""
One-time migration script: run against Neon to create indexes.
Usage: DATABASE_URL=... python scripts/migrate.py
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

database_url = os.environ.get("DATABASE_URL")
if not database_url:
    print("ERROR: Set DATABASE_URL environment variable")
    sys.exit(1)

engine = create_engine(database_url, poolclass=NullPool)

indexes = [
    "CREATE INDEX IF NOT EXISTS idx_posts_herd_id_not_hidden ON posts (herd_id) WHERE is_hidden = FALSE",
    "CREATE INDEX IF NOT EXISTS idx_posts_univ_domain_not_hidden ON posts (university_domain) WHERE is_hidden = FALSE",
    "CREATE INDEX IF NOT EXISTS idx_posts_device_id ON posts (device_id)",
    "CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (post_id)",
    "CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON reposts (post_id)",
    "CREATE INDEX IF NOT EXISTS idx_herd_memberships_device_id ON herd_memberships (device_id)",
]

with engine.connect() as conn:
    for stmt in indexes:
        print(f"  {stmt.split('idx_')[1].split(' ON')[0]}...", end=" ")
        conn.execute(text(stmt))
        print("ok")
    conn.commit()

print("All indexes created.")
