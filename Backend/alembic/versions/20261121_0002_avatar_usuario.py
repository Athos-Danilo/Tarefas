"""adiciona colunas foto_google_url e avatar_arquivo em usuarios

Revision ID: 20261121_0002
Revises: 20261121_0001
Create Date: 2026-11-21 17:45:00
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20261121_0002"
down_revision: str | Sequence[str] | None = "20261121_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("usuarios", sa.Column("foto_google_url", sa.String(length=512), nullable=True))
    op.add_column("usuarios", sa.Column("avatar_arquivo", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("usuarios", "avatar_arquivo")
    op.drop_column("usuarios", "foto_google_url")
