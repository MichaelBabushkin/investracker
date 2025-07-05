from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime

class ReportUpload(Base):
    __tablename__ = "report_uploads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer)
    broker = Column(String(50))
    report_type = Column(String(50))
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    processing_status = Column(String(20), default="pending")  # pending, completed, failed
    extracted_data = Column(JSON)  # Store the extracted data as JSON
    raw_text = Column(Text)  # Store the raw extracted text
    error_message = Column(Text)
    
    # Relationship
    user = relationship("User", back_populates="report_uploads")

class ExtractedHolding(Base):
    __tablename__ = "extracted_holdings"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("report_uploads.id"), nullable=False)
    symbol = Column(String(10), nullable=False)
    name = Column(String(255))
    shares = Column(Float)
    price = Column(Float)
    value = Column(Float)
    extraction_confidence = Column(Float, default=0.8)  # Confidence level of extraction
    
    # Relationship
    report = relationship("ReportUpload")

class ExtractedTransaction(Base):
    __tablename__ = "extracted_transactions"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("report_uploads.id"), nullable=False)
    date = Column(DateTime)
    type = Column(String(20))  # buy, sell, dividend, etc.
    symbol = Column(String(10))
    quantity = Column(Float)
    price = Column(Float)
    total_amount = Column(Float)
    extraction_confidence = Column(Float, default=0.8)
    
    # Relationship
    report = relationship("ReportUpload")
