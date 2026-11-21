(function () {
  'use strict';

  const D = window.LumeDados;

  // Biblioteca de icones SVG lineares finos estilo Lucide (zero emojis crus de UI)
  function svgIco(paths, tam, cor) {
    const s = tam || 18;
    const c = cor || 'currentColor';
    return `<span class="ico-svg" aria-hidden="true"><svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`;
  }

  const ICONES = {
    jornada: (t) => svgIco('<path d="M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/><circle cx="12" cy="12" r="4"/>', t),
    mapa: (t) => svgIco('<circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.6 16.6L15.4 7.4M9 18h6"/>', t),
    foco: (t) => svgIco('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', t),
    calendario: (t) => svgIco('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>', t),
    diario: (t) => svgIco('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>', t),
    perfil: (t) => svgIco('<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>', t),
    busca: (t) => svgIco('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>', t),
    sino: (t) => svgIco('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>', t),
    clima: (t) => svgIco('<path d="M17.5 19H9a5 5 0 1 1 .9-9.9 6 6 0 0 1 11.4 2.4A4 4 0 0 1 17.5 19Z"/>', t),
    chuva: (t) => svgIco('<path d="M16 13v4M12 15v4M8 13v4"/><path d="M17.5 15H9a4.5 4.5 0 1 1 .8-8.9A5.5 5.5 0 0 1 20 8.5 3.5 3.5 0 0 1 17.5 15Z"/>', t),
    lua: (t) => svgIco('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>', t),
    tarde: (t) => svgIco('<path d="M12 10V2M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M16 18a4 4 0 0 0-8 0"/>', t),
    folha: (t) => svgIco('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>', t),
    mais: (t) => svgIco('<path d="M12 5v14M5 12h14"/>', t),
    nota: (t) => svgIco('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>', t),
    lixeira: (t) => svgIco('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', t),
    check: (t) => svgIco('<polyline points="20 6 9 17 4 12"/>', t),
    alerta: (t) => svgIco('<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>', t),
    mergulho: (t) => svgIco('<polyline points="9 18 15 12 9 6"/>', t),
    setaEsq: (t) => svgIco('<polyline points="15 18 9 12 15 6"/>', t),
    slid: (t) => svgIco('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>', t),
    celular: (t) => svgIco('<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>', t),
    pino: (t) => svgIco('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>', t),
    audio: (t) => svgIco('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>', t),
    google: () => '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.8-5.4 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12Z"/></svg>'
  };

  const NAV_ITENS = [
    { id: 'jornada', nome: 'Jornada', ico: ICONES.jornada },
    { id: 'mapa', nome: 'Mapa', ico: ICONES.mapa },
    { id: 'foco', nome: 'Foco', ico: ICONES.foco },
    { id: 'calendario', nome: 'Calendario', ico: ICONES.calendario },
    { id: 'diario', nome: 'Diario', ico: ICONES.diario },
    { id: 'perfil', nome: 'Perfil', ico: ICONES.perfil }
  ];

  const estado = {
    fluxo: 'landing', // Inicia direto na Landing impactante ou Workspace
    visao: 'jornada',
    viewport: 'desktop',
    modoEstado: 'normal',
    modoDesempenho: false,
    dockAberto: false,
    popoverHorizonte: false,
    minuto: 570,
    climaSimulador: 'auto',
    faseFaviconAtual: null,

    usuario: {
      nome: 'Athos Danilo',
      email: 'athos.danilo@exemplo.com',
      avatarTipo: 'preset',
      avatarId: 'vagalume-estelar',
      avatarUploadData: null
    },
    wizard: {
      passo: 1,
      grupoAvatar: 'Criaturas',
      nome: 'Athos Danilo',
      avatarTipo: 'preset',
      avatarId: 'vagalume-estelar',
      avatarUploadData: null,
      criarGuia: true,
      ativarClimaAgora: false
    },

    climaConsentido: {
      habilitado: false,
      cidade: null,
      uf: null,
      temp: null,
      estado: 'limpo',
      desc: 'Ceu limpo'
    },

    audio: { habilitado: false },
    pushDispositivos: [
      { id: 'd-1', rotulo: 'Notebook Windows (Chrome)', plataforma: 'desktop' },
      { id: 'd-2', rotulo: 'Celular Android (App instalado)', plataforma: 'android' }
    ],

    tarefas: D.criarTarefasIniciais(),
    expandidas: { 't-1': true, 't-1-1': true, 't-1-1-1': false },
    ramoFocoId: null, // Permite mergulhar em subarvores profundas sem esmagar no celular
    filtroTurno: 'todos',
    busca: '',
    tarefaSelecionadaId: 't-1',
    gavetaAberta: false,

    mapaZoom: 1,
    mapaPosicoes: {},

    calAno: new Date().getFullYear(),
    calMes: new Date().getMonth(),
    calDiaSelecionado: String(new Date().getDate()).padStart(2, '0'),

    focoTarefaId: 't-1-1',
    focoTotalSeg: 25 * 60,
    focoRestanteSeg: 25 * 60,
    focoRodando: false,
    focoTimerId: null,

    diario: [
      { hora: 'Hoje 09:42', tipo: 'Tarefa concluida', texto: 'Concluiu "Validar profundidade maxima = 5".' },
      { hora: 'Ontem 20:15', tipo: 'Modo Foco', texto: 'Completou sessao lunar de 25 min em Projeto Web II.' }
    ],

    landingChecks: [true, true, false, false],
    snapshotDesfazer: null,
    toastTimerId: null
  };

  function escaparHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatarRichText(texto) {
    return escaparHtml(texto)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  function formatarHora(min) {
    const m = ((Math.round(min) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  function rotuloTurno(min) {
    if (min >= 345 && min < 420) return 'Aurora';
    if (min >= 420 && min < 720) return 'Manha';
    if (min >= 720 && min < 1020) return 'Tarde';
    if (min >= 1020 && min < 1140) return 'Entardecer';
    return 'Noite';
  }

  function saudacaoPorHora(min) {
    if (min >= 300 && min < 720) return 'Bom dia';
    if (min >= 720 && min < 1080) return 'Boa tarde';
    return 'Boa noite';
  }

  function encontrarNoComCaminho(lista, id, caminho) {
    const trilha = caminho || [];
    for (let i = 0; i < lista.length; i++) {
      const no = lista[i];
      const prox = trilha.concat([no]);
      if (no.id === id) return { no, lista, indice: i, pai: trilha[trilha.length - 1] || null, caminho: prox };
      if (no.subtarefas && no.subtarefas.length) {
        const achado = encontrarNoComCaminho(no.subtarefas, id, prox);
        if (achado) return achado;
      }
    }
    return null;
  }

  function encontrarNo(lista, id) {
    return encontrarNoComCaminho(lista, id, []);
  }

  function clonarTarefas(lista) {
    return JSON.parse(JSON.stringify(lista));
  }

  function contarDescendentes(no) {
    let total = 0;
    for (const f of (no.subtarefas || [])) total += 1 + contarDescendentes(f);
    return total;
  }

  function marcarSubarvoreStatus(no, novoStatus) {
    no.status = novoStatus;
    for (const f of (no.subtarefas || [])) marcarSubarvoreStatus(f, novoStatus);
  }

  function todasFilhasConcluidas(no) {
    if (!no.subtarefas || !no.subtarefas.length) return no.status === 'concluida';
    return no.subtarefas.every(f => f.status === 'concluida');
  }

  function recalcularAncestrais(lista, alvoId) {
    function visitar(nos) {
      for (const no of nos) {
        if (no.subtarefas && no.subtarefas.length) {
          const achou = no.subtarefas.some(f => f.id === alvoId) || visitar(no.subtarefas);
          if (achou) {
            if (todasFilhasConcluidas(no)) no.status = 'concluida';
            else if (no.status === 'concluida') no.status = 'em_andamento';
            return true;
          }
        }
      }
      return false;
    }
    visitar(lista);
  }

  function listarTodasPlanas(lista, prof) {
    const nivel = prof || 1;
    let out = [];
    for (const no of lista) {
      out.push({ no, nivel });
      if (no.subtarefas && no.subtarefas.length) out = out.concat(listarTodasPlanas(no.subtarefas, nivel + 1));
    }
    return out;
  }

  function corAvatarCss(avId) {
    const av = D.AVATARES.find(x => x.id === avId) || D.AVATARES[8];
    return `${[4.5, 34.8, 65.2, 95.5][av.c]}% ${[4.5, 34.8, 65.2, 95.5][av.r]}%`;
  }

  function renderAvatarHtml(u, tam) {
    const px = tam || 44;
    if (u.avatarTipo === 'upload' && u.avatarUploadData) {
      return `<img src="${u.avatarUploadData}" width="${px}" height="${px}" alt="Avatar" style="border-radius:999px;object-fit:cover;border:2px solid var(--primaria);flex-shrink:0;" />`;
    }
    if (u.avatarTipo === 'google') {
      const ini = (u.nome || 'AD').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
      return `<div style="width:${px}px;height:${px}px;border-radius:999px;background:#1D5C87;color:#FFF;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${Math.round(px * 0.38)}px;border:2px solid var(--primaria);flex-shrink:0;">${escaparHtml(ini)}</div>`;
    }
    return `<span class="avatar-sprite" style="width:${px}px;height:${px}px;background-position:${corAvatarCss(u.avatarId)};border:2px solid var(--primaria);"></span>`;
  }

  function renderAnelSvg(pct, tam, esp) {
    const s = tam || 52;
    const stroke = esp || 5;
    const r = (s - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.max(0, Math.min(100, pct)) / 100) * circ;
    return `
      <svg class="anel-progresso" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true">
        <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="var(--borda)" stroke-width="${stroke}" />
        <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="var(--primaria)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" />
      </svg>
    `;
  }

  function obterEstadoClimaticoEfetivo() {
    if (estado.climaSimulador !== 'auto') return estado.climaSimulador;
    return estado.climaConsentido.habilitado ? estado.climaConsentido.estado : 'limpo';
  }

  function aplicarAtmosfera() {
    const t = D.interpolacao24h(estado.minuto);
    const root = document.documentElement;
    root.style.setProperty('--ceu-topo', t.ceuTopo);
    root.style.setProperty('--ceu-meio', t.ceuMeio);
    root.style.setProperty('--ceu-base', t.ceuBase);
    root.style.setProperty('--primaria', t.primaria);
    root.style.setProperty('--primaria-txt', t.primariaTxt);

    const frame = document.getElementById('app-frame');
    if (frame) {
      frame.classList.toggle('tema-noturno', t.noturna);
      frame.classList.toggle('vp-desktop', estado.viewport === 'desktop');
      frame.classList.toggle('vp-tablet', estado.viewport === 'tablet');
      frame.classList.toggle('vp-celular', estado.viewport === 'celular');
      frame.classList.toggle('modo-desempenho', estado.modoDesempenho);
    }

    const fav = D.obterFaseFavicon(estado.minuto);
    if (estado.faseFaviconAtual !== fav.id) {
      estado.faseFaviconAtual = fav.id;
      const link = document.getElementById('favicon-ativo');
      if (link) link.href = `${fav.arquivo}?turno=${fav.id}`;
      document.title = `Lume - ${fav.nome}`;
    }

    const clima = obterEstadoClimaticoEfetivo();
    const fatorNuvem = clima === 'limpo' ? 1 : (clima === 'parcialmente_nublado' ? 0.65 : 0.25);
    const elEstrelas = document.getElementById('camada-estrelas');
    if (elEstrelas) elEstrelas.style.opacity = (t.estrelas * fatorNuvem).toFixed(2);

    let opNoite = 0;
    if (estado.minuto >= 1140 || estado.minuto <= 300) opNoite = 1;
    else if (estado.minuto > 990 && estado.minuto < 1140) opNoite = (estado.minuto - 990) / 150;
    else if (estado.minuto > 300 && estado.minuto < 420) opNoite = 1 - (estado.minuto - 300) / 120;

    const imgDia = document.getElementById('diorama-dia');
    const imgNoite = document.getElementById('diorama-noite');
    if (imgDia) imgDia.style.opacity = ((t.noturna ? 0.28 : 0.16) * (1 - opNoite * 0.85)).toFixed(2);
    if (imgNoite) imgNoite.style.opacity = (0.34 * opNoite).toFixed(2);

    const solEl = document.getElementById('astro-sol');
    const luaEl = document.getElementById('astro-lua');
    const faseHoje = D.obterFaseLunarHemisferioSul(new Date());
    const mostrarAstroFundo = estado.fluxo === 'workspace';
    if (solEl && luaEl) {
      if (!mostrarAstroFundo) {
        solEl.style.opacity = '0';
        luaEl.style.opacity = '0';
      } else if (!t.noturna) {
        const progSol = (estado.minuto - 345) / (1050 - 345);
        solEl.style.left = `${14 + progSol * 74}%`;
        solEl.style.top = `${16 - Math.sin(progSol * Math.PI) * 10}%`;
        solEl.style.opacity = clima === 'tempestade' ? '0.12' : (clima === 'nublado' || clima === 'chuvoso' ? '0.35' : '0.78');
        luaEl.style.opacity = '0';
      } else {
        const mNorm = estado.minuto < 345 ? estado.minuto + 1440 : estado.minuto;
        const progLua = (mNorm - 1050) / (1785 - 1050);
        luaEl.innerHTML = D.renderizarLuaSvg(faseHoje, 52);
        luaEl.style.left = `${16 + progLua * 70}%`;
        luaEl.style.top = `${16 - Math.sin(progLua * Math.PI) * 10}%`;
        luaEl.style.opacity = clima === 'tempestade' ? '0.18' : (clima === 'nublado' || clima === 'chuvoso' ? '0.42' : '0.88');
        solEl.style.opacity = '0';
      }
    }

    const nuvensEl = document.getElementById('camada-nuvens');
    const chuvaEl = document.getElementById('camada-chuva');
    const veoEl = document.getElementById('camada-clima-veo');
    const raioEl = document.getElementById('camada-relampago');
    if (nuvensEl && chuvaEl && veoEl && raioEl) {
      const escuras = clima === 'chuvoso' || clima === 'tempestade';
      nuvensEl.querySelectorAll('.nuvem-clay').forEach(n => n.classList.toggle('escura', escuras));
      nuvensEl.style.opacity = clima === 'limpo' ? '0' : (clima === 'parcialmente_nublado' ? '0.62' : '0.96');
      chuvaEl.style.opacity = clima === 'chuvoso' ? '0.68' : (clima === 'tempestade' ? '0.95' : '0');
      veoEl.style.backgroundColor = clima === 'tempestade'
        ? 'rgba(15, 23, 42, 0.25)'
        : (clima === 'nublado' || clima === 'chuvoso' ? 'rgba(30, 41, 59, 0.12)' : 'transparent');
      raioEl.classList.toggle('ativo', clima === 'tempestade');
    }
  }

  function celebrarParticulas(elemento) {
    if (!elemento || estado.modoDesempenho) return;
    const rect = elemento.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const cores = ['#F59E0B', '#10B981', '#FFD166', '#60A5FA', '#FB7185'];
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('span');
      p.className = 'particula-celebracao';
      const ang = (Math.PI * 2 * i) / 8;
      const dist = 22 + Math.random() * 18;
      p.style.left = `${cx - 4}px`;
      p.style.top = `${cy - 4}px`;
      p.style.background = cores[i % cores.length];
      p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 650);
    }
  }

  function mostrarToast(texto, comDesfazer) {
    const area = document.getElementById('area-toast');
    if (!area) return;
    if (estado.toastTimerId) clearTimeout(estado.toastTimerId);
    area.innerHTML = `
      <div class="toast-flutuante" role="status">
        <span style="font-size:13px;font-weight:600;">${escaparHtml(texto)}</span>
        ${comDesfazer ? `<button class="btn pequeno" style="background:#F59E0B;color:#0F172A;border:none;" type="button" id="btn-desfazer-toast">Desfazer (10s)</button>` : ''}
      </div>
    `;
    if (comDesfazer) {
      document.getElementById('btn-desfazer-toast').addEventListener('click', () => {
        if (estado.snapshotDesfazer) {
          estado.tarefas = clonarTarefas(estado.snapshotDesfazer);
          estado.snapshotDesfazer = null;
        }
        area.innerHTML = '';
        renderizar();
        mostrarToast('Conclusao em cascata desfeita.', false);
      });
    }
    estado.toastTimerId = setTimeout(() => {
      estado.snapshotDesfazer = null;
      if (area) area.innerHTML = '';
    }, comDesfazer ? 10000 : 3200);
  }

  function renderDockPrototipo() {
    const dock = document.getElementById('proto-dock');
    const telaLabel = estado.viewport[0].toUpperCase() + estado.viewport.slice(1);
    dock.innerHTML = `
      ${estado.dockAberto ? `
        <div class="proto-popover">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>Controles do Prototipo</strong>
            <button type="button" class="proto-btn" id="proto-fechar">Fechar</button>
          </div>
          <div>
            <div style="color:#94A3B8;margin-bottom:4px;">Fluxo</div>
            <div class="proto-grupo">
              ${['landing', 'primeiro_acesso', 'workspace'].map(f => `
                <button type="button" class="proto-btn ${estado.fluxo === f ? 'ativo' : ''}" data-fluxo="${f}">
                  ${f === 'landing' ? 'Landing' : (f === 'primeiro_acesso' ? 'Primeiro Acesso' : 'Workspace')}
                </button>
              `).join('')}
            </div>
          </div>
          <div>
            <div style="color:#94A3B8;margin-bottom:4px;">Tela simulada</div>
            <div class="proto-grupo">
              ${['desktop', 'tablet', 'celular'].map(v => `
                <button type="button" class="proto-btn ${estado.viewport === v ? 'ativo' : ''}" data-vp="${v}">${v}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <div style="color:#94A3B8;margin-bottom:4px;">Estado de dados</div>
            <div class="proto-grupo">
              ${['normal', 'vazio', 'carregando', 'erro'].map(s => `
                <button type="button" class="proto-btn ${estado.modoEstado === s ? 'ativo' : ''}" data-estado="${s}">${s}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <button type="button" class="proto-btn ${estado.modoDesempenho ? 'ativo' : ''}" id="toggle-desempenho" style="width:100%;">
              ${estado.modoDesempenho ? 'Modo Desempenho (Fallback 2D): Ativo' : 'Ativar Modo Desempenho (Fallback 2D)'}
            </button>
          </div>
        </div>
      ` : ''}
      <button type="button" class="proto-trigger" id="proto-toggle">
        ${ICONES.slid(14)}
        <span>Prototipo · ${telaLabel}</span>
      </button>
    `;

    document.getElementById('proto-toggle').addEventListener('click', () => {
      estado.dockAberto = !estado.dockAberto;
      renderDockPrototipo();
    });
    const btnFec = document.getElementById('proto-fechar');
    if (btnFec) btnFec.addEventListener('click', () => { estado.dockAberto = false; renderDockPrototipo(); });

    dock.querySelectorAll('[data-fluxo]').forEach(b => b.addEventListener('click', () => {
      estado.fluxo = b.dataset.fluxo;
      estado.popoverHorizonte = false;
      renderizar();
    }));
    dock.querySelectorAll('[data-vp]').forEach(b => b.addEventListener('click', () => {
      estado.viewport = b.dataset.vp;
      aplicarAtmosfera();
      renderDockPrototipo();
    }));
    dock.querySelectorAll('[data-estado]').forEach(b => b.addEventListener('click', () => {
      estado.modoEstado = b.dataset.estado;
      renderizar();
    }));
    const tog = document.getElementById('toggle-desempenho');
    if (tog) tog.addEventListener('click', () => {
      estado.modoDesempenho = !estado.modoDesempenho;
      aplicarAtmosfera();
      renderDockPrototipo();
    });
  }

  // ===================== 1. LANDING CINEMATOGRAFICA =====================
  function renderChamadaPalavras() {
    const palavras = [
      { txt: 'Transforme', st: '' },
      { txt: 'sua', st: '' },
      { txt: 'rotina', st: 'font-weight:700;' },
      { txt: 'em', st: '' },
      { txt: 'um', st: '' },
      { txt: 'horizonte', st: 'font-style:italic;color:var(--primaria);font-weight:700;' },
      { txt: 'vivo.', st: 'font-style:italic;color:var(--primaria);font-weight:700;' }
    ];
    return palavras.map((p, i) => `<span class="chamada-palavra" style="animation-delay:${i * 22}ms;${p.st}">${p.txt}</span>`).join(' ');
  }

  function renderLanding() {
    const fav = D.obterFaseFavicon(estado.minuto);
    const noturno = D.interpolacao24h(estado.minuto).noturna;
    const faseHoje = D.obterFaseLunarHemisferioSul(new Date());
    const okCount = estado.landingChecks.filter(Boolean).length;
    const estagioIdx = Math.min(3, Math.max(0, okCount === 0 ? 0 : okCount - 1));
    const plantaX = (estagioIdx * 33.333).toFixed(2) + '%';
    const pctLanding = Math.round((okCount / 4) * 100);
    const climaEf = obterEstadoClimaticoEfetivo();

    const recursos = [
      { cor: 'amber', ico: ICONES.jornada(18), tit: 'Arvore ate 5 niveis', txt: 'Progresso calculado pelas etapas finais, alerta de filha urgente e desfazer instantaneo.' },
      { cor: 'lavanda', ico: ICONES.mapa(18), tit: 'Mapa Constelacao', txt: 'Organize ramos botanicos durante o dia e ligacoes estelares luminosas a noite.' },
      { cor: 'ceu', ico: ICONES.lua(18), tit: 'Lua 3D na fase real', txt: 'Iluminacao astronômica fiel ao Hemisferio Sul acompanhando a lua verdadeira de hoje.' },
      { cor: 'menta', ico: ICONES.clima(18), tit: 'Clima com privacidade', txt: 'Cidade e temperatura apenas com sua permissao, mudando nuvens e chuva no cenario.' },
      { cor: 'pessego', ico: ICONES.foco(18), tit: 'Modo Foco solar e lunar', txt: 'Temporizador imersivo com audio opcional que mistura ambiente do turno e chuva leve.' },
      { cor: 'rosa', ico: ICONES.sino(18), tit: 'Lembretes no celular e PC', txt: 'Instalavel na tela inicial sem app store, com notificacoes nativas em varios aparelhos.' }
    ];

    return `
      <div class="landing-wrap">
        <nav class="landing-nav">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${fav.arquivo}" width="36" height="36" alt="Marca Sol de 4 Ls" />
            <div>
              <div class="titulo-display" style="font-size:22px;font-weight:700;">Lume</div>
            </div>
          </div>
          <div class="landing-links">
            <a href="#sec-demo">Horizonte ao vivo</a>
            <a href="#sec-recursos">Recursos</a>
            <a href="#sec-comecar">Como funciona</a>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="btn pequeno suave landing-btn-sec" id="btn-landing-primeiro">Primeiro acesso</button>
            <button type="button" class="btn primaria" id="btn-landing-entrar">${ICONES.google()} Entrar com Google</button>
          </div>
        </nav>

        <section class="landing-hero">
          <div style="display:grid;gap:14px;">
            <span class="pilula menta" style="justify-self:start;">${ICONES.folha(14)} Organizador pessoal vivo e gratuito</span>
            <h1 class="titulo-display" style="font-size:clamp(30px,4.3vw,50px);font-weight:700;">
              ${renderChamadaPalavras()}
            </h1>
            <p style="margin:0;font-size:15.5px;line-height:1.55;color:var(--texto-sec);max-width:520px;">
              Um espaco de tarefas onde cada subtarefa concluida faz o jardim florescer de dia, acende constelacoes a noite e acompanha o ceu real da sua hora.
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:10px;padding-top:4px;">
              <button type="button" class="btn primaria" id="btn-hero-comecar" style="min-height:46px;padding:10px 22px;font-size:14px;">
                ${ICONES.google()} Comecar gratis com Google
              </button>
              <a href="#sec-demo" class="btn" style="text-decoration:none;min-height:46px;">Testar simulador abaixo</a>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:2px;">
              <span class="pilula">${ICONES.celular(13)} PC e celular</span>
              <span class="pilula">${ICONES.lua(13)} ${faseHoje.nome} (${faseHoje.iluminacao}%)</span>
              <span class="pilula">${ICONES.sino(13)} Avisos Push</span>
            </div>
          </div>

          <div class="vitrine-3d" id="vitrine-hero">
            <img src="../Identidade-visual/assets-3d/${noturno ? 'diorama-jardim-noite-3d.png' : 'diorama-jardim-dia-3d.png'}" id="vitrine-img" alt="Cenario Soft-3D do jardim Lume" />
            <div class="flutuante-clima">
              ${climaEf === 'chuvoso' || climaEf === 'tempestade' ? ICONES.chuva(15) : ICONES.clima(15)}
              <span>Brasilia · 24 C · ${climaEf.replace('_', ' ')}</span>
            </div>
            <div class="flutuante-progresso">
              <div style="width:42px;height:42px;border-radius:12px;background-image:url('../Identidade-visual/assets-3d/prancha-plantas-evolucao-3d.png');background-size:400% 200%;background-position:${plantaX} 0%;"></div>
              <div>
                <div style="font-size:12px;font-weight:700;">Projeto Web II</div>
                <div class="mono" style="font-size:11px;color:#526375;">${pctLanding}% concluido</div>
              </div>
              <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                ${renderAnelSvg(pctLanding, 38, 4)}
              </div>
            </div>
          </div>
        </section>

        <section id="sec-demo" class="bento" style="display:grid;gap:18px;">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;">
            <div>
              <span class="pilula ceu">Demonstracao interativa sem salvar no servidor</span>
              <h2 class="titulo-display" style="font-size:26px;margin-top:6px;">Sinta a passagem das <strong>24 horas</strong> e a planta crescendo</h2>
            </div>
            <span class="pilula mono" id="landing-hora-label">${formatarHora(estado.minuto)} · ${rotuloTurno(estado.minuto)}</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:16px;">
            <div class="card-limpo" style="display:grid;gap:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>Arco do Dia &amp; Clima ao vivo</strong>
                <span class="pilula amber">${fav.nome}</span>
              </div>
              <input id="landing-slider-hora" type="range" min="0" max="1439" value="${estado.minuto}" style="accent-color:var(--primaria);" />
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${[
                  { id: 'limpo', lbl: 'Limpo' },
                  { id: 'parcialmente_nublado', lbl: 'Parc. Nublado' },
                  { id: 'nublado', lbl: 'Nublado' },
                  { id: 'chuvoso', lbl: 'Chuva' },
                  { id: 'tempestade', lbl: 'Tempestade' }
                ].map(c => `
                  <button type="button" class="btn pequeno ${estado.climaSimulador === c.id ? 'primaria' : 'suave'}" data-clima-demo="${c.id}">${c.lbl}</button>
                `).join('')}
              </div>
            </div>

            <div class="card-limpo" style="display:grid;gap:10px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:62px;height:62px;border-radius:16px;background-image:url('../Identidade-visual/assets-3d/prancha-plantas-evolucao-3d.png');background-size:400% 200%;background-position:${plantaX} 0%;flex-shrink:0;border:1px solid var(--borda);"></div>
                <div>
                  <strong style="font-size:15px;">Marque etapas e veja florescer</strong>
                  <div class="mono" style="font-size:12px;color:var(--texto-sec);">${okCount} de 4 etapas concluidas (${pctLanding}%)</div>
                </div>
              </div>
              <div style="display:grid;gap:6px;">
                ${['Definir objetivo da semana', 'Dividir em subtarefas', 'Fazer 25 min no Modo Foco', 'Celebrar o ciclo concluido'].map((lbl, idx) => `
                  <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                    <input type="checkbox" ${estado.landingChecks[idx] ? 'checked' : ''} data-landing-chk="${idx}" style="width:16px;height:16px;accent-color:var(--primaria);" />
                    <span style="${estado.landingChecks[idx] ? 'text-decoration:line-through;opacity:0.65;' : ''}">${lbl}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
        </section>

        <section id="sec-recursos" style="display:grid;gap:14px;">
          <div style="text-align:center;max-width:600px;margin:0 auto;">
            <h2 class="titulo-display" style="font-size:28px;">Tudo que voce encontra ao <em>entrar no Lume</em></h2>
          </div>
          <div class="grade-recursos">
            ${recursos.map(r => `
              <article class="card-limpo" style="display:grid;gap:10px;">
                <span class="pilula ${r.cor}" style="justify-self:start;padding:7px 11px;">${r.ico}</span>
                <strong style="font-size:16px;">${r.tit}</strong>
                <p style="margin:0;font-size:13.5px;color:var(--texto-sec);line-height:1.48;">${r.txt}</p>
              </article>
            `).join('')}
          </div>
        </section>

        <section id="sec-comecar" class="hero-jornada" style="grid-template-columns:1fr;text-align:center;justify-items:center;min-height:170px;">
          <div style="position:relative;z-index:2;display:grid;gap:10px;justify-items:center;max-width:560px;">
            <h2 class="titulo-display" style="font-size:28px;">Pronto para organizar seu dia com calma e clareza?</h2>
            <p style="margin:0;font-size:14px;opacity:0.86;">Entre em segundos com sua conta Google, sem senhas extras e sem custo.</p>
            <button type="button" class="btn primaria" id="btn-cta-final" style="min-height:46px;padding:10px 24px;">
              ${ICONES.google()} Entrar agora no Lume
            </button>
          </div>
        </section>
      </div>
    `;
  }

  function ligarEventosLanding() {
    const irWorkspace = () => { estado.fluxo = 'workspace'; renderizar(); };
    const irPrimeiro = () => { estado.fluxo = 'primeiro_acesso'; estado.wizard.passo = 1; renderizar(); };
    document.getElementById('btn-landing-entrar').addEventListener('click', irWorkspace);
    document.getElementById('btn-hero-comecar').addEventListener('click', irWorkspace);
    document.getElementById('btn-cta-final').addEventListener('click', irWorkspace);
    document.getElementById('btn-landing-primeiro').addEventListener('click', irPrimeiro);

    const vit = document.getElementById('vitrine-hero');
    const vitImg = document.getElementById('vitrine-img');
    if (vit && vitImg) {
      vit.addEventListener('mousemove', e => {
        const r = vit.getBoundingClientRect();
        const dx = ((e.clientX - r.left) / r.width - 0.5) * 8;
        const dy = ((e.clientY - r.top) / r.height - 0.5) * 6;
        vitImg.style.transform = `scale(1.04) translate(${-dx}px, ${-dy}px)`;
      });
      vit.addEventListener('mouseleave', () => { vitImg.style.transform = 'scale(1)'; });
    }

    document.getElementById('landing-slider-hora').addEventListener('input', e => {
      estado.minuto = parseInt(e.target.value, 10);
      aplicarAtmosfera();
      const lbl = document.getElementById('landing-hora-label');
      if (lbl) lbl.textContent = `${formatarHora(estado.minuto)} · ${rotuloTurno(estado.minuto)}`;
      if (vitImg) {
        const ehNot = D.interpolacao24h(estado.minuto).noturna;
        const alvo = `../Identidade-visual/assets-3d/${ehNot ? 'diorama-jardim-noite-3d.png' : 'diorama-jardim-dia-3d.png'}`;
        if (!vitImg.src.endsWith(ehNot ? 'noite-3d.png' : 'dia-3d.png')) vitImg.src = alvo;
      }
    });
    document.querySelectorAll('[data-clima-demo]').forEach(b => b.addEventListener('click', () => {
      estado.climaSimulador = b.dataset.climaDemo;
      renderizar();
    }));
    document.querySelectorAll('[data-landing-chk]').forEach(chk => chk.addEventListener('change', () => {
      const idx = parseInt(chk.dataset.landingChk, 10);
      estado.landingChecks[idx] = chk.checked;
      if (chk.checked) celebrarParticulas(chk);
      setTimeout(() => renderizar(), 220);
    }));
  }

  // ===================== 2. PRIMEIRO ACESSO ACOLHEDOR (WIZARD 3 PASSOS) =====================
  function renderPrimeiroAcesso() {
    const w = estado.wizard;
    const avFiltrados = D.AVATARES.filter(a => a.g === w.grupoAvatar);

    return `
      <div class="wizard-wrap">
        <section class="bento" style="display:grid;gap:18px;">
          <div class="wizard-banner">
            <img src="../Identidade-visual/assets-3d/diorama-jardim-dia-3d.png" alt="Jardim de boas-vindas" />
          </div>

          <div class="wizard-steps">
            <div class="step-pill ${w.passo === 1 ? 'ativo' : ''}">1. Seu nome</div>
            <div class="step-pill ${w.passo === 2 ? 'ativo' : ''}">2. Seu avatar</div>
            <div class="step-pill ${w.passo === 3 ? 'ativo' : ''}">3. Seu inicio</div>
          </div>

          ${w.passo === 1 ? `
            <div style="display:grid;gap:12px;">
              <h1 class="titulo-display" style="font-size:28px;">Que bom ter voce aqui, <em id="wiz-nome-saudacao" style="color:var(--primaria);">${escaparHtml(w.nome || 'amigo')}</em>!</h1>
              <p style="margin:0;font-size:14px;color:var(--texto-sec);">
                Como voce gostaria de ser chamado dentro do seu Lume?
              </p>
              <input id="wiz-input-nome" class="campo" maxlength="60" placeholder="Seu nome de exibicao" value="${escaparHtml(w.nome)}" style="font-size:15px;padding:12px 16px;" />
              <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;">
                <button type="button" class="btn suave" id="wiz-sair-landing">Voltar</button>
                <button type="button" class="btn primaria" id="wiz-prox-1">Continuar</button>
              </div>
            </div>
          ` : ''}

          ${w.passo === 2 ? `
            <div style="display:grid;gap:14px;">
              <div style="display:flex;align-items:center;gap:14px;">
                ${renderAvatarHtml({ nome: w.nome, avatarTipo: w.avatarTipo, avatarId: w.avatarId, avatarUploadData: w.avatarUploadData }, 72)}
                <div>
                  <h2 class="titulo-display" style="font-size:23px;">Escolha sua marca pessoal</h2>
                  <div style="font-size:13px;color:var(--texto-sec);">Selecione um dos 16 personagens 3D ou use sua foto.</div>
                </div>
              </div>

              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${['Astros', 'Botanicos', 'Criaturas', 'Observatorio'].map(g => `
                  <button type="button" class="btn pequeno ${w.grupoAvatar === g && w.avatarTipo === 'preset' ? 'primaria' : 'suave'}" data-wiz-grupo="${g}">${g}</button>
                `).join('')}
                <button type="button" class="btn pequeno ${w.avatarTipo === 'google' ? 'primaria' : 'suave'}" id="wiz-btn-google">Foto Google</button>
                <label class="btn pequeno ${w.avatarTipo === 'upload' ? 'primaria' : 'suave'}" style="cursor:pointer;">
                  Enviar imagem
                  <input type="file" id="wiz-upload" accept="image/png,image/jpeg,image/webp" style="display:none;" />
                </label>
              </div>

              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
                ${avFiltrados.map(av => `
                  <button type="button" class="card-limpo" data-wiz-av="${av.id}" style="display:flex;align-items:center;gap:10px;padding:10px;cursor:pointer;${w.avatarTipo === 'preset' && w.avatarId === av.id ? 'border:2px solid var(--primaria);background:var(--pastel-menta);' : ''}">
                    <span class="avatar-sprite" style="width:44px;height:44px;background-position:${corAvatarCss(av.id)};"></span>
                    <span style="font-size:13px;font-weight:700;">${av.nome}</span>
                  </button>
                `).join('')}
              </div>

              <div style="display:flex;justify-content:space-between;padding-top:4px;">
                <button type="button" class="btn suave" id="wiz-voltar-2">Voltar</button>
                <button type="button" class="btn primaria" id="wiz-prox-2">Continuar</button>
              </div>
            </div>
          ` : ''}

          ${w.passo === 3 ? `
            <div style="display:grid;gap:14px;">
              <h2 class="titulo-display" style="font-size:24px;">Como prefere comecar hoje?</h2>

              <button type="button" class="card-limpo" id="wiz-opt-guia" style="display:flex;align-items:center;gap:14px;text-align:left;cursor:pointer;${w.criarGuia ? 'border:2px solid var(--primaria);background:var(--pastel-menta);' : ''}">
                <div class="planta-mini" style="background-position:33.33% 0%;"></div>
                <div style="flex:1;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <strong style="font-size:14.5px;">Comecar com 1 jornada-guia editavel</strong>
                    <span class="pilula menta">Recomendado</span>
                  </div>
                  <div style="font-size:12.5px;color:var(--texto-sec);margin-top:3px;">Ja traz um exemplo vivo de projeto em niveis para voce explorar e editar.</div>
                </div>
              </button>

              <button type="button" class="card-limpo" id="wiz-opt-vazio" style="display:flex;align-items:center;gap:14px;text-align:left;cursor:pointer;${!w.criarGuia ? 'border:2px solid var(--primaria);background:var(--pastel-ceu);' : ''}">
                <div class="planta-mini" style="background-position:0% 0%;"></div>
                <div>
                  <strong style="font-size:14.5px;">Comecar com o jardim livre</strong>
                  <div style="font-size:12.5px;color:var(--texto-sec);margin-top:3px;">Tela totalmente limpa para criar suas proprias tarefas do zero.</div>
                </div>
              </button>

              <div class="card-limpo" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <div>
                  <strong style="font-size:13.5px;">Mostrar cidade e temperatura no card inicial</strong>
                  <div style="font-size:12px;color:var(--texto-sec);">Opcional: voce pode ativar ou desativar depois no painel.</div>
                </div>
                <button type="button" class="switch-btn ${w.ativarClimaAgora ? 'ativo' : ''}" id="wiz-switch-clima" aria-label="Ativar clima local"></button>
              </div>

              <div style="display:flex;justify-content:space-between;padding-top:4px;">
                <button type="button" class="btn suave" id="wiz-voltar-3">Voltar</button>
                <button type="button" class="btn primaria" id="wiz-concluir">Abrir meu horizonte</button>
              </div>
            </div>
          ` : ''}
        </section>
      </div>
    `;
  }

  function ligarEventosPrimeiroAcesso() {
    const w = estado.wizard;
    if (w.passo === 1) {
      document.getElementById('wiz-input-nome').addEventListener('input', e => {
        w.nome = e.target.value;
        const s = document.getElementById('wiz-nome-saudacao');
        if (s) s.textContent = w.nome.trim() || 'amigo';
      });
      document.getElementById('wiz-sair-landing').addEventListener('click', () => { estado.fluxo = 'landing'; renderizar(); });
      document.getElementById('wiz-prox-1').addEventListener('click', () => {
        if (w.nome.trim().length < 2) { mostrarToast('Informe pelo menos 2 caracteres no nome.', false); return; }
        w.passo = 2;
        renderizar();
      });
    } else if (w.passo === 2) {
      document.querySelectorAll('[data-wiz-grupo]').forEach(b => b.addEventListener('click', () => {
        w.avatarTipo = 'preset';
        w.grupoAvatar = b.dataset.wizGrupo;
        renderizar();
      }));
      document.querySelectorAll('[data-wiz-av]').forEach(b => b.addEventListener('click', () => {
        w.avatarTipo = 'preset';
        w.avatarId = b.dataset.wizAv;
        renderizar();
      }));
      document.getElementById('wiz-btn-google').addEventListener('click', () => { w.avatarTipo = 'google'; renderizar(); });
      document.getElementById('wiz-upload').addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const rd = new FileReader();
        rd.onload = () => { w.avatarTipo = 'upload'; w.avatarUploadData = rd.result; renderizar(); };
        rd.readAsDataURL(f);
      });
      document.getElementById('wiz-voltar-2').addEventListener('click', () => { w.passo = 1; renderizar(); });
      document.getElementById('wiz-prox-2').addEventListener('click', () => { w.passo = 3; renderizar(); });
    } else {
      document.getElementById('wiz-opt-guia').addEventListener('click', () => { w.criarGuia = true; renderizar(); });
      document.getElementById('wiz-opt-vazio').addEventListener('click', () => { w.criarGuia = false; renderizar(); });
      document.getElementById('wiz-switch-clima').addEventListener('click', () => { w.ativarClimaAgora = !w.ativarClimaAgora; renderizar(); });
      document.getElementById('wiz-voltar-3').addEventListener('click', () => { w.passo = 2; renderizar(); });
      document.getElementById('wiz-concluir').addEventListener('click', () => {
        estado.usuario.nome = w.nome.trim();
        estado.usuario.avatarTipo = w.avatarTipo;
        estado.usuario.avatarId = w.avatarId;
        estado.usuario.avatarUploadData = w.avatarUploadData;
        estado.tarefas = w.criarGuia ? D.criarTarefasIniciais() : [];
        if (w.ativarClimaAgora) {
          const c = D.CIDADES_DEMO[0];
          estado.climaConsentido = { habilitado: true, cidade: c.cidade, uf: c.uf, temp: c.temp, estado: c.estado, desc: c.desc };
        }
        estado.fluxo = 'workspace';
        estado.visao = 'jornada';
        renderizar();
        mostrarToast('Bem-vindo ao seu espaco no Lume!', false);
      });
    }
  }

  // ===================== 3. WORKSPACE & ARVORE V2 =====================
  function renderEstadoEspecial() {
    if (estado.modoEstado === 'carregando') {
      return `
        <div style="display:grid;gap:14px;">
          <div class="skeleton" style="height:170px;width:100%;"></div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
            <div class="skeleton" style="height:64px;"></div><div class="skeleton" style="height:64px;"></div>
            <div class="skeleton" style="height:64px;"></div><div class="skeleton" style="height:64px;"></div>
          </div>
          <div class="skeleton" style="height:220px;width:100%;"></div>
        </div>
      `;
    }
    if (estado.modoEstado === 'erro') {
      return `
        <div class="card-limpo" style="display:grid;gap:12px;border-color:#DC2626;padding:24px;">
          <span class="pilula rosa" style="justify-self:start;">${ICONES.alerta(15)} Falha temporaria de sincronizacao</span>
          <h2 class="titulo-display" style="font-size:22px;">Nao foi possivel atualizar seus dados agora</h2>
          <p style="margin:0;font-size:13.5px;color:var(--texto-sec);">Verifique sua conexao ou tente novamente em instantes.</p>
          <div><button type="button" class="btn primaria" id="btn-recuperar-estado">Tentar novamente</button></div>
        </div>
      `;
    }
    return `
      <div class="card-limpo" style="text-align:center;padding:38px 20px;display:grid;gap:12px;justify-items:center;">
        <span class="pilula menta" style="padding:10px;">${ICONES.folha(22)}</span>
        <h2 class="titulo-display" style="font-size:24px;">Seu horizonte ainda esta vazio</h2>
        <p style="margin:0;font-size:14px;color:var(--texto-sec);max-width:420px;">Adicione sua primeira tarefa para acompanhar o jardim crescer e acender constelacoes.</p>
        <button type="button" class="btn primaria" id="btn-recuperar-estado">Voltar ao exemplo com dados</button>
      </div>
    `;
  }

  function renderPassoNaTrilha(no, nivel) {
    const temFilhos = no.subtarefas && no.subtarefas.length > 0;
    const expandida = !!estado.expandidas[no.id];
    const marcado = no.status === 'concluida';
    const corPonto = { baixa: 'var(--prio-baixa)', media: 'var(--prio-media)', alta: 'var(--prio-alta)', urgente: 'var(--prio-urgente)' }[no.prioridade] || 'var(--primaria)';
    const corPill = { baixa: 'menta', media: 'ceu', alta: 'amber', urgente: 'rosa' }[no.prioridade] || '';
    const prog = temFilhos ? D.calcularProgressoFolhas(no) : null;

    return `
      <div class="passo-bloco">
        <div class="passo-linha">
          <div class="passo-esq">
            ${temFilhos ? `
              <button type="button" class="btn pequeno suave" style="min-height:24px;padding:2px 7px;border-radius:8px;" data-expandir="${no.id}" aria-label="Expandir">
                ${expandida ? '▾' : '▸'}
              </button>
            ` : `<span style="width:8px;height:8px;border-radius:999px;background:${corPonto};flex-shrink:0;margin:0 4px;"></span>`}

            <button type="button" class="chk-tatil ${marcado ? 'marcado' : ''}" data-concluir="${no.id}" aria-label="Marcar tarefa">
              ${marcado ? ICONES.check(13) : ''}
            </button>

            <div style="min-width:0;flex:1;">
              <div class="passo-titulo ${marcado ? 'concluido' : ''}">
                ${escaparHtml(no.titulo)}
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:3px;">
                <span class="pilula ${corPill}" style="padding:2px 7px;font-size:10.5px;">${no.prioridade}</span>
                <span class="pilula mono" style="padding:2px 7px;font-size:10.5px;">Nv ${nivel}</span>
                ${prog ? `<span class="pilula mono" style="padding:2px 7px;font-size:10.5px;">${prog.percentual}%</span>` : ''}
                ${no.prazo ? `<span class="pilula mono" style="padding:2px 7px;font-size:10.5px;">${no.prazo}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="passo-acoes">
            ${temFilhos && nivel >= 2 ? `<button type="button" class="btn pequeno suave quad" title="Focar neste ramo" data-mergulhar="${no.id}">${ICONES.mergulho(13)}</button>` : ''}
            ${nivel < 5 ? `<button type="button" class="btn pequeno suave quad" title="Adicionar subetapa" data-add-sub="${no.id}">${ICONES.mais(13)}</button>` : ''}
            <button type="button" class="btn pequeno suave quad" title="Abrir notas e lembretes" data-abrir-gaveta="${no.id}">${ICONES.nota(13)}</button>
            <button type="button" class="btn pequeno suave quad" title="Excluir" data-excluir-tarefa="${no.id}">${ICONES.lixeira(13)}</button>
          </div>
        </div>
        ${temFilhos && expandida ? `<div class="trilha-indent">${no.subtarefas.map(f => renderPassoNaTrilha(f, nivel + 1)).join('')}</div>` : ''}
      </div>
    `;
  }

  function renderCartaoProjeto(raiz) {
    const prog = D.calcularProgressoFolhas(raiz);
    const estagio = prog.percentual >= 99 ? 3 : (prog.percentual >= 60 ? 2 : (prog.percentual >= 25 ? 1 : 0));
    const plantaX = (estagio * 33.333).toFixed(2) + '%';
    const temFilhos = raiz.subtarefas && raiz.subtarefas.length > 0;
    const filhaUrg = D.temFilhaUrgenteAberta(raiz);
    const marcado = raiz.status === 'concluida';
    const temaClasse = `tema-${raiz.turno || 'livre'}`;

    return `
      <article class="projeto-card ${temaClasse}">
        <div class="projeto-cabecalho">
          <div class="projeto-info-topo">
            <div class="planta-mini" style="background-position:${plantaX} 0%;"></div>
            <div style="min-width:0;flex:1;">
              <div style="display:flex;align-items:center;gap:8px;">
                <button type="button" class="chk-tatil ${marcado ? 'marcado' : ''}" data-concluir="${raiz.id}" aria-label="Concluir projeto">${marcado ? ICONES.check(13) : ''}</button>
                <strong style="font-size:16px;${marcado ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escaparHtml(raiz.titulo)}</strong>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                <span class="pilula" style="background:rgba(255,255,255,0.72);color:#162230;">${raiz.turno}</span>
                <span class="pilula mono" style="background:rgba(255,255,255,0.72);color:#162230;">${prog.folhasConcluidas}/${prog.totalFolhas} etapas</span>
                ${filhaUrg ? `<span class="pilula rosa">${ICONES.alerta(12)} Filha urgente</span>` : ''}
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;">
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              ${renderAnelSvg(prog.percentual, 44, 4.5)}
              <span class="mono" style="position:absolute;font-size:10.5px;font-weight:700;">${prog.percentual}%</span>
            </div>
            <button type="button" class="btn pequeno quad" title="Nova subetapa" data-add-sub="${raiz.id}">${ICONES.mais(14)}</button>
            <button type="button" class="btn pequeno quad" title="Notas e lembretes" data-abrir-gaveta="${raiz.id}">${ICONES.nota(14)}</button>
            <button type="button" class="btn pequeno quad" title="Excluir" data-excluir-tarefa="${raiz.id}">${ICONES.lixeira(14)}</button>
          </div>
        </div>

        ${temFilhos ? `
          <div class="projeto-miolo">
            ${raiz.subtarefas.map(f => renderPassoNaTrilha(f, 2)).join('')}
          </div>
        ` : ''}
      </article>
    `;
  }

  function renderColunaDireitaJornada() {
    if (estado.gavetaAberta) return renderGaveta();

    const planas = listarTodasPlanas(estado.tarefas);
    const folhas = planas.filter(x => !x.no.subtarefas || !x.no.subtarefas.length);
    const okFolhas = folhas.filter(x => x.no.status === 'concluida').length;
    const pctDia = folhas.length ? Math.round((okFolhas / folhas.length) * 100) : 0;
    const faseHoje = D.obterFaseLunarHemisferioSul(new Date());

    return `
      <aside style="display:grid;gap:16px;">
        <div class="card-limpo" style="display:grid;gap:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:15px;">Meta de Hoje</strong>
            <span class="pilula menta">${okFolhas}/${folhas.length} etapas</span>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${renderAnelSvg(pctDia, 78, 8)}
              <span class="mono" style="position:absolute;font-size:16px;font-weight:700;">${pctDia}%</span>
            </div>
            <div style="font-size:13px;color:var(--texto-sec);line-height:1.45;">
              <strong>Otimo ritmo!</strong><br/>Cada etapa concluida acende uma estrela do seu ciclo.
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center;">
            {['S','T','Q','Q','S','S','D']}
          </div>
        </div>

        <div class="card-limpo" style="background:var(--primaria);color:var(--primaria-txt);border-color:transparent;display:grid;gap:10px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:11.5px;font-weight:700;opacity:0.85;text-transform:uppercase;">Proximo Foco</span>
            ${ICONES.foco(17)}
          </div>
          <strong style="font-size:17px;">Projeto Web II - Lume</strong>
          <div style="font-size:12.5px;opacity:0.88;">Sessao sugerida de 25 min para fechar os testes de dominio.</div>
          <button type="button" class="btn" style="background:#FFFFFF;color:#162230;border:none;" id="btn-atalho-foco">Iniciar Modo Foco</button>
        </div>

        <div class="card-limpo" style="display:grid;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            ${D.renderizarLuaSvg(faseHoje, 36)}
            <div>
              <strong style="font-size:14px;">${faseHoje.nome}</strong>
              <div style="font-size:12px;color:var(--texto-sec);">${faseHoje.iluminacao}% iluminada (Hemisferio Sul)</div>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${[{ m: 570, l: 'Manha' }, { m: 900, l: 'Tarde' }, { m: 1065, l: 'Entardecer' }, { m: 1290, l: 'Noite' }].map(p => `
              <button type="button" class="btn pequeno suave" data-preset-min="${p.m}">${p.l}</button>
            `).join('')}
          </div>
        </div>
      </aside>
    `.replace('{[\'S\',\'T\',\'Q\',\'Q\',\'S\',\'S\',\'D\']}', ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, idx) => `
      <div>
        <div style="width:24px;height:24px;margin:0 auto 3px;border-radius:999px;display:flex;align-items:center;justify-content:center;${idx < 4 ? 'background:var(--primaria);color:var(--primaria-txt);' : 'background:var(--sup-alt);color:var(--texto-sec);'}">${idx < 4 ? ICONES.check(12) : ''}</div>
        <span class="mono" style="font-size:10.5px;color:var(--texto-sec);">${d}</span>
      </div>
    `).join(''));
  }

  function renderJornada() {
    const noturno = D.interpolacao24h(estado.minuto).noturna;
    const clima = estado.climaConsentido;
    const climaEf = obterEstadoClimaticoEfetivo();
    const faseHoje = D.obterFaseLunarHemisferioSul(new Date());

    // Contagem por turno nas raizes
    const contTurno = { manha: 0, tarde: 0, noite: 0, livre: 0 };
    estado.tarefas.forEach(t => { if (contTurno[t.turno] !== undefined) contTurno[t.turno]++; });

    // Se o usuario clicou em "Mergulhar" em algum sub-ramo, exibe aquele ramo como foco limpo
    let listaExibida = estado.tarefas;
    let migalha = null;
    if (estado.ramoFocoId) {
      const ach = encontrarNo(estado.tarefas, estado.ramoFocoId);
      if (ach) {
        listaExibida = [ach.no];
        migalha = ach.caminho;
      } else {
        estado.ramoFocoId = null;
      }
    }

    const filtradas = listaExibida.filter(t => {
      if (!estado.ramoFocoId && estado.filtroTurno !== 'todos' && t.turno !== estado.filtroTurno) return false;
      if (estado.busca.trim() && !JSON.stringify(t).toLowerCase().includes(estado.busca.trim().toLowerCase())) return false;
      return true;
    });

    const primeiroNome = (estado.usuario.nome || 'Athos').split(' ')[0];

    return `
      <div style="display:grid;gap:18px;">
        <section class="hero-jornada">
          <img class="hero-jornada-bg" src="../Identidade-visual/assets-3d/${noturno ? 'diorama-jardim-noite-3d.png' : 'diorama-jardim-dia-3d.png'}" alt="" />
          <div style="position:relative;z-index:2;display:grid;gap:10px;justify-items:start;">
            <span class="pilula" style="background:rgba(255,255,255,0.75);color:#162230;">${rotuloTurno(estado.minuto)} · ${formatarHora(estado.minuto)}</span>
            <h1 class="titulo-display" style="font-size:clamp(24px,3vw,34px);font-weight:700;">
              ${saudacaoPorHora(estado.minuto)}, <em style="color:var(--primaria);">${escaparHtml(primeiroNome)}!</em>
            </h1>
            <p style="margin:0;font-size:13.5px;opacity:0.86;max-width:410px;">
              Pronto para iluminar mais uma etapa da sua jornada hoje?
            </p>
            <button type="button" class="btn primaria" id="btn-hero-nova-tarefa">${ICONES.mais(16)} Nova tarefa</button>
          </div>

          <div class="minicard-clima-hero">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                ${climaEf === 'chuvoso' || climaEf === 'tempestade' ? ICONES.chuva(20) : (noturno ? D.renderizarLuaSvg(faseHoje, 24) : ICONES.clima(20))}
                <span class="mono" style="font-size:12px;font-weight:700;">${formatarHora(estado.minuto)}</span>
              </div>
              <button type="button" class="btn pequeno suave" id="btn-abrir-modal-clima">${clima.habilitado ? 'Alterar' : 'Ativar clima'}</button>
            </div>
            ${clima.habilitado ? `
              <div>
                <div class="mono" style="font-size:22px;font-weight:700;line-height:1.1;">${clima.temp} C</div>
                <div style="font-size:12px;opacity:0.82;">${escaparHtml(clima.cidade)}, ${escaparHtml(clima.uf)} · ${escaparHtml(clima.desc)}</div>
              </div>
            ` : `
              <div style="font-size:12px;opacity:0.8;">Ative opcionalmente para ver cidade e temperatura aqui.</div>
            `}
          </div>
        </section>

        <div class="grade-turnos">
          ${[
            { id: 'manha', nome: 'Manha', cls: 't-manha', ico: ICONES.jornada(16) },
            { id: 'tarde', nome: 'Tarde', cls: 't-tarde', ico: ICONES.tarde(16) },
            { id: 'noite', nome: 'Noite', cls: 't-noite', ico: ICONES.lua(16) },
            { id: 'livre', nome: 'Livre', cls: 't-livre', ico: ICONES.folha(16) }
          ].map(tr => `
            <button type="button" class="card-turno ${tr.cls} ${estado.filtroTurno === tr.id ? 'ativo' : ''}" data-filtro-turno="${estado.filtroTurno === tr.id ? 'todos' : tr.id}">
              <span class="turno-circulo">${tr.ico}</span>
              <div>
                <div style="font-size:13.5px;font-weight:700;">${tr.nome}</div>
                <div class="mono" style="font-size:11px;opacity:0.85;">${contTurno[tr.id]} projeto(s)</div>
              </div>
            </button>
          `).join('')}
        </div>

        <div class="grade-ws">
          <div style="display:grid;gap:14px;">
            ${migalha ? `
              <div class="migalha-ramo">
                <button type="button" class="btn pequeno suave" id="btn-sair-mergulho">${ICONES.setaEsq(13)} Todas</button>
                ${migalha.map(c => `<span>/</span> <button type="button" class="btn pequeno suave" data-mergulhar="${c.id}">${escaparHtml(c.titulo.slice(0, 20))}</button>`).join('')}
              </div>
            ` : ''}

            ${filtradas.length ? filtradas.map(t => renderCartaoProjeto(t)).join('') : '<div class="card-limpo">Nenhuma tarefa encontrada nesse turno ou busca.</div>'}
          </div>

          ${renderColunaDireitaJornada()}
        </div>
      </div>
    `;
  }

  function renderGaveta() {
    const achado = encontrarNo(estado.tarefas, estado.tarefaSelecionadaId);
    if (!achado) return '';
    const t = achado.no;
    const prog = D.calcularProgressoFolhas(t);
    const notas = t.notas || [];

    return `
      <aside class="card-limpo" style="display:grid;gap:14px;position:sticky;top:18px;" aria-label="Notas e Lembretes da tarefa">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div>
            <span class="pilula ceu">Notas &amp; Lembretes</span>
            <h3 class="titulo-display" style="font-size:20px;margin-top:6px;">${escaparHtml(t.titulo)}</h3>
          </div>
          <button type="button" class="btn pequeno suave" id="btn-fechar-gaveta">Fechar</button>
        </div>

        <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:var(--sup-alt);">
          ${renderAnelSvg(prog.percentual, 40, 4)}
          <div class="mono" style="font-size:12px;"><strong>${prog.percentual}%</strong> (${prog.folhasConcluidas}/${prog.totalFolhas} etapas finais)</div>
        </div>

        <div style="display:grid;gap:8px;">
          ${notas.length ? notas.map((b, bi) => {
            if (b.tipo === 'subtitulo') return `<div style="font-family:var(--fonte-display);font-weight:700;font-size:15px;">${escaparHtml(b.texto)}</div>`;
            if (b.tipo === 'paragrafo') return `<div style="font-size:13px;line-height:1.48;">${formatarRichText(b.texto)}</div>`;
            if (b.tipo === 'lista') return `<ul style="margin:0;padding-left:18px;font-size:13px;">${b.itens.map(i => `<li>${escaparHtml(i)}</li>`).join('')}</ul>`;
            if (b.tipo === 'checklist') return `<div style="display:grid;gap:5px;">${b.itens.map((it, ii) => `<label style="display:flex;gap:8px;font-size:13px;cursor:pointer;"><input type="checkbox" ${it.ok ? 'checked' : ''} data-chk-nota="${bi}:${ii}" style="accent-color:var(--primaria);" /><span style="${it.ok ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escaparHtml(it.texto)}</span></label>`).join('')}</div>`;
            if (b.tipo === 'citacao') return `<blockquote style="margin:0;padding:10px 12px;border-left:3px solid var(--primaria);background:var(--sup-alt);border-radius:10px;font-style:italic;font-size:12.5px;">${escaparHtml(b.texto)}</blockquote>`;
            if (b.tipo === 'codigo_ou_link') return `<div class="mono" style="padding:8px 10px;border-radius:10px;background:var(--sup-alt);font-size:11.5px;word-break:break-all;">Link: ${escaparHtml(b.rotulo || '')} (${escaparHtml(b.conteudo)})</div>`;
            return '';
          }).join('') : '<div style="font-size:13px;color:var(--texto-sec);">Sem blocos de nota ainda.</div>'}
        </div>

        <div style="display:grid;gap:8px;padding-top:6px;border-top:1px solid var(--borda);">
          <strong style="font-size:12.5px;">Lembretes no celular e PC (max 3)</strong>
          ${(t.lembretes || []).map(l => `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;background:var(--sup-alt);padding:7px 10px;border-radius:10px;">
              <span style="display:flex;align-items:center;gap:6px;">${ICONES.sino(13)} ${escaparHtml(l.rotulo)}</span>
              <button type="button" class="btn pequeno" style="min-height:24px;padding:2px 8px;" data-rm-lembrete="${l.id}">✕</button>
            </div>
          `).join('')}
          <div style="display:flex;gap:6px;align-items:center;">
            <select id="sel-novo-lembrete" class="campo" style="padding:7px 10px;font-size:12px;min-width:0;flex:1;">
              <option value="15 min antes">15 min antes</option>
              <option value="Na hora">Na hora</option>
              <option value="1h antes">1h antes</option>
            </select>
            <button type="button" class="btn pequeno primaria" id="btn-add-lembrete" style="white-space:nowrap;flex-shrink:0;">+ Lembrete</button>
          </div>
        </div>

        <div style="display:flex;gap:8px;">
          <button type="button" class="btn pequeno suave" style="flex:1;" id="btn-exportar-md">Exportar .md</button>
          <button type="button" class="btn pequeno suave" style="flex:1;" id="btn-exportar-json">Exportar .json</button>
        </div>
      </aside>
    `;
  }

  function garantirPosicoesMapa(raiz) {
    const fila = [{ no: raiz, nivel: 0 }];
    const nos = [];
    const arestas = [];
    const contPorNivel = {};
    while (fila.length) {
      const atual = fila.shift();
      const id = atual.no.id;
      contPorNivel[atual.nivel] = contPorNivel[atual.nivel] || 0;
      const ord = contPorNivel[atual.nivel]++;
      if (!estado.mapaPosicoes[id]) estado.mapaPosicoes[id] = { x: 28 + atual.nivel * 210, y: 28 + ord * 102 };
      nos.push(atual.no);
      (atual.no.subtarefas || []).forEach(f => { arestas.push({ de: id, para: f.id }); fila.push({ no: f, nivel: atual.nivel + 1 }); });
    }
    return { nos, arestas };
  }

  function renderMapa() {
    const raiz = estado.tarefas[0];
    if (!raiz) return '<div class="card-limpo">Crie uma tarefa raiz na Jornada para abrir o Mapa Visual.</div>';
    const noturno = D.interpolacao24h(estado.minuto).noturna;
    const { nos, arestas } = garantirPosicoesMapa(raiz);
    const corAresta = noturno ? '#F5D076' : '#256B4E';

    return `
      <div class="grade-ws" style="${estado.gavetaAberta ? '' : 'grid-template-columns:1fr;'}">
        <section class="bento" style="display:grid;gap:14px;">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;">
            <div>
              <h2 class="titulo-display" style="font-size:24px;">Mapa ${noturno ? '<em>Constelacao Estelar</em>' : '<em>Ramos Botanicos</em>'}</h2>
              <div style="font-size:13px;color:var(--texto-sec);">Arraste livremente os cartoes ou toque para editar notas na lateral.</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <button type="button" class="btn pequeno suave" id="mapa-zoom-out">-</button>
              <span class="pilula mono">${Math.round(estado.mapaZoom * 100)}%</span>
              <button type="button" class="btn pequeno suave" id="mapa-zoom-in">+</button>
              <button type="button" class="btn pequeno primaria" id="mapa-reorg">Reorganizar</button>
            </div>
          </div>

          <div class="canvas-mapa" id="canvas-mapa">
            <div style="position:relative;width:100%;height:100%;transform:scale(${estado.mapaZoom});transform-origin:top left;">
              <svg width="100%" height="100%" style="position:absolute;inset:0;pointer-events:none;">
                ${arestas.map(a => {
                  const p1 = estado.mapaPosicoes[a.de];
                  const p2 = estado.mapaPosicoes[a.para];
                  const x1 = p1.x + 184;
                  const y1 = p1.y + 32;
                  const x2 = p2.x;
                  const y2 = p2.y + 32;
                  const cx = (x1 + x2) / 2;
                  return `<path d="M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}" fill="none" stroke="${corAresta}" stroke-width="2.5" stroke-dasharray="${noturno ? '6 4' : ''}" opacity="0.82" />`;
                }).join('')}
              </svg>
              ${nos.map(n => {
                const p = estado.mapaPosicoes[n.id];
                const pr = D.calcularProgressoFolhas(n);
                return `
                  <div class="no-mapa ${estado.tarefaSelecionadaId === n.id ? 'selecionado' : ''}" data-mapa-no="${n.id}" style="left:${p.x}px;top:${p.y}px;">
                    <div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escaparHtml(n.titulo)}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px;">
                      <span class="pilula ${n.status === 'concluida' ? 'menta' : 'amber'}" style="padding:2px 7px;font-size:10px;">${n.status}</span>
                      <span class="mono" style="font-size:11px;font-weight:700;">${pr.percentual}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </section>
        ${estado.gavetaAberta ? renderGaveta() : ''}
      </div>
    `;
  }

  function renderFoco() {
    const planas = listarTodasPlanas(estado.tarefas);
    const ach = encontrarNo(estado.tarefas, estado.focoTarefaId) || (planas[0] ? { no: planas[0].no } : null);
    const tarefa = ach ? ach.no : null;
    const min = String(Math.floor(estado.focoRestanteSeg / 60)).padStart(2, '0');
    const seg = String(estado.focoRestanteSeg % 60).padStart(2, '0');
    const pctTimer = Math.round(((estado.focoTotalSeg - estado.focoRestanteSeg) / estado.focoTotalSeg) * 100);
    const noturno = D.interpolacao24h(estado.minuto).noturna;
    const faseHoje = D.obterFaseLunarHemisferioSul(new Date());

    return `
      <section class="bento" style="display:grid;gap:20px;text-align:center;justify-items:center;padding:34px 20px;">
        <span class="pilula lavanda">${noturno ? ICONES.lua(14) : ICONES.jornada(14)} Modo Foco Imersivo</span>
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          ${renderAnelSvg(pctTimer, 190, 10)}
          <div style="position:absolute;display:grid;justify-items:center;gap:4px;">
            ${noturno ? D.renderizarLuaSvg(faseHoje, 34) : '<div class="sol-3d" style="width:32px;height:32px;"></div>'}
            <div class="mono" style="font-size:44px;font-weight:700;letter-spacing:-0.03em;">${min}:${seg}</div>
          </div>
        </div>
        <div style="font-family:var(--fonte-display);font-style:italic;font-size:17px;color:var(--texto-sec);max-width:460px;">
          "Foque em um pequeno passo; todo o horizonte acompanha o seu progresso."
        </div>
        <select id="sel-foco-tarefa" class="campo" style="max-width:420px;">
          ${planas.map(p => `<option value="${p.no.id}" ${tarefa && p.no.id === tarefa.id ? 'selected' : ''}>${escaparHtml(p.no.titulo)}</option>`).join('')}
        </select>
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
          ${[25, 45, 50].map(m => `<button type="button" class="btn pequeno ${estado.focoTotalSeg === m * 60 ? 'primaria' : 'suave'}" data-foco-preset="${m}">${m} min</button>`).join('')}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
          <button type="button" class="btn primaria" id="btn-foco-toggle">${estado.focoRodando ? 'Pausar foco' : 'Iniciar sessao'}</button>
          <button type="button" class="btn suave" id="btn-foco-concluir">Concluir e salvar no Diario</button>
        </div>
      </section>
    `;
  }

  function renderCalendario() {
    const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const primeiroDia = new Date(estado.calAno, estado.calMes, 1).getDay();
    const totalDias = new Date(estado.calAno, estado.calMes + 1, 0).getDate();
    const planas = listarTodasPlanas(estado.tarefas).map(x => x.no);
    const mesPad = String(estado.calMes + 1).padStart(2, '0');

    const celulas = [];
    for (let v = 0; v < primeiroDia; v++) celulas.push('<div></div>');
    for (let d = 1; d <= totalDias; d++) {
      const dStr = String(d).padStart(2, '0');
      const dataIso = `${estado.calAno}-${mesPad}-${dStr}`;
      const fase = D.obterFaseLunarHemisferioSul(new Date(estado.calAno, estado.calMes, d, 21, 0, 0));
      const doDia = planas.filter(t => t.prazo === dataIso);
      celulas.push(`
        <button type="button" class="dia-celula ${estado.calDiaSelecionado === dStr ? 'selecionado' : ''}" data-cal-dia="${dStr}">
          <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
            <span class="mono" style="font-size:12px;font-weight:700;">${d}</span>
            ${D.renderizarLuaSvg(fase, 17)}
          </div>
          <div style="font-size:10.5px;color:var(--texto-sec);width:100%;">
            ${doDia.length ? `<span class="pilula amber" style="padding:1px 6px;font-size:10px;">${doDia.length} prazo</span>` : '&nbsp;'}
          </div>
        </button>
      `);
    }

    const dataSel = `${estado.calAno}-${mesPad}-${estado.calDiaSelecionado}`;
    const faseSel = D.obterFaseLunarHemisferioSul(new Date(estado.calAno, estado.calMes, Number(estado.calDiaSelecionado), 21, 0, 0));
    const tarefasSel = planas.filter(t => t.prazo === dataSel);

    return `
      <section class="bento" style="display:grid;gap:16px;">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;">
          <h2 class="titulo-display" style="font-size:25px;">Calendario de <em>Prazos</em> &amp; Fases Lunares</h2>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="btn pequeno suave" id="cal-ant">${ICONES.setaEsq(14)}</button>
            <span class="pilula" style="background:#162230;color:#FFFFFF;padding:6px 14px;">${meses[estado.calMes]} ${estado.calAno}</span>
            <button type="button" class="btn pequeno suave" id="cal-prox">${ICONES.mergulho(14)}</button>
          </div>
        </div>

        <div class="grade-calendario">
          ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(s => `<div class="mono" style="text-align:center;font-size:11px;font-weight:700;color:var(--texto-sec);">${s}</div>`).join('')}
          ${celulas.join('')}
        </div>

        <div class="card-limpo" style="display:grid;gap:10px;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${D.renderizarLuaSvg(faseSel, 34)}
            <div>
              <strong>${dataSel}</strong>
              <div style="font-size:12.5px;color:var(--texto-sec);">Hemisferio Sul: ${faseSel.nome} (${faseSel.iluminacao}% iluminada)</div>
            </div>
          </div>
          ${tarefasSel.length ? tarefasSel.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:12px;background:var(--sup-alt);">
              <strong style="font-size:13px;">${escaparHtml(t.titulo)}</strong>
              <span class="pilula amber">${t.prioridade}</span>
            </div>
          `).join('') : '<div style="font-size:13px;color:var(--texto-sec);">Nenhuma tarefa com prazo marcado neste dia.</div>'}
        </div>
      </section>
    `;
  }

  function renderDiario() {
    const planas = listarTodasPlanas(estado.tarefas).map(x => x.no);
    const concluidas = planas.filter(t => t.status === 'concluida').length;
    return `
      <section class="bento" style="display:grid;gap:16px;">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;">
          <h2 class="titulo-display" style="font-size:25px;">Estatisticas &amp; <em>Diario do Ciclo</em></h2>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn pequeno suave" id="btn-exportar-diario-md">Exportar .md</button>
            <button type="button" class="btn pequeno suave" id="btn-exportar-diario-json">Exportar .json</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;">
          <div class="card-limpo"><span class="pilula menta">Etapas concluidas</span><div class="mono" style="font-size:28px;font-weight:700;margin-top:8px;">${concluidas}</div></div>
          <div class="card-limpo"><span class="pilula amber">Em andamento</span><div class="mono" style="font-size:28px;font-weight:700;margin-top:8px;">${planas.length - concluidas}</div></div>
          <div class="card-limpo"><span class="pilula lavanda">Eventos no Diario</span><div class="mono" style="font-size:28px;font-weight:700;margin-top:8px;">${estado.diario.length}</div></div>
        </div>
        <div style="display:grid;gap:8px;">
          ${estado.diario.map(ev => `
            <div class="card-limpo" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 16px;">
              <div><strong>${escaparHtml(ev.tipo)}:</strong> ${escaparHtml(ev.texto)}</div>
              <span class="mono" style="font-size:12px;color:var(--texto-sec);">${escaparHtml(ev.hora)}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderPerfil() {
    const u = estado.usuario;
    return `
      <section class="bento" style="display:grid;gap:16px;">
        <h2 class="titulo-display" style="font-size:25px;">Perfil, Privacidade &amp; <em>Notificacoes</em></h2>

        <div class="card-limpo" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:14px;">
            ${renderAvatarHtml(u, 56)}
            <div>
              <strong style="font-size:16px;">${escaparHtml(u.nome)}</strong>
              <div style="font-size:12.5px;color:var(--texto-sec);">${escaparHtml(u.email)} · Conta Google</div>
            </div>
          </div>
          <button type="button" class="btn pequeno suave" id="btn-sair-todos">Sair de todos os aparelhos</button>
        </div>

        <div class="card-limpo" style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
          <div>
            <strong>Clima e cidade local no painel</strong>
            <div style="font-size:12.5px;color:var(--texto-sec);">${estado.climaConsentido.habilitado ? `${estado.climaConsentido.cidade}, ${estado.climaConsentido.uf} (${estado.climaConsentido.temp} C)` : 'Desativado ate voce autorizar'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button type="button" class="btn pequeno suave" id="btn-perfil-clima">Configurar</button>
            <button type="button" class="switch-btn ${estado.climaConsentido.habilitado ? 'ativo' : ''}" id="sw-perfil-clima" aria-label="Alternar clima"></button>
          </div>
        </div>

        <div class="card-limpo" style="display:grid;gap:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <strong>Lembretes no celular e computador (PWA)</strong>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn pequeno primaria" id="btn-ativar-este-disp">+ Ativar neste dispositivo</button>
              <button type="button" class="btn pequeno suave" id="btn-testar-push">Simular aviso</button>
            </div>
          </div>
          ${estado.pushDispositivos.map(d => `
            <div style="display:flex;justify-content:space-between;align-items:center;background:var(--sup-alt);padding:10px 12px;border-radius:12px;font-size:13px;">
              <span style="display:flex;align-items:center;gap:8px;">${ICONES.celular(15)} ${escaparHtml(d.rotulo)}</span>
              <button type="button" class="btn pequeno" data-rm-disp="${d.id}">Revogar</button>
            </div>
          `).join('')}
          <div style="padding:12px;border-radius:14px;background:var(--pastel-ceu);color:var(--pastel-ceu-txt);font-size:12.5px;">
            <strong>No iPhone / iPad (iOS 16.4+):</strong> 1) Toque em <strong>Compartilhar</strong> &rarr; <strong>Adicionar a Tela de Inicio</strong>; 2) Abra pelo icone instalado e toque em <strong>Ativar neste dispositivo</strong>.
          </div>
        </div>

        <div class="card-limpo" style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
          <div>
            <strong>Sons sutis e ambiente de chuva</strong>
            <div style="font-size:12.5px;color:var(--texto-sec);">Inicia silenciado por padrao; toca chuva suave quando chove no cenario.</div>
          </div>
          <button type="button" class="switch-btn ${estado.audio.habilitado ? 'ativo' : ''}" id="sw-audio" aria-label="Alternar audio"></button>
        </div>

        <div class="card-limpo" style="border-color:rgba(220,38,38,0.3);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div>
            <strong style="color:#DC2626;">Excluir minha conta em definitivo</strong>
            <div style="font-size:12.5px;color:var(--texto-sec);">Remove dados, tarefas, notas, preferencias e dispositivos conectados.</div>
          </div>
          <button type="button" class="btn perigo" id="btn-abrir-excluir-conta">Excluir conta</button>
        </div>
      </section>
    `;
  }

  function renderWorkspace() {
    const fav = D.obterFaseFavicon(estado.minuto);
    const faseHoje = D.obterFaseLunarHemisferioSul(new Date());
    const climaEf = obterEstadoClimaticoEfetivo();

    let miolo = '';
    if (estado.modoEstado !== 'normal') miolo = renderEstadoEspecial();
    else if (estado.visao === 'jornada') miolo = renderJornada();
    else if (estado.visao === 'mapa') miolo = renderMapa();
    else if (estado.visao === 'foco') miolo = renderFoco();
    else if (estado.visao === 'calendario') miolo = renderCalendario();
    else if (estado.visao === 'diario') miolo = renderDiario();
    else miolo = renderPerfil();

    const planas = listarTodasPlanas(estado.tarefas);
    const conc = planas.filter(x => x.no.status === 'concluida').length;

    return `
      <div class="shell-app">
        <aside class="sidebar bento" aria-label="Menu lateral">
          <div class="marca-topo-side" style="display:flex;align-items:center;gap:10px;padding:0 4px;">
            <img src="${fav.arquivo}" width="34" height="34" alt="Sol de 4 Ls" />
            <div class="marca-texto-side">
              <div class="titulo-display" style="font-size:23px;font-weight:700;line-height:1;">Lume</div>
              <div class="marca-sub" style="font-size:11px;color:var(--texto-sec);">Horizonte Vivo</div>
            </div>
          </div>

          <nav class="nav-lista">
            ${NAV_ITENS.map(n => `
              <button type="button" class="nav-item ${estado.visao === n.id ? 'ativo' : ''}" data-nav="${n.id}">
                ${n.ico(18)}
                <span class="nav-texto">${n.nome}</span>
              </button>
            `).join('')}
          </nav>

          <div class="card-limpo card-ciclo-side" style="background:var(--pastel-amber);color:var(--pastel-amber-txt);">
            <strong style="font-size:12.5px;">Ciclo de hoje</strong>
            <div style="font-size:12px;">${conc} de ${planas.length} etapas iluminadas</div>
          </div>
          <div class="card-limpo ciclo-compacto-side mono" title="Ciclo de hoje: ${conc} de ${planas.length}">${conc}/${planas.length}</div>

          <div class="perfil-rodape-side" style="display:flex;align-items:center;gap:10px;padding:4px;">
            ${renderAvatarHtml(estado.usuario, 38)}
            <div class="usuario-meta" style="min-width:0;">
              <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escaparHtml(estado.usuario.nome)}</div>
              <div style="font-size:11px;color:var(--texto-sec);">${estado.pushDispositivos.length} dispositivos</div>
            </div>
          </div>
        </aside>

        <div class="area-principal">
          <div class="topbar-ws">
            <div class="busca-pill">
              ${ICONES.busca(16)}
              <input id="ws-busca-global" placeholder="Buscar tarefas, notas ou etiquetas..." value="${escaparHtml(estado.busca)}" />
            </div>

            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <button type="button" class="pilula-horizonte" id="btn-popover-horizonte">
                ${ICONES.jornada(15)}
                <span class="mono">${formatarHora(estado.minuto)} · ${rotuloTurno(estado.minuto)}</span>
                <span class="pilula ceu" style="padding:2px 8px;">${climaEf.replace('_', ' ')}</span>
              </button>
              <button type="button" class="btn pequeno" style="width:40px;padding:0;" id="btn-sino-topo" title="Lembretes e Web Push">
                ${ICONES.sino(16)}
              </button>
            </div>
          </div>

          ${miolo}
        </div>
      </div>

      <nav class="bottom-nav" aria-label="Navegacao mobile">
        ${NAV_ITENS.map(n => `
          <button type="button" class="bottom-btn ${estado.visao === n.id ? 'ativo' : ''}" data-nav="${n.id}">
            ${n.ico(18)}
            <span>${n.nome}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  function renderPopoverHorizonte() {
    const area = document.getElementById('area-popover');
    if (!area) return;
    if (!estado.popoverHorizonte || estado.fluxo !== 'workspace') {
      area.innerHTML = '';
      return;
    }
    const faseHoje = D.obterFaseLunarHemisferioSul(new Date());
    area.innerHTML = `
      <div class="popover-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong>Simulador do Horizonte 24h</strong>
          <button type="button" class="btn pequeno suave" id="pop-fechar">Fechar</button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <input id="pop-slider-hora" type="range" min="0" max="1439" value="${estado.minuto}" style="flex:1;accent-color:var(--primaria);" />
          <span class="mono" id="pop-hora-txt" style="font-size:12.5px;font-weight:700;">${formatarHora(estado.minuto)}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <button type="button" class="btn pequeno suave" id="pop-hora-real">Hora real</button>
          ${[{ m: 350, l: 'Aurora' }, { m: 570, l: 'Manha' }, { m: 900, l: 'Tarde' }, { m: 1065, l: 'Entardecer' }, { m: 1290, l: 'Noite' }].map(p => `
            <button type="button" class="btn pequeno suave" data-preset-min="${p.m}">${p.l}</button>
          `).join('')}
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;margin-bottom:6px;">Clima simulado no cenario:</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${[
              { id: 'auto', l: 'Auto' },
              { id: 'limpo', l: 'Limpo' },
              { id: 'parcialmente_nublado', l: 'Parc. Nublado' },
              { id: 'nublado', l: 'Nublado' },
              { id: 'chuvoso', l: 'Chuva' },
              { id: 'tempestade', l: 'Tempestade' }
            ].map(c => `<button type="button" class="btn pequeno ${estado.climaSimulador === c.id ? 'primaria' : 'suave'}" data-pop-clima="${c.id}">${c.l}</button>`).join('')}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--texto-sec);">
          ${D.renderizarLuaSvg(faseHoje, 22)}
          <span>Lua hoje: ${faseHoje.nome} (${faseHoje.iluminacao}%)</span>
        </div>
      </div>
    `;

    document.getElementById('pop-fechar').addEventListener('click', () => { estado.popoverHorizonte = false; renderPopoverHorizonte(); });
    document.getElementById('pop-slider-hora').addEventListener('input', e => {
      estado.minuto = parseInt(e.target.value, 10);
      aplicarAtmosfera();
      const t = document.getElementById('pop-hora-txt');
      if (t) t.textContent = formatarHora(estado.minuto);
    });
    document.getElementById('pop-hora-real').addEventListener('click', () => {
      const ag = new Date();
      estado.minuto = ag.getHours() * 60 + ag.getMinutes();
      renderizar();
    });
    area.querySelectorAll('[data-preset-min]').forEach(b => b.addEventListener('click', () => {
      estado.minuto = parseInt(b.dataset.presetMin, 10);
      renderizar();
    }));
    area.querySelectorAll('[data-pop-clima]').forEach(b => b.addEventListener('click', () => {
      estado.climaSimulador = b.dataset.popClima;
      renderizar();
    }));
  }

  // ===================== MODAIS =====================
  function abrirModal(html) {
    const area = document.getElementById('area-modal');
    area.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><div class="modal-card">${html}</div></div>`;
    document.getElementById('modal-backdrop').addEventListener('click', e => { if (e.target.id === 'modal-backdrop') fecharModal(); });
  }
  function fecharModal() {
    const area = document.getElementById('area-modal');
    if (area) area.innerHTML = '';
  }

  function abrirModalNovaTarefa(paiId) {
    abrirModal(`
      <h3 class="titulo-display" style="font-size:22px;">${paiId ? 'Nova subetapa' : 'Nova tarefa no horizonte'}</h3>
      <input id="mdl-tit-tarefa" class="campo" placeholder="O que voce quer realizar?" maxlength="140" />
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <select id="mdl-prio-tarefa" class="campo">
          <option value="baixa">Prioridade Baixa</option>
          <option value="media" selected>Prioridade Media</option>
          <option value="alta">Prioridade Alta</option>
          <option value="urgente">Prioridade Urgente</option>
        </select>
        <select id="mdl-turno-tarefa" class="campo">
          <option value="manha">Manha</option>
          <option value="tarde" selected>Tarde</option>
          <option value="noite">Noite</option>
          <option value="livre">Livre</option>
        </select>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="btn suave" id="mdl-nt-cancelar">Cancelar</button>
        <button type="button" class="btn primaria" id="mdl-nt-criar">Criar agora</button>
      </div>
    `);
    document.getElementById('mdl-nt-cancelar').addEventListener('click', fecharModal);
    document.getElementById('mdl-nt-criar').addEventListener('click', () => {
      const tit = document.getElementById('mdl-tit-tarefa').value.trim();
      if (!tit) return;
      const nova = {
        id: 't-' + Date.now(),
        titulo: tit,
        prioridade: document.getElementById('mdl-prio-tarefa').value,
        status: 'pendente',
        turno: document.getElementById('mdl-turno-tarefa').value,
        prazo: null,
        etiquetas: [],
        lembretes: [],
        notas: [],
        subtarefas: []
      };
      if (paiId) {
        const ach = encontrarNo(estado.tarefas, paiId);
        if (ach) {
          ach.no.subtarefas = ach.no.subtarefas || [];
          ach.no.subtarefas.push(nova);
          estado.expandidas[paiId] = true;
          recalcularAncestrais(estado.tarefas, paiId);
        }
      } else {
        estado.tarefas.unshift(nova);
      }
      fecharModal();
      renderizar();
    });
  }

  function abrirModalClima() {
    abrirModal(`
      <div style="display:flex;align-items:center;gap:8px;">
        ${ICONES.pino(18)}
        <h3 class="titulo-display" style="font-size:21px;">Exibir cidade e temperatura?</h3>
      </div>
      <p style="margin:0;font-size:13.5px;color:var(--texto-sec);">
        Respeitamos sua privacidade: nenhuma consulta de localizacao acontece sem sua autorizacao explicita.
      </p>
      <button type="button" class="btn primaria" id="mdl-clima-geo">Permitir localizacao aproximada</button>
      <div style="font-size:12px;font-weight:700;margin-top:4px;">Ou escolha sua cidade manualmente:</div>
      <div style="display:grid;gap:6px;">
        ${D.CIDADES_DEMO.map((c, idx) => `
          <button type="button" class="btn suave" style="justify-content:space-between;border-radius:14px;" data-mdl-cidade="${idx}">
            <span>${c.cidade}, ${c.uf}</span>
            <span class="mono">${c.temp} C · ${c.desc}</span>
          </button>
        `).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;gap:8px;">
        ${estado.climaConsentido.habilitado ? `<button type="button" class="btn perigo" id="mdl-clima-desativar">Desativar e limpar</button>` : '<span></span>'}
        <button type="button" class="btn suave" id="mdl-fechar">Cancelar</button>
      </div>
    `);
    document.getElementById('mdl-clima-geo').addEventListener('click', () => {
      const c = D.CIDADES_DEMO[0];
      estado.climaConsentido = { habilitado: true, cidade: c.cidade, uf: c.uf, temp: c.temp, estado: c.estado, desc: c.desc };
      fecharModal(); renderizar(); mostrarToast(`Clima ativado para ${c.cidade} (${c.temp} C).`, false);
    });
    document.querySelectorAll('[data-mdl-cidade]').forEach(b => b.addEventListener('click', () => {
      const c = D.CIDADES_DEMO[parseInt(b.dataset.mdlCidade, 10)];
      estado.climaConsentido = { habilitado: true, cidade: c.cidade, uf: c.uf, temp: c.temp, estado: c.estado, desc: c.desc };
      fecharModal(); renderizar(); mostrarToast(`Cidade selecionada: ${c.cidade} (${c.temp} C).`, false);
    }));
    const btnDes = document.getElementById('mdl-clima-desativar');
    if (btnDes) btnDes.addEventListener('click', () => {
      estado.climaConsentido = { habilitado: false, cidade: null, uf: null, temp: null, estado: 'limpo', desc: 'Ceu limpo' };
      fecharModal(); renderizar(); mostrarToast('Clima desativado e dados removidos.', false);
    });
    document.getElementById('mdl-fechar').addEventListener('click', fecharModal);
  }

  function abrirModalExclusaoTarefa(id) {
    const ach = encontrarNo(estado.tarefas, id);
    if (!ach) return;
    const qtdFilhas = contarDescendentes(ach.no);
    if (qtdFilhas === 0) {
      ach.lista.splice(ach.indice, 1);
      if (ach.pai) recalcularAncestrais(estado.tarefas, ach.pai.id);
      if (estado.tarefaSelecionadaId === id) estado.gavetaAberta = false;
      renderizar();
      mostrarToast('Tarefa removida.', false);
      return;
    }
    abrirModal(`
      <h3 class="titulo-display" style="font-size:21px;">Esta tarefa possui ${qtdFilhas} subetapa(s)</h3>
      <p style="margin:0;font-size:13.5px;color:var(--texto-sec);">Escolha o que fazer com os itens vinculados a "${escaparHtml(ach.no.titulo)}":</p>
      <button type="button" class="btn perigo" id="mdl-exc-cascata">Excluir tudo em cascata (${qtdFilhas + 1} itens)</button>
      <button type="button" class="btn primaria" id="mdl-exc-promover">Excluir so a mae e subir ${ach.no.subtarefas.length} filha(s)</button>
      <button type="button" class="btn suave" id="mdl-exc-cancelar">Cancelar</button>
    `);
    document.getElementById('mdl-exc-cascata').addEventListener('click', () => {
      ach.lista.splice(ach.indice, 1);
      if (ach.pai) recalcularAncestrais(estado.tarefas, ach.pai.id);
      estado.gavetaAberta = false; fecharModal(); renderizar(); mostrarToast('Subarvore excluida em cascata.', false);
    });
    document.getElementById('mdl-exc-promover').addEventListener('click', () => {
      ach.lista.splice(ach.indice, 1, ...(ach.no.subtarefas || []));
      if (ach.pai) recalcularAncestrais(estado.tarefas, ach.pai.id);
      estado.gavetaAberta = false; fecharModal(); renderizar(); mostrarToast('Mae removida e filhas promovidas um nivel.', false);
    });
    document.getElementById('mdl-exc-cancelar').addEventListener('click', fecharModal);
  }

  function abrirModalExcluirConta() {
    abrirModal(`
      <h3 class="titulo-display" style="font-size:21px;color:#DC2626;">Apagar conta em definitivo?</h3>
      <p style="margin:0;font-size:13.5px;color:var(--texto-sec);">Todas as tarefas, notas, historico, clima e dispositivos push serao removidos sem possibilidade de recuperacao.</p>
      <label style="font-size:12.5px;font-weight:700;">Digite <code>EXCLUIR</code> para confirmar:</label>
      <input id="mdl-input-excluir" class="campo" placeholder="EXCLUIR" />
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="btn suave" id="mdl-conta-cancelar">Cancelar</button>
        <button type="button" class="btn perigo" id="mdl-conta-confirmar">Confirmar exclusao</button>
      </div>
    `);
    document.getElementById('mdl-conta-cancelar').addEventListener('click', fecharModal);
    document.getElementById('mdl-conta-confirmar').addEventListener('click', () => {
      if (document.getElementById('mdl-input-excluir').value.trim() !== 'EXCLUIR') {
        mostrarToast('Digite exatamente a palavra EXCLUIR.', false);
        return;
      }
      fecharModal();
      estado.fluxo = 'landing';
      estado.climaConsentido = { habilitado: false, cidade: null, uf: null, temp: null, estado: 'limpo', desc: 'Ceu limpo' };
      renderizar();
      mostrarToast('Conta encerrada nesta demonstracao.', false);
    });
  }

  function baixarTexto(nome, conteudo, mime) {
    const blob = new Blob([conteudo], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  }

  function ligarEventosWorkspace() {
    document.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
      estado.visao = b.dataset.nav;
      estado.popoverHorizonte = false;
      renderizar();
    }));

    const buscaGlobal = document.getElementById('ws-busca-global');
    if (buscaGlobal) {
      buscaGlobal.addEventListener('input', e => {
        const pos = e.target.selectionStart;
        estado.busca = e.target.value;
        renderizar();
        const novo = document.getElementById('ws-busca-global');
        if (novo) { novo.focus(); if (typeof pos === 'number') novo.setSelectionRange(pos, pos); }
      });
    }

    document.getElementById('btn-popover-horizonte').addEventListener('click', () => {
      estado.popoverHorizonte = !estado.popoverHorizonte;
      renderPopoverHorizonte();
    });
    document.getElementById('btn-sino-topo').addEventListener('click', () => {
      estado.visao = 'perfil';
      renderizar();
    });

    const btnRec = document.getElementById('btn-recuperar-estado');
    if (btnRec) btnRec.addEventListener('click', () => { estado.modoEstado = 'normal'; renderizar(); });
    if (estado.modoEstado !== 'normal') return;

    const btnNovaHero = document.getElementById('btn-hero-nova-tarefa');
    if (btnNovaHero) btnNovaHero.addEventListener('click', () => abrirModalNovaTarefa(null));

    const btnClimaHero = document.getElementById('btn-abrir-modal-clima');
    if (btnClimaHero) btnClimaHero.addEventListener('click', abrirModalClima);

    const btnAtalhoFoco = document.getElementById('btn-atalho-foco');
    if (btnAtalhoFoco) btnAtalhoFoco.addEventListener('click', () => { estado.visao = 'foco'; renderizar(); });

    document.querySelectorAll('[data-preset-min]').forEach(b => b.addEventListener('click', () => {
      estado.minuto = parseInt(b.dataset.presetMin, 10);
      renderizar();
    }));
    document.querySelectorAll('[data-filtro-turno]').forEach(b => b.addEventListener('click', () => {
      estado.filtroTurno = b.dataset.filtroTurno;
      renderizar();
    }));

    const btnSairMerg = document.getElementById('btn-sair-mergulho');
    if (btnSairMerg) btnSairMerg.addEventListener('click', () => { estado.ramoFocoId = null; renderizar(); });
    document.querySelectorAll('[data-mergulhar]').forEach(b => b.addEventListener('click', () => {
      estado.ramoFocoId = b.dataset.mergulhar;
      estado.expandidas[estado.ramoFocoId] = true;
      renderizar();
    }));

    document.querySelectorAll('[data-expandir]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.expandir;
      estado.expandidas[id] = !estado.expandidas[id];
      renderizar();
    }));

    document.querySelectorAll('[data-concluir]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.concluir;
      const ach = encontrarNo(estado.tarefas, id);
      if (!ach) return;
      const marcando = ach.no.status !== 'concluida';
      const temFilhas = ach.no.subtarefas && ach.no.subtarefas.length > 0;
      if (marcando) {
        if (temFilhas) estado.snapshotDesfazer = clonarTarefas(estado.tarefas);
        celebrarParticulas(btn);
        marcarSubarvoreStatus(ach.no, 'concluida');
        recalcularAncestrais(estado.tarefas, id);
        estado.diario.unshift({ hora: 'Agora', tipo: 'Tarefa concluida', texto: `Concluiu "${ach.no.titulo}".` });
        setTimeout(() => {
          renderizar();
          if (temFilhas) mostrarToast(`Subarvore de "${ach.no.titulo}" concluida em cascata.`, true);
        }, 200);
      } else {
        ach.no.status = 'em_andamento';
        recalcularAncestrais(estado.tarefas, id);
        renderizar();
      }
    }));

    function ehTelaCompacta() {
      return estado.viewport !== 'desktop' || window.innerWidth <= 1120;
    }

    function ligarEventosGaveta(emModal) {
      const raizGav = emModal ? document.getElementById('area-modal') : document;
      if (!raizGav) return;
      const recarregarGaveta = () => {
        if (emModal) {
          abrirModal(renderGaveta());
          ligarEventosGaveta(true);
        } else {
          renderizar();
        }
      };
      const btnFecGav = raizGav.querySelector('#btn-fechar-gaveta');
      if (btnFecGav) btnFecGav.addEventListener('click', () => {
        estado.gavetaAberta = false;
        if (emModal) fecharModal();
        renderizar();
      });
      raizGav.querySelectorAll('[data-chk-nota]').forEach(chk => chk.addEventListener('change', () => {
        const [bi, ii] = chk.dataset.chkNota.split(':').map(Number);
        const ach = encontrarNo(estado.tarefas, estado.tarefaSelecionadaId);
        if (ach && ach.no.notas[bi] && ach.no.notas[bi].itens[ii]) {
          ach.no.notas[bi].itens[ii].ok = chk.checked;
          recarregarGaveta();
        }
      }));
      const btnAddLemb = raizGav.querySelector('#btn-add-lembrete');
      if (btnAddLemb) btnAddLemb.addEventListener('click', () => {
        const ach = encontrarNo(estado.tarefas, estado.tarefaSelecionadaId);
        if (!ach) return;
        ach.no.lembretes = ach.no.lembretes || [];
        if (ach.no.lembretes.length >= 3) { mostrarToast('Limite de 3 lembretes por tarefa.', false); return; }
        ach.no.lembretes.push({ id: 'l-' + Date.now(), rotulo: raizGav.querySelector('#sel-novo-lembrete').value, disparo: 'Agendado' });
        recarregarGaveta();
      });
      raizGav.querySelectorAll('[data-rm-lembrete]').forEach(b => b.addEventListener('click', () => {
        const ach = encontrarNo(estado.tarefas, estado.tarefaSelecionadaId);
        if (ach) { ach.no.lembretes = (ach.no.lembretes || []).filter(l => l.id !== b.dataset.rmLembrete); recarregarGaveta(); }
      }));
      const btnExpMd = raizGav.querySelector('#btn-exportar-md');
      if (btnExpMd) btnExpMd.addEventListener('click', () => {
        const ach = encontrarNo(estado.tarefas, estado.tarefaSelecionadaId);
        if (ach) baixarTexto('tarefa-lume.md', `# ${ach.no.titulo}\n\nStatus: ${ach.no.status}\n`, 'text/markdown;charset=utf-8');
      });
      const btnExpJson = raizGav.querySelector('#btn-exportar-json');
      if (btnExpJson) btnExpJson.addEventListener('click', () => {
        const ach = encontrarNo(estado.tarefas, estado.tarefaSelecionadaId);
        if (ach) baixarTexto('tarefa-lume.json', JSON.stringify(ach.no, null, 2), 'application/json;charset=utf-8');
      });
    }

    document.querySelectorAll('[data-add-sub]').forEach(b => b.addEventListener('click', () => abrirModalNovaTarefa(b.dataset.addSub)));
    document.querySelectorAll('[data-abrir-gaveta]').forEach(b => b.addEventListener('click', () => {
      estado.tarefaSelecionadaId = b.dataset.abrirGaveta;
      if (ehTelaCompacta()) {
        estado.gavetaAberta = false;
        abrirModal(renderGaveta());
        ligarEventosGaveta(true);
      } else {
        estado.gavetaAberta = true;
        renderizar();
      }
    }));
    document.querySelectorAll('[data-excluir-tarefa]').forEach(b => b.addEventListener('click', () => abrirModalExclusaoTarefa(b.dataset.excluirTarefa)));
    ligarEventosGaveta(false);

    // Mapa
    const zIn = document.getElementById('mapa-zoom-in');
    const zOut = document.getElementById('mapa-zoom-out');
    const rOrg = document.getElementById('mapa-reorg');
    if (zIn) zIn.addEventListener('click', () => { estado.mapaZoom = Math.min(1.4, estado.mapaZoom + 0.1); renderizar(); });
    if (zOut) zOut.addEventListener('click', () => { estado.mapaZoom = Math.max(0.6, estado.mapaZoom - 0.1); renderizar(); });
    if (rOrg) rOrg.addEventListener('click', () => { estado.mapaPosicoes = {}; renderizar(); });
    document.querySelectorAll('[data-mapa-no]').forEach(el => {
      el.addEventListener('pointerdown', ev => {
        const id = el.dataset.mapaNo;
        const pos = estado.mapaPosicoes[id];
        if (!pos) return;
        const sx = ev.clientX, sy = ev.clientY, ox = pos.x, oy = pos.y;
        let moveu = false;
        function mover(e) {
          const dx = (e.clientX - sx) / estado.mapaZoom;
          const dy = (e.clientY - sy) / estado.mapaZoom;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moveu = true;
          pos.x = Math.max(8, ox + dx); pos.y = Math.max(8, oy + dy);
          el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`;
        }
        function soltar() {
          window.removeEventListener('pointermove', mover);
          window.removeEventListener('pointerup', soltar);
          if (!moveu) { estado.tarefaSelecionadaId = id; estado.gavetaAberta = true; }
          renderizar();
        }
        window.addEventListener('pointermove', mover);
        window.addEventListener('pointerup', soltar);
      });
    });

    // Foco
    const selFoco = document.getElementById('sel-foco-tarefa');
    if (selFoco) selFoco.addEventListener('change', e => { estado.focoTarefaId = e.target.value; renderizar(); });
    document.querySelectorAll('[data-foco-preset]').forEach(b => b.addEventListener('click', () => {
      if (estado.focoTimerId) { clearInterval(estado.focoTimerId); estado.focoTimerId = null; }
      estado.focoRodando = false;
      estado.focoTotalSeg = parseInt(b.dataset.focoPreset, 10) * 60;
      estado.focoRestanteSeg = estado.focoTotalSeg;
      renderizar();
    }));
    const btnFocoTog = document.getElementById('btn-foco-toggle');
    if (btnFocoTog) btnFocoTog.addEventListener('click', () => {
      estado.focoRodando = !estado.focoRodando;
      if (estado.focoRodando) {
        estado.focoTimerId = setInterval(() => {
          if (estado.focoRestanteSeg > 0) estado.focoRestanteSeg -= 1; else estado.focoRodando = false;
          if (estado.visao === 'foco') renderizar();
        }, 1000);
      } else if (estado.focoTimerId) { clearInterval(estado.focoTimerId); estado.focoTimerId = null; }
      renderizar();
    });
    const btnFocoConc = document.getElementById('btn-foco-concluir');
    if (btnFocoConc) btnFocoConc.addEventListener('click', () => {
      if (estado.focoTimerId) { clearInterval(estado.focoTimerId); estado.focoTimerId = null; }
      estado.focoRodando = false;
      estado.diario.unshift({ hora: 'Agora', tipo: 'Modo Foco', texto: 'Sessao de foco concluida e registrada.' });
      estado.focoRestanteSeg = estado.focoTotalSeg;
      renderizar();
      mostrarToast('Sessao registrada no Diario!', false);
    });

    // Calendario
    const calAnt = document.getElementById('cal-ant');
    const calProx = document.getElementById('cal-prox');
    if (calAnt) calAnt.addEventListener('click', () => { estado.calMes -= 1; if (estado.calMes < 0) { estado.calMes = 11; estado.calAno -= 1; } renderizar(); });
    if (calProx) calProx.addEventListener('click', () => { estado.calMes += 1; if (estado.calMes > 11) { estado.calMes = 0; estado.calAno += 1; } renderizar(); });
    document.querySelectorAll('[data-cal-dia]').forEach(b => b.addEventListener('click', () => { estado.calDiaSelecionado = b.dataset.calDia; renderizar(); }));

    // Diario
    const btnDiaMd = document.getElementById('btn-exportar-diario-md');
    if (btnDiaMd) btnDiaMd.addEventListener('click', () => {
      baixarTexto('diario-lume.md', '# Diario do Ciclo - Lume\n\n' + estado.diario.map(e => `- **${e.hora}** [${e.tipo}]: ${e.texto}`).join('\n'), 'text/markdown;charset=utf-8');
    });
    const btnDiaJson = document.getElementById('btn-exportar-diario-json');
    if (btnDiaJson) btnDiaJson.addEventListener('click', () => baixarTexto('diario-lume.json', JSON.stringify(estado.diario, null, 2), 'application/json;charset=utf-8'));

    // Perfil
    const btnSairTodos = document.getElementById('btn-sair-todos');
    if (btnSairTodos) btnSairTodos.addEventListener('click', () => mostrarToast('Todas as sessoes encerradas.', false));
    const btnPerfClima = document.getElementById('btn-perfil-clima');
    if (btnPerfClima) btnPerfClima.addEventListener('click', abrirModalClima);
    const swPerfClima = document.getElementById('sw-perfil-clima');
    if (swPerfClima) swPerfClima.addEventListener('click', () => {
      if (estado.climaConsentido.habilitado) {
        estado.climaConsentido = { habilitado: false, cidade: null, uf: null, temp: null, estado: 'limpo', desc: 'Ceu limpo' };
        renderizar();
        mostrarToast('Clima desativado e dados removidos.', false);
      } else abrirModalClima();
    });
    const btnAtvDisp = document.getElementById('btn-ativar-este-disp');
    if (btnAtvDisp) btnAtvDisp.addEventListener('click', () => {
      if (estado.pushDispositivos.length >= 10) { mostrarToast('Limite de 10 dispositivos atingido.', false); return; }
      estado.pushDispositivos.push({ id: 'd-' + Date.now(), rotulo: 'Este navegador', plataforma: 'desktop' });
      renderizar();
      mostrarToast('Notificacoes ativadas neste dispositivo.', false);
    });
    const btnTestPush = document.getElementById('btn-testar-push');
    if (btnTestPush) btnTestPush.addEventListener('click', () => mostrarToast(`Aviso enviado para ${estado.pushDispositivos.length} dispositivo(s)!`, false));
    document.querySelectorAll('[data-rm-disp]').forEach(b => b.addEventListener('click', () => {
      estado.pushDispositivos = estado.pushDispositivos.filter(d => d.id !== b.dataset.rmDisp);
      renderizar();
    }));
    const swAudio = document.getElementById('sw-audio');
    if (swAudio) swAudio.addEventListener('click', () => { estado.audio.habilitado = !estado.audio.habilitado; renderizar(); });
    const btnExcConta = document.getElementById('btn-abrir-excluir-conta');
    if (btnExcConta) btnExcConta.addEventListener('click', abrirModalExcluirConta);
  }

  function renderizar() {
    const palco = document.getElementById('conteudo-dinamico');
    if (!palco) return;
    renderDockPrototipo();
    if (estado.fluxo === 'landing') {
      palco.innerHTML = renderLanding();
      ligarEventosLanding();
    } else if (estado.fluxo === 'primeiro_acesso') {
      palco.innerHTML = renderPrimeiroAcesso();
      ligarEventosPrimeiroAcesso();
    } else {
      palco.innerHTML = renderWorkspace();
      ligarEventosWorkspace();
    }
    renderPopoverHorizonte();
    aplicarAtmosfera();
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });
  document.addEventListener('DOMContentLoaded', renderizar);
})();
