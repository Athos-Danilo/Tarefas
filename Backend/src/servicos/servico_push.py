import logging
from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from configuracao.configuracoes import Configuracoes
from contratos.push import (
    InscricaoPushRegistro,
    LembreteTarefaRegistro,
    ProvedorWebPush,
    RepositorioPushELembretes,
    ResumoDisparoLembretes,
)
from dominio.erros import ErroDeDominio
from dominio.push import (
    TipoEventoGrupoPush,
    montar_payload_notificacao_grupo,
    montar_payload_notificacao_lembrete,
    validar_chaves_push,
    validar_endpoint_push,
    validar_lembrete_entrada,
    validar_limite_dispositivos,
    validar_limite_lembretes_tarefa,
    validar_plataforma_push,
    validar_rotulo_dispositivo,
    validar_token_cron_interno,
)

logger = logging.getLogger(__name__)


class ServicoPush:
    """Casos de uso de inscricoes Web Push VAPID, lembretes e disparo em lote."""

    def __init__(
        self,
        *,
        configuracoes: Configuracoes,
        repositorio: RepositorioPushELembretes,
        provedor_web_push: ProvedorWebPush,
    ) -> None:
        self._config = configuracoes
        self._repo = repositorio
        self._provedor = provedor_web_push

    def obter_chave_publica(self) -> tuple[str | None, bool]:
        chave = (self._config.vapid_public_key or "").strip() or None
        return chave, chave is not None

    async def listar_dispositivos(self, usuario_id: UUID) -> list[InscricaoPushRegistro]:
        return await self._repo.listar_inscricoes_usuario(usuario_id)

    async def registrar_dispositivo(
        self,
        usuario_id: UUID,
        *,
        endpoint: str,
        chave_p256dh: str,
        chave_auth: str,
        rotulo_dispositivo: str | None,
        plataforma: str,
    ) -> InscricaoPushRegistro:
        endpoint_valido = validar_endpoint_push(endpoint)
        p256dh_valido, auth_valido = validar_chaves_push(chave_p256dh, chave_auth)
        plataforma_valida = validar_plataforma_push(plataforma)
        rotulo_valido = validar_rotulo_dispositivo(rotulo_dispositivo, plataforma_valida)

        atuais = await self._repo.listar_inscricoes_usuario(usuario_id)
        existente_mesmo_usuario = any(item.endpoint == endpoint_valido for item in atuais)
        validar_limite_dispositivos(
            len(atuais),
            ja_existe_mesmo_endpoint=existente_mesmo_usuario,
        )

        return await self._repo.registrar_ou_atualizar_inscricao(
            usuario_id=usuario_id,
            endpoint=endpoint_valido,
            chave_p256dh=p256dh_valido,
            chave_auth=auth_valido,
            rotulo_dispositivo=rotulo_valido,
            plataforma=plataforma_valida,
        )

    async def revogar_dispositivo(self, usuario_id: UUID, dispositivo_id: UUID) -> None:
        removido = await self._repo.revogar_inscricao(usuario_id, dispositivo_id)
        if not removido:
            raise ErroDeDominio(
                codigo="DISPOSITIVO_PUSH_NAO_ENCONTRADO",
                mensagem="Dispositivo Web Push nao encontrado.",
                status_http=404,
            )

    async def _exigir_acesso_tarefa(self, usuario_id: UUID, tarefa_id: UUID) -> None:
        permitido = await self._repo.verificar_acesso_tarefa(usuario_id, tarefa_id)
        if not permitido:
            raise ErroDeDominio(
                codigo="TAREFA_NAO_ENCONTRADA",
                mensagem="Tarefa nao encontrada.",
                status_http=404,
            )

    async def listar_lembretes_tarefa(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> list[LembreteTarefaRegistro]:
        await self._exigir_acesso_tarefa(usuario_id, tarefa_id)
        return await self._repo.listar_lembretes_tarefa(usuario_id, tarefa_id)

    async def criar_lembrete(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
        *,
        disparar_em: datetime,
        antecedencia_min: int,
    ) -> LembreteTarefaRegistro:
        await self._exigir_acesso_tarefa(usuario_id, tarefa_id)
        instante_utc, antecedencia_valida = validar_lembrete_entrada(
            disparar_em,
            antecedencia_min,
        )
        pendentes = await self._repo.contar_lembretes_pendentes_tarefa(usuario_id, tarefa_id)
        validar_limite_lembretes_tarefa(pendentes)
        return await self._repo.criar_lembrete(
            usuario_id=usuario_id,
            tarefa_id=tarefa_id,
            disparar_em=instante_utc,
            antecedencia_min=antecedencia_valida,
        )

    async def atualizar_lembrete(
        self,
        usuario_id: UUID,
        lembrete_id: UUID,
        *,
        disparar_em: datetime | None,
        antecedencia_min: int | None,
    ) -> LembreteTarefaRegistro:
        if disparar_em is None and antecedencia_min is None:
            raise ErroDeDominio(
                codigo="LEMBRETE_INVALIDO",
                mensagem="Informe disparar_em ou antecedencia_min para atualizar o lembrete.",
                status_http=422,
            )
        instante_utc: datetime | None = None
        if disparar_em is not None:
            instante_utc, _ = validar_lembrete_entrada(
                disparar_em,
                antecedencia_min if antecedencia_min is not None else 0,
            )
        elif antecedencia_min is not None:
            validar_lembrete_entrada(datetime.now(UTC), antecedencia_min)

        atualizado = await self._repo.atualizar_lembrete(
            usuario_id=usuario_id,
            lembrete_id=lembrete_id,
            disparar_em=instante_utc,
            antecedencia_min=antecedencia_min,
        )
        if atualizado is None:
            raise ErroDeDominio(
                codigo="LEMBRETE_NAO_ENCONTRADO",
                mensagem="Lembrete pendente nao encontrado.",
                status_http=404,
            )
        return atualizado

    async def cancelar_lembrete(self, usuario_id: UUID, lembrete_id: UUID) -> None:
        cancelado = await self._repo.cancelar_lembrete(usuario_id, lembrete_id)
        if not cancelado:
            raise ErroDeDominio(
                codigo="LEMBRETE_NAO_ENCONTRADO",
                mensagem="Lembrete pendente nao encontrado.",
                status_http=404,
            )

    async def _enviar_para_inscricoes(
        self,
        inscricoes: Sequence[InscricaoPushRegistro],
        payload: dict[str, Any],
        agora: datetime,
    ) -> tuple[int, int]:
        sucessos_ids: list[UUID] = []
        expiradas_ids: list[UUID] = []
        for inscricao in inscricoes:
            resultado = await self._provedor.enviar(inscricao, payload)
            if resultado.sucesso:
                sucessos_ids.append(inscricao.id)
            elif resultado.expirada:
                expiradas_ids.append(inscricao.id)

        if sucessos_ids:
            await self._repo.atualizar_ultimo_envio_inscricoes(sucessos_ids, agora)
        removidas = 0
        if expiradas_ids:
            removidas = await self._repo.remover_inscricoes_por_ids(expiradas_ids)
        return len(sucessos_ids), removidas

    async def disparar_lembretes_pendentes(
        self,
        *,
        token_cron_recebido: str | None,
    ) -> ResumoDisparoLembretes:
        validar_token_cron_interno(self._config.token_cron_lembretes, token_cron_recebido)
        agora = datetime.now(UTC)
        pendentes = await self._repo.listar_lembretes_pendentes_vencidos(agora)
        if not pendentes:
            return ResumoDisparoLembretes(
                lembretes_processados=0,
                notificacoes_enviadas=0,
                inscricoes_removidas_expiradas=0,
            )

        uids = list({item.usuario_id for item in pendentes})
        todas_inscricoes = await self._repo.listar_inscricoes_por_usuarios(uids)
        por_usuario: dict[UUID, list[InscricaoPushRegistro]] = defaultdict(list)
        for insc in todas_inscricoes:
            por_usuario[insc.usuario_id].append(insc)

        notificacoes_enviadas = 0
        expiradas_ids_acumuladas: set[UUID] = set()
        sucessos_ids: list[UUID] = []
        processados_ids: list[UUID] = []

        for lembrete in pendentes:
            processados_ids.append(lembrete.id)
            payload = montar_payload_notificacao_lembrete(
                lembrete.tarefa_id,
                lembrete.titulo_tarefa,
                lembrete.antecedencia_min,
            )
            alvos = [
                insc
                for insc in por_usuario.get(lembrete.usuario_id, [])
                if insc.id not in expiradas_ids_acumuladas
            ]
            for insc in alvos:
                res = await self._provedor.enviar(insc, payload)
                if res.sucesso:
                    notificacoes_enviadas += 1
                    sucessos_ids.append(insc.id)
                elif res.expirada:
                    expiradas_ids_acumuladas.add(insc.id)

        await self._repo.marcar_lembretes_enviados(processados_ids, agora)
        if sucessos_ids:
            await self._repo.atualizar_ultimo_envio_inscricoes(list(set(sucessos_ids)), agora)
        removidas = 0
        if expiradas_ids_acumuladas:
            removidas = await self._repo.remover_inscricoes_por_ids(list(expiradas_ids_acumuladas))
        return ResumoDisparoLembretes(
            lembretes_processados=len(processados_ids),
            notificacoes_enviadas=notificacoes_enviadas,
            inscricoes_removidas_expiradas=removidas,
        )

    async def notificar_usuarios_evento_grupo(
        self,
        *,
        destinatarios_ids: Sequence[UUID],
        tipo_evento: TipoEventoGrupoPush,
        tarefa_id: UUID,
        tarefa_raiz_id: UUID,
        titulo_tarefa: str,
        autor_nome: str,
    ) -> None:
        if not destinatarios_ids:
            return
        try:
            inscricoes = await self._repo.listar_inscricoes_por_usuarios(destinatarios_ids)
            if not inscricoes:
                return
            payload = montar_payload_notificacao_grupo(
                tipo_evento,
                tarefa_id,
                tarefa_raiz_id,
                titulo_tarefa,
                autor_nome,
            )
            await self._enviar_para_inscricoes(inscricoes, payload, datetime.now(UTC))
        except Exception:  # pragma: no cover - best-effort nao bloqueia mutacoes do grupo
            logger.warning(
                "Falha nao-bloqueante ao enviar notificacao Web Push de grupo.",
                exc_info=True,
            )
