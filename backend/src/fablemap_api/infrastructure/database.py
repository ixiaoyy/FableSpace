"""
MySQL 数据库连接管理

提供 SQLAlchemy 引擎和会话管理。
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import Session, sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool

from .settings import ApiSettings

# SQLAlchemy 声明基类
Base = declarative_base()


class Database:
    """数据库连接管理器"""

    def __init__(
        self,
        url: str,
        pool_size: int = 5,
        max_overflow: int = 10,
        pool_recycle: int = 3600,
        echo: bool = False,
    ):
        """
        初始化数据库连接

        Args:
            url: 数据库连接 URL，格式：mysql+pymysql://user:pass@host:port/dbname
            pool_size: 连接池最小连接数
            max_overflow: 连接池最大溢出连接数
            pool_recycle: 连接回收时间（秒），避免 MySQL 8 小时超时
            echo: 是否打印 SQL 语句（调试用）
        """
        self.url = url
        self.engine: Engine = create_engine(
            url,
            poolclass=QueuePool,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_recycle=pool_recycle,
            pool_pre_ping=True,  # 每次使用前检查连接是否有效
            echo=echo,
        )
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
        )

    def get_session(self) -> Session:
        """获取一个新的数据库会话"""
        return self.SessionLocal()

    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """
        自动管理会话的上下文管理器

        用法：
            with db.session_scope() as session:
                session.query(Model).all()
        """
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def create_tables(self) -> None:
        """创建所有表（根据 Base 的 metadata）"""
        Base.metadata.create_all(bind=self.engine)

    def drop_tables(self) -> None:
        """删除所有表"""
        Base.metadata.drop_all(bind=self.engine)

    def dispose(self) -> None:
        """关闭连接池"""
        self.engine.dispose()


def create_database_from_settings(settings: ApiSettings) -> Database | None:
    """
    根据 ApiSettings 创建数据库连接

    Returns:
        Database 实例，或 None（如果未配置 MySQL URL）
    """
    mysql_url = getattr(settings, "mysql_url", None)
    if not mysql_url:
        return None

    mysql_pool_size = getattr(settings, "mysql_pool_size", 5)
    mysql_max_overflow = getattr(settings, "mysql_max_overflow", 10)
    mysql_echo = getattr(settings, "mysql_echo", False)

    return Database(
        url=mysql_url,
        pool_size=mysql_pool_size,
        max_overflow=mysql_max_overflow,
        echo=mysql_echo,
    )