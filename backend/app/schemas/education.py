from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

class EducationProgressBase(BaseModel):
    completed_topics: List[str] = []
    last_visited_topic: Optional[str] = None
    quiz_scores: Dict[str, int] = {}

class EducationProgressUpdate(BaseModel):
    completed_topics: Optional[List[str]] = None
    last_visited_topic: Optional[str] = None
    quiz_scores: Optional[Dict[str, int]] = None

class EducationProgressResponse(EducationProgressBase):
    user_id: str
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True
