"""
Israeli Report Upload Model
Stores uploaded PDF files for Israeli stock investment reports
"""
from sqlalchemy import Column, Integer, String, DateTime, LargeBinary, Index
from sqlalchemy.sql import func
from app.core.database import Base


class IsraeliReportUpload(Base):
    """Stores uploaded PDF investment reports from Israeli brokers"""
    
    __tablename__ = "IsraeliReportUpload"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_data = Column(LargeBinary, nullable=False)  # Store the actual PDF file
    file_size = Column(Integer, nullable=False)  # Size in bytes
    broker = Column(String, nullable=False, default='excellence')  # Broker name
    upload_batch_id = Column(String, nullable=False, index=True)  # Links to PendingIsraeliTransaction batch
    upload_date = Column(DateTime, nullable=False, server_default=func.now())
    
    # Add indexes for common queries
    __table_args__ = (
        Index('idx_user_upload_date', 'user_id', 'upload_date'),
        Index('idx_batch_id', 'upload_batch_id'),
    )
    
    def __repr__(self):
        return f"<IsraeliReportUpload(id={self.id}, filename={self.filename}, broker={self.broker})>"
