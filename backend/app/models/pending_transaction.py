"""
Pending Israeli Transaction Model
Stores extracted transactions before user approval
"""
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Index
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from app.core.database import Base


class PendingIsraeliTransaction(Base):
    """Pending transactions extracted from PDFs awaiting user review"""
    
    __tablename__ = "PendingIsraeliTransaction"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    upload_batch_id = Column(String, nullable=False, index=True)  # UUID for each PDF upload
    pdf_filename = Column(String, nullable=True)
    
    # Transaction details
    transaction_date = Column(String, nullable=True)
    security_no = Column(String, nullable=True)
    stock_name = Column(String, nullable=True)
    transaction_type = Column(String, nullable=False)  # BUY, SELL, DIVIDEND
    quantity = Column(Numeric(15, 4), nullable=True)
    price = Column(Numeric(15, 4), nullable=True)
    amount = Column(Numeric(15, 4), nullable=True)
    currency = Column(String, nullable=True)
    
    # Status tracking
    status = Column(String, nullable=False, default="pending")  # pending, approved, rejected, modified
    review_notes = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String, nullable=True)
    
    # Metadata
    raw_data = Column(JSON, nullable=True)  # Original extracted data
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=True, onupdate=func.now())
    
    def __repr__(self):
        return f"<PendingTransaction(id={self.id}, type={self.transaction_type}, stock={self.stock_name}, status={self.status})>"
