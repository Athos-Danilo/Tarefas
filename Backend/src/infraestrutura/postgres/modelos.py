from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as UUID_PG
from sqlalchemy.orm import Mapped, mapped_column

from infraestrutura.postgres.base import BaseRelacional


def _agora_utc() -> datetime:
    return datetime.now(UTC)


class UsuarioModelo(BaseRelacional):
    """Tabela de contas autenticadas via Google OAuth 2.0."""

    __tablename__ = "usuarios"
    __table_args__ = (
        CheckConstraint(
            "avatar_tipo IN ('preset', 'google', 'upload')",
            name="avatar_tipo_valido",
        ),
    )

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    google_sub: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    nome_exibicao: Mapped[str] = mapped_column(String(60), nullable=False)
    avatar_tipo: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="preset",
        server_default=text("'preset'"),
    )
    avatar_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    foto_google_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    avatar_arquivo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    primeiro_acesso_concluido: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        onupdate=_agora_utc,
        server_default=text("NOW()"),
    )


class SessaoModelo(BaseRelacional):
    """Tabela de sessoes server-side vinculadas aos cookies HttpOnly."""

    __tablename__ = "sessoes"
    __table_args__ = (Index("ix_sessoes_usuario_expira", "usuario_id", "expira_em"),)

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    usuario_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    csrf_token_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expiracao_absoluta_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )
    revogada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class TarefaModelo(BaseRelacional):
    """Tabela principal da arvore multinivel de tarefas (ate 5 niveis)."""

    __tablename__ = "tarefas"
    __table_args__ = (
        CheckConstraint("profundidade BETWEEN 1 AND 5", name="profundidade_valida"),
        CheckConstraint(
            "tarefa_pai_id IS NULL OR tarefa_pai_id <> id",
            name="sem_auto_referencia",
        ),
        CheckConstraint(
            "prioridade IN ('baixa', 'media', 'alta', 'urgente')",
            name="prioridade_valida",
        ),
        CheckConstraint(
            "status IN ('pendente', 'em_andamento', 'concluida')",
            name="status_tarefa_valido",
        ),
        CheckConstraint(
            "turno IN ('manha', 'tarde', 'noite', 'livre')",
            name="turno_valido",
        ),
        CheckConstraint(
            "recorrencia_tipo IN ('nenhuma', 'diaria', 'semanal', 'mensal')",
            name="recorrencia_tipo_valida",
        ),
        CheckConstraint(
            "vezes_reaberta >= 0",
            name="vezes_reaberta_nao_negativa",
        ),
        CheckConstraint(
            "NOT (responsavel_usuario_id IS NOT NULL AND vaga_responsavel_id IS NOT NULL)",
            name="no_maximo_um_responsavel",
        ),
        Index("ix_tarefas_usuario_pai", "usuario_id", "tarefa_pai_id"),
        Index("ix_tarefas_usuario_prazo", "usuario_id", "prazo"),
        Index("ix_tarefas_usuario_serie", "usuario_id", "serie_recorrencia_id"),
        Index("ix_tarefas_responsavel_usuario", "responsavel_usuario_id"),
        Index("ix_tarefas_vaga_responsavel", "vaga_responsavel_id"),
    )

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    usuario_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    tarefa_pai_id: Mapped[UUID | None] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("tarefas.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    titulo: Mapped[str] = mapped_column(String(140), nullable=False)
    prioridade: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="media",
        server_default=text("'media'"),
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pendente",
        server_default=text("'pendente'"),
    )
    turno: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="livre",
        server_default=text("'livre'"),
    )
    prazo: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    profundidade: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default=text("1"),
    )
    ordem_manual: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    recorrencia_tipo: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="nenhuma",
        server_default=text("'nenhuma'"),
    )
    recorrencia_config: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )
    serie_recorrencia_id: Mapped[UUID | None] = mapped_column(
        UUID_PG(as_uuid=True),
        nullable=True,
    )
    vezes_reaberta: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    compartilhada: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    responsavel_usuario_id: Mapped[UUID | None] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    vaga_responsavel_id: Mapped[UUID | None] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("vagas_tarefa.id", ondelete="SET NULL"),
        nullable=True,
    )
    concluida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        onupdate=_agora_utc,
        server_default=text("NOW()"),
    )


class EtiquetaModelo(BaseRelacional):
    """Tabela de etiquetas nomeadas por usuario."""

    __tablename__ = "etiquetas"
    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "nome_normalizado",
            name="uq_etiquetas_usuario_nome_normalizado",
        ),
    )

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    usuario_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    nome: Mapped[str] = mapped_column(String(30), nullable=False)
    nome_normalizado: Mapped[str] = mapped_column(String(30), nullable=False)
    cor: Mapped[str] = mapped_column(String(7), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )


class TarefaEtiquetaModelo(BaseRelacional):
    """Tabela associativa N:N entre tarefas e etiquetas."""

    __tablename__ = "tarefa_etiquetas"

    tarefa_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("tarefas.id", ondelete="CASCADE"),
        primary_key=True,
    )
    etiqueta_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("etiquetas.id", ondelete="CASCADE"),
        primary_key=True,
    )


