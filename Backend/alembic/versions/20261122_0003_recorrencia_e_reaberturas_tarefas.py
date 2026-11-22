"""adiciona recorrencia e rastreio de reaberturas em tarefas

Revision ID: 20261122_0003
Revises: 20261121_0002
Create Date: 2026-11-22 09:55:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20261122_0003"
down_revision: str | Sequence[str] | None = "20261121_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "tarefas",
        sa.Column(
            "recorrencia_tipo",
            sa.String(length=16),
            server_default=sa.text("'nenhuma'"),
            nullable=False,
        ),
    )
    op.add_column(
        "tarefas",
        sa.Column(
            "recorrencia_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        "tarefas",
        sa.Column(
            "serie_recorrencia_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.add_column(
        "tarefas",
        sa.Column(
            "vezes_reaberta",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_tarefas_recorrencia_tipo_valida",
        "tarefas",
        "recorrencia_tipo IN ('nenhuma', 'diaria', 'semanal', 'mensal')",
    )
    op.create_check_constraint(
        "ck_tarefas_vezes_reaberta_nao_negativa",
        "tarefas",
        "vezes_reaberta >= 0",
    )
    op.create_index(
        "ix_tarefas_usuario_serie",
        "tarefas",
        ["usuario_id", "serie_recorrencia_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_tarefas_usuario_serie", table_name="tarefas")
    op.drop_constraint("ck_tarefas_vezes_reaberta_nao_negativa", "tarefas", type_="check")
    op.drop_constraint("ck_tarefas_recorrencia_tipo_valida", "tarefas", type_="check")
    op.drop_column("tarefas", "vezes_reaberta")
    op.drop_column("tarefas", "serie_recorrencia_id")
    op.drop_column("tarefas", "recorrencia_config")
    op.drop_column("tarefas", "recorrencia_tipo")
