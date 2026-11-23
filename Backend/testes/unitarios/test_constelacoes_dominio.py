from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from contratos.grupos import ContextoGrupoDaTarefa, RepositorioGrupos
from dominio.constelacoes import (
    COORDENADA_MAX,
    COORDENADA_MIN,
    MAX_NOS_LAYOUT,
    ZOOM_MAX,
    ZOOM_MIN,
    LayoutConstelacao,
    PosicaoNoConstelacao,
    ViewportConstelacao,
    criar_layout_padrao,
    validar_e_normalizar_layout_constelacao,
)
from dominio.erros import ErroDeDominio
from servicos.servico_constelacoes import ServicoConstelacoes


def test_layout_padrao_possui_dicionario_vazio_e_viewport_neutro() -> None:
    raiz_id = uuid4()
    layout = criar_layout_padrao(usuario_id="usr-1", tarefa_raiz_id=str(raiz_id))

    assert layout.usuario_id == "usr-1"
    assert layout.tarefa_raiz_id == str(raiz_id)
    assert layout.nos == {}
    assert layout.viewport == ViewportConstelacao(zoom=1.0, centro_x=0.0, centro_y=0.0)
    assert layout.atualizado_em is None


def test_validar_layout_normaliza_uuids_e_filtra_nos_fora_da_arvore() -> None:
    raiz_id = uuid4()
    filha_id = uuid4()
    descartado_id = uuid4()
    agora = datetime(2026, 11, 23, 12, 0, tzinfo=UTC)

    layout = validar_e_normalizar_layout_constelacao(
        usuario_id="usr-1",
        tarefa_raiz_id=raiz_id,
        nos_brutos={
            str(raiz_id).upper(): PosicaoNoConstelacao(x=420.5, y=180.0, fixado=True),
            str(filha_id): PosicaoNoConstelacao(x=580.0, y=295.0, fixado=False),
            str(descartado_id): PosicaoNoConstelacao(x=10.0, y=20.0, fixado=True),
        },
        viewport=ViewportConstelacao(zoom=1.25, centro_x=450.0, centro_y=240.0),
        atualizado_em=agora,
        ids_permitidos={str(raiz_id), str(filha_id)},
    )

    assert isinstance(layout, LayoutConstelacao)
    assert set(layout.nos.keys()) == {str(raiz_id), str(filha_id)}
    assert layout.nos[str(raiz_id)] == PosicaoNoConstelacao(x=420.5, y=180.0, fixado=True)
    assert layout.viewport == ViewportConstelacao(zoom=1.25, centro_x=450.0, centro_y=240.0)
    assert layout.atualizado_em == agora


def test_validar_layout_rejeita_chave_nao_uuid() -> None:
    with pytest.raises(ErroDeDominio) as exc:
        validar_e_normalizar_layout_constelacao(
            usuario_id="usr-1",
            tarefa_raiz_id=uuid4(),
            nos_brutos={"nao-e-uuid": PosicaoNoConstelacao(x=0.0, y=0.0, fixado=True)},
            viewport=ViewportConstelacao(zoom=1.0, centro_x=0.0, centro_y=0.0),
            atualizado_em=datetime.now(UTC),
        )

    assert exc.value.status_http == 422
    assert exc.value.codigo == "ID_NO_LAYOUT_INVALIDO"


def test_validar_layout_rejeita_coordenadas_invalidas_ou_fora_dos_limites() -> None:
    no_id = str(uuid4())
    for ruim in (float("nan"), float("inf"), COORDENADA_MIN - 1.0, COORDENADA_MAX + 1.0):
        with pytest.raises(ErroDeDominio) as exc:
            validar_e_normalizar_layout_constelacao(
                usuario_id="usr-1",
                tarefa_raiz_id=uuid4(),
                nos_brutos={no_id: PosicaoNoConstelacao(x=ruim, y=0.0, fixado=True)},
                viewport=ViewportConstelacao(zoom=1.0, centro_x=0.0, centro_y=0.0),
                atualizado_em=datetime.now(UTC),
            )
        assert exc.value.status_http == 422
        assert exc.value.codigo == "COORDENADA_LAYOUT_INVALIDA"


def test_validar_layout_rejeita_zoom_e_centro_invalidos() -> None:
    for zoom_ruim in (ZOOM_MIN - 0.05, ZOOM_MAX + 0.1, float("nan")):
        with pytest.raises(ErroDeDominio) as exc:
            validar_e_normalizar_layout_constelacao(
                usuario_id="usr-1",
                tarefa_raiz_id=uuid4(),
                nos_brutos={},
                viewport=ViewportConstelacao(zoom=zoom_ruim, centro_x=0.0, centro_y=0.0),
                atualizado_em=datetime.now(UTC),
            )
        assert exc.value.status_http == 422
        assert exc.value.codigo == "VIEWPORT_INVALIDO"


def test_validar_layout_rejeita_mais_que_250_nos() -> None:
    nos_excessivos = {
        str(uuid4()): PosicaoNoConstelacao(x=float(i), y=float(i), fixado=False)
        for i in range(MAX_NOS_LAYOUT + 1)
    }

    with pytest.raises(ErroDeDominio) as exc:
        validar_e_normalizar_layout_constelacao(
            usuario_id="usr-1",
            tarefa_raiz_id=uuid4(),
            nos_brutos=nos_excessivos,
            viewport=ViewportConstelacao(zoom=1.0, centro_x=0.0, centro_y=0.0),
            atualizado_em=datetime.now(UTC),
        )

    assert exc.value.status_http == 422
    assert exc.value.codigo == "LIMITE_NOS_LAYOUT_EXCEDIDO"


class _RepoGruposDuble:
    def __init__(self, contexto: ContextoGrupoDaTarefa | None) -> None:
        self._contexto = contexto

    async def obter_contexto_por_tarefa(
        self,
        usuario_solicitante_id: UUID,
        tarefa_id: UUID,
    ) -> ContextoGrupoDaTarefa | None:
        del usuario_solicitante_id, tarefa_id
        return self._contexto


async def test_servico_constelacoes_retorna_503_quando_mongo_ausente_no_salvamento() -> None:
    usuario_id = uuid4()
    raiz_id = uuid4()
    contexto = ContextoGrupoDaTarefa(
        tarefa_raiz_id=raiz_id,
        titulo_raiz="Arvore Teste",
        dono_arvore_id=usuario_id,
        compartilhada=False,
        meu_papel="lider",
        nos_arvore=(),
    )
    repo_grupos: RepositorioGrupos = _RepoGruposDuble(contexto)  # type: ignore[assignment]
    servico = ServicoConstelacoes(repositorio_grupos=repo_grupos, repositorio_layouts=None)

    with pytest.raises(ErroDeDominio) as exc:
        await servico.salvar_layout(
            usuario_id=usuario_id,
            tarefa_raiz_id=raiz_id,
            nos={},
            viewport=ViewportConstelacao(zoom=1.0, centro_x=0.0, centro_y=0.0),
        )

    assert exc.value.status_http == 503
    assert exc.value.codigo == "SERVICO_EXTERNO_INDISPONIVEL"