class SessaoFocoModelo(BaseRelacional):
    """Tabela de sessoes do Modo Foco Imersivo com apenas uma ativa por usuario."""

    __tablename__ = "sessoes_foco"
    __table_args__ = (
        CheckConstraint(
            "duracao_planejada_seg BETWEEN 60 AND 14400",
            name="duracao_planejada_valida",
        ),
        CheckConstraint(
            "status IN ('em_andamento', 'concluida', 'interrompida')",
            name="status_foco_valido",
        ),
        Index(
            "uq_sessoes_foco_ativa_por_usuario",
            "usuario_id",
            unique=True,
            postgresql_where=text("status = 'em_andamento'"),
        ),
        Index("ix_sessoes_foco_usuario_iniciada", "usuario_id", "iniciada_em"),
    )

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    usuario_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    tarefa_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("tarefas.id", ondelete="CASCADE"),
        nullable=False,
    )
    duracao_planejada_seg: Mapped[int] = mapped_column(Integer, nullable=False)
    duracao_real_seg: Mapped[int | None] = mapped_column(Integer, nullable=True)
    iniciada_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )
    encerrada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="em_andamento",
        server_default=text("'em_andamento'"),
    )


class InscricaoPushModelo(BaseRelacional):
    """Tabela de dispositivos inscritos em notificacoes Web Push VAPID."""

    __tablename__ = "inscricoes_push"
    __table_args__ = (
        CheckConstraint(
            "plataforma IN ('desktop', 'android', 'ios', 'outro')",
            name="plataforma_push_valida",
        ),
        Index("ix_inscricoes_push_usuario", "usuario_id"),
    )

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    usuario_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    endpoint: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    chave_p256dh: Mapped[str] = mapped_column(Text, nullable=False)
    chave_auth: Mapped[str] = mapped_column(Text, nullable=False)
    rotulo_dispositivo: Mapped[str] = mapped_column(String(80), nullable=False)
    plataforma: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="outro",
        server_default=text("'outro'"),
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )
    ultimo_envio_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LembreteTarefaModelo(BaseRelacional):
    """Tabela de lembretes agendados para disparo via cron e Web Push."""

    __tablename__ = "lembretes_tarefas"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pendente', 'enviado', 'cancelado')",
            name="status_lembrete_valido",
        ),
        Index("ix_lembretes_varredura", "status", "disparar_em"),
        Index("ix_lembretes_tarefa", "tarefa_id"),
    )

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    usuario_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    tarefa_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("tarefas.id", ondelete="CASCADE"),
        nullable=False,
    )
    disparar_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    antecedencia_min: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pendente",
        server_default=text("'pendente'"),
    )
    enviado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )


class MembroTarefaModelo(BaseRelacional):
    """Tabela de integrantes vinculados a uma tarefa em conjunto."""

    __tablename__ = "membros_tarefa"
    __table_args__ = (
        CheckConstraint("papel IN ('lider', 'colaborador')", name="papel_membro_valido"),
        UniqueConstraint(
            "tarefa_raiz_id",
            "usuario_id",
            name="uq_membros_tarefa_raiz_usuario",
        ),
        Index(
            "uq_membros_tarefa_lider_unico",
            "tarefa_raiz_id",
            unique=True,
            postgresql_where=text("papel = 'lider'"),
        ),
        Index("ix_membros_tarefa_usuario", "usuario_id"),
    )

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    tarefa_raiz_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("tarefas.id", ondelete="CASCADE"),
        nullable=False,
    )
    usuario_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    papel: Mapped[str] = mapped_column(String(20), nullable=False)
    entrou_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )


class VagaTarefaModelo(BaseRelacional):
    """Tabela de vagas nomeadas pre-criadas pelo lider em Tarefas em Conjunto."""

    __tablename__ = "vagas_tarefa"
    __table_args__ = (
        Index("ix_vagas_tarefa_raiz", "tarefa_raiz_id"),
        Index("ix_vagas_tarefa_raiz_email", "tarefa_raiz_id", "email_opcional"),
    )

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    tarefa_raiz_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("tarefas.id", ondelete="CASCADE"),
        nullable=False,
    )
    nome_exibicao: Mapped[str] = mapped_column(String(60), nullable=False)
    email_opcional: Mapped[str | None] = mapped_column(String(320), nullable=True)
    ocupada_por_usuario_id: Mapped[UUID | None] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    criada_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )


class ConviteTarefaModelo(BaseRelacional):
    """Tabela de tokens de link de convite para entrada em Tarefas em Conjunto."""

    __tablename__ = "convites_tarefa"
    __table_args__ = (Index("ix_convites_tarefa_raiz_ativo", "tarefa_raiz_id", "ativo"),)

    id: Mapped[UUID] = mapped_column(UUID_PG(as_uuid=True), primary_key=True, default=uuid4)
    tarefa_raiz_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("tarefas.id", ondelete="CASCADE"),
        nullable=False,
    )
    codigo_token: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    criado_por_usuario_id: Mapped[UUID] = mapped_column(
        UUID_PG(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    ativo: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    expira_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_agora_utc,
        server_default=text("NOW()"),
    )
    revogado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
