"""
ApexMatch Database Configuration
SQLAlchemy setup with connection management
"""

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from typing import Generator
import logging

from config import settings

# Configure logging
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger(__name__)

# Database engine configuration
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite configuration for development
    engine = create_engine(
        settings.DATABASE_URL,
        echo=settings.DATABASE_ECHO,
        connect_args={
            "check_same_thread": False,
            "timeout": 20
        },
        poolclass=StaticPool,
    )
else:
    # PostgreSQL configuration for production
    engine = create_engine(
        settings.DATABASE_URL,
        echo=settings.DATABASE_ECHO,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for models
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()

def get_db() -> Generator[Session, None, None]:
    """
    Database dependency for FastAPI routes
    Provides database session with automatic cleanup
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_tables():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise

def drop_tables():
    """Drop all database tables (use with caution)"""
    try:
        Base.metadata.drop_all(bind=engine)
        logger.warning("All database tables dropped")
    except Exception as e:
        logger.error(f"Error dropping database tables: {e}")
        raise

def check_connection():
    """Check database connection health"""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False

# Database utilities for testing
class DatabaseManager:
    """Database management utilities"""
    
    @staticmethod
    def reset_database():
        """Reset database for testing"""
        drop_tables()
        create_tables()
    
    @staticmethod
    def get_table_names():
        """Get list of all table names"""
        return Base.metadata.tables.keys()
    
    @staticmethod
    def backup_data(session: Session, table_name: str):
        """Simple data backup utility"""
        # Implementation would depend on specific backup requirements
        pass

# Connection event listeners for debugging
if settings.DEBUG:
    from sqlalchemy import event
    
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Set SQLite pragmas for better performance"""
        if settings.DATABASE_URL.startswith("sqlite"):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=1000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.close()
    
    @event.listens_for(engine, "before_cursor_execute")
    def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        """Log SQL queries in debug mode"""
        logger.debug(f"SQL: {statement}")
        if parameters:
            logger.debug(f"Parameters: {parameters}")

# Export commonly used objects
__all__ = [
    "engine",
    "SessionLocal", 
    "Base",
    "get_db",
    "create_tables",
    "drop_tables",
    "check_connection",
    "DatabaseManager"
]