import base64
import json
import re
from collections.abc import Sequence
from dataclasses import asdict
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import DESCENDING
from pymongo.asynchronous.database import AsyncDatabase

from contratos.tarefas import EventoCicloRegistro
from dominio.erros import ErroDeDominio
from infraestrutura.mongo.indices import COLECAO_EVENTOS_CICLO


def _normalizar_dt_utc(valor: Any) -> datetime:
    if isinstance(valor, datetime):
        return valor.replace(tzinfo=UTC) if valor.tzinfo is None else valor.astimezone(UTC)
    return datetime.now(UTC)


def _normalizar_documento_evento(doc: dict[str, Any]) -> dict[str, Any]:
    item = dict(doc)
    if "_id" in item:
        item["evento_id"] = str(item.pop("_id"))
    if isinstance(item.get("criado_em"), datetime):
        item["criado_em"] = _normalizar_dt_utc(item["criado_em"])
    return item


def _codificar_cursor(evento: dict[str, Any]) -> str:
    criado_em = _normalizar_dt_utc(evento.get("criado_em")).isoformat()
    payload = json.dumps({"t": criado_em, "id": str(evento["evento_id"])}, separators=(",", ":"))
    return base64.urlsafe_b64encode(payload.encode("utf-8")).decode("ascii").rstrip("=")


def _decodificar_cursor(cursor_bruto: str) -> tuple[datetime, ObjectId]:
    texto = cursor_bruto.strip()
    if not texto:
        raise ErroDeDominio(
            codigo="CURSOR_INVALIDO",
            mensagem="Cursor de paginacao do diario e invalido.",
            status_http=422,
        )
    padding = "=" * ((4 - len(texto) % 4) % 4)
    try:
        decodificado = base64.urlsafe_b64decode((texto + padding).encode("ascii")).decode("utf-8")
        carga = json.loads(decodificado)
        dt = datetime.fromisoformat(str(carga["t"]))
        dt = dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)
        oid = ObjectId(str(carga["id"]))
        return dt, oid
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, InvalidId) as falha:
        raise ErroDeDominio(
            codigo="CURSOR_INVALIDO",
            mensagem="Cursor de paginacao do diario e invalido.",
            status_http=422,
        ) from falha


def _montar_clausula_pertenca(
    usuario_id: str,
    raizes_compartilhadas: Sequence[str],
) -> dict[str, Any]:
    condicoes: list[dict[str, Any]] = [
        {"usuario_id": usuario_id},
        {"autor_usuario_id": usuario_id},
    ]
    raizes_unicas = [raiz for raiz in dict.fromkeys(raizes_compartilhadas) if raiz]
    if raizes_unicas:
        condicoes.append({"tarefa_raiz_id": {"$in": raizes_unicas}})
    return {"$or": condicoes}


class RepositorioEventosCicloMongo:
    """Adaptador MongoDB para gravacao e leitura de eventos no diario."""

    def __init__(self, banco: AsyncDatabase[dict[str, Any]]) -> None:
        self._colecao = banco[COLECAO_EVENTOS_CICLO]

    async def registrar(self, evento: EventoCicloRegistro) -> None:
        await self._colecao.insert_one(asdict(evento))

    async def listar_por_raiz(
        self,
        tarefa_raiz_id: str,
        limite: int = 20,
    ) -> list[dict[str, Any]]:
        cursor = (
            self._colecao.find({"tarefa_raiz_id": tarefa_raiz_id})
            .sort([("criado_em", DESCENDING), ("_id", DESCENDING)])
            .limit(limite)
        )
        itens: list[dict[str, Any]] = []
        async for doc in cursor:
            itens.append(_normalizar_documento_evento(doc))
        return itens

    async def listar_diario_paginado(
        self,
        *,
        usuario_id: str,
        raizes_compartilhadas: Sequence[str] = (),
        limite: int = 20,
        cursor: str | None = None,
        tipo: str | None = None,
        busca: str | None = None,
    ) -> tuple[list[dict[str, Any]], str | None]:
        clausulas: list[dict[str, Any]] = [
            _montar_clausula_pertenca(usuario_id, raizes_compartilhadas)
        ]

        if tipo is not None and tipo.strip():
            clausulas.append({"tipo_evento": tipo.strip()})

        if busca is not None and busca.strip():
            padrao = re.escape(busca.strip())
            clausulas.append(
                {
                    "$or": [
                        {"resumo": {"$regex": padrao, "$options": "i"}},
                        {"tipo_evento": {"$regex": padrao, "$options": "i"}},
                    ]
                }
            )

        if cursor is not None and cursor.strip():
            dt_cursor, oid_cursor = _decodificar_cursor(cursor)
            clausulas.append(
                {
                    "$or": [
                        {"criado_em": {"$lt": dt_cursor}},
                        {"criado_em": dt_cursor, "_id": {"$lt": oid_cursor}},
                    ]
                }
            )

        filtro: dict[str, Any] = clausulas[0] if len(clausulas) == 1 else {"$and": clausulas}
        consulta = (
            self._colecao.find(filtro)
            .sort([("criado_em", DESCENDING), ("_id", DESCENDING)])
            .limit(limite + 1)
        )
        resultados: list[dict[str, Any]] = []
        async for doc in consulta:
            resultados.append(_normalizar_documento_evento(doc))

        proximo_cursor: str | None = None
        if len(resultados) > limite:
            resultados = resultados[:limite]
            proximo_cursor = _codificar_cursor(resultados[-1])

        return resultados, proximo_cursor

    async def listar_por_periodo(
        self,
        *,
        usuario_id: str,
        raizes_compartilhadas: Sequence[str] = (),
        inicio: datetime | None = None,
        fim: datetime | None = None,
        limite: int = 5000,
    ) -> list[dict[str, Any]]:
        clausulas: list[dict[str, Any]] = [
            _montar_clausula_pertenca(usuario_id, raizes_compartilhadas)
        ]
        faixa_dt: dict[str, Any] = {}
        if inicio is not None:
            faixa_dt["$gte"] = _normalizar_dt_utc(inicio)
        if fim is not None:
            faixa_dt["$lte"] = _normalizar_dt_utc(fim)
        if faixa_dt:
            clausulas.append({"criado_em": faixa_dt})

        filtro: dict[str, Any] = clausulas[0] if len(clausulas) == 1 else {"$and": clausulas}
        consulta = (
            self._colecao.find(filtro)
            .sort([("criado_em", DESCENDING), ("_id", DESCENDING)])
            .limit(limite)
        )
        itens: list[dict[str, Any]] = []
        async for doc in consulta:
            itens.append(_normalizar_documento_evento(doc))
        return itens
