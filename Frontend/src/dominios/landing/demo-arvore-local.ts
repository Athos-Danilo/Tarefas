import type { PrioridadeTarefa } from '../../astronomia/tipos';

export interface NoDemoTarefa {
  id: string;
  titulo: string;
  prioridade: PrioridadeTarefa;
  concluida: boolean;
  filhas: ReadonlyArray<NoDemoTarefa>;
}

export interface ResumoArvoreDemo {
  totalFolhas: number;
  folhasConcluidas: number;
  percentual: number;
  progressoNormalizado: number;
  temFilhaUrgenteAberta: boolean;
}

export function criarArvoreDemoInicial(): NoDemoTarefa {
  return {
    id: 'demo-raiz',
    titulo: 'Preparar entrega do Lume',
    prioridade: 'alta',
    concluida: false,
    filhas: [
      {
        id: 'demo-ramo-1',
        titulo: 'Organizar protótipo do dia',
        prioridade: 'media',
        concluida: false,
        filhas: [
          {
            id: 'demo-sub-1',
            titulo: 'Definir metas da semana',
            prioridade: 'media',
            concluida: true,
            filhas: [],
          },
          {
            id: 'demo-sub-urgente',
            titulo: 'Revisar acessibilidade',
            prioridade: 'urgente',
            concluida: false,
            filhas: [],
          },
          {
            id: 'demo-sub-3',
            titulo: 'Ajustar cores da alvorada',
            prioridade: 'baixa',
            concluida: false,
            filhas: [],
          },
        ],
      },
      {
        id: 'demo-ramo-2',
        titulo: 'Publicar resumo do projeto',
        prioridade: 'alta',
        concluida: false,
        filhas: [],
      },
    ],
  };
}

function definirEstadoSubarvore(no: NoDemoTarefa, concluida: boolean): NoDemoTarefa {
  return {
    ...no,
    concluida,
    filhas: no.filhas.map((filha) => definirEstadoSubarvore(filha, concluida)),
  };
}

export function alternarNoDemo(no: NoDemoTarefa, idAlvo: string): NoDemoTarefa {
  if (no.id === idAlvo) {
    return definirEstadoSubarvore(no, !no.concluida);
  }

  if (no.filhas.length === 0) {
    return no;
  }

  let alterou = false;
  const novasFilhas = no.filhas.map((filha) => {
    const atualizada = alternarNoDemo(filha, idAlvo);
    if (atualizada !== filha) {
      alterou = true;
    }
    return atualizada;
  });

  if (!alterou) {
    return no;
  }

  const todasConcluidas = novasFilhas.every((filha) => filha.concluida);
  return {
    ...no,
    concluida: todasConcluidas,
    filhas: novasFilhas,
  };
}

function contarFolhas(no: NoDemoTarefa): { total: number; concluidas: number } {
  if (no.filhas.length === 0) {
    return {
      total: 1,
      concluidas: no.concluida ? 1 : 0,
    };
  }
  return no.filhas.reduce(
    (acumulado, filha) => {
      const parcial = contarFolhas(filha);
      return {
        total: acumulado.total + parcial.total,
        concluidas: acumulado.concluidas + parcial.concluidas,
      };
    },
    { total: 0, concluidas: 0 },
  );
}

function existeDescendenteUrgenteAberta(no: NoDemoTarefa, ehRaiz: boolean): boolean {
  if (!ehRaiz && no.prioridade === 'urgente' && !no.concluida) {
    return true;
  }
  return no.filhas.some((filha) => existeDescendenteUrgenteAberta(filha, false));
}

export function calcularResumoArvoreDemo(raiz: NoDemoTarefa): ResumoArvoreDemo {
  const { total, concluidas } = contarFolhas(raiz);
  const percentual = total === 0 ? 0 : Math.round((concluidas / total) * 100);
  const progressoNormalizado = total === 0 ? 0 : Number((concluidas / total).toFixed(4));
  const temFilhaUrgenteAberta = existeDescendenteUrgenteAberta(raiz, true);

  return {
    totalFolhas: total,
    folhasConcluidas: concluidas,
    percentual,
    progressoNormalizado,
    temFilhaUrgenteAberta,
  };
}
