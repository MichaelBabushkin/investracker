from fastapi import APIRouter
from app.api.v1.endpoints import auth, portfolios, transactions, analytics, reports, israeli_stocks, admin, calendar, user_settings, world_stocks

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(admin.router, tags=["admin"])  # Admin routes have prefix in router definition
api_router.include_router(portfolios.router, prefix="/portfolios", tags=["portfolios"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(israeli_stocks.router, prefix="/israeli-stocks", tags=["israeli-stocks"])
api_router.include_router(world_stocks.router, prefix="/world-stocks", tags=["world-stocks"])
api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])
api_router.include_router(user_settings.router, prefix="/user-settings", tags=["user-settings"])
