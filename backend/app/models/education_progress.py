from sqlalchemy import Column, String, JSON, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class EducationProgress(Base):
    __tablename__ = "EducationProgress"
    
    user_id = Column(String(25), primary_key=True, index=True)
    completed_topics = Column(JSON, default=list, nullable=False)  # List of topic IDs
    last_visited_topic = Column(String(100), nullable=True)  # Last topic ID visited
    quiz_scores = Column(JSON, default=dict, nullable=False)  # {topic_id: score}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
