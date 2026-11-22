import re
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from typing import Any, Protocol
from urllib.parse import urlsplit
from uuid import UUID

from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import PrioridadeTarefa, StatusTarefa, TurnoTarefa

MAX_ETIQUETAS_USUARIO = 30
MAX_ETIQUETAS_POR_TAREFA = 8
ETIQUETA_NOME_MIN = 1
ETIQUETA_NOME_MAX = 30
MAX_BLOCOS_POR_TAREFA = 50
MAX_CARACTERES_NOTAS_TAREFA = 15000

_REGEX_COR_HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
_FORMATO_DATA_MD = "%d/%m/%Y %H:%M UTC"


class EtiquetaExportavel(Protocol):
    """Contrato estrutural minimo de etiqueta para exportacao."""

    @property
    def nome(self) -> str: ...


class TarefaExportavel(Protocol):
    """Contrato estrutural minimo de tarefa para exportacao em Markdown."""

    @property
    def id(self) -> UUID: ...

    @property
    def tarefa_pai_id(self) -> UUID | None: ...

    @property
    def titulo(self) -> str: ...

    @property
    def prioridade(self) -> PrioridadeTarefa: ...

    @property
    def status(self) -> StatusTarefa: ...

    @property
    def turno(self) -> TurnoTarefa: ...

    @property
    def prazo(self) -> datetime | None: ...

    @property
    def profundidade(self) -> int: ...

    @property
    def etiquetas(self) -> Sequence[EtiquetaExportavel]: ...


def normalizar_nome_etiqueta(nome: str) -> tuple[str, str]:
    """Colapsa espacos, valida comprimento (1-30) e retorna (nome_exibicao, nome_normalizado)."""
    limpo = " ".join(nome.split())
    if len(limpo) < ETIQUETA_NOME_MIN or len(limpo) > ETIQUETA_NOME_MAX:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="O nome da etiqueta deve conter entre 1 e 30 caracteres.",
            status_http=422,
            detalhes={"minimo": ETIQUETA_NOME_MIN, "maximo": ETIQUETA_NOME_MAX},
        )
    return limpo, limpo.lower()


def validar_cor_hex(cor: str) -> str:
    """Valida e normaliza cor hexadecimal no formato #RRGGBB."""
    limpa = cor.strip()
    if not _REGEX_COR_HEX.fullmatch(limpa):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="A cor da etiqueta deve seguir o formato hexadecimal #RRGGBB.",
            status_http=422,
        )
    return limpa.upper()


def validar_etiquetas_da_tarefa(etiqueta_ids: Sequence[UUID]) -> tuple[UUID, ...]:
    """Remove duplicidades e aplica limite maximo de 8 etiquetas por tarefa."""
    unicas = tuple(dict.fromkeys(etiqueta_ids))
    if len(unicas) > MAX_ETIQUETAS_POR_TAREFA:
        raise ErroDeDominio(
            codigo="LIMITE_ETIQUETAS_EXCEDIDO",
            mensagem="Cada tarefa aceita no maximo 8 etiquetas associadas.",
            status_http=422,
            detalhes={"limite_por_tarefa": MAX_ETIQUETAS_POR_TAREFA},
        )
    return unicas


def _validar_url_segura(url_bruta: str) -> str:
    url = url_bruta.strip()
    analisada = urlsplit(url)
    if analisada.scheme.lower() not in ("http", "https") or not analisada.netloc:
        raise ErroDeDominio(
            codigo="URL_NAO_SEGURA",
            mensagem="Links nas notas devem usar exclusivamente os protocolos http:// ou https://.",
            status_http=422,
        )
    return url


def _validar_metadados_visuais(metadados: Mapping[str, Any] | None) -> dict[str, Any]:
    if not metadados:
        return {}
    resultado: dict[str, Any] = {}
    forma = metadados.get("forma_botanica")
    if forma is not None:
        if not isinstance(forma, str) or len(forma.strip()) > 40:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="forma_botanica deve ser texto com ate 40 caracteres.",
                status_http=422,
            )
        resultado["forma_botanica"] = forma.strip()
    cor = metadados.get("cor_estrela")
    if cor is not None:
        if not isinstance(cor, str):
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="cor_estrela deve estar no formato hexadecimal #RRGGBB.",
                status_http=422,
            )
        resultado["cor_estrela"] = validar_cor_hex(cor)
    icone = metadados.get("icone")
    if icone is not None:
        if not isinstance(icone, str) or len(icone.strip()) > 40:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="icone deve ser texto com ate 40 caracteres.",
                status_http=422,
            )
        resultado["icone"] = icone.strip()
    return resultado


def _validar_bloco_subtitulo(bloco: Mapping[str, Any], bloco_id: str) -> tuple[dict[str, Any], int]:
    nivel = bloco.get("nivel")
    texto = bloco.get("texto")
    if nivel not in (2, 3) or not isinstance(texto, str):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Bloco 'subtitulo' exige nivel (2 ou 3) e texto.",
            status_http=422,
        )
    return {"id": bloco_id, "tipo": "subtitulo", "nivel": nivel, "texto": texto}, len(texto)


