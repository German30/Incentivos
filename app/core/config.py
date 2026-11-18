from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict
from sqlalchemy import URL

RAIZ_PROYECTO = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # Ruta absoluta: el .env se encuentra aunque la app se ejecute desde otra carpeta.
    model_config = SettingsConfigDict(env_file=RAIZ_PROYECTO / ".env", env_file_encoding="utf-8")

    app_name: str = "Incentivos API"
    environment: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "root"
    db_password: str = "root123"
    db_name: str = "incentivos"

    jwt_secret: str
    jwt_algoritmo: str = "HS256"
    jwt_expira_minutos: int = 480

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        # El .env del proyecto gana sobre variables de entorno heredadas del sistema
        # (p. ej. un DB_PASSWORD viejo en la sesión). Sin .env, se usan las del entorno.
        return init_settings, dotenv_settings, env_settings, file_secret_settings

    @property
    def database_url(self) -> URL:
        return URL.create(
            "mysql+pymysql",
            username=self.db_user,
            password=self.db_password,
            host=self.db_host,
            port=self.db_port,
            database=self.db_name,
            query={"charset": "utf8mb4"},
        )


@lru_cache
def get_settings() -> Settings:
    # Los campos obligatorios (jwt_secret) se leen del .env / variables de entorno,
    # algo que el analizador estático no puede ver.
    return Settings()  # pyright: ignore[reportCallIssue]
