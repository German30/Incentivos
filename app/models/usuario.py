from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.roles import Rol
from app.models.base import Base


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario: Mapped[str] = mapped_column(String(50), unique=True)
    nombre: Mapped[str] = mapped_column(String(150))
    password_hash: Mapped[str] = mapped_column(String(100))
    rol: Mapped[Rol] = mapped_column(Enum(Rol, name="rol", values_callable=lambda e: [r.value for r in e]))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ultimo_acceso: Mapped[datetime | None] = mapped_column(DateTime)
