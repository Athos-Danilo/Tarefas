import type { StatusTutorialPreferencia } from '../../servicos/tipos-estatisticas';

export interface DefinicaoPassoTutorial {
  numero: number;
  titulo: string;
  descricao: string;
  dicaPratica: string;
  seletorAlvo: string | null;
}

export const TOTAL_PASSOS_TUTORIAL = 6;

export const PASSOS_TUTORIAL_LUME: readonly DefinicaoPassoTutorial[] = [
  {
    numero: 1,
    titulo: 'Horizonte Vivo e Clima opt-in',
    descricao:
      'O céu do Lume acompanha a hora real e a fase da Lua. Você pode simular momentos do dia e ativar o clima local apenas se quiser compartilhar uma cidade ou localização aproximada.',
    dicaPratica: 'Use "Simular arco e clima" ou o cartão de clima para ajustar a atmosfera.',
    seletorAlvo: '[data-tutorial-alvo="horizonte-clima"]',
  },
  {
    numero: 2,
    titulo: 'Jornada do Dia, árvore em 5 níveis e recorrência',
    descricao:
      'Divida grandes objetivos em subtarefas de até 5 níveis. Concluir todas as folhas ilumina a tarefa-mãe automaticamente, e tarefas recorrentes criam a próxima ocorrência ao concluir.',
    dicaPratica:
      'Organize suas metas por turno (Manhã, Tarde, Noite ou Livre) e arraste para ordenar.',
    seletorAlvo: '[data-tutorial-alvo="arvore-recorrencia"]',
  },
  {
    numero: 3,
    titulo: 'Tarefas em Conjunto por link e vagas',
    descricao:
      'Precisa fazer um trabalho em equipe? Compartilhe qualquer árvore por link de convite, defina vagas nomeadas, acompanhe o progresso dos membros e atribua subtarefas.',
    dicaPratica: 'Clique em "Compartilhar" na árvore para gerar um link e gerenciar participantes.',
    seletorAlvo: '[data-tutorial-alvo="tarefas-conjunto"]',
  },
  {
    numero: 4,
    titulo: 'Notas ricas, etiquetas e lembretes Web Push',
    descricao:
      'Abra qualquer tarefa para adicionar notas em blocos (checklist, prazos, links e código), aplique etiquetas coloridas e agende lembretes para acompanhar seus prazos.',
    dicaPratica: 'Filtre rapidamente por texto, turno, prioridade ou etiqueta sempre que precisar.',
    seletorAlvo: '[data-tutorial-alvo="notas-lembretes"]',
  },
  {
    numero: 5,
    titulo: 'Todas as visões do Lume no menu',
    descricao:
      'Alterne entre Jornada, Mapa em Constelação, Modo Foco Imersivo com temporizador, Calendário Mensal dos Prazos e o painel completo de Estatísticas e Diário do Ciclo.',
    dicaPratica:
      'Cada sessão de foco ou conclusão alimenta seu Diário e seus gráficos em tempo real.',
    seletorAlvo: '[data-tutorial-alvo="visoes-lume"]',
  },
  {
    numero: 6,
    titulo: 'Tudo pronto para iluminar seu ciclo',
    descricao:
      'Você já conhece o essencial do Lume. Seu progresso deste tour fica salvo na sua conta, e você pode rever estas instruções a qualquer momento pela página Perfil.',
    dicaPratica: 'Dica: pressione Esc para sair rapidamente sempre que abrir este guia novamente.',
    seletorAlvo: null,
  },
] as const;

export function deveIniciarTutorialAutomaticamente(
  status: StatusTutorialPreferencia | null | undefined,
  rotaAtual: string,
  revisaoSolicitada: boolean,
): boolean {
  if (rotaAtual !== '/jornada') {
    return false;
  }
  if (revisaoSolicitada) {
    return true;
  }
  return status === 'pendente';
}

export function resolverPassoInicial(etapaPersistida: number, modoRevisao: boolean): number {
  if (modoRevisao || etapaPersistida <= 0) {
    return 1;
  }
  return Math.min(TOTAL_PASSOS_TUTORIAL, Math.max(1, Math.round(etapaPersistida)));
}

export interface EntradaTransicaoTutorial {
  passoAtual: number;
  statusPersistido: StatusTutorialPreferencia;
  modoRevisao: boolean;
}

export interface AtualizacaoTutorialPersistida {
  status: StatusTutorialPreferencia;
  etapaAtual: number;
}

export interface ResultadoAvancoTutorial {
  aberto: boolean;
  proximoPasso: number;
  atualizacaoPersistida: AtualizacaoTutorialPersistida | null;
}

