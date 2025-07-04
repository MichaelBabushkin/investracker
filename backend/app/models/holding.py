from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Holding(Base):
    __tablename__ = "holdings"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    
    quantity = Column(Float, nullable=False)  # Current number of shares/units
    average_cost = Column(Float, nullable=False)  # Average cost per share/unit
    total_cost = Column(Float, nullable=False)  # Total cost basis
    current_price = Column(Float, nullable=True)  # Current market price
    current_value = Column(Float, nullable=True)  # Current market value
    
    # Performance metrics
    unrealized_gain_loss = Column(Float, nullable=True)
    unrealized_gain_loss_percent = Column(Float, nullable=True)
    realized_gain_loss = Column(Float, default=0.0)  # From closed positions
    
    # Dates
    first_purchase_date = Column(DateTime, nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    asset = relationship("Asset", back_populates="holdings")
    
    def __repr__(self):
        return f"<Holding(id={self.id}, asset_id={self.asset_id}, quantity={self.quantity})>"