def _validar_bloco_paragrafo(bloco: Mapping[str, Any], bloco_id: str) -> tuple[dict[str, Any], int]:
    texto = bloco.get("texto")
    if not isinstance(texto, str):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Bloco 'paragrafo' exige campo texto.",
            status_http=422,
        )
    return {"id": bloco_id, "tipo": "paragrafo", "texto": texto}, len(texto)


def _validar_bloco_lista(bloco: Mapping[str, Any], bloco_id: str) -> tuple[dict[str, Any], int]:
    ordenada = bloco.get("ordenada", False)
    itens = bloco.get("itens")
    if not isinstance(ordenada, bool) or not isinstance(itens, list):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Bloco 'lista' exige 'ordenada' booleano e 'itens' em lista.",
            status_http=422,
        )
    itens_validados: list[str] = []
    caracteres = 0
    for item in itens:
        if not isinstance(item, str):
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Todos os itens de 'lista' devem ser textos.",
                status_http=422,
            )
        itens_validados.append(item)
        caracteres += len(item)
    return (
        {"id": bloco_id, "tipo": "lista", "ordenada": ordenada, "itens": itens_validados},
        caracteres,
    )


def _validar_bloco_checklist(bloco: Mapping[str, Any], bloco_id: str) -> tuple[dict[str, Any], int]:
    itens = bloco.get("itens")
    if not isinstance(itens, list):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Bloco 'checklist' exige lista de itens.",
            status_http=422,
        )
    itens_validados: list[dict[str, Any]] = []
    caracteres = 0
    for item in itens:
        if (
            not isinstance(item, Mapping)
            or not isinstance(item.get("texto"), str)
            or not isinstance(item.get("marcado"), bool)
        ):
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Cada item de checklist exige 'texto' (str) e 'marcado' (bool).",
                status_http=422,
            )
        texto = item["texto"]
        itens_validados.append({"texto": texto, "marcado": item["marcado"]})
        caracteres += len(texto)
    return {"id": bloco_id, "tipo": "checklist", "itens": itens_validados}, caracteres


def _validar_bloco_citacao(bloco: Mapping[str, Any], bloco_id: str) -> tuple[dict[str, Any], int]:
    texto = bloco.get("texto")
    autor = bloco.get("autor")
    if not isinstance(texto, str) or (autor is not None and not isinstance(autor, str)):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Bloco 'citacao' exige texto e autor opcional em formato texto.",
            status_http=422,
        )
    chars = len(texto) + (len(autor) if isinstance(autor, str) else 0)
    saida: dict[str, Any] = {"id": bloco_id, "tipo": "citacao", "texto": texto}
    if autor is not None:
        saida["autor"] = autor
    return saida, chars


def _validar_bloco_codigo_ou_link(
    bloco: Mapping[str, Any],
    bloco_id: str,
) -> tuple[dict[str, Any], int]:
    subtipo = bloco.get("subtipo")
    rotulo = bloco.get("rotulo")
    conteudo = bloco.get("conteudo")
    if (
        subtipo not in ("codigo", "link")
        or not isinstance(conteudo, str)
        or (rotulo is not None and not isinstance(rotulo, str))
    ):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Bloco 'codigo_ou_link' exige subtipo ('codigo'|'link') e conteudo.",
            status_http=422,
        )
    conteudo_validado = _validar_url_segura(conteudo) if subtipo == "link" else conteudo
    chars = len(conteudo_validado) + (len(rotulo) if isinstance(rotulo, str) else 0)
    saida: dict[str, Any] = {
        "id": bloco_id,
        "tipo": "codigo_ou_link",
        "subtipo": subtipo,
        "conteudo": conteudo_validado,
    }
    if rotulo is not None:
        saida["rotulo"] = rotulo
    return saida, chars


_VALIDADORES_BLOCO = {
    "subtitulo": _validar_bloco_subtitulo,
    "paragrafo": _validar_bloco_paragrafo,
    "lista": _validar_bloco_lista,
    "checklist": _validar_bloco_checklist,
    "citacao": _validar_bloco_citacao,
    "codigo_ou_link": _validar_bloco_codigo_ou_link,
}


