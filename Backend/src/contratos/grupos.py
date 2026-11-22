from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID

from contratos.tarefas import TarefaRegistro
from dominio.grupos import PapelGrupo


@dataclass(frozen=True)
class MembroGrupoRegistro:
    """Integrante ativo de uma tarefa em conjunto com dados de perfil."""

    id: UUID
    tarefa_raiz_id: UUID
    usuario_id: UUID
    nome_exibicao: str
    email: str
    avatar_url: str | None
    papel: PapelGrupo
    entrou_em: datetime


@dataclass(frozen=True)
class VagaGrupoRegistro:
    """Vaga nomeada persistida no PostgreSQL."""

    id: UUID
    tarefa_raiz_id: UUID
    nome_exibicao: str
    email_opcional: str | None
    ocupada_por_usuario_id: UUID | None
    criada_em: datetime


@dataclass(frozen=True)
class ConviteGrupoRegistro:
    """Convite de compartilhamento vinculado a uma tarefa-raiz."""

    id: UUID
    tarefa_raiz_id: UUID
    codigo_token: str
    criado_por_usuario_id: UUID
    ativo: bool
    expira_em: datetime | None
    criado_em: datetime
    revogado_em: datetime | None


@dataclass(frozen=True)
class ContextoGrupoDaTarefa:
    """Informacoes de autorizacao e arvore compartilhada associadas a uma tarefa."""

    tarefa_raiz_id: UUID
    titulo_raiz: str
    dono_arvore_id: UUID
    compartilhada: bool
    meu_papel: PapelGrupo | None
    nos_arvore: tuple[TarefaRegistro, ...]


@dataclass(frozen=True)
class PreviaConviteRegistro:
    """Dados seguros exibidos na previa de entrada por link."""

    tarefa_raiz_id: UUID
    titulo: str
    lider_nome: str
    membros: tuple[MembroGrupoRegistro, ...]
    vagas: tuple[VagaGrupoRegistro, ...]
    ja_e_membro: bool


@dataclass(frozen=True)
class ResultadoEntradaGrupoRegistro:
    """Resultado atomico da entrada via convite."""

    tarefa_raiz_id: UUID
    dono_arvore_id: UUID
    papel: PapelGrupo
    vaga_vinculada_id: UUID | None
    subtarefas_herdadas: int
    ja_era_membro: bool


@dataclass(frozen=True)
class ResultadoSaidaGrupoRegistro:
    """Resultado de saida voluntaria ou remocao de membro."""

    dono_arvore_id: UUID
    subtarefas_desvinculadas: int
    grupo_desfeito: bool = False


class RepositorioGrupos(Protocol):
    """Porta PostgreSQL para compartilhamento, vagas, convites e papeis."""

    async def obter_contexto_por_tarefa(
        self,
        usuario_solicitante_id: UUID,
        tarefa_id: UUID,
    ) -> ContextoGrupoDaTarefa | None: ...

    async def compartilhar_tarefa(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
    ) -> ConviteGrupoRegistro: ...

    async def listar_membros(self, tarefa_raiz_id: UUID) -> list[MembroGrupoRegistro]: ...

    async def listar_vagas(self, tarefa_raiz_id: UUID) -> list[VagaGrupoRegistro]: ...

    async def obter_convite_ativo_da_raiz(
        self,
        tarefa_raiz_id: UUID,
    ) -> ConviteGrupoRegistro | None: ...

    async def criar_vaga(
        self,
        tarefa_raiz_id: UUID,
        *,
        nome_exibicao: str,
        email_opcional: str | None,
    ) -> VagaGrupoRegistro: ...

    async def excluir_vaga(
        self,
        tarefa_raiz_id: UUID,
        vaga_id: UUID,
    ) -> bool: ...

    async def regenerar_convite(
        self,
        tarefa_raiz_id: UUID,
        criado_por_usuario_id: UUID,
    ) -> ConviteGrupoRegistro: ...

    async def revogar_convites(self, tarefa_raiz_id: UUID) -> int: ...

    async def obter_previa_convite(
        self,
        codigo_token: str,
        usuario_solicitante_id: UUID,
    ) -> PreviaConviteRegistro: ...

    async def entrar_por_convite(
        self,
        *,
        codigo_token: str,
        usuario_id: UUID,
        email_usuario: str,
        vaga_id_solicitada: UUID | None,
    ) -> ResultadoEntradaGrupoRegistro: ...

    async def atribuir_responsavel_subtarefa(
        self,
        *,
        tarefa_raiz_id: UUID,
        dono_arvore_id: UUID,
        tarefa_id: UUID,
        responsavel_usuario_id: UUID | None,
        vaga_responsavel_id: UUID | None,
    ) -> TarefaRegistro: ...

    async def transferir_lideranca(
        self,
        *,
        tarefa_raiz_id: UUID,
        lider_atual_id: UUID,
        novo_lider_id: UUID,
    ) -> list[UUID]: ...

    async def remover_ou_sair_membro(
        self,
        *,
        tarefa_raiz_id: UUID,
        usuario_alvo_id: UUID,
    ) -> ResultadoSaidaGrupoRegistro: ...
