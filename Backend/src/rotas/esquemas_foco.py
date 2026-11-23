from uuid import UUID

from pydantic import BaseModel

from contratos.foco import SessaoFocoRegistro
from dominio.foco import StatusSessaoFoco
from rotas.esquemas_autenticacao import formatar_instante_iso_utc


class RequisicaoIniciarSessaoFoco(BaseModel):
    """Payload de POST /api/foco/sessoes."""

    tarefa_id: UUID
    duracao_planejada_seg: int


class RequisicaoEncerrarSessaoFoco(BaseModel):
    """Payload opcional para concluir ou interromper uma sessao de foco."""

    duracao_real_seg: int | None = None


class SessaoFocoResposta(BaseModel):
    """Representacao serializada de uma sessao do Modo Foco."""

    id: UUID
    tarefa_id: UUID
    tarefa_titulo: str
    duracao_planejada_seg: int
    duracao_real_seg: int | None
    iniciada_em: str
    encerrada_em: str | None
    status: StatusSessaoFoco


class RespostaSessaoFocoAtiva(BaseModel):
    """Resposta de GET /api/foco/sessoes/ativa."""

    sessao_ativa: SessaoFocoResposta | None


class RespostaSessaoFocoItem(BaseModel):
    """Resposta de POST /api/foco/sessoes e transicoes de encerramento."""

    sessao: SessaoFocoResposta


class RespostaHistoricoFoco(BaseModel):
    """Resposta de GET /api/foco/sessoes."""

    itens: list[SessaoFocoResposta]
    total_segundos_concluidos: int


def montar_sessao_foco_resposta(registro: SessaoFocoRegistro) -> SessaoFocoResposta:
    """Converte o registro de persistencia para o contrato JSON da API."""
    return SessaoFocoResposta(
        id=registro.id,
        tarefa_id=registro.tarefa_id,
        tarefa_titulo=registro.tarefa_titulo,
        duracao_planejada_seg=registro.duracao_planejada_seg,
        duracao_real_seg=registro.duracao_real_seg,
        iniciada_em=formatar_instante_iso_utc(registro.iniciada_em),
        encerrada_em=(
            formatar_instante_iso_utc(registro.encerrada_em)
            if registro.encerrada_em is not None
            else None
        ),
        status=registro.status,
    )
