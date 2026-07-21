import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

database_url = os.environ["DATABASE_URL"]

# Reuse connections within a warm serverless instance instead of opening a fresh
# TCP+TLS+auth connection to Neon on every request (the old NullPool did the
# latter, adding ~100-400ms per request). pool_pre_ping discards connections the
# pooler dropped between invocations; connect_timeout + statement_timeout make a
# stalled DB fail fast instead of hanging the function. Pair this with the Neon
# *pooled* endpoint (-pooler host) in DATABASE_URL for best results.
engine = create_engine(
    database_url,
    pool_size=1,
    max_overflow=2,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "connect_timeout": 5,
        "options": "-c statement_timeout=8000",
    },
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    with engine.connect() as conn:
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                device_hash TEXT UNIQUE NOT NULL,
                is_banned BOOLEAN DEFAULT FALSE,
                verified_university BOOLEAN DEFAULT FALSE,
                university_domain TEXT,
                verification_status TEXT DEFAULT 'none',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        )
        conn.execute(
            text("""
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
        """)
        )
        conn.execute(
            text("""
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
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS votes (
                post_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                vote INTEGER NOT NULL,
                PRIMARY KEY (post_id, device_id)
            )
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS reports (
                post_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                reason TEXT,
                PRIMARY KEY (post_id, device_id)
            )
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS email_verifications (
                id TEXT PRIMARY KEY,
                device_id TEXT NOT NULL,
                email TEXT NOT NULL,
                domain TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL
            )
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS university_domains (
                domain TEXT PRIMARY KEY,
                active BOOLEAN DEFAULT TRUE
            )
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS herd_memberships (
                device_id TEXT NOT NULL REFERENCES devices(id),
                herd_id TEXT NOT NULL,
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (device_id, herd_id)
            )
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS reposts (
                post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                device_id TEXT NOT NULL REFERENCES devices(id),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (post_id, device_id)
            )
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS comment_votes (
                comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
                device_id TEXT NOT NULL REFERENCES devices(id),
                vote INTEGER NOT NULL,
                PRIMARY KEY (comment_id, device_id)
            )
        """)
        )
        conn.execute(
            text("""
            ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS post_images (
                post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
                data BYTEA NOT NULL,
                content_type TEXT NOT NULL DEFAULT 'image/jpeg',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        )
        conn.execute(
            text("""
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
        """)
        )
        conn.execute(
            text("""
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
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS device_profiles (
                device_id TEXT PRIMARY KEY REFERENCES devices(id),
                university TEXT,
                university_other TEXT,
                date_of_birth DATE,
                gender TEXT,
                gender_self_describe TEXT,
                academic_year TEXT,
                first_experience TEXT,
                onboarding_completed_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        )
        conn.execute(
            text("""
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'device_profiles' AND column_name = 'age_range'
                ) THEN
                    ALTER TABLE device_profiles DROP COLUMN age_range;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'device_profiles' AND column_name = 'date_of_birth'
                ) THEN
                    ALTER TABLE device_profiles ADD COLUMN date_of_birth DATE;
                END IF;
            END $$;
        """)
        )
        conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS device_interests (
                device_id TEXT NOT NULL REFERENCES devices(id),
                interest TEXT NOT NULL,
                category TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (device_id, interest)
            )
        """)
        )
        conn.execute(
            text("""
            INSERT INTO university_domains (domain, active)
            VALUES ('jgu.edu.in', TRUE)
            ON CONFLICT (domain) DO NOTHING
        """)
        )
        conn.commit()
