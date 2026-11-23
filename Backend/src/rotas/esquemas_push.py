from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from contratos.push import (
    InscricaoPushRegistro,
    LembreteTarefaRegistro,
    ResumoDisparoLembretes,
)
from dominio.push import (
    MAX_DISPOSITIVOS_PUSH_USUARIO,
    MAX_LEMBRETES_ATIVOS_TAREFA,
    PlataformaPush,
    StatusLembrete,
)
from rotas.esquemas_autenticacao import formatar_instante_iso_utc


class ChavesPushEntrada(BaseModel):
    """Par de chaves criptograficas gerado por PushSubscription.toJSON()."""

    p256dh: str
    auth: str


class RequisicaoRegistrarDispositivoPush(BaseModel):
    """Payload de POST /api/push/dispositivos."""

    endpoint: str
    chaves: ChavesPushEntrada
    rotulo_dispositivo: str | None = Field(default=None, max_length=80)
    plataforma: str = "outro"


class DispositivoPushResposta(BaseModel):
    """Representacao segura de dispositivo Web Push sem expor segredos p256dh/auth."""

    id: UUID
    rotulo_dispositivo: str
    plataforma: PlataformaPush
    criado_em: str
    ultimo_envio_em: str | None


class RespostaChavePublicaPush(BaseModel):
    """Resposta de GET /api/push/chave-publica."""

    chave_publica: str | None
    habilitado: bool


class RespostaListarDispositivosPush(BaseModel):
    """Lista de dispositivos Web Push da conta e teto maximo."""

    itens: list[DispositivoPushResposta]
    limite_maximo: int = MAX_DISPOSITIVOS_PUSH_USUARIO


class RequisicaoCriarLembrete(BaseModel):
    """Payload de POST /api/tarefas/{tarefa_id}/lembretes."""

    disparar_em: datetime
    antecedencia_min: int = 15


class RequisicaoAtualizarLembrete(BaseModel):
    """Payload parcial de PATCH /api/lembretes/{lembrete_id}."""

    disparar_em: datetime | None = None
    antecedencia_min: int | None = None


class LembreteDetalhadoResposta(BaseModel):
    """Representacao completa de lembrete vinculado a uma tarefa."""

    id: UUID
    tarefa_id: UUID
    disparar_em: str
    antecedencia_min: int
    status: StatusLembrete
    enviado_em: str | None
    criado_em: str


class RespostaListarLembretesTarefa(BaseModel):
    """Lista de lembretes da tarefa e teto maximo por tarefa."""

    itens: list[LembreteDetalhadoResposta]
    limite_maximo: int = MAX_LEMBRETES_ATIVOS_TAREFA


class RespostaDisparoLembretesCron(BaseModel):
    """Contadores consolidados retornados pelo endpoint interno de cron."""

    lembretes_processados: int
    notificacoes_enviadas: int
    inscricoes_removidas_expiradas: int


def montar_dispositivo_push_resposta(reg: InscricaoPushRegistro) -> DispositivoPushResposta:
    return DispositivoPushResposta(
        id=reg.id,
        rotulo_dispositivo=reg.rotulo_dispositivo,
        plataforma=reg.plataforma,
        criado_em=formatar_instante_iso_utc(reg.criado_em),
        ultimo_envio_em=(
            formatar_instante_iso_utc(reg.ultimo_envio_em) if reg.ultimo_envio_em else None
        ),
    )


def montar_lembrete_detalhado_resposta(reg: LembreteTarefaRegistro) -> LembreteDetalhadoResposta:
    return LembreteDetalhadoResposta(
        id=reg.id,
        tarefa_id=reg.tarefa_id,
        disparar_em=formatar_instante_iso_utc(reg.disparar_em),
        antecedencia_min=reg.antecedencia_min,
        status=reg.status,
        enviado_em=formatar_instante_iso_utc(reg.enviado_em) if reg.enviado_em else None,
        criado_em=formatar_instante_iso_utc(reg.criado_em),
    )


def montar_resumo_disparo_resposta(res: ResumoDisparoLembretes) -> RespostaDisparoLembretesCron:
    return RespostaDisparoLembretesCron(
        lembretes_processados=res.lembretes_processados,
        notificacoes_enviadas=res.notificacoes_enviadas,
        inscricoes_removidas_expiradas=res.inscricoes_removidas_expiradas,
    )
