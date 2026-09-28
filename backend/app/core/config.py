from functools import lru_cache
from pathlib import Path
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    database_url: str = 'sqlite:///./mavitrine.db'
    jwt_secret: SecretStr = Field(min_length=32)
    token_minutes: int = Field(default=30, ge=5, le=120)
    allowed_origins: list[str] = ['http://localhost:3000']
    upload_dir: Path = Path('./uploads')

@lru_cache
def settings() -> Settings:
    return Settings()
