import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from pymongo.errors import PyMongoError

from contratos.grupos import (
    ContextoGrupoDaTarefa,
    ConviteGrupoRegistro,
    PreviaConviteRegistro,
    RepositorioGrupos,
    ResultadoEntradaGrupoRegistro,
    ResultadoSaidaGrupoRegistro,
    VagaGrupoRegistro,
)
from contratos.tarefas import (
    EventoCicloRegistro,
    RepositorioDetalhesTarefas,
    RepositorioEventosCiclo,
    TarefaRegistro,
)
from dominio.erros import ErroDeDominio
from dominio.grupos import (
    MembroGrupoInfo,
    NoParaDesempenho,
    PainelDesempenhoGrupo,
    VagaGrupoInfo,
    calcular_desempenho_grupo,
    exigir_lider,
    normalizar_email_opcional,
    validar_atribuicao_responsavel,
    validar_nome_vaga,
    validar_saida_membro,
)

logger = logging.getLogger(__name__)


def _momento_utc(agora: datetime) -> str:
    hora = agora.astimezone(UTC).hour
    if 5 <= hora < 12:
        return "manha"
    if 12 <= hora < 17:
        return "tarde"
    if 17 <= hora < 19:
        return "crepusculo"
    return "noite"


@dataclass(frozen=True)
class AtividadeGrupoItem:
    """Item formatado para linha do tempo recente da equipe."""

    evento_id: str
    autor_nome: str
    tipo_evento: str
    resumo: str
    criado_em: datetime


@dataclass(frozen=True)
class PainelCompletoGrupoServico:
    """Visao consolidada de painel de desempenho, token (se lider) e atividades."""

    painel: PainelDesempenhoGrupo
    codigo_token: str | None
    atividade_recente: tuple[AtividadeGrupoItem, ...]


