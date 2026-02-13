from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.education_progress import EducationProgress
from app.schemas.education import EducationProgressResponse, EducationProgressUpdate

router = APIRouter()

@router.get("/progress", response_model=EducationProgressResponse)
async def get_education_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's education progress"""
    progress = db.query(EducationProgress).filter(
        EducationProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        # Create default progress if it doesn't exist
        progress = EducationProgress(
            user_id=current_user.id,
            completed_topics=[],
            last_visited_topic=None,
            quiz_scores={}
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    
    return progress

@router.put("/progress", response_model=EducationProgressResponse)
async def update_education_progress(
    progress_update: EducationProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's education progress"""
    progress = db.query(EducationProgress).filter(
        EducationProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        # Create new progress record
        progress = EducationProgress(
            user_id=current_user.id,
            completed_topics=progress_update.completed_topics or [],
            last_visited_topic=progress_update.last_visited_topic,
            quiz_scores=progress_update.quiz_scores or {}
        )
        db.add(progress)
    else:
        # Update existing progress
        if progress_update.completed_topics is not None:
            progress.completed_topics = progress_update.completed_topics
        if progress_update.last_visited_topic is not None:
            progress.last_visited_topic = progress_update.last_visited_topic
        if progress_update.quiz_scores is not None:
            progress.quiz_scores = progress_update.quiz_scores
    
    db.commit()
    db.refresh(progress)
    return progress

@router.post("/progress/complete-topic/{topic_id}", response_model=EducationProgressResponse)
async def mark_topic_complete(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a topic as complete"""
    progress = db.query(EducationProgress).filter(
        EducationProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        progress = EducationProgress(
            user_id=current_user.id,
            completed_topics=[topic_id],
            last_visited_topic=topic_id,
            quiz_scores={}
        )
        db.add(progress)
    else:
        if topic_id not in progress.completed_topics:
            completed = progress.completed_topics or []
            completed.append(topic_id)
            progress.completed_topics = completed
        progress.last_visited_topic = topic_id
    
    db.commit()
    db.refresh(progress)
    return progress

@router.post("/progress/quiz-score/{topic_id}/{score}", response_model=EducationProgressResponse)
async def save_quiz_score(
    topic_id: str,
    score: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save a quiz score for a topic"""
    progress = db.query(EducationProgress).filter(
        EducationProgress.user_id == current_user.id
    ).first()
    
    if not progress:
        progress = EducationProgress(
            user_id=current_user.id,
            completed_topics=[],
            last_visited_topic=topic_id,
            quiz_scores={topic_id: score}
        )
        db.add(progress)
    else:
        scores = progress.quiz_scores or {}
        scores[topic_id] = score
        progress.quiz_scores = scores
        progress.last_visited_topic = topic_id
    
    db.commit()
    db.refresh(progress)
    return progress
