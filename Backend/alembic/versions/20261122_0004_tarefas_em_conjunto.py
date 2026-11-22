"""adiciona tabelas e colunas para Tarefas em Conjunto

Revision ID: 20261122_0004
Revises: 20261122_0003
Create Date: 2026-11-22 10:15:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20261122_0004"
down_revision: str | Sequence[str] | None = "20261122_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "membros_tarefa",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tarefa_raiz_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("papel", sa.String(length=20), nullable=False),
        sa.Column(
            "entrou_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "papel IN ('lider', 'colaborador')",
            name="ck_membros_tarefa_papel_membro_valido",
        ),
        sa.ForeignKeyConstraint(
            ["tarefa_raiz_id"],
            ["tarefas.id"],
            name="fk_membros_tarefa_raiz_tarefas",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name="fk_membros_tarefa_usuario_usuarios",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_membros_tarefa"),
        sa.UniqueConstraint(
            "tarefa_raiz_id",
            "usuario_id",
            name="uq_membros_tarefa_raiz_usuario",
        ),
    )
    op.create_index("ix_membros_tarefa_usuario", "membros_tarefa", ["usuario_id"])
    op.create_index(
        "uq_membros_tarefa_lider_unico",
        "membros_tarefa",
        ["tarefa_raiz_id"],
        unique=True,
        postgresql_where=sa.text("papel = 'lider'"),
    )

    op.create_table(
        "vagas_tarefa",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tarefa_raiz_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nome_exibicao", sa.String(length=60), nullable=False),
        sa.Column("email_opcional", sa.String(length=320), nullable=True),
        sa.Column("ocupada_por_usuario_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "criada_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["tarefa_raiz_id"],
            ["tarefas.id"],
            name="fk_vagas_tarefa_raiz_tarefas",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["ocupada_por_usuario_id"],
            ["usuarios.id"],
            name="fk_vagas_tarefa_ocupada_usuarios",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_vagas_tarefa"),
    )
    op.create_index("ix_vagas_tarefa_raiz", "vagas_tarefa", ["tarefa_raiz_id"])
    op.create_index(
        "ix_vagas_tarefa_raiz_email",
        "vagas_tarefa",
        ["tarefa_raiz_id", "email_opcional"],
    )

    op.create_table(
        "convites_tarefa",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tarefa_raiz_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("codigo_token", sa.String(length=128), nullable=False),
        sa.Column("criado_por_usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "ativo",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("revogado_em", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["tarefa_raiz_id"],
            ["tarefas.id"],
            name="fk_convites_tarefa_raiz_tarefas",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["criado_por_usuario_id"],
            ["usuarios.id"],
            name="fk_convites_tarefa_criador_usuarios",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_convites_tarefa"),
        sa.UniqueConstraint("codigo_token", name="uq_convites_tarefa_codigo_token"),
    )
    op.create_index(
        "ix_convites_tarefa_raiz_ativo",
        "convites_tarefa",
        ["tarefa_raiz_id", "ativo"],
    )

    op.add_column(
        "tarefas",
        sa.Column(
            "compartilhada",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "tarefas",
        sa.Column("responsavel_usuario_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "tarefas",
        sa.Column("vaga_responsavel_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_tarefas_responsavel_usuario_id_usuarios",
        "tarefas",
        "usuarios",
        ["responsavel_usuario_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_tarefas_vaga_responsavel_id_vagas_tarefa",
        "tarefas",
        "vagas_tarefa",
        ["vaga_responsavel_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_check_constraint(
        "ck_tarefas_no_maximo_um_responsavel",
        "tarefas",
        "NOT (responsavel_usuario_id IS NOT NULL AND vaga_responsavel_id IS NOT NULL)",
    )
    op.create_index("ix_tarefas_responsavel_usuario", "tarefas", ["responsavel_usuario_id"])
    op.create_index("ix_tarefas_vaga_responsavel", "tarefas", ["vaga_responsavel_id"])


def downgrade() -> None:
    op.drop_index("ix_tarefas_vaga_responsavel", table_name="tarefas")
    op.drop_index("ix_tarefas_responsavel_usuario", table_name="tarefas")
    op.drop_constraint("ck_tarefas_no_maximo_um_responsavel", "tarefas", type_="check")
    op.drop_constraint(
        "fk_tarefas_vaga_responsavel_id_vagas_tarefa",
        "tarefas",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_tarefas_responsavel_usuario_id_usuarios",
        "tarefas",
        type_="foreignkey",
    )
    op.drop_column("tarefas", "vaga_responsavel_id")
    op.drop_column("tarefas", "responsavel_usuario_id")
    op.drop_column("tarefas", "compartilhada")

    op.drop_index("ix_convites_tarefa_raiz_ativo", table_name="convites_tarefa")
    op.drop_table("convites_tarefa")

    op.drop_index("ix_vagas_tarefa_raiz_email", table_name="vagas_tarefa")
    op.drop_index("ix_vagas_tarefa_raiz", table_name="vagas_tarefa")
    op.drop_table("vagas_tarefa")

    op.drop_index("uq_membros_tarefa_lider_unico", table_name="membros_tarefa")
    op.drop_index("ix_membros_tarefa_usuario", table_name="membros_tarefa")
    op.drop_table("membros_tarefa")
