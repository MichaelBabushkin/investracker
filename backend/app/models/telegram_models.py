from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TelegramChannel(Base):
    __tablename__ = "telegram_channels"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)  # without @
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    language = Column(String(5), default="en")          # "he" / "en"
    categories = Column(JSON, default=lambda: ["general"]) # general / crypto / forex / stocks / analysis
    is_active = Column(Boolean, default=True, nullable=False)
    subscriber_count = Column(Integer, nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    messages = relationship("TelegramMessage", back_populates="channel", cascade="all, delete-orphan")
    subscriptions = relationship("UserTelegramSubscription", back_populates="channel", cascade="all, delete-orphan")


class UserTelegramSubscription(Base):
    __tablename__ = "user_telegram_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(25), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel_id = Column(Integer, ForeignKey("telegram_channels.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    channel = relationship("TelegramChannel", back_populates="subscriptions")

    __table_args__ = (
        UniqueConstraint("user_id", "channel_id", name="uq_user_channel_subscription"),
    )


class TelegramMessage(Base):
    __tablename__ = "telegram_messages"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("telegram_channels.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(Integer, nullable=False)        # Telegram's internal message id
    text = Column(Text, nullable=True)
    has_media = Column(Boolean, default=False)          # True if message has a photo/video
    media_type = Column(String(20), nullable=True)      # "photo" | "video" | "document"
    media_url = Column(String(1000), nullable=True)     # Reserved for future external hosting
    views = Column(Integer, nullable=True)
    forwards = Column(Integer, nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    channel = relationship("TelegramChannel", back_populates="messages")

    __table_args__ = (
        UniqueConstraint("channel_id", "message_id", name="uq_channel_message"),
    )
