"""esquema inicial do lume com oito tabelas relacionais

Revision ID: 20261121_0001
Revises:
Create Date: 2026-11-21 14:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20261121_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("google_sub", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("nome_exibicao", sa.String(length=60), nullable=False),
        sa.Column(
            "avatar_tipo",
            sa.String(length=20),
            server_default=sa.text("'preset'"),
            nullable=False,
        ),
        sa.Column("avatar_id", sa.String(length=120), nullable=True),
        sa.Column(
            "primeiro_acesso_concluido",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "avatar_tipo IN ('preset', 'google', 'upload')",
            name="ck_usuarios_avatar_tipo_valido",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_usuarios"),
        sa.UniqueConstraint("google_sub", name="uq_usuarios_google_sub"),
    )

    op.create_table(
        "sessoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("csrf_token_hash", sa.String(length=128), nullable=False),
        sa.Column("expira_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "expiracao_absoluta_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("revogada_em", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name="fk_sessoes_usuario_id_usuarios",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sessoes"),
        sa.UniqueConstraint("token_hash", name="uq_sessoes_token_hash"),
    )
    op.create_index("ix_sessoes_usuario_expira", "sessoes", ["usuario_id", "expira_em"])

    op.create_table(
        "tarefas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tarefa_pai_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("titulo", sa.String(length=140), nullable=False),
        sa.Column(
            "prioridade",
            sa.String(length=16),
            server_default=sa.text("'media'"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'pendente'"),
            nullable=False,
        ),
        sa.Column(
            "turno",
            sa.String(length=16),
            server_default=sa.text("'livre'"),
            nullable=False,
        ),
        sa.Column("prazo", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "profundidade",
            sa.Integer(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "ordem_manual",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("concluida_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "atualizado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "prioridade IN ('baixa', 'media', 'alta', 'urgente')",
            name="ck_tarefas_prioridade_valida",
        ),
        sa.CheckConstraint(
            "profundidade BETWEEN 1 AND 5",
            name="ck_tarefas_profundidade_valida",
        ),
        sa.CheckConstraint(
            "tarefa_pai_id IS NULL OR tarefa_pai_id <> id",
            name="ck_tarefas_sem_auto_referencia",
        ),
        sa.CheckConstraint(
            "status IN ('pendente', 'em_andamento', 'concluida')",
            name="ck_tarefas_status_tarefa_valido",
        ),
        sa.CheckConstraint(
            "turno IN ('manha', 'tarde', 'noite', 'livre')",
            name="ck_tarefas_turno_valido",
        ),
        sa.ForeignKeyConstraint(
            ["tarefa_pai_id"],
            ["tarefas.id"],
            name="fk_tarefas_tarefa_pai_id_tarefas",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name="fk_tarefas_usuario_id_usuarios",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_tarefas"),
    )
    op.create_index("ix_tarefas_tarefa_pai_id", "tarefas", ["tarefa_pai_id"])
    op.create_index("ix_tarefas_usuario_pai", "tarefas", ["usuario_id", "tarefa_pai_id"])
    op.create_index("ix_tarefas_usuario_prazo", "tarefas", ["usuario_id", "prazo"])

    op.create_table(
        "etiquetas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nome", sa.String(length=30), nullable=False),
        sa.Column("nome_normalizado", sa.String(length=30), nullable=False),
        sa.Column("cor", sa.String(length=7), nullable=False),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name="fk_etiquetas_usuario_id_usuarios",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_etiquetas"),
        sa.UniqueConstraint(
            "usuario_id",
            "nome_normalizado",
            name="uq_etiquetas_usuario_nome_normalizado",
        ),
    )

    op.create_table(
        "tarefa_etiquetas",
        sa.Column("tarefa_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("etiqueta_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["etiqueta_id"],
            ["etiquetas.id"],
            name="fk_tarefa_etiquetas_etiqueta_id_etiquetas",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tarefa_id"],
            ["tarefas.id"],
            name="fk_tarefa_etiquetas_tarefa_id_tarefas",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("tarefa_id", "etiqueta_id", name="pk_tarefa_etiquetas"),
    )

    op.create_table(
        "sessoes_foco",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tarefa_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("duracao_planejada_seg", sa.Integer(), nullable=False),
        sa.Column("duracao_real_seg", sa.Integer(), nullable=True),
        sa.Column(
            "iniciada_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("encerrada_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'em_andamento'"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "duracao_planejada_seg BETWEEN 60 AND 14400",
            name="ck_sessoes_foco_duracao_planejada_valida",
        ),
        sa.CheckConstraint(
            "status IN ('em_andamento', 'concluida', 'interrompida')",
            name="ck_sessoes_foco_status_foco_valido",
        ),
        sa.ForeignKeyConstraint(
            ["tarefa_id"],
            ["tarefas.id"],
            name="fk_sessoes_foco_tarefa_id_tarefas",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name="fk_sessoes_foco_usuario_id_usuarios",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sessoes_foco"),
    )
    op.create_index(
        "ix_sessoes_foco_usuario_iniciada",
        "sessoes_foco",
        ["usuario_id", "iniciada_em"],
    )
    op.create_index(
        "uq_sessoes_foco_ativa_por_usuario",
        "sessoes_foco",
        ["usuario_id"],
        unique=True,
        postgresql_where=sa.text("status = 'em_andamento'"),
    )

    op.create_table(
        "inscricoes_push",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("chave_p256dh", sa.Text(), nullable=False),
        sa.Column("chave_auth", sa.Text(), nullable=False),
        sa.Column("rotulo_dispositivo", sa.String(length=80), nullable=False),
        sa.Column(
            "plataforma",
            sa.String(length=20),
            server_default=sa.text("'outro'"),
            nullable=False,
        ),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("ultimo_envio_em", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "plataforma IN ('desktop', 'android', 'ios', 'outro')",
            name="ck_inscricoes_push_plataforma_push_valida",
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name="fk_inscricoes_push_usuario_id_usuarios",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_inscricoes_push"),
        sa.UniqueConstraint("endpoint", name="uq_inscricoes_push_endpoint"),
    )
    op.create_index("ix_inscricoes_push_usuario", "inscricoes_push", ["usuario_id"])

    op.create_table(
        "lembretes_tarefas",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tarefa_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("disparar_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("antecedencia_min", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'pendente'"),
            nullable=False,
        ),
        sa.Column("enviado_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "criado_em",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pendente', 'enviado', 'cancelado')",
            name="ck_lembretes_tarefas_status_lembrete_valido",
        ),
        sa.ForeignKeyConstraint(
            ["tarefa_id"],
            ["tarefas.id"],
            name="fk_lembretes_tarefas_tarefa_id_tarefas",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"],
            ["usuarios.id"],
            name="fk_lembretes_tarefas_usuario_id_usuarios",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_lembretes_tarefas"),
    )
    op.create_index("ix_lembretes_tarefa", "lembretes_tarefas", ["tarefa_id"])
    op.create_index("ix_lembretes_varredura", "lembretes_tarefas", ["status", "disparar_em"])


def downgrade() -> None:
    op.drop_index("ix_lembretes_varredura", table_name="lembretes_tarefas")
    op.drop_index("ix_lembretes_tarefa", table_name="lembretes_tarefas")
    op.drop_table("lembretes_tarefas")

    op.drop_index("ix_inscricoes_push_usuario", table_name="inscricoes_push")
    op.drop_table("inscricoes_push")

    op.drop_index("uq_sessoes_foco_ativa_por_usuario", table_name="sessoes_foco")
    op.drop_index("ix_sessoes_foco_usuario_iniciada", table_name="sessoes_foco")
    op.drop_table("sessoes_foco")

    op.drop_table("tarefa_etiquetas")
    op.drop_table("etiquetas")

    op.drop_index("ix_tarefas_usuario_prazo", table_name="tarefas")
    op.drop_index("ix_tarefas_usuario_pai", table_name="tarefas")
    op.drop_index("ix_tarefas_tarefa_pai_id", table_name="tarefas")
    op.drop_table("tarefas")

    op.drop_index("ix_sessoes_usuario_expira", table_name="sessoes")
    op.drop_table("sessoes")

    op.drop_table("usuarios")
