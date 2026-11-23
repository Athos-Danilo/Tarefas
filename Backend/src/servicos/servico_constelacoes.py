from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from uuid import UUID

from pymongo.errors import PyMongoError

from contratos.constelacoes import RepositorioLayoutsConstelacao
from contratos.grupos import ContextoGrupoDaTarefa, RepositorioGrupos
from contratos.tarefas import RepositorioTarefas
from dominio.constelacoes import (
    LayoutConstelacao,
    PosicaoNoConstelacao,
    ViewportConstelacao,
    criar_layout_padrao,
    filtrar_nos_constelacao_existentes,
    validar_e_normalizar_layout_constelacao,
)
from dominio.erros import ErroDeDominio


class ServicoConstelacoes:
    """Casos de uso para leitura, salvamento e reset do layout do Mapa Visual."""

    def __init__(
        self,
        repositorio_grupos: RepositorioGrupos,
        repositorio_layouts: RepositorioLayoutsConstelacao | None,
        repositorio_tarefas: RepositorioTarefas | None = None,
        relogio: Callable[[], datetime] | None = None,
    ) -> None:
        self._grupos = repositorio_grupos
        self._layouts = repositorio_layouts
        self._tarefas = repositorio_tarefas
        self._relogio = relogio or (lambda: datetime.now(UTC))

    async def _exigir_arvore_raiz(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
    ) -> ContextoGrupoDaTarefa:
        contexto = await self._grupos.obter_contexto_por_tarefa(usuario_id, tarefa_raiz_id)
        if contexto is None or contexto.tarefa_raiz_id != tarefa_raiz_id:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa raiz nao encontrada para exibicao no mapa.",
                status_http=404,
            )
        return contexto

    def _exigir_repositorio_layouts(self) -> RepositorioLayoutsConstelacao:
        if self._layouts is None:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Armazenamento MongoDB de constelacoes indisponivel.",
                status_http=503,
            )
        return self._layouts

    async def _coletar_ids_arvore(
        self,
        contexto: ContextoGrupoDaTarefa,
    ) -> set[str] | None:
        if contexto.nos_arvore:
            return {str(no.id) for no in contexto.nos_arvore}
        if self._tarefas is None:
            return None
        subarvore = await self._tarefas.obter_subarvore_cte(
            contexto.dono_arvore_id,
            contexto.tarefa_raiz_id,
        )
        return {str(no.id) for no in subarvore}

    async def obter_layout(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
    ) -> LayoutConstelacao:
        contexto = await self._exigir_arvore_raiz(usuario_id, tarefa_raiz_id)
        repo_layouts = self._exigir_repositorio_layouts()
        try:
            encontrado = await repo_layouts.obter(str(usuario_id), str(tarefa_raiz_id))
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel carregar o layout da constelacao.",
                status_http=503,
            ) from falha

        if encontrado is None:
            return criar_layout_padrao(str(usuario_id), str(tarefa_raiz_id))

        ids_arvore = await self._coletar_ids_arvore(contexto)
        if ids_arvore is None:
            return encontrado
        return filtrar_nos_constelacao_existentes(encontrado, ids_arvore)

    async def salvar_layout(
        self,
        *,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
        nos: Mapping[str, PosicaoNoConstelacao],
        viewport: ViewportConstelacao,
    ) -> LayoutConstelacao:
        contexto = await self._exigir_arvore_raiz(usuario_id, tarefa_raiz_id)
        repo_layouts = self._exigir_repositorio_layouts()
        agora = self._relogio().astimezone(UTC)
        ids_arvore = await self._coletar_ids_arvore(contexto)
        layout_validado = validar_e_normalizar_layout_constelacao(
            usuario_id=str(usuario_id),
            tarefa_raiz_id=tarefa_raiz_id,
            nos_brutos=nos,
            viewport=viewport,
            atualizado_em=agora,
            ids_permitidos=ids_arvore,
        )
        try:
            await repo_layouts.salvar(layout_validado)
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel persistir o layout da constelacao.",
                status_http=503,
            ) from falha
        return layout_validado

    async def remover_layout(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
    ) -> None:
        await self._exigir_arvore_raiz(usuario_id, tarefa_raiz_id)
        repo_layouts = self._exigir_repositorio_layouts()
        try:
            await repo_layouts.remover(str(usuario_id), str(tarefa_raiz_id))
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel restaurar o arranjo automatico.",
                status_http=503,
            ) from falha
