from contratos.clima import EntradaCacheClima


class CacheClimaMemoria:
    """Cache em memoria por coordenada aproximada com limite maximo de entradas."""

    def __init__(self, max_entradas: int = 512) -> None:
        self._max_entradas = max(1, max_entradas)
        self._dados: dict[tuple[float, float], EntradaCacheClima] = {}

    def obter(self, latitude_aprox: float, longitude_aprox: float) -> EntradaCacheClima | None:
        return self._dados.get((latitude_aprox, longitude_aprox))

    def salvar(
        self,
        latitude_aprox: float,
        longitude_aprox: float,
        entrada: EntradaCacheClima,
    ) -> None:
        chave = (latitude_aprox, longitude_aprox)
        if chave in self._dados:
            del self._dados[chave]
        elif len(self._dados) >= self._max_entradas:
            chave_mais_antiga = next(iter(self._dados))
            del self._dados[chave_mais_antiga]
        self._dados[chave] = entrada

    def limpar(self) -> None:
        self._dados.clear()