class ServicoGrupos:
    """Casos de uso de Tarefas em Conjunto: vagas, convites, papeis e desempenho."""

    def __init__(
        self,
        *,
        repositorio_grupos: RepositorioGrupos,
        repositorio_eventos: RepositorioEventosCiclo | None = None,
        repositorio_detalhes: RepositorioDetalhesTarefas | None = None,
    ) -> None:
        self._grupos = repositorio_grupos
        self._eventos = repositorio_eventos
        self._detalhes = repositorio_detalhes

    async def _exigir_contexto_grupo(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
        *,
        exigir_raiz: bool = False,
    ) -> ContextoGrupoDaTarefa:
        ctx = await self._grupos.obter_contexto_por_tarefa(usuario_id, tarefa_id)
        if ctx is None:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )
        if not ctx.compartilhada or ctx.meu_papel is None:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Esta tarefa ainda nao foi compartilhada em conjunto.",
                status_http=422,
            )
        if exigir_raiz and ctx.tarefa_raiz_id != tarefa_id:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Informe a tarefa-raiz do projeto compartilhado.",
                status_http=422,
            )
        return ctx

    async def _registrar_evento_seguro(
        self,
        *,
        dono_arvore_id: UUID,
        autor_usuario_id: UUID,
        autor_nome: str,
        tarefa_id: UUID | None,
        tarefa_raiz_id: UUID,
        tipo_evento: str,
        resumo: str,
        detalhes: dict[str, Any] | None = None,
    ) -> None:
        if self._eventos is None:
            return
        agora = datetime.now(UTC)
        carga = dict(detalhes or {})
        carga["autor_nome"] = autor_nome
        evento = EventoCicloRegistro(
            usuario_id=str(dono_arvore_id),
            autor_usuario_id=str(autor_usuario_id),
            tarefa_id=str(tarefa_id) if tarefa_id else None,
            tarefa_raiz_id=str(tarefa_raiz_id),
            tipo_evento=tipo_evento,
            momento_do_dia=_momento_utc(agora),
            resumo=resumo,
            detalhes=carga,
            criado_em=agora,
        )
        try:
            await self._eventos.registrar(evento)
        except (PyMongoError, OSError, TimeoutError) as falha:
            logger.warning("Falha nao critica ao gravar evento de grupo no MongoDB: %s", falha)

    async def compartilhar_tarefa(
        self,
        usuario_id: UUID,
        nome_usuario: str,
        tarefa_raiz_id: UUID,
    ) -> ConviteGrupoRegistro:
        convite = await self._grupos.compartilhar_tarefa(usuario_id, tarefa_raiz_id)
        await self._registrar_evento_seguro(
            dono_arvore_id=usuario_id,
            autor_usuario_id=usuario_id,
            autor_nome=nome_usuario,
            tarefa_id=tarefa_raiz_id,
            tarefa_raiz_id=tarefa_raiz_id,
            tipo_evento="grupo_compartilhado",
            resumo=f"{nome_usuario} ativou o compartilhamento em conjunto.",
        )
        return convite

    async def criar_vaga(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
        *,
        nome_exibicao: str,
        email_opcional: str | None = None,
    ) -> VagaGrupoRegistro:
        ctx = await self._exigir_contexto_grupo(usuario_id, tarefa_raiz_id, exigir_raiz=True)
        exigir_lider(ctx.meu_papel)
        nome_valido = validar_nome_vaga(nome_exibicao)
        email_valido = normalizar_email_opcional(email_opcional)
        return await self._grupos.criar_vaga(
            tarefa_raiz_id,
            nome_exibicao=nome_valido,
            email_opcional=email_valido,
        )

    async def excluir_vaga(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
        vaga_id: UUID,
    ) -> None:
        ctx = await self._exigir_contexto_grupo(usuario_id, tarefa_raiz_id, exigir_raiz=True)
        exigir_lider(ctx.meu_papel)
        removida = await self._grupos.excluir_vaga(tarefa_raiz_id, vaga_id)
        if not removida:
            raise ErroDeDominio(
                codigo="RECURSO_NAO_ENCONTRADO",
                mensagem="Vaga nao encontrada neste grupo.",
                status_http=404,
            )

    async def regenerar_convite(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
    ) -> ConviteGrupoRegistro:
        ctx = await self._exigir_contexto_grupo(usuario_id, tarefa_raiz_id, exigir_raiz=True)
        exigir_lider(ctx.meu_papel)
        return await self._grupos.regenerar_convite(tarefa_raiz_id, usuario_id)

    async def revogar_convites(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
    ) -> int:
        ctx = await self._exigir_contexto_grupo(usuario_id, tarefa_raiz_id, exigir_raiz=True)
        exigir_lider(ctx.meu_papel)
        return await self._grupos.revogar_convites(tarefa_raiz_id)

    async def obter_previa_convite(
        self,
        usuario_id: UUID,
        codigo_token: str,
    ) -> PreviaConviteRegistro:
        return await self._grupos.obter_previa_convite(codigo_token, usuario_id)

    async def entrar_por_convite(
        self,
        usuario_id: UUID,
        *,
        email_usuario: str,
        nome_usuario: str,
        codigo_token: str,
        vaga_id: UUID | None = None,
    ) -> ResultadoEntradaGrupoRegistro:
        res = await self._grupos.entrar_por_convite(
            codigo_token=codigo_token,
            usuario_id=usuario_id,
            email_usuario=email_usuario,
            vaga_id_solicitada=vaga_id,
        )
        if not res.ja_era_membro:
            await self._registrar_evento_seguro(
                dono_arvore_id=res.dono_arvore_id,
                autor_usuario_id=usuario_id,
                autor_nome=nome_usuario,
                tarefa_id=res.tarefa_raiz_id,
                tarefa_raiz_id=res.tarefa_raiz_id,
                tipo_evento="grupo_entrada",
                resumo=f"{nome_usuario} entrou no projeto compartilhado.",
            )
        return res

    async def atribuir_responsavel(
        self,
        usuario_id: UUID,
        nome_usuario: str,
        tarefa_id: UUID,
        *,
        responsavel_usuario_id: UUID | None,
        vaga_responsavel_id: UUID | None,
    ) -> TarefaRegistro:
        validar_atribuicao_responsavel(responsavel_usuario_id, vaga_responsavel_id)
        ctx = await self._exigir_contexto_grupo(usuario_id, tarefa_id)
        exigir_lider(ctx.meu_papel)

        atualizada = await self._grupos.atribuir_responsavel_subtarefa(
            tarefa_raiz_id=ctx.tarefa_raiz_id,
            dono_arvore_id=ctx.dono_arvore_id,
            tarefa_id=tarefa_id,
            responsavel_usuario_id=responsavel_usuario_id,
            vaga_responsavel_id=vaga_responsavel_id,
        )
        await self._registrar_evento_seguro(
            dono_arvore_id=ctx.dono_arvore_id,
            autor_usuario_id=usuario_id,
            autor_nome=nome_usuario,
            tarefa_id=atualizada.id,
            tarefa_raiz_id=ctx.tarefa_raiz_id,
            tipo_evento="grupo_atribuicao",
            resumo=f"{nome_usuario} atribuiu responsavel em {atualizada.titulo}.",
        )
        return atualizada

    async def obter_desempenho(
        self,
        usuario_id: UUID,
        tarefa_raiz_id: UUID,
    ) -> PainelCompletoGrupoServico:
        ctx = await self._grupos.obter_contexto_por_tarefa(usuario_id, tarefa_raiz_id)
        if (
            ctx is None
            or not ctx.compartilhada
            or ctx.meu_papel is None
            or ctx.tarefa_raiz_id != tarefa_raiz_id
        ):
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Projeto compartilhado nao encontrado.",
                status_http=404,
            )

        membros = await self._grupos.listar_membros(tarefa_raiz_id)
        vagas = await self._grupos.listar_vagas(tarefa_raiz_id)
        convite_ativo = await self._grupos.obter_convite_ativo_da_raiz(tarefa_raiz_id)

        nos_perf = [
            NoParaDesempenho(
                id=no.id,
                tarefa_pai_id=no.tarefa_pai_id,
                status=no.status,
                responsavel_usuario_id=no.responsavel_usuario_id,
                vaga_responsavel_id=no.vaga_responsavel_id,
            )
            for no in ctx.nos_arvore
        ]
        membros_info = [
            MembroGrupoInfo(
                usuario_id=m.usuario_id,
                nome_exibicao=m.nome_exibicao,
                papel=m.papel,
                avatar_url=m.avatar_url,
            )
            for m in membros
        ]
        vagas_info = [
            VagaGrupoInfo(
                id=v.id,
                nome_exibicao=v.nome_exibicao,
                email_opcional=v.email_opcional,
                ocupada_por_usuario_id=v.ocupada_por_usuario_id,
            )
            for v in vagas
        ]
        painel = calcular_desempenho_grupo(
            tarefa_raiz_id=tarefa_raiz_id,
            titulo_raiz=ctx.titulo_raiz,
            meu_papel=ctx.meu_papel,
            link_convite_ativo=convite_ativo is not None,
            nos=nos_perf,
            membros=membros_info,
            vagas=vagas_info,
        )

        nomes_membros = {str(m.usuario_id): m.nome_exibicao for m in membros}
        eventos_brutos: list[dict[str, Any]] = []
        if self._eventos is not None:
            try:
                eventos_brutos = await self._eventos.listar_por_raiz(str(tarefa_raiz_id), limite=20)
            except (PyMongoError, OSError, TimeoutError) as falha:
                logger.warning("Degradacao segura ao ler atividade_recente no MongoDB: %s", falha)

        atividades: list[AtividadeGrupoItem] = []
        for item in eventos_brutos:
            det = item.get("detalhes")
            det_dict = det if isinstance(det, dict) else {}
            autor_uid = str(item.get("autor_usuario_id", ""))
            autor_nome = str(det_dict.get("autor_nome") or nomes_membros.get(autor_uid, "Membro"))
            criado_em = item.get("criado_em")
            instante = criado_em if isinstance(criado_em, datetime) else datetime.now(UTC)
            atividades.append(
                AtividadeGrupoItem(
                    evento_id=str(item.get("evento_id", "")),
                    autor_nome=autor_nome,
                    tipo_evento=str(item.get("tipo_evento", "")),
                    resumo=str(item.get("resumo", "")),
                    criado_em=instante,
                )
            )

        codigo_token = (
            convite_ativo.codigo_token
            if convite_ativo is not None and ctx.meu_papel == "lider"
            else None
        )
        return PainelCompletoGrupoServico(
            painel=painel,
            codigo_token=codigo_token,
            atividade_recente=tuple(atividades),
        )

    async def transferir_lideranca(
        self,
        usuario_id: UUID,
        nome_usuario: str,
        tarefa_raiz_id: UUID,
        *,
        novo_lider_usuario_id: UUID,
    ) -> None:
        ctx = await self._exigir_contexto_grupo(usuario_id, tarefa_raiz_id, exigir_raiz=True)
        exigir_lider(ctx.meu_papel)
        if novo_lider_usuario_id == usuario_id:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Voce ja e o lider atual deste grupo.",
                status_http=422,
            )

        ids_arvore = await self._grupos.transferir_lideranca(
            tarefa_raiz_id=tarefa_raiz_id,
            lider_atual_id=usuario_id,
            novo_lider_id=novo_lider_usuario_id,
        )
        if self._detalhes is not None and ids_arvore:
            try:
                await self._detalhes.transferir_dono_por_tarefas(
                    str(usuario_id),
                    str(novo_lider_usuario_id),
                    [str(tid) for tid in ids_arvore],
                )
            except (PyMongoError, OSError, TimeoutError) as falha:
                logger.warning("Falha nao critica ao transferir notas no MongoDB: %s", falha)

        await self._registrar_evento_seguro(
            dono_arvore_id=novo_lider_usuario_id,
            autor_usuario_id=usuario_id,
            autor_nome=nome_usuario,
            tarefa_id=tarefa_raiz_id,
            tarefa_raiz_id=tarefa_raiz_id,
            tipo_evento="grupo_lideranca",
            resumo=f"{nome_usuario} transferiu a lideranca do projeto.",
        )

    async def remover_membro(
        self,
        usuario_id: UUID,
        nome_usuario: str,
        tarefa_raiz_id: UUID,
        *,
        membro_usuario_id: UUID,
    ) -> ResultadoSaidaGrupoRegistro:
        ctx = await self._exigir_contexto_grupo(usuario_id, tarefa_raiz_id, exigir_raiz=True)
        exigir_lider(ctx.meu_papel)
        if membro_usuario_id == usuario_id:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Transfira a lideranca ou utilize /sair para encerrar sua participacao.",
                status_http=422,
            )
        res = await self._grupos.remover_ou_sair_membro(
            tarefa_raiz_id=tarefa_raiz_id,
            usuario_alvo_id=membro_usuario_id,
        )
        await self._registrar_evento_seguro(
            dono_arvore_id=res.dono_arvore_id,
            autor_usuario_id=usuario_id,
            autor_nome=nome_usuario,
            tarefa_id=tarefa_raiz_id,
            tarefa_raiz_id=tarefa_raiz_id,
            tipo_evento="grupo_membro_removido",
            resumo=f"{nome_usuario} removeu um integrante do projeto.",
        )
        return res

    async def sair_do_grupo(
        self,
        usuario_id: UUID,
        nome_usuario: str,
        tarefa_raiz_id: UUID,
    ) -> ResultadoSaidaGrupoRegistro:
        ctx = await self._exigir_contexto_grupo(usuario_id, tarefa_raiz_id, exigir_raiz=True)
        assert ctx.meu_papel is not None
        membros = await self._grupos.listar_membros(tarefa_raiz_id)
        validar_saida_membro(ctx.meu_papel, len(membros))
        res = await self._grupos.remover_ou_sair_membro(
            tarefa_raiz_id=tarefa_raiz_id,
            usuario_alvo_id=usuario_id,
        )
        if not res.grupo_desfeito:
            await self._registrar_evento_seguro(
                dono_arvore_id=res.dono_arvore_id,
                autor_usuario_id=usuario_id,
                autor_nome=nome_usuario,
                tarefa_id=tarefa_raiz_id,
                tarefa_raiz_id=tarefa_raiz_id,
                tipo_evento="grupo_saida",
                resumo=f"{nome_usuario} saiu do projeto em conjunto.",
            )
        return res
