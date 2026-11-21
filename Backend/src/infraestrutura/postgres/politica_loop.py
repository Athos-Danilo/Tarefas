import asyncio
import sys


def configurar_loop_assincrono_windows() -> None:
    """Ajusta a politica de event loop no Windows para compatibilidade com psycopg async."""
    if sys.platform != "win32":
        return

    politica_cls = getattr(asyncio, "WindowsSelectorEventLoopPolicy", None)
    if politica_cls is None:
        return

    politica_atual = asyncio.get_event_loop_policy()
    if not isinstance(politica_atual, politica_cls):
        asyncio.set_event_loop_policy(politica_cls())
