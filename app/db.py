import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

database_url = os.environ["DATABASE_URL"]

engine = create_engine(database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                device_hash TEXT UNIQUE NOT NULL,
                is_banned BOOLEAN DEFAULT FALSE,
                verified_university BOOLEAN DEFAULT FALSE,
                university_domain TEXT,
                verification_status TEXT DEFAULT 'none',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS posts (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                device_id TEXT NOT NULL REFERENCES devices(id),
                herd_type TEXT DEFAULT 'local',
                herd_id TEXT,
                university_domain TEXT,
                lat DOUBLE PRECISION,
                lng DOUBLE PRECISION,
                upvotes INTEGER DEFAULT 0,
                downvotes INTEGER DEFAULT 0,
                reports INTEGER DEFAULT 0,
                is_hidden BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                device_id TEXT NOT NULL REFERENCES devices(id),
                parent_comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                upvotes INTEGER DEFAULT 0,
                downvotes INTEGER DEFAULT 0
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS votes (
                post_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                vote INTEGER NOT NULL,
                PRIMARY KEY (post_id, device_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS reports (
                post_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                reason TEXT,
                PRIMARY KEY (post_id, device_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_verifications (
                id TEXT PRIMARY KEY,
                device_id TEXT NOT NULL,
                email TEXT NOT NULL,
                domain TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS university_domains (
                domain TEXT PRIMARY KEY,
                active BOOLEAN DEFAULT TRUE
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS herd_memberships (
                device_id TEXT NOT NULL REFERENCES devices(id),
                herd_id TEXT NOT NULL,
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (device_id, herd_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS reposts (
                post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                device_id TEXT NOT NULL REFERENCES devices(id),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (post_id, device_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS comment_votes (
                comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
                device_id TEXT NOT NULL REFERENCES devices(id),
                vote INTEGER NOT NULL,
                PRIMARY KEY (comment_id, device_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS moderation_logs (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                pass_type TEXT NOT NULL DEFAULT 'second_pass',
                verdict TEXT NOT NULL,
                category TEXT,
                reason TEXT,
                confidence TEXT,
                model TEXT,
                prompt_tokens INTEGER,
                completion_tokens INTEGER,
                latency_ms INTEGER,
                error TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                device_id TEXT NOT NULL REFERENCES devices(id),
                type TEXT NOT NULL DEFAULT 'moderation',
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                post_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.commit()
