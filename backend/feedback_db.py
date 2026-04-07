from typing import List

import aiosqlite

from config import SQLITE_DB_PATH
from models import AdminStatsResponse, DocumentInfo


CREATE_QUERIES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT UNIQUE,
    session_id TEXT,
    question TEXT,
    answer TEXT,
    module TEXT DEFAULT 'general',
    language TEXT DEFAULT 'en',
    answered INTEGER DEFAULT 1,
    confidence REAL DEFAULT 0.0,
    response_time_ms INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_FEEDBACK_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT,
    session_id TEXT,
    rating INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_DOCUMENTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE,
    topic TEXT,
    chunk_count INTEGER,
    file_size_kb REAL,
    indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_APPLICATIONS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT UNIQUE,
    applicant_name TEXT,
    program TEXT,
    status TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

CREATE_APPOINTMENTS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT UNIQUE,
    session_id TEXT,
    student_name TEXT,
    email TEXT,
    phone TEXT,
    preferred_date TEXT,
    preferred_time TEXT,
    reason TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""


async def init_db() -> None:
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        await db.execute(CREATE_QUERIES_TABLE_SQL)
        await db.execute(CREATE_FEEDBACK_TABLE_SQL)
        await db.execute(CREATE_DOCUMENTS_TABLE_SQL)
        await db.execute(CREATE_APPLICATIONS_TABLE_SQL)
        await db.execute(CREATE_APPOINTMENTS_TABLE_SQL)
        # Migrations: add missing columns to existing databases
        migrations = [
            "ALTER TABLE queries ADD COLUMN message_id TEXT",
            "ALTER TABLE queries ADD COLUMN confidence REAL DEFAULT 0.0",
            "ALTER TABLE queries ADD COLUMN response_time_ms INTEGER DEFAULT 0",
            "ALTER TABLE queries ADD COLUMN language TEXT DEFAULT 'en'",
        ]
        for sql in migrations:
            try:
                await db.execute(sql)
            except Exception:
                pass  # column already exists

        # Seed demo application rows for immediate tracking flow.
        await db.executemany(
            """
            INSERT OR IGNORE INTO applications (
                application_id,
                applicant_name,
                program,
                status
            )
            VALUES (?, ?, ?, ?)
            """,
            [
                ("APP2026001", "Ravi Kumar", "B.Tech CSE", "Under Review"),
                ("APP2026002", "Sowmya R", "B.Tech ECE", "Documents Pending"),
                ("APP2026003", "Rahul Teja", "M.Tech AI", "Selected"),
            ],
        )
        await db.commit()


async def clear_documents() -> None:
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        await db.execute("DELETE FROM documents")
        await db.commit()


