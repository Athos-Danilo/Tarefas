import { describe, expect, it, vi } from 'vitest';
import {
  CATALOGO_AVATARES_OFICIAIS,
  CONFIRMACAO_EXCLUSAO_EXATA,
  esquemaPerfil,
  esquemaPrimeiroAcesso,
  TAMANHO_MAXIMO_AVATAR_BYTES,
  validarArquivoAvatarLocal,
} from '../../src/dominios/conta/catalogo-avatares';
import {
  alternarNoDemo,
  calcularResumoArvoreDemo,
  criarArvoreDemoInicial,
} from '../../src/dominios/landing/demo-arvore-local';
import { criarServicoAutenticacao } from '../../src/servicos/cliente-autenticacao';
import { ErroApi, lerCookieCsrf } from '../../src/servicos/cliente-http';

describe('Dominio de conta, catalogo de avatares, CSRF e demo local', () => {
  it('expoe exatamente os 16 avatares Soft-3D oficiais agrupados em 4 categorias', () => {
    expect(CATALOGO_AVATARES_OFICIAIS).toHaveLength(16);

    const ids = CATALOGO_AVATARES_OFICIAIS.map((item) => item.id);
    expect(ids).toEqual([
      'sol-nascente',
      'lua-crescente',
      'cometa-dourado',
      'aurora-boreal',
      'girassol-lume',
      'samambaia-orvalho',
      'lotus-serena',
      'broto-vivo',
      'vagalume-estelar',
      'coruja-noturna',
      'borboleta-aurora',
      'beija-flor-solar',
      'telescopio-celeste',
      'bussola-astral',
      'ampulheta-solar',
      'estrela-guia',
    ]);
    expect(new Set(ids).size).toBe(16);

    const categorias = new Set(CATALOGO_AVATARES_OFICIAIS.map((item) => item.categoria));
    expect(categorias).toEqual(new Set(['Astros', 'Botânicos', 'Criaturas', 'Observatório']));

    for (const item of CATALOGO_AVATARES_OFICIAIS) {
      expect(item.url).toBe(`/assets-3d/avatares/${item.id}.png`);
    }
    expect(CONFIRMACAO_EXCLUSAO_EXATA).toBe('EXCLUIR');
  });

  it('valida upload local de avatar (formato e limite 2 MB) e formularios Zod', () => {
    const pngValido = new File([new Uint8Array(512)], 'foto.png', { type: 'image/png' });
    const webpValido = new File([new Uint8Array(512)], 'foto.webp', { type: 'image/webp' });
    const svgInvalido = new File(['<svg/>'], 'vetor.svg', { type: 'image/svg+xml' });
    const arquivoGrande = new File(
      [new Uint8Array(TAMANHO_MAXIMO_AVATAR_BYTES + 1)],
      'grande.png',
      {
        type: 'image/png',
      },
    );

    expect(validarArquivoAvatarLocal(pngValido)).toBeNull();
    expect(validarArquivoAvatarLocal(webpValido)).toBeNull();
    expect(validarArquivoAvatarLocal(svgInvalido)).toMatch(/png, jpg ou webp/i);
    expect(validarArquivoAvatarLocal(arquivoGrande)).toMatch(/2 mb/i);

    const okPrimeiro = esquemaPrimeiroAcesso.safeParse({
      nomeExibicao: '  Athos Danilo  ',
      avatarTipo: 'preset',
      avatarId: 'sol-nascente',
      criarArvoreGuia: true,
    });
    expect(okPrimeiro.success).toBe(true);
    if (okPrimeiro.success) {
      expect(okPrimeiro.data.nomeExibicao).toBe('Athos Danilo');
    }

    const nomeCurto = esquemaPrimeiroAcesso.safeParse({
      nomeExibicao: ' A ',
      avatarTipo: 'preset',
      avatarId: 'sol-nascente',
      criarArvoreGuia: true,
    });
    expect(nomeCurto.success).toBe(false);

    const presetInvalido = esquemaPerfil.safeParse({
      nomeExibicao: 'Athos',
      avatarTipo: 'preset',
      avatarId: 'inexistente',
    });
    expect(presetInvalido.success).toBe(false);
  });

  it('extrai cookie CSRF e integra endpoints de sessao/conta com fetch falso', async () => {
    expect(lerCookieCsrf('outro=1; lume_csrf=token%2Dabc%3D1; tema=claro')).toBe('token-abc=1');
    expect(lerCookieCsrf('outro=1')).toBeNull();

    document.cookie = 'lume_csrf=csrf-teste-fase15; path=/';

    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ erro: { codigo: 'NAO_AUTENTICADO' } }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            primeiro_acesso_concluido: true,
            arvore_guia_criada: true,
            tarefa_guia_id: 'tarefa-guia-1',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            avatar_tipo: 'upload',
            avatar_url: '/api/conta/avatar/atual?v=10',
            largura: 256,
            altura: 256,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            erro: {
              codigo: 'CONFIRMACAO_EXCLUSAO_INVALIDA',
              mensagem: 'Digite EXCLUIR exatamente.',
            },
          }),
          { status: 409 },
        ),
      );

    const servico = criarServicoAutenticacao(fetchMock);

    const anonimo = await servico.consultarSessao();
    expect(anonimo).toEqual({ autenticado: false, usuario: null, sessao: null });

    const resPa = await servico.concluirPrimeiroAcesso({
      nomeExibicao: 'Athos',
      avatarTipo: 'preset',
      avatarId: 'vagalume-estelar',
      criarArvoreGuia: true,
    });
    expect(resPa).toEqual({
      primeiroAcessoConcluido: true,
      arvoreGuiaCriada: true,
      tarefaGuiaId: 'tarefa-guia-1',
    });

    const chamadaPa = fetchMock.mock.calls[1];
    expect(chamadaPa[0]).toBe('/api/conta/primeiro-acesso');
    const initPa = chamadaPa[1] as RequestInit;
    expect(initPa.method).toBe('POST');
    expect((initPa.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-teste-fase15');
    expect(typeof initPa.body).toBe('string');
    expect(JSON.parse(initPa.body as string)).toEqual({
      nome_exibicao: 'Athos',
      avatar_tipo: 'preset',
      avatar_id: 'vagalume-estelar',
      criar_arvore_guia: true,
    });

    const arq = new File([new Uint8Array(64)], 'avatar.png', { type: 'image/png' });
    const resUpload = await servico.enviarAvatar(arq);
    expect(resUpload.avatarUrl).toBe('/api/conta/avatar/atual?v=10');

    const chamadaUpload = fetchMock.mock.calls[2];
    const initUpload = chamadaUpload[1] as RequestInit;
    expect(initUpload.body).toBeInstanceOf(FormData);
    expect((initUpload.body as FormData).get('arquivo')).toBe(arq);
    expect((initUpload.headers as Record<string, string>)['X-CSRF-Token']).toBe(
      'csrf-teste-fase15',
    );

    await expect(servico.excluirConta('ERRADO')).rejects.toMatchObject<Partial<ErroApi>>({
      status: 409,
      codigo: 'CONFIRMACAO_EXCLUSAO_INVALIDA',
    });
  });

  it('recalcula progresso por folhas e alerta de filha urgente na arvore demo local', () => {
    const inicial = criarArvoreDemoInicial();
    const resumoInicial = calcularResumoArvoreDemo(inicial);
    expect(resumoInicial.totalFolhas).toBe(4);
    expect(resumoInicial.folhasConcluidas).toBe(1);
    expect(resumoInicial.percentual).toBe(25);
    expect(resumoInicial.temFilhaUrgenteAberta).toBe(true);

    const aposConcluirUrgente = alternarNoDemo(inicial, 'demo-sub-urgente');
    const resumoSemUrgente = calcularResumoArvoreDemo(aposConcluirUrgente);
    expect(resumoSemUrgente.folhasConcluidas).toBe(2);
    expect(resumoSemUrgente.percentual).toBe(50);
    expect(resumoSemUrgente.temFilhaUrgenteAberta).toBe(false);

    const aposReabrir = alternarNoDemo(aposConcluirUrgente, 'demo-sub-urgente');
    expect(calcularResumoArvoreDemo(aposReabrir).temFilhaUrgenteAberta).toBe(true);
  });
});
