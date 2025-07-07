"""
Configuration settings for the Integra Markets application.
"""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from functools import lru_cache
from typing import Optional, List

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment
    ENVIRONMENT: str = Field("development", env="ENVIRONMENT")
    DEBUG: bool = Field(True, env="DEBUG")
    LOG_LEVEL: str = Field("INFO", env="LOG_LEVEL")
    
    # Database
    DATABASE_URL: str = Field("sqlite:///./integra.db", env="DATABASE_URL")
    
    # API Keys
    OPENAI_API_KEY: Optional[str] = Field(None, env="OPENAI_API_KEY")
    OPENWEATHERMAP_API_KEY: Optional[str] = Field(None, env="OPENWEATHERMAP_API_KEY")
    ALPHA_VANTAGE_API_KEY: Optional[str] = Field(None, env="ALPHA_VANTAGE_API_KEY")
    HUGGING_FACE_TOKEN: Optional[str] = Field(None, env="HUGGING_FACE_TOKEN")
    
    # Supabase
    SUPABASE_URL: Optional[str] = Field(None, env="SUPABASE_URL")
    SUPABASE_KEY: Optional[str] = Field(None, env="SUPABASE_KEY")
    
    # Feature Flags
    ENABLE_LLM_FEATURES: bool = Field(True, env="ENABLE_LLM_FEATURES")
    FREE_TIER_DAILY_LLM_LIMIT: int = Field(2, env="FREE_TIER_DAILY_LLM_LIMIT")
    
    # FinBERT Configuration
    FINBERT_MODEL: str = Field("ProsusAI/finbert", env="FINBERT_MODEL")
    FINBERT_CACHE_DIR: str = Field("./app/models/cache", env="FINBERT_CACHE_DIR")
    
    # NLTK Data Path
    NLTK_DATA_PATH: str = Field("./app/models/nltk_data", env="NLTK_DATA_PATH")
    
    # API Configuration
    HOST: str = Field("0.0.0.0", env="HOST")
    PORT: int = Field(8000, env="PORT")
    
    # CORS
    CORS_ORIGINS: List[str] = Field(["*"], env="CORS_ORIGINS")
    
    # Use SettingsConfigDict instead of the old Config class
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )

@lru_cache()
def get_settings() -> Settings:
    """
    Get application settings from environment variables.
    
    Returns:
        Settings: Application settings.
    """
    return Settings()

# Create a global settings object
settings = get_settings()