def validar_detalhes_tarefa(
    *,
    metadados_visuais: Mapping[str, Any] | None,
    notas_em_blocos: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    """Valida os 6 tipos de bloco rico, URLs http(s) e limites de 50 blocos / 15.000 chars."""
    if len(notas_em_blocos) > MAX_BLOCOS_POR_TAREFA:
        raise ErroDeDominio(
            codigo="LIMITE_BLOCOS_EXCEDIDO",
            mensagem="As notas da tarefa permitem no maximo 50 blocos.",
            status_http=422,
            detalhes={"limite_blocos": MAX_BLOCOS_POR_TAREFA},
        )

    metadados_validados = _validar_metadados_visuais(metadados_visuais)
    blocos_validados: list[dict[str, Any]] = []
    total_caracteres = 0

    for indice, bloco in enumerate(notas_em_blocos, start=1):
        tipo = bloco.get("tipo")
        if not isinstance(tipo, str) or tipo not in _VALIDADORES_BLOCO:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Tipo de bloco de nota nao suportado.",
                status_http=422,
            )
        id_bruto = bloco.get("id")
        bloco_id = (
            id_bruto.strip() if isinstance(id_bruto, str) and id_bruto.strip() else f"blk-{indice}"
        )
        bloco_normalizado, chars = _VALIDADORES_BLOCO[tipo](bloco, bloco_id)
        total_caracteres += chars
        if total_caracteres > MAX_CARACTERES_NOTAS_TAREFA:
            raise ErroDeDominio(
                codigo="LIMITE_BLOCOS_EXCEDIDO",
                mensagem="As notas da tarefa excedem o limite maximo de 15.000 caracteres.",
                status_http=422,
                detalhes={"limite_caracteres": MAX_CARACTERES_NOTAS_TAREFA},
            )
        blocos_validados.append(bloco_normalizado)

    return {
        "metadados_visuais": metadados_validados,
        "notas_em_blocos": blocos_validados,
    }


def criar_detalhes_tarefa_padrao(usuario_id: str, tarefa_id: str) -> dict[str, Any]:
    """Estrutura vazia padrao usada em degradacao segura quando nao ha notas salvas."""
    return {
        "tarefa_id": tarefa_id,
        "usuario_id": usuario_id,
        "metadados_visuais": {},
        "notas_em_blocos": [],
        "atualizado_em": None,
    }


def _renderizar_bloco_markdown(bloco: Mapping[str, Any], recuo: str) -> list[str]:
    tipo = bloco.get("tipo")
    linhas: list[str] = []
    if tipo == "subtitulo":
        prefixo = "#" * (int(bloco.get("nivel", 2)) + 1)
        linhas.append(f"{recuo}{prefixo} {bloco.get('texto', '')}")
    elif tipo == "paragrafo":
        linhas.append(f"{recuo}{bloco.get('texto', '')}")
    elif tipo == "lista":
        ordenada = bool(bloco.get("ordenada", False))
        for pos, item in enumerate(bloco.get("itens", []), start=1):
            marcador = f"{pos}." if ordenada else "-"
            linhas.append(f"{recuo}{marcador} {item}")
    elif tipo == "checklist":
        for item in bloco.get("itens", []):
            marca = "x" if item.get("marcado") else " "
            linhas.append(f"{recuo}- [{marca}] {item.get('texto', '')}")
    elif tipo == "citacao":
        autor = bloco.get("autor")
        sufixo = f" ({autor})" if autor else ""
        linhas.append(f"{recuo}> {bloco.get('texto', '')}{sufixo}")
    elif tipo == "codigo_ou_link":
        conteudo = str(bloco.get("conteudo", ""))
        rotulo = bloco.get("rotulo") or conteudo
        if bloco.get("subtipo") == "link":
            linhas.append(f"{recuo}- [{rotulo}]({conteudo})")
        else:
            linhas.append(f"{recuo}```")
            linhas.extend(f"{recuo}{parte}" for parte in conteudo.splitlines())
            linhas.append(f"{recuo}```")
    return linhas


def renderizar_arvore_markdown(
    registros: Sequence[TarefaExportavel],
    detalhes_por_tarefa: Mapping[UUID, Mapping[str, Any]],
) -> str:
    """Exporta arvore hierarquica de tarefas e seus blocos ricos em Markdown UTF-8."""
    por_pai: dict[UUID | None, list[TarefaExportavel]] = {}
    ids_presentes = {item.id for item in registros}
    for item in registros:
        chave_pai = item.tarefa_pai_id if item.tarefa_pai_id in ids_presentes else None
        por_pai.setdefault(chave_pai, []).append(item)

    linhas: list[str] = ["# Tarefas exportadas - Lume", ""]

    def _visitar(no: TarefaExportavel, nivel_visual: int) -> None:
        recuo = "  " * nivel_visual
        marca = "x" if no.status == "concluida" else " "
        metadados = [f"prioridade: {no.prioridade}", f"turno: {no.turno}"]
        if no.prazo is not None:
            metadados.append(f"prazo: {no.prazo.astimezone(UTC).strftime(_FORMATO_DATA_MD)}")
        if no.etiquetas:
            nomes = ", ".join(etq.nome for etq in no.etiquetas)
            metadados.append(f"etiquetas: {nomes}")
        linhas.append(f"{recuo}- [{marca}] **{no.titulo}** ({' | '.join(metadados)})")

        detalhe = detalhes_por_tarefa.get(no.id)
        if detalhe:
            for bloco in detalhe.get("notas_em_blocos", []):
                linhas.extend(_renderizar_bloco_markdown(bloco, f"{recuo}  "))

        for filha in por_pai.get(no.id, []):
            _visitar(filha, nivel_visual + 1)

    for raiz in por_pai.get(None, []):
        _visitar(raiz, 0)
        linhas.append("")

    return "\n".join(linhas).strip() + "\n"
