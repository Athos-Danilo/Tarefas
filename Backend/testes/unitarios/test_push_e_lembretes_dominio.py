from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest
from pywebpush import WebPushException

from configuracao.configuracoes import Configuracoes
from contratos.push import InscricaoPushRegistro
from dominio.erros import ErroDeDominio
from dominio.push import (
    MAX_ANTECEDENCIA_MIN,
    MAX_DISPOSITIVOS_PUSH_USUARIO,
    MAX_LEMBRETES_ATIVOS_TAREFA,
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
from infraestrutura.webpush.adaptador_pywebpush import AdaptadorPyWebPush


def test_validar_endpoint_push_aceita_https_e_rejeita_esquemas_inseguros() -> None:
    url = "https://fcm.googleapis.com/fcm/send/abc-123"
    assert validar_endpoint_push(f"  {url}  ") == url

    for invalido in ("", "   ", "http://inseguro.dev/push", "javascript:alert(1)", "https://"):
        with pytest.raises(ErroDeDominio) as exc:
            validar_endpoint_push(invalido)
        assert exc.value.codigo == "ENDPOINT_PUSH_INVALIDO"
        assert exc.value.status_http == 422


def test_validar_chaves_push_rejeita_ausencia_ou_espacos() -> None:
    p256dh, auth = validar_chaves_push("  BEl62iUYgUivxIkv69yViEui  ", "  tBHItJI5svbpez  ")
    assert p256dh == "BEl62iUYgUivxIkv69yViEui"
    assert auth == "tBHItJI5svbpez"

    for p, a in (("", "tBHItJI5svbpez"), ("curta", "tBHItJI5svbpez"), ("BEl62iUYgUivxI", "ab")):
        with pytest.raises(ErroDeDominio) as exc:
            validar_chaves_push(p, a)
        assert exc.value.codigo == "CHAVES_PUSH_INVALIDAS"
        assert exc.value.status_http == 422


def test_validar_plataforma_e_rotulo_dispositivo() -> None:
    assert validar_plataforma_push("desktop") == "desktop"
    assert validar_plataforma_push("ios") == "ios"
    with pytest.raises(ErroDeDominio) as exc_plat:
        validar_plataforma_push("smartwatch")
    assert exc_plat.value.codigo == "PLATAFORMA_PUSH_INVALIDA"

    assert validar_rotulo_dispositivo(None, "desktop") == "Computador"
    assert validar_rotulo_dispositivo("   ", "android") == "Android"
    assert validar_rotulo_dispositivo("Meu iPhone 15", "ios") == "Meu iPhone 15"

    with pytest.raises(ErroDeDominio) as exc_rot:
        validar_rotulo_dispositivo("x" * 81, "desktop")
    assert exc_rot.value.codigo == "ROTULO_DISPOSITIVO_INVALIDO"


def test_validar_limites_dispositivos_e_lembretes_d09() -> None:
    validar_limite_dispositivos(MAX_DISPOSITIVOS_PUSH_USUARIO - 1, ja_existe_mesmo_endpoint=False)
    validar_limite_dispositivos(MAX_DISPOSITIVOS_PUSH_USUARIO, ja_existe_mesmo_endpoint=True)

    with pytest.raises(ErroDeDominio) as exc_disp:
        validar_limite_dispositivos(MAX_DISPOSITIVOS_PUSH_USUARIO, ja_existe_mesmo_endpoint=False)
    assert exc_disp.value.codigo == "LIMITE_DISPOSITIVOS_PUSH_ATINGIDO"
    assert exc_disp.value.status_http == 409

    validar_limite_lembretes_tarefa(MAX_LEMBRETES_ATIVOS_TAREFA - 1)
    with pytest.raises(ErroDeDominio) as exc_lem:
        validar_limite_lembretes_tarefa(MAX_LEMBRETES_ATIVOS_TAREFA)
    assert exc_lem.value.codigo == "LIMITE_LEMBRETES_TAREFA_ATINGIDO"
    assert exc_lem.value.status_http == 409


def test_validar_lembrete_entrada_normaliza_utc_e_valida_antecedencia() -> None:
    instante_ingenuo = datetime(2026, 11, 30, 14, 0, 0)
    normalizado, min_ant = validar_lembrete_entrada(instante_ingenuo, 15)
    assert normalizado.tzinfo == UTC
    assert min_ant == 15

    with pytest.raises(ErroDeDominio):
        validar_lembrete_entrada(instante_ingenuo, -1)
    with pytest.raises(ErroDeDominio):
        validar_lembrete_entrada(instante_ingenuo, MAX_ANTECEDENCIA_MIN + 1)


def test_validar_token_cron_interno_em_tempo_constante() -> None:
    validar_token_cron_interno("segredo-cron-lume-123", "segredo-cron-lume-123")

    for esperado, recebido in (
        (None, "qualquer"),
        ("", ""),
        ("segredo-cron-lume-123", None),
        ("segredo-cron-lume-123", "errado"),
    ):
        with pytest.raises(ErroDeDominio) as exc:
            validar_token_cron_interno(esperado, recebido)
        assert exc.value.codigo == "TOKEN_INTERNO_INVALIDO"
        assert exc.value.status_http == 401


def test_montar_payloads_notificacao_lembrete_e_grupo() -> None:
    tid = uuid4()
    raiz_id = uuid4()
    payload_lembrete = montar_payload_notificacao_lembrete(tid, "Estudar Web II", 15)
    assert "Estudar Web II" in payload_lembrete["titulo"]
    assert "15 min antes" in payload_lembrete["corpo"]
    assert payload_lembrete["url"] == f"/jornada?tarefa={tid}"

    payload_atrib = montar_payload_notificacao_grupo(
        "atribuicao",
        tid,
        raiz_id,
        "Subtarefa API",
        "Athos",
    )
    assert payload_atrib["tipo"] == "grupo_atribuicao"
    assert "Athos" in payload_atrib["corpo"]
    assert "Subtarefa API" in payload_atrib["corpo"]
    assert str(raiz_id) in payload_atrib["url"]

    payload_concl = montar_payload_notificacao_grupo(
        "conclusao",
        tid,
        raiz_id,
        "Subtarefa API",
        "Maria",
    )
    assert payload_concl["tipo"] == "grupo_conclusao"
    assert "Maria" in payload_concl["corpo"]


async def test_adaptador_pywebpush_trata_sucesso_e_expiracao_410() -> None:
    config = Configuracoes(
        _env_file=None,
        vapid_public_key="chave-pub-teste",
        vapid_private_key="chave-priv-teste",
        vapid_subject="mailto:contato@lume.dev",
    )
    adaptador = AdaptadorPyWebPush(config)
    inscricao = InscricaoPushRegistro(
        id=uuid4(),
        usuario_id=uuid4(),
        endpoint="https://fcm.googleapis.com/fcm/send/abc",
        chave_p256dh="p256dh-teste-123456",
        chave_auth="auth-teste-123",
        rotulo_dispositivo="Notebook",
        plataforma="desktop",
        criado_em=datetime.now(UTC),
        ultimo_envio_em=None,
    )

    with patch(
        "infraestrutura.webpush.adaptador_pywebpush.webpush",
        return_value=SimpleNamespace(status_code=201),
    ) as mock_webpush:
        res_ok = await adaptador.enviar(inscricao, {"titulo": "Teste"})
    assert res_ok.sucesso is True
    assert res_ok.expirada is False
    assert res_ok.status_http == 201
    assert mock_webpush.call_count == 1

    exc_410 = WebPushException("Gone", response=SimpleNamespace(status_code=410))
    with patch(
        "infraestrutura.webpush.adaptador_pywebpush.webpush",
        side_effect=exc_410,
    ):
        res_exp = await adaptador.enviar(inscricao, {"titulo": "Teste"})
    assert res_exp.sucesso is False
    assert res_exp.expirada is True
    assert res_exp.status_http == 410

    exc_500 = WebPushException("Server error", response=SimpleNamespace(status_code=500))
    with patch(
        "infraestrutura.webpush.adaptador_pywebpush.webpush",
        side_effect=exc_500,
    ):
        res_500 = await adaptador.enviar(inscricao, {"titulo": "Teste"})
    assert res_500.sucesso is False
    assert res_500.expirada is False
    assert res_500.status_http == 500
