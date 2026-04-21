import uuid
from datetime import datetime
from sqlalchemy import DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, declared_attr
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    """The master registry for all models to inherit from. It provides common fields and configurations."""
     # autommatic table naming
    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Automatically generate table names based on the class name in lowercase.
        Example: class UserProfile(Base) -> __tablename__ = 'userprofile'"""
        return cls.__name__.lower()  
    
    #2. Universal primary key using UUID
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4, 
        unique=True, 
        server_default=text("gen_random_uuid()")  # For PostgreSQL, ensure the extension is enabled
    )

class TimestampMixin:
    """A mixin class to provide automatic created_at and updated_at columns to any model that inherits from it."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        onupdate=func.now()
    )