import { requisitarJson } from './cliente-http';
import { mapearTarefa, type TarefaApiCrua } from './cliente-jornada';
import type {
  EntradaAtribuirResponsavel,
  EntrarConviteResposta,
  PainelDesempenhoGrupo,
  PapelGrupo,
  PreviaConviteGrupo,
  ResultadoCompartilharGrupo,
  ResultadoRegenerarConvite,
  ResultadoSairGrupo,
  ResultadoTransferirLideranca,
  ServicoGruposFrontend,
  VagaGrupo,
} from './tipos-grupos';
import type { TarefaArvore } from './tipos-jornada';

interface CompartilharApiCrua {
  tarefa_raiz_id: string;
  compartilhada: boolean;
  meu_papel: PapelGrupo;
  codigo_token: string;
  link_convite: string;
}

interface VagaApiCrua {
  id: string;
  tarefa_raiz_id: string;
  nome_exibicao: string;
  email_opcional: string | null;
  ocupada_por_usuario_id: string | null;
  criada_em: string;
}

interface RegenerarConviteApiCrua {
  codigo_token: string;
  link_convite: string;
  ativo: boolean;
}

interface PreviaConviteApiCrua {
  tarefa_raiz_id: string;
  titulo: string;
  lider_nome: string;
  membros_ativos: Array<{
    usuario_id: string;
    nome_exibicao: string;
    avatar_url: string | null;
    papel: PapelGrupo;
  }>;
  vagas_disponiveis: Array<{
    id: string;
    nome_exibicao: string;
    email_opcional: string | null;
  }>;
  ja_e_membro: boolean;
}

interface EntrarConviteApiCrua {
  tarefa_raiz_id: string;
  papel: PapelGrupo;
  vaga_vinculada_id: string | null;
  subtarefas_herdadas: number;
  ja_era_membro: boolean;
}

interface PainelDesempenhoApiCrua {
  tarefa_raiz_id: string;
  titulo: string;
  meu_papel: PapelGrupo;
  link_convite_ativo: boolean;
  codigo_token: string | null;
  resumo_geral: {
    total_subtarefas_folha: number;
    folhas_concluidas: number;
    percentual_geral: number;
  };
  integrantes: Array<{
    usuario_id: string;
    nome_exibicao: string;
    papel: PapelGrupo;
    avatar_url: string | null;
    atribuidas: number;
    concluidas: number;
    percentual: number;
  }>;
  vagas_abertas: Array<{
    vaga_id: string;
    nome_exibicao: string;
    email_opcional: string | null;
    atribuidas: number;
  }>;
  atividade_recente: Array<{
    evento_id: string;
    autor_nome: string;
    tipo_evento: string;
    resumo: string;
    criado_em: string;
  }>;
}

interface TransferirLiderancaApiCrua {
  lideranca_transferida: boolean;
  novo_lider_usuario_id: string;
}

interface SairGrupoApiCrua {
  saiu_do_grupo: boolean;
  subtarefas_desvinculadas: number;
}

export function construirLinkConviteAbsoluto(codigoToken: string, origem?: string): string {
  const base =
    origem ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  const limpa = base.replace(/\/+$/, '');
  return `${limpa}/convite/${encodeURIComponent(codigoToken)}`;
}

