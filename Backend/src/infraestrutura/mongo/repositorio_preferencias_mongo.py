from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from dominio.preferencias_padrao import (
    PreferenciasAudio,
    PreferenciasCenario,
    PreferenciasClima,
    PreferenciasTutorial,
    criar_preferencias_cenario_padrao,
)
from infraestrutura.mongo.indices import COLECAO_PREFERENCIAS_CENARIO


def _mesclar_clima(clima_bruto: Any, padrao: PreferenciasClima) -> PreferenciasClima:
    dados = clima_bruto if isinstance(clima_bruto, dict) else {}
    return {
        "habilitado": bool(dados.get("habilitado", padrao["habilitado"])),
        "modo_localizacao": dados.get("modo_localizacao", padrao["modo_localizacao"]),
        "cidade": dados.get("cidade", padrao["cidade"]),
        "uf": dados.get("uf", padrao["uf"]),
        "latitude_aprox": dados.get("latitude_aprox", padrao["latitude_aprox"]),
        "longitude_aprox": dados.get("longitude_aprox", padrao["longitude_aprox"]),
    }


def _mesclar_audio(audio_bruto: Any, padrao: PreferenciasAudio) -> PreferenciasAudio:
    dados = audio_bruto if isinstance(audio_bruto, dict) else {}
    return {
        "habilitado": bool(dados.get("habilitado", padrao["habilitado"])),
        "volume_geral": float(dados.get("volume_geral", padrao["volume_geral"])),
        "volume_efeitos": float(dados.get("volume_efeitos", padrao["volume_efeitos"])),
        "volume_ambiente": float(dados.get("volume_ambiente", padrao["volume_ambiente"])),
    }


def _mesclar_tutorial(
    tutorial_bruto: Any,
    padrao: PreferenciasTutorial,
) -> PreferenciasTutorial:
    dados = tutorial_bruto if isinstance(tutorial_bruto, dict) else {}
    status_bruto = dados.get("status", padrao["status"])
    status = (
        status_bruto if status_bruto in ("pendente", "pulado", "concluido") else padrao["status"]
    )
    return {
        "status": status,
        "etapa_atual": int(dados.get("etapa_atual", padrao["etapa_atual"])),
        "atualizado_em": dados.get("atualizado_em", padrao["atualizado_em"]),
    }


class RepositorioPreferenciasMongo:
    """Repositorio MongoDB para preferencias_cenario com degradacao segura para o padrao."""

    def __init__(self, banco: AsyncDatabase[dict[str, Any]]) -> None:
        self._colecao = banco[COLECAO_PREFERENCIAS_CENARIO]

    async def obter_ou_padrao(self, usuario_id: str) -> PreferenciasCenario:
        documento = await self._colecao.find_one({"usuario_id": usuario_id}, {"_id": 0})
        padrao = criar_preferencias_cenario_padrao(usuario_id)
        if documento is None:
            return padrao

        return {
            "usuario_id": usuario_id,
            "modo_temporal": documento.get("modo_temporal", padrao["modo_temporal"]),
            "hora_simulada": documento.get("hora_simulada", padrao["hora_simulada"]),
            "qualidade_3d": documento.get("qualidade_3d", padrao["qualidade_3d"]),
            "reduzir_movimento": documento.get("reduzir_movimento", padrao["reduzir_movimento"]),
            "clima": _mesclar_clima(documento.get("clima"), padrao["clima"]),
            "audio": _mesclar_audio(documento.get("audio"), padrao["audio"]),
            "tutorial": _mesclar_tutorial(documento.get("tutorial"), padrao["tutorial"]),
            "atualizado_em": documento.get("atualizado_em", padrao["atualizado_em"]),
        }

    async def salvar(self, preferencias: PreferenciasCenario) -> None:
        await self._colecao.replace_one(
            {"usuario_id": preferencias["usuario_id"]},
            dict(preferencias),
            upsert=True,
        )

    async def remover_por_usuario(self, usuario_id: str) -> bool:
        resultado = await self._colecao.delete_one({"usuario_id": usuario_id})
        return resultado.deleted_count > 0