export function avancarPassoTutorial(entrada: EntradaTransicaoTutorial): ResultadoAvancoTutorial {
  const atualLimpo = Math.min(TOTAL_PASSOS_TUTORIAL, Math.max(1, entrada.passoAtual));
  if (atualLimpo >= TOTAL_PASSOS_TUTORIAL) {
    return {
      aberto: false,
      proximoPasso: TOTAL_PASSOS_TUTORIAL,
      atualizacaoPersistida:
        entrada.modoRevisao && entrada.statusPersistido === 'concluido'
          ? null
          : { status: 'concluido', etapaAtual: TOTAL_PASSOS_TUTORIAL },
    };
  }

  const proximoPasso = atualLimpo + 1;
  return {
    aberto: true,
    proximoPasso,
    atualizacaoPersistida: entrada.modoRevisao
      ? null
      : { status: 'pendente', etapaAtual: proximoPasso },
  };
}

export function voltarPassoTutorial(passoAtual: number): number {
  return Math.max(1, Math.min(TOTAL_PASSOS_TUTORIAL, passoAtual - 1));
}

export interface ResultadoPuloTutorial {
  aberto: boolean;
  atualizacaoPersistida: AtualizacaoTutorialPersistida | null;
}

export function pularTutorial(entrada: EntradaTransicaoTutorial): ResultadoPuloTutorial {
  const passoSeguro = Math.min(TOTAL_PASSOS_TUTORIAL, Math.max(1, entrada.passoAtual));
  return {
    aberto: false,
    atualizacaoPersistida: entrada.modoRevisao
      ? null
      : { status: 'pulado', etapaAtual: passoSeguro },
  };
}

export interface RetanguloAlvo {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ViewportJanela {
  largura: number;
  altura: number;
}

export interface GeometriaSpotlight {
  centralizado: boolean;
  recorte: RetanguloAlvo | null;
  cartaoTop: number;
  cartaoLeft: number;
  cartaoLargura: number;
  cartaoAlturaEstimada: number;
}

export function calcularGeometriaSpotlight(
  rect: RetanguloAlvo | null,
  viewport: ViewportJanela,
): GeometriaSpotlight {
  const margem = 12;
  const larguraSegura = Math.max(280, viewport.largura);
  const alturaSegura = Math.max(360, viewport.altura);
  const cartaoLargura = Math.min(440, larguraSegura - margem * 2);
  const cartaoAlturaEstimada = larguraSegura < 480 ? 290 : 270;

  const fallbackCentralizado: GeometriaSpotlight = {
    centralizado: true,
    recorte: null,
    cartaoLargura,
    cartaoAlturaEstimada,
    cartaoLeft: Math.max(margem, Math.round((larguraSegura - cartaoLargura) / 2)),
    cartaoTop: Math.max(margem, Math.round((alturaSegura - cartaoAlturaEstimada) / 2)),
  };

  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return fallbackCentralizado;
  }

  const padding = 8;
  const recorte: RetanguloAlvo = {
    top: Math.max(margem / 2, rect.top - padding),
    left: Math.max(margem / 2, rect.left - padding),
    width: Math.min(larguraSegura - margem, rect.width + padding * 2),
    height: Math.min(alturaSegura - margem, rect.height + padding * 2),
  };

  const espacoAbaixo = alturaSegura - (recorte.top + recorte.height + margem);
  const espacoAcima = recorte.top - margem;

  let cartaoTop: number;
  if (espacoAbaixo >= cartaoAlturaEstimada + 8) {
    cartaoTop = recorte.top + recorte.height + 12;
  } else if (espacoAcima >= cartaoAlturaEstimada + 8) {
    cartaoTop = recorte.top - cartaoAlturaEstimada - 12;
  } else {
    // Em celulares estreitos ou alvos altos, exibe o recorte acima/atras e ancora o cartao dentro da tela.
    cartaoTop = Math.max(margem, alturaSegura - cartaoAlturaEstimada - margem);
  }

  cartaoTop = Math.max(margem, Math.min(cartaoTop, alturaSegura - cartaoAlturaEstimada - margem));

  const centroAlvoX = recorte.left + recorte.width / 2;
  const cartaoLeftIdeal = centroAlvoX - cartaoLargura / 2;
  const cartaoLeft = Math.max(
    margem,
    Math.min(Math.round(cartaoLeftIdeal), larguraSegura - cartaoLargura - margem),
  );

  return {
    centralizado: false,
    recorte,
    cartaoTop: Math.round(cartaoTop),
    cartaoLeft,
    cartaoLargura,
    cartaoAlturaEstimada,
  };
}
