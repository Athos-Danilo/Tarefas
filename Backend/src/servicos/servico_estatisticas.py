from collections.abc import Callable
from datetime import UTC, datetime, time, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pymongo.errors import PyMongoError

from contratos.foco import RepositorioSessoesFoco
from contratos.persistencia import RepositorioPreferenciasCenario
from contratos.tarefas import RepositorioEventosCiclo, RepositorioTarefas
from dominio.calendario import FUSO_PADRAO
from dominio.erros import ErroDeDominio
from dominio.estatisticas import (
    EscopoEstatisticas,
    FormatoExportacaoDiario,
    PeriodoEstatisticas,
    ResumoEstatisticas,
    calcular_estatisticas,
    formatar_diario_markdown,
    validar_atualizacao_preferencias,
)
from dominio.preferencias_padrao import PreferenciasCenario


def _resolver_fuso(fuso_horario: str | None) -> ZoneInfo:
    nome = (fuso_horario or FUSO_PADRAO).strip() or FUSO_PADRAO
    try:
        return ZoneInfo(nome)
    except ZoneInfoNotFoundError as falha:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Fuso horario informado e invalido.",
            status_http=422,
        ) from falha


def parsear_limite_intervalo(valor: str | None, *, eh_fim: bool, fuso: ZoneInfo) -> datetime | None:
    """Converte data ou instante ISO 8601 para datetime UTC para recorte de diario."""
    if valor is None or not valor.strip():
        return None
    bruto = valor.strip()
    if len(bruto) == 10:
        try:
            data_pura = datetime.strptime(bruto, "%Y-%m-%d").date()
        except ValueError as falha:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Data do intervalo de exportacao invalida.",
                status_http=422,
            ) from falha
        horario = time(23, 59, 59, 999999) if eh_fim else time(0, 0, 0, 0)
        return datetime.combine(data_pura, horario, tzinfo=fuso).astimezone(UTC)

    normalizado = f"{bruto[:-1]}+00:00" if bruto.endswith("Z") else bruto
    try:
        instante = datetime.fromisoformat(normalizado)
    except ValueError as falha:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Instante ISO do intervalo de exportacao invalido.",
            status_http=422,
        ) from falha
    if instante.tzinfo is None:
        return instante.replace(tzinfo=fuso).astimezone(UTC)
    return instante.astimezone(UTC)


