(function (root) {
  'use strict';

  const CEU_KEYS = [
    { min: 0,    topo: '#070C1A', meio: '#0D1730', base: '#132040', estrelas: 1.00 },
    { min: 285,  topo: '#0C1229', meio: '#182144', base: '#262D52', estrelas: 0.95 },
    { min: 345,  topo: '#5C5E96', meio: '#E79B9B', base: '#FCE2C4', estrelas: 0.30 },
    { min: 450,  topo: '#B5DFF8', meio: '#E2F2F8', base: '#F7F1E1', estrelas: 0.00 },
    { min: 630,  topo: '#87C8F2', meio: '#CDEAFB', base: '#F3F4EA', estrelas: 0.00 },
    { min: 810,  topo: '#5EB3E6', meio: '#B4DFF4', base: '#F7E8C8', estrelas: 0.00 },
    { min: 975,  topo: '#6CAEDB', meio: '#E6CFAF', base: '#F8D19A', estrelas: 0.00 },
    { min: 1050, topo: '#47366E', meio: '#B55A74', base: '#F3A172', estrelas: 0.45 },
    { min: 1125, topo: '#1E183E', meio: '#643563', base: '#C8736A', estrelas: 0.85 },
    { min: 1215, topo: '#070C1A', meio: '#0D1730', base: '#132040', estrelas: 1.00 },
    { min: 1440, topo: '#070C1A', meio: '#0D1730', base: '#132040', estrelas: 1.00 }
  ];

  const UI_LUMINOSA = [
    { min: 345,  sol: '#FFF8F1', alt: '#F5E7DA', txt: '#2B1822', sec: '#5E3D4B', pri: '#8A3E52', priTxt: '#FFFFFF' },
    { min: 450,  sol: '#FFFDF8', alt: '#F1EDE0', txt: '#172430', sec: '#4A5D6E', pri: '#256B4E', priTxt: '#FFFFFF' },
    { min: 630,  sol: '#FDFEFF', alt: '#EBF2F7', txt: '#132230', sec: '#43586B', pri: '#1E6663', priTxt: '#FFFFFF' },
    { min: 810,  sol: '#FFFDF7', alt: '#F2EFE3', txt: '#1A2029', sec: '#4C5361', pri: '#1F6A73', priTxt: '#FFFFFF' },
    { min: 975,  sol: '#FFF9EE', alt: '#F4E8D4', txt: '#221E1A', sec: '#594E43', pri: '#A94F0D', priTxt: '#FFFFFF' },
    { min: 1049, sol: '#FFF3E8', alt: '#F3DFCE', txt: '#281C22', sec: '#61424E', pri: '#9C3E32', priTxt: '#FFFFFF' }
  ];

  const UI_NOTURNA = [
    { min: 1050, sol: '#1E1533', alt: '#2B1F47', txt: '#FDF5EC', sec: '#DFC7D9', pri: '#FFA26B', priTxt: '#1E1533' },
    { min: 1125, sol: '#161533', alt: '#211F47', txt: '#F7F3FD', sec: '#C5BDDC', pri: '#F7BD72', priTxt: '#161533' },
    { min: 1215, sol: '#0E172E', alt: '#162242', txt: '#F1F5FF', sec: '#A5B4D4', pri: '#F5D076', priTxt: '#0E172E' },
    { min: 1440, sol: '#0B1226', alt: '#121C38', txt: '#EEF3FF', sec: '#A2B2D4', pri: '#F5D076', priTxt: '#0B1226' },
    { min: 1725, sol: '#131836', alt: '#1D244A', txt: '#F3F2FF', sec: '#B5BADB', pri: '#F5C478', priTxt: '#131836' },
    { min: 1784, sol: '#1F1B3D', alt: '#2B2552', txt: '#FBF2F6', sec: '#D4BFD6', pri: '#FFA678', priTxt: '#1F1B3D' }
  ];

  const FASES_FAVICON = {
    manha: {
      id: 'manha',
      nome: 'Manha',
      faixa: '05:45 - 11:59',
      arquivo: '../Identidade-visual/assets-3d/favicons/favicon-lume-manha.png'
    },
    tarde: {
      id: 'tarde',
      nome: 'Tarde',
      faixa: '12:00 - 16:59',
      arquivo: '../Identidade-visual/assets-3d/favicons/favicon-lume-tarde.png'
    },
    entardecer: {
      id: 'entardecer',
      nome: 'Entardecer',
      faixa: '17:00 - 18:59',
      arquivo: '../Identidade-visual/assets-3d/favicons/favicon-lume-entardecer.png'
    },
    noite: {
      id: 'noite',
      nome: 'Noite',
      faixa: '19:00 - 05:44',
      arquivo: '../Identidade-visual/assets-3d/favicons/favicon-lume-noite.png'
    }
  };

  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function lerpHex(a, b, t) {
    const [r1, g1, b1] = hexRgb(a);
    const [r2, g2, b2] = hexRgb(b);
    return rgbHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  }

  function interpolarTabela(tab, m) {
    let a = tab[0];
    let b = tab[tab.length - 1];
    for (let i = 0; i < tab.length - 1; i++) {
      if (m >= tab[i].min && m <= tab[i + 1].min) {
        a = tab[i];
        b = tab[i + 1];
        break;
      }
    }
    const t = b.min === a.min ? 0 : (m - a.min) / (b.min - a.min);
    return { a, b, t };
  }

  function interpolacao24h(min) {
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    const ceuP = interpolarTabela(CEU_KEYS, m);
    const noturna = !(m >= 345 && m <= 1049);
    const mNorm = m < 345 ? m + 1440 : m;
    const uiP = noturna ? interpolarTabela(UI_NOTURNA, mNorm) : interpolarTabela(UI_LUMINOSA, m);

    const sol = lerpHex(uiP.a.sol, uiP.b.sol, uiP.t);
    const [sr, sg, sb] = hexRgb(sol);
    return {
      minuto: m,
      noturna,
      ceuTopo: lerpHex(ceuP.a.topo, ceuP.b.topo, ceuP.t),
      ceuMeio: lerpHex(ceuP.a.meio, ceuP.b.meio, ceuP.t),
      ceuBase: lerpHex(ceuP.a.base, ceuP.b.base, ceuP.t),
      estrelas: ceuP.a.estrelas + (ceuP.b.estrelas - ceuP.a.estrelas) * ceuP.t,
      sup: `rgba(${sr}, ${sg}, ${sb}, ${noturna ? '0.90' : '0.92'})`,
      supSolida: sol,
      supAlt: lerpHex(uiP.a.alt, uiP.b.alt, uiP.t),
      texto: lerpHex(uiP.a.txt, uiP.b.txt, uiP.t),
      textoSec: lerpHex(uiP.a.sec, uiP.b.sec, uiP.t),
      primaria: lerpHex(uiP.a.pri, uiP.b.pri, uiP.t),
      primariaTxt: uiP.t < 0.5 ? uiP.a.priTxt : uiP.b.priTxt,
      borda: noturna ? 'rgba(241, 245, 255, 0.18)' : 'rgba(23, 36, 48, 0.14)'
    };
  }

  function obterFaseFavicon(min) {
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    if (m >= 345 && m < 720) return FASES_FAVICON.manha;
    if (m >= 720 && m < 1020) return FASES_FAVICON.tarde;
    if (m >= 1020 && m < 1140) return FASES_FAVICON.entardecer;
    return FASES_FAVICON.noite;
  }

  // Modulo astronomico puro offline (Hemisferio Sul) - D02 / ID-25
  const CICLO_SINODICO_DIAS = 29.53058867;
  const LUA_NOVA_REF_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

  function obterFaseLunarHemisferioSul(data) {
    const ms = (data instanceof Date ? data : new Date(data)).getTime();
    const dias = (ms - LUA_NOVA_REF_MS) / 86400000;
    const ciclo = ((dias % CICLO_SINODICO_DIAS) + CICLO_SINODICO_DIAS) % CICLO_SINODICO_DIAS;
    const fracao = ciclo / CICLO_SINODICO_DIAS; // 0 = Nova, 0.5 = Cheia
    const iluminacao = Math.round(((1 - Math.cos(fracao * 2 * Math.PI)) / 2) * 100);

    let nome = 'Lua Nova';
    if (fracao < 0.03 || fracao >= 0.97) nome = 'Lua Nova';
    else if (fracao < 0.22) nome = 'Crescente Concava';
    else if (fracao < 0.28) nome = 'Quarto Crescente';
    else if (fracao < 0.47) nome = 'Crescente Gibosa';
    else if (fracao < 0.53) nome = 'Lua Cheia';
    else if (fracao < 0.72) nome = 'Minguante Gibosa';
    else if (fracao < 0.78) nome = 'Quarto Minguante';
    else nome = 'Minguante Concava';

    return {
      fracao,
      iluminacao,
      nome,
      crescente: fracao > 0 && fracao < 0.5,
      hemisferio: 'Sul'
    };
  }

  // No Hemisferio Sul, a Lua Crescente ilumina da esquerda para a direita
  function renderizarLuaSvg(fase, tamanho) {
    const r = 44;
    const k = Math.cos(fase.fracao * 2 * Math.PI); // +1 nova, 0 quarto, -1 cheia
    const rx = Math.max(0.5, Math.abs(k) * r);
    let caminho = '';

    if (fase.iluminacao <= 2) {
      caminho = '';
    } else if (fase.iluminacao >= 98) {
      caminho = `M 50 ${50 - r} A ${r} ${r} 0 1 1 50 ${50 + r} A ${r} ${r} 0 1 1 50 ${50 - r}`;
    } else if (fase.fracao < 0.5) {
      // Crescente: borda externa a esquerda (sweep 0 de cima para baixo)
      const sweepTerminator = k > 0 ? 0 : 1;
      caminho = `M 50 ${50 - r} A ${r} ${r} 0 1 0 50 ${50 + r} A ${rx} ${r} 0 1 ${sweepTerminator} 50 ${50 - r}`;
    } else {
      // Minguante: borda externa a direita (sweep 1 de cima para baixo)
      const sweepTerminator = k < 0 ? 0 : 1;
      caminho = `M 50 ${50 - r} A ${r} ${r} 0 1 1 50 ${50 + r} A ${rx} ${r} 0 1 ${sweepTerminator} 50 ${50 - r}`;
    }

    return `
      <svg width="${tamanho}" height="${tamanho}" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="luaClay${tamanho}" cx="36%" cy="32%">
            <stop offset="0%" stop-color="#FFFDF0" />
            <stop offset="65%" stop-color="#F7E8B5" />
            <stop offset="100%" stop-color="#D7BE7A" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="${r}" fill="rgba(22, 34, 66, 0.72)" stroke="rgba(247, 232, 181, 0.28)" stroke-width="1.5" />
        ${caminho ? `<path d="${caminho}" fill="url(#luaClay${tamanho})" />` : ''}
      </svg>
    `;
  }

  // Regras puras da arvore multinivel (D08) - calculo exclusivamente pelas tarefas-folha
  function contarFolhas(no) {
    const filhas = no.subtarefas || [];
    if (filhas.length === 0) {
      return {
        totalFolhas: 1,
        folhasConcluidas: no.status === 'concluida' ? 1 : 0
      };
    }
    return filhas.reduce((acc, f) => {
      const sub = contarFolhas(f);
      return {
        totalFolhas: acc.totalFolhas + sub.totalFolhas,
        folhasConcluidas: acc.folhasConcluidas + sub.folhasConcluidas
      };
    }, { totalFolhas: 0, folhasConcluidas: 0 });
  }

  function calcularProgressoFolhas(no) {
    const res = contarFolhas(no);
    const percentual = res.totalFolhas === 0 ? 0 : Math.round((res.folhasConcluidas / res.totalFolhas) * 100);
    return {
      totalFolhas: res.totalFolhas,
      folhasConcluidas: res.folhasConcluidas,
      percentual
    };
  }

  function temFilhaUrgenteAberta(no) {
    const filhas = no.subtarefas || [];
    for (const f of filhas) {
      if ((f.prioridade === 'urgente' && f.status !== 'concluida') || temFilhaUrgenteAberta(f)) {
        return true;
      }
    }
    return false;
  }

  const AVATARES = [
    { id: 'sol-nascente', nome: 'Sol Nascente', g: 'Astros', r: 0, c: 0 },
    { id: 'lua-crescente', nome: 'Lua Crescente', g: 'Astros', r: 0, c: 1 },
    { id: 'cometa-dourado', nome: 'Cometa Dourado', g: 'Astros', r: 0, c: 2 },
    { id: 'aurora-boreal', nome: 'Aurora Boreal', g: 'Astros', r: 0, c: 3 },
    { id: 'girassol-lume', nome: 'Girassol Lume', g: 'Botanicos', r: 1, c: 0 },
    { id: 'samambaia-orvalho', nome: 'Samambaia', g: 'Botanicos', r: 1, c: 1 },
    { id: 'lotus-serena', nome: 'Lotus Serena', g: 'Botanicos', r: 1, c: 2 },
    { id: 'broto-vivo', nome: 'Broto Vivo', g: 'Botanicos', r: 1, c: 3 },
    { id: 'vagalume-estelar', nome: 'Vagalume', g: 'Criaturas', r: 2, c: 0 },
    { id: 'coruja-noturna', nome: 'Coruja', g: 'Criaturas', r: 2, c: 1 },
    { id: 'borboleta-aurora', nome: 'Borboleta', g: 'Criaturas', r: 2, c: 2 },
    { id: 'beija-flor-solar', nome: 'Beija-flor', g: 'Criaturas', r: 2, c: 3 },
    { id: 'telescopio-celeste', nome: 'Telescopio', g: 'Observatorio', r: 3, c: 0 },
    { id: 'bussola-astral', nome: 'Bussola', g: 'Observatorio', r: 3, c: 1 },
    { id: 'ampulheta-solar', nome: 'Ampulheta', g: 'Observatorio', r: 3, c: 2 },
    { id: 'estrela-guia', nome: 'Estrela-guia', g: 'Observatorio', r: 3, c: 3 }
  ];

  const CIDADES_DEMO = [
    { cidade: 'Brasilia', uf: 'DF', temp: 24, wmo: 61, estado: 'chuvoso', desc: 'Chuva leve' },
    { cidade: 'Sao Paulo', uf: 'SP', temp: 21, wmo: 3, estado: 'nublado', desc: 'Nublado' },
    { cidade: 'Belo Horizonte', uf: 'MG', temp: 26, wmo: 2, estado: 'parcialmente_nublado', desc: 'Parcialmente nublado' },
    { cidade: 'Florianopolis', uf: 'SC', temp: 25, wmo: 0, estado: 'limpo', desc: 'Ceu limpo' },
    { cidade: 'Manaus', uf: 'AM', temp: 29, wmo: 95, estado: 'tempestade', desc: 'Tempestade suave' }
  ];

  function criarTarefasIniciais() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const diaHoje = String(hoje.getDate()).padStart(2, '0');
    const diaFim = String(Math.min(28, hoje.getDate() + 4)).padStart(2, '0');
    const diaMedio = String(Math.min(28, Math.max(1, hoje.getDate() + 2))).padStart(2, '0');

    return [
      {
        id: 't-1',
        titulo: 'Projeto Web II - Lume (Arvore 5 niveis)',
        prioridade: 'alta',
        status: 'em_andamento',
        turno: 'tarde',
        prazo: `${ano}-${mes}-${diaFim}`,
        etiquetas: ['Faculdade', 'Web II'],
        lembretes: [{ id: 'l-1', rotulo: '15 min antes', disparo: `${ano}-${mes}-${diaFim} 13:45` }],
        notas: [
          { tipo: 'subtitulo', texto: 'Checklist de arquitetura (6 blocos)' },
          { tipo: 'paragrafo', texto: 'Apresentar o **Horizonte Vivo** com *Lua 3D real*, clima opt-in e arvore poliglota.' },
          { tipo: 'lista', itens: ['PostgreSQL para hierarquia ACID', 'MongoDB para notas e preferencias'] },
          { tipo: 'checklist', itens: [{ texto: 'Validar Lua no Hemisferio Sul', ok: true }, { texto: 'Testar Web Push no celular', ok: false }] },
          { tipo: 'citacao', texto: 'Cada subtarefa concluida ilumina uma estrela no horizonte.' },
          { tipo: 'codigo_ou_link', subtipo: 'link', rotulo: 'Especificacao Open-Meteo', conteudo: 'https://open-meteo.com/' }
        ],
        subtarefas: [
          {
            id: 't-1-1',
            titulo: 'Backend FastAPI + Bancos',
            prioridade: 'alta',
            status: 'em_andamento',
            turno: 'manha',
            prazo: `${ano}-${mes}-${diaMedio}`,
            etiquetas: ['API'],
            lembretes: [],
            notas: [{ tipo: 'paragrafo', texto: 'Camada de domínio puro testada com **pytest**.' }],
            subtarefas: [
              {
                id: 't-1-1-1',
                titulo: 'Nivel 3: Corrigir bloqueio de ciclo urgencia',
                prioridade: 'urgente',
                status: 'em_andamento',
                turno: 'manha',
                prazo: `${ano}-${mes}-${diaHoje}`,
                etiquetas: ['Urgente'],
                lembretes: [{ id: 'l-2', rotulo: 'Na hora (10:00)', disparo: `${ano}-${mes}-${diaHoje} 10:00` }],
                notas: [{ tipo: 'paragrafo', texto: 'Esta subtarefa nivel 3 dispara o alerta na tarefa-mae.' }],
                subtarefas: [
                  {
                    id: 't-1-1-1-1',
                    titulo: 'Nivel 4: Escrever teste de reparenting',
                    prioridade: 'media',
                    status: 'em_andamento',
                    turno: 'manha',
                    prazo: null,
                    etiquetas: [],
                    lembretes: [],
                    notas: [],
                    subtarefas: [
                      {
                        id: 't-1-1-1-1-1',
                        titulo: 'Nivel 5: Validar profundidade maxima = 5',
                        prioridade: 'baixa',
                        status: 'concluida',
                        turno: 'manha',
                        prazo: null,
                        etiquetas: [],
                        lembretes: [],
                        notas: [],
                        subtarefas: []
                      },
                      {
                        id: 't-1-1-1-1-2',
                        titulo: 'Nivel 5: Testar promocao de filhas ao excluir mae',
                        prioridade: 'alta',
                        status: 'pendente',
                        turno: 'tarde',
                        prazo: null,
                        etiquetas: [],
                        lembretes: [],
                        notas: [],
                        subtarefas: []
                      }
                    ]
                  }
                ]
              },
              {
                id: 't-1-1-2',
                titulo: 'Nivel 3: Adaptador Open-Meteo com cache',
                prioridade: 'media',
                status: 'concluida',
                turno: 'tarde',
                prazo: null,
                etiquetas: [],
                lembretes: [],
                notas: [],
                subtarefas: []
              }
            ]
          },
          {
            id: 't-1-2',
            titulo: 'Apresentacao e slides em sala',
            prioridade: 'baixa',
            status: 'concluida',
            turno: 'noite',
            prazo: `${ano}-${mes}-${diaMedio}`,
            etiquetas: ['Web II'],
            lembretes: [],
            notas: [{ tipo: 'citacao', texto: 'Mostrar o celular recebendo push ao vivo!' }],
            subtarefas: []
          }
        ]
      },
      {
        id: 't-2',
        titulo: 'Revisar algoritmo de fases lunares',
        prioridade: 'media',
        status: 'pendente',
        turno: 'noite',
        prazo: `${ano}-${mes}-${diaHoje}`,
        etiquetas: ['3D'],
        lembretes: [{ id: 'l-3', rotulo: '1h antes', disparo: `${ano}-${mes}-${diaHoje} 19:00` }],
        notas: [{ tipo: 'paragrafo', texto: 'Garantir orientacao correta do **Hemisferio Sul**.' }],
        subtarefas: []
      },
      {
        id: 't-3',
        titulo: 'Organizar leituras da semana',
        prioridade: 'baixa',
        status: 'pendente',
        turno: 'livre',
        prazo: null,
        etiquetas: ['Pessoal'],
        lembretes: [],
        notas: [],
        subtarefas: []
      }
    ];
  }

  const dadosExportados = {
    CEU_KEYS,
    UI_LUMINOSA,
    UI_NOTURNA,
    FASES_FAVICON,
    AVATARES,
    CIDADES_DEMO,
    interpolacao24h,
    obterFaseFavicon,
    obterFaseLunarHemisferioSul,
    renderizarLuaSvg,
    calcularProgressoFolhas,
    temFilhaUrgenteAberta,
    criarTarefasIniciais
  };

  root.LumeDados = dadosExportados;
})(typeof window !== 'undefined' ? window : globalThis);
