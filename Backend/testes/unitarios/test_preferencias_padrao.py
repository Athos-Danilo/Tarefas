from datetime import UTC, datetime
from uuid import uuid4

from dominio.preferencias_padrao import criar_preferencias_cenario_padrao


def test_preferencias_padrao_iniciam_com_clima_e_audio_desativados() -> None:
    usuario_id = str(uuid4())
    instante_fixo = datetime(2026, 11, 21, 16, 0, 0, tzinfo=UTC)

    padrao = criar_preferencias_cenario_padrao(usuario_id=usuario_id, agora=instante_fixo)

    assert padrao["usuario_id"] == usuario_id
    assert padrao["modo_temporal"] == "relogio_real"
    assert padrao["hora_simulada"] is None
    assert padrao["qualidade_3d"] == "auto"
    assert padrao["reduzir_movimento"] is False
    assert padrao["atualizado_em"] == instante_fixo

    assert padrao["clima"] == {
        "habilitado": False,
        "modo_localizacao": None,
        "cidade": None,
        "uf": None,
        "latitude_aprox": None,
        "longitude_aprox": None,
    }
    assert padrao["audio"] == {
        "habilitado": False,
        "volume_geral": 0.7,
        "volume_efeitos": 0.8,
        "volume_ambiente": 0.5,
    }
    assert padrao["tutorial"] == {
        "status": "pendente",
        "etapa_atual": 0,
        "atualizado_em": None,
    }
