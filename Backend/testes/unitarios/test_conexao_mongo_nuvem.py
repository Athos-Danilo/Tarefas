import certifi

from infraestrutura.mongo.conexao import montar_opcoes_cliente_mongo


def test_montar_opcoes_cliente_mongo_local_nao_exige_tlscafile() -> None:
    opcoes = montar_opcoes_cliente_mongo("mongodb://127.0.0.1:27017", timeout_ms=2000)
    assert opcoes == {
        "serverSelectionTimeoutMS": 2000,
        "connectTimeoutMS": 2000,
        "socketTimeoutMS": 2000,
        "tz_aware": True,
    }
    assert "tlsCAFile" not in opcoes


def test_montar_opcoes_cliente_mongo_atlas_e_tls_incluem_certifi() -> None:
    opcoes_srv = montar_opcoes_cliente_mongo(
        "  mongodb+srv://usuario:senha@cluster0.abc.mongodb.net/?retryWrites=true&w=majority  ",
        timeout_ms=10000,
    )
    assert opcoes_srv["serverSelectionTimeoutMS"] == 10000
    assert opcoes_srv["connectTimeoutMS"] == 10000
    assert opcoes_srv["socketTimeoutMS"] == 10000
    assert opcoes_srv["tz_aware"] is True
    assert opcoes_srv["tlsCAFile"] == certifi.where()

    opcoes_tls = montar_opcoes_cliente_mongo("mongodb://host:27017/?tls=true", timeout_ms=10000)
    assert opcoes_tls["tlsCAFile"] == certifi.where()