async def save_feedback(message_id: str, session_id: str, rating: int) -> None:
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO feedback (message_id, session_id, rating)
            VALUES (?, ?, ?)
            """,
            (message_id, session_id, rating),
        )
        await db.commit()


async def log_query(
    session_id: str,
    message_id: str,
    question: str,
    answer: str,
    module: str,
    language: str,
    answered: bool,
    confidence: float,
    response_time_ms: int,
) -> None:
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO queries (
                message_id,
                session_id,
                question,
                answer,
                module,
                language,
                answered,
                confidence,
                response_time_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                message_id,
                session_id,
                question,
                answer,
                module,
                language,
                1 if answered else 0,
                float(confidence),
                int(response_time_ms),
            ),
        )
        await db.commit()


async def get_stats() -> AdminStatsResponse:
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        total_queries = int((await (await db.execute("SELECT COUNT(*) FROM queries")).fetchone())[0])
        answered_count = int(
            (await (await db.execute("SELECT COUNT(*) FROM queries WHERE answered = 1")).fetchone())[0]
        )
        unanswered_count = int(
            (await (await db.execute("SELECT COUNT(*) FROM queries WHERE answered = 0")).fetchone())[0]
        )
        positive_feedback = int(
            (await (await db.execute("SELECT COUNT(*) FROM feedback WHERE rating = 1")).fetchone())[0]
        )
        negative_feedback = int(
            (await (await db.execute("SELECT COUNT(*) FROM feedback WHERE rating = -1")).fetchone())[0]
        )

        total_feedback = positive_feedback + negative_feedback
        satisfaction_score = (
            (positive_feedback / total_feedback) * 100 if total_feedback > 0 else 0.0
        )

        module_cursor = await db.execute(
            """
            SELECT module, COUNT(*)
            FROM queries
            GROUP BY module
            """
        )
        module_rows = await module_cursor.fetchall()
        await module_cursor.close()
        module_distribution = {row[0] or "general": row[1] for row in module_rows}

        unanswered_cursor = await db.execute(
            """
            SELECT question, timestamp
            FROM queries
            WHERE answered = 0
            ORDER BY timestamp DESC
            LIMIT 10
            """
        )
        unanswered_rows = await unanswered_cursor.fetchall()
        await unanswered_cursor.close()
        top_unanswered = [
            {"question": row[0], "timestamp": row[1]}
            for row in unanswered_rows
        ]

        negative_cursor = await db.execute(
            """
            SELECT q.question, substr(q.answer, 1, 200), f.timestamp
            FROM feedback f
            JOIN queries q ON q.message_id = f.message_id
            WHERE f.rating = -1
            ORDER BY f.timestamp DESC
            LIMIT 10
            """
        )
        negative_rows = await negative_cursor.fetchall()
        await negative_cursor.close()
        recent_negative = [
            {
                "question": row[0],
                "answer_snippet": row[1],
                "timestamp": row[2],
            }
            for row in negative_rows
        ]

        avg_row = await (await db.execute("SELECT AVG(response_time_ms) FROM queries")).fetchone()
        avg_response_time_ms = float(avg_row[0] or 0.0)

        today_row = await (
            await db.execute(
                "SELECT COUNT(*) FROM queries WHERE date(timestamp) = date('now')"
            )
        ).fetchone()
        queries_today = int(today_row[0] or 0)

        week_row = await (
            await db.execute(
                "SELECT COUNT(*) FROM queries WHERE timestamp >= datetime('now','-7 days')"
            )
        ).fetchone()
        queries_this_week = int(week_row[0] or 0)

        day_cursor = await db.execute(
            """
            SELECT date(timestamp), COUNT(*)
            FROM queries
            WHERE timestamp >= datetime('now','-6 days')
            GROUP BY date(timestamp)
            ORDER BY date(timestamp)
            """
        )
        day_rows = await day_cursor.fetchall()
        await day_cursor.close()
        queries_by_day = [{"date": row[0], "count": int(row[1] or 0)} for row in day_rows]

    return AdminStatsResponse(
        total_queries=total_queries,
        answered_count=answered_count,
        unanswered_count=unanswered_count,
        positive_feedback=positive_feedback,
        negative_feedback=negative_feedback,
        satisfaction_score=round(satisfaction_score, 2),
        module_distribution=module_distribution,
        top_unanswered=top_unanswered,
        recent_negative=recent_negative,
        avg_response_time_ms=round(avg_response_time_ms, 2),
        queries_today=queries_today,
        queries_this_week=queries_this_week,
        queries_by_day=queries_by_day,
    )


async def get_document_list() -> List[DocumentInfo]:
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        cursor = await db.execute(
            """
            SELECT filename, topic, chunk_count, file_size_kb, indexed_at
            FROM documents
            ORDER BY indexed_at DESC
            """
        )
        rows = await cursor.fetchall()
        await cursor.close()

    return [
        DocumentInfo(
            filename=row[0],
            topic=row[1] or "general",
            chunk_count=int(row[2] or 0),
            file_size_kb=float(row[3] or 0.0),
            indexed_at=str(row[4]),
        )
        for row in rows
    ]


async def save_document_info(
    filename: str,
    topic: str,
    chunk_count: int,
    file_size_kb: float,
) -> None:
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO documents (filename, topic, chunk_count, file_size_kb)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(filename) DO UPDATE SET
                topic = excluded.topic,
                chunk_count = excluded.chunk_count,
                file_size_kb = excluded.file_size_kb,
                indexed_at = CURRENT_TIMESTAMP
            """,
            (filename, topic, int(chunk_count), float(file_size_kb)),
        )
        await db.commit()


async def get_unanswered_questions(limit: int = 20) -> List[dict]:
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        cursor = await db.execute(
            """
            SELECT question, timestamp
            FROM queries
            WHERE answered = 0
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = await cursor.fetchall()
        await cursor.close()

    return [{"question": row[0], "timestamp": row[1]} for row in rows]


async def get_application_status(application_id: str):
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        cursor = await db.execute(
            """
            SELECT application_id, applicant_name, program, status, last_updated
            FROM applications
            WHERE application_id = ?
            """,
            (application_id.strip().upper(),),
        )
        row = await cursor.fetchone()
        await cursor.close()

    if not row:
        return None

    return {
        "application_id": row[0],
        "applicant_name": row[1] or "Student",
        "program": row[2] or "Unknown Program",
        "status": row[3] or "Not Available",
        "last_updated": str(row[4]),
    }


async def create_appointment(
    booking_id: str,
    session_id: str,
    student_name: str,
    email: str,
    phone: str,
    preferred_date: str,
    preferred_time: str,
    reason: str,
):
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO appointments (
                booking_id,
                session_id,
                student_name,
                email,
                phone,
                preferred_date,
                preferred_time,
                reason,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
            """,
            (
                booking_id,
                session_id,
                student_name,
                email,
                phone,
                preferred_date,
                preferred_time,
                reason,
            ),
        )
        await db.commit()

    return {
        "booking_id": booking_id,
        "session_id": session_id,
        "student_name": student_name,
        "email": email,
        "phone": phone,
        "preferred_date": preferred_date,
        "preferred_time": preferred_time,
        "reason": reason,
        "status": "confirmed",
    }
