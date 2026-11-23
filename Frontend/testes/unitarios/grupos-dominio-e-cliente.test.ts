import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePollingInteligente } from '../../src/hooks/usar-polling-inteligente';
import { ErroApi } from '../../src/servicos/cliente-http';
import {
  construirLinkConviteAbsoluto,
  criarServicoGrupos,
} from '../../src/servicos/cliente-grupos';
import type { TarefaArvore } from '../../src/servicos/tipos-jornada';
import {
  encontrarVagaAutomaticaPorEmail,
  esquemaNovaVaga,
  noPertenceAoEscopoDoColaborador,
  obterPermissoesNoGrupo,
} from '../../src/dominios/grupos/logica-grupos';

function fabricarNoGrupo(
  parcial: Partial<TarefaArvore> & { id: string; titulo: string },
): TarefaArvore {
  return {
    tarefaPaiId: null,
    prioridade: 'media',
    status: 'pendente',
    turno: 'tarde',
    prazo: null,
    profundidade: 1,
    ordemManual: 0,
    percentualConclusao: 0,
    totalFolhas: 1,
    folhasConcluidas: 0,
    temFilhaUrgenteAberta: false,
    etiquetas: [],
    recorrencia: { tipo: 'nenhuma', diasSemana: [], diaMes: null, intervalo: 1 },
    serieRecorrenciaId: null,
    vezesReaberta: 0,
    compartilhada: true,
    responsavel: null,
    lembretesPendentes: 0,
    criadoEm: '2026-11-23T09:00:00Z',
    atualizadoEm: '2026-11-23T09:00:00Z',
    subtarefas: [],
    ...parcial,
  };
}

