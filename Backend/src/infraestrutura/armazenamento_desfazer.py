import secrets
from dataclasses import replace
from datetime import UTC, datetime
from threading import Lock
from uuid import UUID

from dominio.modelos_tarefa import RegistroDesfazerCascata


class ArmazenamentoDesfazerMemoria:
    """Armazena tokens temporarios de desfazer cascata em memoria por usuario."""

    def __init__(self) -> None:
        self._registros: dict[tuple[UUID, str], RegistroDesfazerCascata] = {}
        self._trava = Lock()

    def _limpar_expirados(self, agora: datetime) -> None:
        expirados = [
            chave
            for chave, valor in self._registros.items()
            if valor.expira_em <= agora or valor.consumido
        ]
        for chave in expirados:
            self._registros.pop(chave, None)

    def salvar(self, usuario_id: UUID, registro: RegistroDesfazerCascata) -> str:
        token = f"undo_{secrets.token_hex(12)}"
        with self._trava:
            self._limpar_expirados(datetime.now(UTC))
            self._registros[(usuario_id, token)] = registro
        return token

    def obter(self, usuario_id: UUID, token: str) -> RegistroDesfazerCascata | None:
        with self._trava:
            return self._registros.get((usuario_id, token))

    def marcar_consumido(self, usuario_id: UUID, token: str) -> None:
        with self._trava:
            chave = (usuario_id, token)
            atual = self._registros.get(chave)
            if atual is not None:
                self._registros[chave] = replace(atual, consumido=True)
                self._registros.pop(chave, None)
