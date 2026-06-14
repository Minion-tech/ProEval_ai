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
    # Default to common local frontend origins to ease local development
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = ["http://localhost:3000", "http://127.0.0.1:3000"]

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

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v:
            return v
        
        # 1. Handle legacy 'postgres://' prefix
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        
        # 2. Ensure asyncpg dialect is specified
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        # 3. asyncpg doesn't support 'sslmode' query parameter.
        # We strip it here so settings.DATABASE_URL is always clean.
        if "sslmode=" in v:
            import re
            v = re.sub(r"(\?|&)sslmode=[^&]*", "", v)
            v = v.replace("?&", "?").rstrip("?").rstrip("&")
            
        return v

    # AI Agents (Anthropic Claude)
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-6"

    # AI Agents (Google Gemini)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"  # Using Flash for higher RPM/TPM on free tier

    # AI Agents (NVIDIA NIM)
    NVIDIA_API_KEY: str = ""
    NVIDIA_MODEL: str = "google/gemma-4-31b-it"

    # Hugging Face (Summarization)
    HUGGINGFACE_API_KEY: str = ""
    HF_CODE_MODEL: str = "Qwen/Qwen2.5-Coder-1.5B-Instruct"
    HF_TEXT_MODEL: str = "meta-llama/Llama-3.2-1B-Instruct"

    # AI Provider Routing
    # Priority: NVIDIA (DeepSeek) -> Groq -> Gemini
    AI_PROVIDER_PRIORITY: str = "nvidia,groq,gemini"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen/qwen3-32b"
    AI_REQUEST_TIMEOUT_SECONDS: int = 90

    # Evaluation Queue
    EVALUATION_QUEUE_ENABLED: bool = False
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    
    # LangSmith Tracing
    LANGSMITH_TRACING: bool = False
    LANGSMITH_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "proeval-agent"
    LANGSMITH_WORKSPACE_ID: str = ""

    # GitHub Integration
    GITHUB_PERSONAL_ACCESS_TOKEN: str = ""

    # Auth
    JWT_SECRET: str = "CHANGE_ME_TO_A_LONG_RANDOM_STRING"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days for development
    
    # ElevenLabs Webhook Security
    ELEVENLABS_WEBHOOK_SECRET: str = ""

    # Dev Mode / Testing
    ENABLE_TEST_MODE: bool = False
    TEST_USER_EMAIL: str = "test@proeval.ai"

    # Email Configuration (For OTP)
    OTP_ENABLED: bool = True
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "" # Defaults to MAIL_USERNAME in validator
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_FROM_NAME: str = "ProEval AI"
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False
    MAIL_DEBUG: int = 0

    @field_validator("MAIL_FROM", mode="before")
    @classmethod
    def validate_mail_from(cls, v: str, info) -> str:
        if v:
            return v
        # Fallback to MAIL_USERNAME if not provided (common for Gmail)
        return info.data.get("MAIL_USERNAME", "noreply@proeval.ai")

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
