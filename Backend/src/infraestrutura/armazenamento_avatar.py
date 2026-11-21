from pathlib import Path


class ArmazenamentoAvatarLocal:
    """Persiste e remove arquivos WebP de avatar em diretorio local isolado."""

    def __init__(self, diretorio_base: str | Path) -> None:
        self._raiz = Path(diretorio_base).resolve()

    def _caminho_seguro(self, nome_arquivo: str) -> Path:
        nome_limpo = Path(nome_arquivo).name
        if not nome_limpo or nome_limpo != nome_arquivo:
            raise ValueError("Nome de arquivo de avatar invalido.")
        return self._raiz / nome_limpo

    def salvar(self, nome_arquivo: str, conteudo_webp: bytes) -> None:
        self._raiz.mkdir(parents=True, exist_ok=True)
        destino = self._caminho_seguro(nome_arquivo)
        destino.write_bytes(conteudo_webp)

    def ler(self, nome_arquivo: str) -> bytes | None:
        alvo = self._caminho_seguro(nome_arquivo)
        if not alvo.is_file():
            return None
        return alvo.read_bytes()

    def remover(self, nome_arquivo: str) -> None:
        alvo = self._caminho_seguro(nome_arquivo)
        if alvo.is_file():
            alvo.unlink()
