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
        conn.commit()
