from fastapi import APIRouter
from app.api.v1.endpoints import auth, portfolios, transactions, analytics

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(portfolios.router, prefix="/portfolios", tags=["portfolios"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
