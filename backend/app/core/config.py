from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Application
    APP_NAME: str = os.getenv("APP_NAME", "Investracker")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    API_VERSION: str = os.getenv("API_VERSION", "v1")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://username:password@localhost:5432/investracker_db")
    DATABASE_URL_TEST: str = os.getenv("DATABASE_URL_TEST", "postgresql://username:password@localhost:5432/investracker_test_db")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Email
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    
    # External APIs
    ALPHA_VANTAGE_API_KEY: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    FINANCIAL_MODELING_PREP_API_KEY: str = os.getenv("FINANCIAL_MODELING_PREP_API_KEY", "")
    
    # File Upload
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    class Config:
        env_file = ".env"

settings = Settings()