export function criarServicoGrupos(funcaoFetch: typeof fetch = fetch): ServicoGruposFrontend {
  return {
    async compartilharTarefa(tarefaRaizId: string): Promise<ResultadoCompartilharGrupo> {
      const resp = await requisitarJson<CompartilharApiCrua>(
        `/api/grupos/${encodeURIComponent(tarefaRaizId)}/compartilhar`,
        { method: 'POST', body: JSON.stringify({}) },
        funcaoFetch,
      );
      return {
        tarefaRaizId: resp.tarefa_raiz_id,
        compartilhada: resp.compartilhada,
        meuPapel: resp.meu_papel,
        codigoToken: resp.codigo_token,
        linkConvite: resp.link_convite,
      };
    },

    async criarVaga(
      tarefaRaizId: string,
      entrada: { nomeExibicao: string; emailOpcional?: string | null },
    ): Promise<VagaGrupo> {
      const resp = await requisitarJson<VagaApiCrua>(
        `/api/grupos/${encodeURIComponent(tarefaRaizId)}/vagas`,
        {
          method: 'POST',
          body: JSON.stringify({
            nome_exibicao: entrada.nomeExibicao,
            email_opcional: entrada.emailOpcional ?? null,
          }),
        },
        funcaoFetch,
      );
      return {
        id: resp.id,
        tarefaRaizId: resp.tarefa_raiz_id,
        nomeExibicao: resp.nome_exibicao,
        emailOpcional: resp.email_opcional,
        ocupadaPorUsuarioId: resp.ocupada_por_usuario_id,
        criadaEm: resp.criada_em,
      };
    },

    async excluirVaga(tarefaRaizId: string, vagaId: string): Promise<void> {
      await requisitarJson<void>(
        `/api/grupos/${encodeURIComponent(tarefaRaizId)}/vagas/${encodeURIComponent(vagaId)}`,
        { method: 'DELETE' },
        funcaoFetch,
      );
    },

    async regenerarConvite(tarefaRaizId: string): Promise<ResultadoRegenerarConvite> {
      const resp = await requisitarJson<RegenerarConviteApiCrua>(
        `/api/grupos/${encodeURIComponent(tarefaRaizId)}/convites/regenerar`,
        { method: 'POST', body: JSON.stringify({}) },
        funcaoFetch,
      );
      return {
        codigoToken: resp.codigo_token,
        linkConvite: resp.link_convite,
        ativo: resp.ativo,
      };
    },

    async revogarConvites(tarefaRaizId: string): Promise<void> {
      await requisitarJson<void>(
        `/api/grupos/${encodeURIComponent(tarefaRaizId)}/convites`,
        { method: 'DELETE' },
        funcaoFetch,
      );
    },

    async obterPreviaConvite(token: string): Promise<PreviaConviteGrupo> {
      const resp = await requisitarJson<PreviaConviteApiCrua>(
        `/api/grupos/convites/${encodeURIComponent(token)}`,
        { method: 'GET' },
        funcaoFetch,
      );
      return {
        tarefaRaizId: resp.tarefa_raiz_id,
        titulo: resp.titulo,
        liderNome: resp.lider_nome,
        membrosAtivos: resp.membros_ativos.map((m) => ({
          usuarioId: m.usuario_id,
          nomeExibicao: m.nome_exibicao,
          avatarUrl: m.avatar_url,
          papel: m.papel,
        })),
        vagasDisponiveis: resp.vagas_disponiveis.map((v) => ({
          id: v.id,
          nomeExibicao: v.nome_exibicao,
          emailOpcional: v.email_opcional,
        })),
        jaEMembro: resp.ja_e_membro,
      };
    },

    async entrarPorConvite(token: string, vagaId: string | null): Promise<EntrarConviteResposta> {
      const resp = await requisitarJson<EntrarConviteApiCrua>(
        `/api/grupos/convites/${encodeURIComponent(token)}/entrar`,
        {
          method: 'POST',
          body: JSON.stringify({ vaga_id: vagaId }),
        },
        funcaoFetch,
      );
      return {
        tarefaRaizId: resp.tarefa_raiz_id,
        papel: resp.papel,
        vagaVinculadaId: resp.vaga_vinculada_id,
        subtarefasHerdadas: resp.subtarefas_herdadas,
        jaEraMembro: resp.ja_era_membro,
      };
    },

    async atribuirResponsavel(
      tarefaId: string,
      entrada: EntradaAtribuirResponsavel,
    ): Promise<TarefaArvore> {
      const resp = await requisitarJson<TarefaApiCrua>(
        `/api/tarefas/${encodeURIComponent(tarefaId)}/atribuir`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            responsavel_usuario_id: entrada.responsavelUsuarioId ?? null,
            vaga_responsavel_id: entrada.vagaResponsavelId ?? null,
          }),
        },
        funcaoFetch,
      );
      return mapearTarefa(resp);
    },

    async obterDesempenhoGrupo(tarefaRaizId: string): Promise<PainelDesempenhoGrupo> {
      const resp = await requisitarJson<PainelDesempenhoApiCrua>(
        `/api/grupos/${encodeURIComponent(tarefaRaizId)}/desempenho`,
        { method: 'GET' },
        funcaoFetch,
      );
      return {
        tarefaRaizId: resp.tarefa_raiz_id,
        titulo: resp.titulo,
        meuPapel: resp.meu_papel,
        linkConviteAtivo: resp.link_convite_ativo,
        codigoToken: resp.codigo_token,
        resumoGeral: {
          totalSubtarefasFolha: resp.resumo_geral.total_subtarefas_folha,
          folhasConcluidas: resp.resumo_geral.folhas_concluidas,
          percentualGeral: resp.resumo_geral.percentual_geral,
        },
        integrantes: resp.integrantes.map((item) => ({
          usuarioId: item.usuario_id,
          nomeExibicao: item.nome_exibicao,
          papel: item.papel,
          avatarUrl: item.avatar_url,
          atribuidas: item.atribuidas,
          concluidas: item.concluidas,
          percentual: item.percentual,
        })),
        vagasAbertas: resp.vagas_abertas.map((vaga) => ({
          vagaId: vaga.vaga_id,
          nomeExibicao: vaga.nome_exibicao,
          emailOpcional: vaga.email_opcional,
          atribuidas: vaga.atribuidas,
        })),
        atividadeRecente: resp.atividade_recente.map((evt) => ({
          eventoId: evt.evento_id,
          autorNome: evt.autor_nome,
          tipoEvento: evt.tipo_evento,
          resumo: evt.resumo,
          criadoEm: evt.criado_em,
        })),
      };
    },

    async transferirLideranca(
      tarefaRaizId: string,
      novoLiderUsuarioId: string,
    ): Promise<ResultadoTransferirLideranca> {
      const resp = await requisitarJson<TransferirLiderancaApiCrua>(
        `/api/grupos/${encodeURIComponent(tarefaRaizId)}/transferir-lideranca`,
        {
          method: 'POST',
          body: JSON.stringify({ novo_lider_usuario_id: novoLiderUsuarioId }),
        },
        funcaoFetch,
      );
      return {
        liderancaTransferida: resp.lideranca_transferida,
        novoLiderUsuarioId: resp.novo_lider_usuario_id,
      };
    },

    async removerMembro(tarefaRaizId: string, usuarioId: string): Promise<void> {
      await requisitarJson<void>(
        `/api/grupos/${encodeURIComponent(tarefaRaizId)}/membros/${encodeURIComponent(usuarioId)}`,
        { method: 'DELETE' },
        funcaoFetch,
      );
    },

    async sairDoGrupo(tarefaRaizId: string): Promise<ResultadoSairGrupo> {
      const resp = await requisitarJson<SairGrupoApiCrua>(
        `/api/grupos/${encodeURIComponent(tarefaRaizId)}/sair`,
        { method: 'POST', body: JSON.stringify({}) },
        funcaoFetch,
      );
      return {
        saiuDoGrupo: resp.saiu_do_grupo,
        subtarefasDesvinculadas: resp.subtarefas_desvinculadas,
      };
    },
  };
}
