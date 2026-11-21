from datetime import UTC, datetime, timedelta
from io import BytesIO

import pytest
from PIL import Image

from dominio.autenticacao import (
    AVATARES_PRESET_OFICIAIS,
    TAMANHO_MAXIMO_AVATAR_BYTES,
    assinar_estado_oauth,
    calcular_nova_expiracao_deslizante,
    gerar_pkce_code_challenge,
    gerar_pkce_code_verifier,
    processar_imagem_avatar,
    validar_escolha_avatar,
    validar_estado_oauth,
    validar_nome_exibicao,
)
from dominio.erros import ErroDeDominio


def _criar_png_em_memoria(largura: int = 400, altura: int = 200) -> bytes:
    imagem = Image.new("RGB", (largura, altura), color=(37, 107, 78))
    buffer = BytesIO()
    imagem.save(buffer, format="PNG")
    return buffer.getvalue()


def test_deve_expor_exatamente_os_dezesseis_avatares_oficiais() -> None:
    assert len(AVATARES_PRESET_OFICIAIS) == 16
    assert "sol-nascente" in AVATARES_PRESET_OFICIAIS
    assert "vagalume-estelar" in AVATARES_PRESET_OFICIAIS
    assert "estrela-guia" in AVATARES_PRESET_OFICIAIS


def test_pkce_gera_verificador_e_challenge_s256_sem_padding() -> None:
    verificador = gerar_pkce_code_verifier()
    desafio = gerar_pkce_code_challenge(verificador)

    assert len(verificador) >= 43
    assert "=" not in desafio
    assert desafio == gerar_pkce_code_challenge(verificador)
    assert desafio != verificador


def test_estado_oauth_assinado_valida_e_rejeita_adulteracao_ou_expiracao() -> None:
    segredo = "segredo-oauth-teste-com-32-bytes-seguros"
    agora = datetime(2026, 11, 21, 18, 0, 0, tzinfo=UTC)
    verificador = gerar_pkce_code_verifier()

    estado_publico, token_assinado = assinar_estado_oauth(
        code_verifier=verificador,
        segredo=segredo,
        agora=agora,
    )

    extraido = validar_estado_oauth(
        estado_recebido=estado_publico,
        token_assinado=token_assinado,
        segredo=segredo,
        agora=agora + timedelta(minutes=2),
    )
    assert extraido == verificador

    with pytest.raises(ErroDeDominio) as exc_div:
        validar_estado_oauth(
            estado_recebido="estado-divergente",
            token_assinado=token_assinado,
            segredo=segredo,
            agora=agora,
        )
    assert exc_div.value.status_http == 401
    assert exc_div.value.codigo == "OAUTH_INVALIDO"

    with pytest.raises(ErroDeDominio) as exc_adulterado:
        validar_estado_oauth(
            estado_recebido=estado_publico,
            token_assinado=token_assinado + "x",
            segredo=segredo,
            agora=agora,
        )
    assert exc_adulterado.value.codigo == "OAUTH_INVALIDO"

    with pytest.raises(ErroDeDominio) as exc_expirado:
        validar_estado_oauth(
            estado_recebido=estado_publico,
            token_assinado=token_assinado,
            segredo=segredo,
            agora=agora + timedelta(minutes=15),
        )
    assert exc_expirado.value.codigo == "OAUTH_INVALIDO"


def test_sessao_deslizante_respeita_sete_dias_e_teto_absoluto_trinta_dias() -> None:
    agora = datetime(2026, 11, 21, 12, 0, 0, tzinfo=UTC)
    teto_longo = agora + timedelta(days=30)
    assert calcular_nova_expiracao_deslizante(agora, teto_longo) == agora + timedelta(days=7)

    teto_proximo = agora + timedelta(days=2)
    assert calcular_nova_expiracao_deslizante(agora, teto_proximo) == teto_proximo


def test_validacao_nome_exibicao_e_avatar_conforme_d05_e_d09() -> None:
    assert validar_nome_exibicao("  Athos Danilo  ") == "Athos Danilo"

    with pytest.raises(ErroDeDominio) as exc_curto:
        validar_nome_exibicao("A")
    assert exc_curto.value.status_http == 422
    assert exc_curto.value.codigo == "VALIDACAO_INVALIDA"

    with pytest.raises(ErroDeDominio) as exc_longo:
        validar_nome_exibicao("A" * 61)
    assert exc_longo.value.status_http == 422

    assert validar_escolha_avatar("preset", "sol-nascente") == ("preset", "sol-nascente")
    assert validar_escolha_avatar("google", None) == ("google", None)

    with pytest.raises(ErroDeDominio) as exc_avatar:
        validar_escolha_avatar("preset", "inexistente")
    assert exc_avatar.value.status_http == 422
    assert exc_avatar.value.codigo == "VALIDACAO_INVALIDA"


def test_processamento_avatar_redimensiona_para_256x256_webp_e_rejeita_invalidos() -> None:
    png_valido = _criar_png_em_memoria(480, 240)
    webp_bytes = processar_imagem_avatar(png_valido)

    with Image.open(BytesIO(webp_bytes)) as img:
        assert img.format == "WEBP"
        assert img.size == (256, 256)

    with pytest.raises(ErroDeDominio) as exc_grande:
        processar_imagem_avatar(b"x" * (TAMANHO_MAXIMO_AVATAR_BYTES + 1))
    assert exc_grande.value.status_http == 413
    assert exc_grande.value.codigo == "ARQUIVO_MUITO_GRANDE"

    with pytest.raises(ErroDeDominio) as exc_formato:
        processar_imagem_avatar(b"arquivo-texto-invalido")
    assert exc_formato.value.status_http == 422
    assert exc_formato.value.codigo == "FORMATO_IMAGEM_INVALIDO"