class ServicoEstatisticas:
    """Casos de uso de estatisticas D14, diario do ciclo e preferencias do cenario."""

    def __init__(
        self,
        *,
        repositorio_tarefas: RepositorioTarefas,
        repositorio_foco: RepositorioSessoesFoco,
        repositorio_eventos: RepositorioEventosCiclo | None,
        repositorio_preferencias: RepositorioPreferenciasCenario | None,
        relogio: Callable[[], datetime] | None = None,
    ) -> None:
        self._tarefas = repositorio_tarefas
        self._foco = repositorio_foco
        self._eventos = repositorio_eventos
        self._preferencias = repositorio_preferencias
        self._relogio = relogio or (lambda: datetime.now(UTC))

    def _agora_utc(self) -> datetime:
        atual = self._relogio()
        return atual.replace(tzinfo=UTC) if atual.tzinfo is None else atual.astimezone(UTC)

    async def _obter_raizes_compartilhadas(self, usuario_id: UUID) -> list[str]:
        tarefas = await self._tarefas.listar_todas_do_usuario(usuario_id)
        return [str(t.id) for t in tarefas if t.compartilhada and t.tarefa_pai_id is None]

    async def obter_resumo(
        self,
        usuario_id: UUID,
        *,
        periodo: PeriodoEstatisticas = "30d",
        escopo: EscopoEstatisticas = "todas",
        etiqueta_id: UUID | None = None,
        fuso_horario: str = FUSO_PADRAO,
    ) -> ResumoEstatisticas:
        fuso = _resolver_fuso(fuso_horario)
        tarefas = await self._tarefas.listar_todas_do_usuario(usuario_id)
        sessoes_foco = await self._foco.listar_todas_do_usuario(usuario_id)
        return calcular_estatisticas(
            tarefas=tarefas,
            sessoes_foco=sessoes_foco,
            periodo=periodo,
            escopo=escopo,
            etiqueta_id=etiqueta_id,
            fuso=fuso,
            agora_utc=self._agora_utc(),
        )

    async def listar_diario(
        self,
        usuario_id: UUID,
        *,
        limite: int = 20,
        cursor: str | None = None,
        tipo: str | None = None,
        busca: str | None = None,
    ) -> tuple[list[dict[str, Any]], str | None]:
        if limite < 1 or limite > 100:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="O limite do diario deve estar entre 1 e 100.",
                status_http=422,
            )
        if self._eventos is None:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="O diario do ciclo nao esta disponivel neste momento.",
                status_http=503,
            )
        raizes_comp = await self._obter_raizes_compartilhadas(usuario_id)
        try:
            return await self._eventos.listar_diario_paginado(
                usuario_id=str(usuario_id),
                raizes_compartilhadas=raizes_comp,
                limite=limite,
                cursor=cursor,
                tipo=tipo,
                busca=busca,
            )
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel consultar o diario do ciclo no banco documental.",
                status_http=503,
            ) from falha

    async def exportar_diario(
        self,
        usuario_id: UUID,
        *,
        formato: FormatoExportacaoDiario = "json",
        de: str | None = None,
        ate: str | None = None,
        fuso_horario: str = FUSO_PADRAO,
    ) -> tuple[str, list[dict[str, Any]]]:
        fuso = _resolver_fuso(fuso_horario)
        inicio_utc = parsear_limite_intervalo(de, eh_fim=False, fuso=fuso)
        fim_utc = parsear_limite_intervalo(ate, eh_fim=True, fuso=fuso)
        if inicio_utc is not None and fim_utc is not None and inicio_utc > fim_utc:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="O inicio do intervalo deve ser anterior ou igual ao fim.",
                status_http=422,
            )
        if (
            inicio_utc is not None
            and fim_utc is not None
            and (fim_utc - inicio_utc) > timedelta(days=3660)
        ):
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="O intervalo de exportacao excede 10 anos.",
                status_http=422,
            )
        if self._eventos is None:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="O diario do ciclo nao esta disponivel para exportacao.",
                status_http=503,
            )
        raizes_comp = await self._obter_raizes_compartilhadas(usuario_id)
        try:
            eventos = await self._eventos.listar_por_periodo(
                usuario_id=str(usuario_id),
                raizes_compartilhadas=raizes_comp,
                inicio=inicio_utc,
                fim=fim_utc,
            )
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel exportar o diario do ciclo.",
                status_http=503,
            ) from falha

        conteudo_md = (
            formatar_diario_markdown(eventos=eventos, fuso=fuso) if formato == "md" else ""
        )
        return conteudo_md, eventos

    async def obter_preferencias(self, usuario_id: UUID) -> PreferenciasCenario:
        if self._preferencias is None:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="As preferencias de cenario nao estao disponiveis.",
                status_http=503,
            )
        try:
            return await self._preferencias.obter_ou_padrao(str(usuario_id))
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel carregar as preferencias do cenario.",
                status_http=503,
            ) from falha

    async def atualizar_preferencias(
        self,
        usuario_id: UUID,
        *,
        patch: dict[str, Any],
        campos_raiz: set[str],
    ) -> PreferenciasCenario:
        if self._preferencias is None:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="As preferencias de cenario nao estao disponiveis.",
                status_http=503,
            )
        try:
            atual = await self._preferencias.obter_ou_padrao(str(usuario_id))
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel ler as preferencias atuais.",
                status_http=503,
            ) from falha

        atualizado = validar_atualizacao_preferencias(
            atual=atual,
            patch=patch,
            campos_raiz=campos_raiz,
            agora=self._agora_utc(),
        )
        try:
            await self._preferencias.salvar(atualizado)
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel salvar as preferencias do cenario.",
                status_http=503,
            ) from falha
        return atualizado
