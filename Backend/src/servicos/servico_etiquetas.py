from uuid import UUID

from contratos.tarefas import EtiquetaRegistro, RepositorioEtiquetas
from dominio.erros import ErroDeDominio
from dominio.notas_e_etiquetas import normalizar_nome_etiqueta, validar_cor_hex


class ServicoEtiquetas:
    """Casos de uso de gerenciamento de etiquetas nomeadas por usuario."""

    def __init__(self, repositorio_etiquetas: RepositorioEtiquetas) -> None:
        self._etiquetas = repositorio_etiquetas

    async def listar_etiquetas(self, usuario_id: UUID) -> list[EtiquetaRegistro]:
        return await self._etiquetas.listar(usuario_id)

    async def criar_etiqueta(
        self,
        usuario_id: UUID,
        *,
        nome: str,
        cor: str,
    ) -> EtiquetaRegistro:
        nome_limpo, nome_normalizado = normalizar_nome_etiqueta(nome)
        cor_validada = validar_cor_hex(cor)
        return await self._etiquetas.criar(
            usuario_id=usuario_id,
            nome=nome_limpo,
            nome_normalizado=nome_normalizado,
            cor=cor_validada,
        )

    async def atualizar_etiqueta(
        self,
        usuario_id: UUID,
        etiqueta_id: UUID,
        *,
        nome: str | None = None,
        cor: str | None = None,
    ) -> EtiquetaRegistro:
        existentes = await self._etiquetas.buscar_por_ids(usuario_id, (etiqueta_id,))
        if not existentes:
            raise ErroDeDominio(
                codigo="RECURSO_NAO_ENCONTRADO",
                mensagem="Etiqueta nao encontrada.",
                status_http=404,
            )
        atual = existentes[0]
        if nome is not None:
            nome_limpo, nome_normalizado = normalizar_nome_etiqueta(nome)
        else:
            nome_limpo, nome_normalizado = normalizar_nome_etiqueta(atual.nome)
        cor_validada = validar_cor_hex(cor) if cor is not None else atual.cor
        return await self._etiquetas.atualizar(
            usuario_id=usuario_id,
            etiqueta_id=etiqueta_id,
            nome=nome_limpo,
            nome_normalizado=nome_normalizado,
            cor=cor_validada,
        )

    async def excluir_etiqueta(self, usuario_id: UUID, etiqueta_id: UUID) -> None:
        removida = await self._etiquetas.excluir(usuario_id, etiqueta_id)
        if not removida:
            raise ErroDeDominio(
                codigo="RECURSO_NAO_ENCONTRADO",
                mensagem="Etiqueta nao encontrada.",
                status_http=404,
            )