describe('Dominio, polling e cliente HTTP de Tarefas em Conjunto (Fase 17)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  it('valida esquema de vaga nomeada e vinculo automatico por e-mail', () => {
    expect(esquemaNovaVaga.safeParse({ nomeExibicao: 'A', emailOpcional: '' }).success).toBe(false);
    expect(
      esquemaNovaVaga.safeParse({
        nomeExibicao: '  Backend   FastAPI  ',
        emailOpcional: 'email-invalido',
      }).success,
    ).toBe(false);

    const ok = esquemaNovaVaga.safeParse({
      nomeExibicao: '  Frontend   React  ',
      emailOpcional: 'Maria.Silva@Exemplo.com',
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.nomeExibicao).toBe('Frontend React');
      expect(ok.data.emailOpcional).toBe('Maria.Silva@Exemplo.com');
    }

    const vagaEncontrada = encontrarVagaAutomaticaPorEmail(
      [
        { id: 'v1', nomeExibicao: 'Design', emailOpcional: null },
        { id: 'v2', nomeExibicao: 'Dados', emailOpcional: 'maria@exemplo.com' },
      ],
      '  MARIA@exemplo.com ',
    );
    expect(vagaEncontrada?.id).toBe('v2');
    expect(encontrarVagaAutomaticaPorEmail([], 'maria@exemplo.com')).toBeNull();
  });

  it('aplica matriz de permissoes por papel (Lider vs Colaborador) e profundidade 5', () => {
    const netaMinha = fabricarNoGrupo({
      id: 'sub-minha-filha',
      tarefaPaiId: 'sub-minha',
      titulo: 'Subetapa herdada',
      profundidade: 3,
    });
    const minhaEtapa = fabricarNoGrupo({
      id: 'sub-minha',
      tarefaPaiId: 'raiz-g',
      titulo: 'Minha etapa',
      profundidade: 2,
      responsavel: {
        tipo: 'usuario',
        usuarioId: 'u-colab',
        vagaId: null,
        nomeExibicao: 'Maria',
        avatarUrl: null,
      },
      subtarefas: [netaMinha],
    });
    const outraEtapa = fabricarNoGrupo({
      id: 'sub-outro',
      tarefaPaiId: 'raiz-g',
      titulo: 'Etapa de outro',
      profundidade: 2,
      responsavel: {
        tipo: 'usuario',
        usuarioId: 'u-lider',
        vagaId: null,
        nomeExibicao: 'Athos',
        avatarUrl: null,
      },
    });
    const vagaAberta = fabricarNoGrupo({
      id: 'sub-vaga',
      tarefaPaiId: 'raiz-g',
      titulo: 'Etapa reservada a vaga',
      profundidade: 2,
      responsavel: {
        tipo: 'vaga',
        usuarioId: null,
        vagaId: 'v-1',
        nomeExibicao: 'Integrante 3',
        avatarUrl: null,
      },
    });
    const raizGrupo = fabricarNoGrupo({
      id: 'raiz-g',
      titulo: 'Projeto Web II',
      profundidade: 1,
      subtarefas: [minhaEtapa, outraEtapa, vagaAberta],
    });

    expect(noPertenceAoEscopoDoColaborador(raizGrupo, 'sub-minha', 'u-colab')).toBe(true);
    expect(noPertenceAoEscopoDoColaborador(raizGrupo, 'sub-minha-filha', 'u-colab')).toBe(true);
    expect(noPertenceAoEscopoDoColaborador(raizGrupo, 'sub-outro', 'u-colab')).toBe(false);
    expect(noPertenceAoEscopoDoColaborador(raizGrupo, 'sub-vaga', 'u-colab')).toBe(false);
    expect(noPertenceAoEscopoDoColaborador(raizGrupo, 'raiz-g', 'u-colab')).toBe(false);

    const permLider = obterPermissoesNoGrupo({
      raizArvore: raizGrupo,
      no: outraEtapa,
      meuPapel: 'lider',
      usuarioAtualId: 'u-lider',
    });
    expect(permLider.podeConcluirOuReabrir).toBe(true);
    expect(permLider.podeGerenciarGrupo).toBe(true);

    const permColabPropria = obterPermissoesNoGrupo({
      raizArvore: raizGrupo,
      no: netaMinha,
      meuPapel: 'colaborador',
      usuarioAtualId: 'u-colab',
    });
    expect(permColabPropria.podeConcluirOuReabrir).toBe(true);
    expect(permColabPropria.podeAdicionarSubtarefa).toBe(true);
    expect(permColabPropria.podeGerenciarGrupo).toBe(false);

    const permColabAlheia = obterPermissoesNoGrupo({
      raizArvore: raizGrupo,
      no: outraEtapa,
      meuPapel: 'colaborador',
      usuarioAtualId: 'u-colab',
    });
    expect(permColabAlheia.podeConcluirOuReabrir).toBe(false);
    expect(permColabAlheia.podeAdicionarSubtarefa).toBe(false);
    expect(permColabAlheia.podeExcluir).toBe(false);
  });

  it('executa polling inteligente apenas com aba visivel e recarrega ao voltar ao foco', () => {
    vi.useFakeTimers();
    const aoAtualizar = vi.fn();

    renderHook(() =>
      usePollingInteligente({
        ativo: true,
        intervaloMs: 12_000,
        aoAtualizar,
      }),
    );

    vi.advanceTimersByTime(12_000);
    expect(aoAtualizar).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    vi.advanceTimersByTime(24_000);
    expect(aoAtualizar).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(aoAtualizar).toHaveBeenCalledTimes(2);

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(aoAtualizar).toHaveBeenCalledTimes(3);
  });

  it('integra todos os 12 endpoints de grupos com CSRF e trata 409 de saida do lider', async () => {
    document.cookie = 'lume_csrf=csrf-grupo-17; path=/';

    expect(construirLinkConviteAbsoluto('tok-99', 'https://lume.app')).toBe(
      'https://lume.app/convite/tok-99',
    );

    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tarefa_raiz_id: 'raiz-1',
            compartilhada: true,
            meu_papel: 'lider',
            codigo_token: 'tok-1',
            link_convite: '/convites/tok-1',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'vaga-1',
            tarefa_raiz_id: 'raiz-1',
            nome_exibicao: 'Backend',
            email_opcional: 'dev@exemplo.com',
            ocupada_por_usuario_id: null,
            criada_em: '2026-11-23T10:00:00Z',
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            codigo_token: 'tok-2',
            link_convite: '/convites/tok-2',
            ativo: true,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tarefa_raiz_id: 'raiz-1',
            titulo: 'Projeto Web II',
            lider_nome: 'Athos',
            membros_ativos: [
              { usuario_id: 'u1', nome_exibicao: 'Athos', avatar_url: null, papel: 'lider' },
            ],
            vagas_disponiveis: [
              { id: 'vaga-2', nome_exibicao: 'Frontend', email_opcional: 'maria@exemplo.com' },
            ],
            ja_e_membro: false,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tarefa_raiz_id: 'raiz-1',
            papel: 'colaborador',
            vaga_vinculada_id: 'vaga-2',
            subtarefas_herdadas: 2,
            ja_era_membro: false,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'sub-1',
            tarefa_pai_id: 'raiz-1',
            titulo: 'Criar mapa',
            prioridade: 'alta',
            status: 'pendente',
            turno: 'tarde',
            prazo: null,
            profundidade: 2,
            ordem_manual: 0,
            percentual_conclusao: 0,
            total_folhas: 1,
            folhas_concluidas: 0,
            tem_filha_urgente_aberta: false,
            etiquetas: [],
            recorrencia: { tipo: 'nenhuma', dias_semana: [], dia_mes: null, intervalo: 1 },
            serie_recorrencia_id: null,
            vezes_reaberta: 0,
            compartilhada: true,
            responsavel: {
              tipo: 'vaga',
              usuario_id: null,
              vaga_id: 'vaga-2',
              nome_exibicao: 'Frontend',
              avatar_url: null,
            },
            lembretes_pendentes: 0,
            criado_em: '2026-11-23T10:00:00Z',
            atualizado_em: '2026-11-23T10:05:00Z',
            subtarefas: [],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tarefa_raiz_id: 'raiz-1',
            titulo: 'Projeto Web II',
            meu_papel: 'lider',
            link_convite_ativo: true,
            codigo_token: 'tok-2',
            resumo_geral: {
              total_subtarefas_folha: 4,
              folhas_concluidas: 2,
              percentual_geral: 50,
            },
            integrantes: [
              {
                usuario_id: 'u1',
                nome_exibicao: 'Athos',
                papel: 'lider',
                avatar_url: null,
                atribuidas: 2,
                concluidas: 2,
                percentual: 100,
              },
            ],
            vagas_abertas: [
              {
                vaga_id: 'vaga-2',
                nome_exibicao: 'Frontend',
                email_opcional: 'maria@exemplo.com',
                atribuidas: 2,
              },
            ],
            atividade_recente: [
              {
                evento_id: 'evt-1',
                autor_nome: 'Athos',
                tipo_evento: 'grupo_compartilhado',
                resumo: 'Athos compartilhou a tarefa',
                criado_em: '2026-11-23T10:00:00Z',
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ lideranca_transferida: true, novo_lider_usuario_id: 'u2' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            erro: {
              codigo: 'LIDER_DEVE_TRANSFERIR_OU_EXCLUIR',
              mensagem: 'Transfira a lideranca antes de sair.',
            },
          }),
          { status: 409 },
        ),
      );

    const servico = criarServicoGrupos(fetchMock);

    const comp = await servico.compartilharTarefa('raiz-1');
    expect(comp.codigoToken).toBe('tok-1');
    const initComp = fetchMock.mock.calls[0][1] as RequestInit;
    expect((initComp.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-grupo-17');

    const vaga = await servico.criarVaga('raiz-1', {
      nomeExibicao: 'Backend',
      emailOpcional: 'dev@exemplo.com',
    });
    expect(vaga.nomeExibicao).toBe('Backend');

    await servico.excluirVaga('raiz-1', 'vaga-1');

    const reg = await servico.regenerarConvite('raiz-1');
    expect(reg.codigoToken).toBe('tok-2');

    await servico.revogarConvites('raiz-1');

    const previa = await servico.obterPreviaConvite('tok-2');
    expect(previa.vagasDisponiveis[0].id).toBe('vaga-2');

    const entrada = await servico.entrarPorConvite('tok-2', 'vaga-2');
    expect(entrada.subtarefasHerdadas).toBe(2);

    const atribuida = await servico.atribuirResponsavel('sub-1', { vagaResponsavelId: 'vaga-2' });
    expect(atribuida.responsavel?.nomeExibicao).toBe('Frontend');

    const painel = await servico.obterDesempenhoGrupo('raiz-1');
    expect(painel.resumoGeral.percentualGeral).toBe(50);
    expect(painel.atividadeRecente[0].autorNome).toBe('Athos');

    const transf = await servico.transferirLideranca('raiz-1', 'u2');
    expect(transf.liderancaTransferida).toBe(true);

    await servico.removerMembro('raiz-1', 'u2');

    await expect(servico.sairDoGrupo('raiz-1')).rejects.toMatchObject<Partial<ErroApi>>({
      status: 409,
      codigo: 'LIDER_DEVE_TRANSFERIR_OU_EXCLUIR',
    });
  });
});
