from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Core Server Settings
    PROJECT_NAME: str = "proeval"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    DEBUG: bool = False
    
    # CORS (For Frontend Integration)
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            import json
            return json.loads(v)
        elif isinstance(v, list):
            return v
        raise ValueError(v)

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:Nabskhan%40123@localhost:5432/proeval"

    # AI Agents (Anthropic Claude)
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"

    # Auth
    JWT_SECRET: str = "CHANGE_ME_TO_A_LONG_RANDOM_STRING"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days for development

    # Email Configuration (For OTP)
    OTP_ENABLED: bool = True
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@proeval.ai"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "ProEval AI"
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False
    MAIL_DEBUG: int = 0

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
