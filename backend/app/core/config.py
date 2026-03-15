from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_name: str = "CrewDock"
    app_version: str = "0.7.0"
    debug: bool = False
    cors_origins: str = "http://localhost:3001"

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "ai_platform"
    db_user: str = "postgres"
    db_password: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    auth_mode: str = "local"
    local_auth_token: str = ""

    # Gateway
    gateway_url: str = "ws://localhost:18789"
    gateway_auth_token: str = ""

    # QMD (knowledge base)
    qmd_base_url: str = ""

    # Costs (per 1M tokens)
    anthropic_pricing_opus_input: float = 15.0
    anthropic_pricing_opus_output: float = 75.0
    anthropic_pricing_sonnet_input: float = 3.0
    anthropic_pricing_sonnet_output: float = 15.0


settings = Settings()
