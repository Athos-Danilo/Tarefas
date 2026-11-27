# Roteiro demonstrativo para apresentacao em Web II - Lume

**Duracao alvo:** `12` a `15` minutos (demonstracao ao vivo + explicacao tecnica da arquitetura e do processo com IA).  
**Documento de apoio metodologico:** [Processo-de-desenvolvimento-com-IA.md](Processo-de-desenvolvimento-com-IA.md).

---

## 0. Checklist 2 minutos antes de apresentar

- [ ] Abrir `https://lume-fawn.vercel.app` no navegador e confirmar que o cartao de saude da API mostra **Conectado** (ja acorda a instancia gratuita do Render antes da fala comecar).
- [ ] Conferir que a segunda janela (ou guia anonima com outra conta Google) esta pronta para mostrar **Tarefas em Conjunto** via link `/convite/:token`.
- [ ] Opcional para demonstrar Web Push ao vivo: deixar o Lume aberto/instalado como PWA no PC ou celular com notificacoes autorizadas e o painel do `cron-job.org` aberto em outra aba.
- [ ] **Plano B (caso a internet da sala oscile):** ter Backend local (`uvicorn` na porta `8000`) e Frontend local (`vite` na porta `5173`) prontos no terminal conforme [Ambiente-local.md](Ambiente-local.md).

---

## 1. Abertura e Landing viva (2 min)

- **Tela:** `https://lume-fawn.vercel.app` (sem precisar logar ainda).
- **O que falar e mostrar:**
  1. Apresentar o **Lume** (*"Suas tarefas no ritmo vivo do dia."*) e a proposta central: unir produtividade estruturada a uma ambientacao visual responsiva ao horario real e ao progresso das entregas.
  2. Demonstrar o **Modo Simulador 24h** trocando rapidamente entre **Manha**, **Tarde**, **Crepusculo** e **Noite**, destacando:
     - a **interpolacao cromatica continua** mantendo contraste WCAG AA em todos os `1.440` minutos;
     - a **Lua 3D iluminada exatamente na fase lunar real do Hemisferio Sul** (calculo astronomico puro offline);
     - o seletor dos **5 estados climaticos** (`Limpo` ate `Tempestade`) acionando nuvens Soft-3D e chuva instanciada no cenario WebGL (e explicando o **Fallback 2D** para acessibilidade e `prefers-reduced-motion`).
  3. Marcar e desmarcar um item na **arvore demonstrativa local** da Landing para mostrar progresso por folhas e alerta visual quando ha filha urgente em aberto.

---

## 2. Autenticacao Google, Tutorial e Privacidade opt-in (2 min)

- **Tela:** Login com Google -> `/primeiro-acesso` -> `/jornada`.
- **O que falar e mostrar:**
  1. Clicar em **Entrar com Google**, explicando que o sistema nao armazena senhas proprias (OAuth 2.0 no servidor via proxy `/api/*` da Vercel para mesma origem + cookie `lume_sessao` `HttpOnly` + `X-CSRF-Token`).
  2. Comentar o fluxo de **Primeiro Acesso** (`16` avatares Soft-3D + foto Google + arvore-guia opcional) e o **Modo Tutorial Guiado** em `6` passos (*spotlight* salvo por usuario no MongoDB e acessivel para rever no Perfil).
  3. Mostrar o **Mini-card de Clima Opt-in (`Open-Meteo`)**: ressaltar que inicia desligado por privacidade (`habilitado: false`) e so consulta previsao aproximada quando o usuario busca uma cidade ou autoriza a geolocalizacao.

---

## 3. Nucleo de Tarefas Compostas e Tarefas em Conjunto (3 min)

- **Tela:** `/jornada` e `/convite/:token`.
- **O que falar e mostrar:**
  1. Exibir uma arvore composta com subtarefas multinivel (ate `5` niveis), mostrar **recorrencia periodica** (`diaria`, `semanal`, `mensal`) e concluir uma filha para acionar o progresso automatico da mae (e o botao **Desfazer** de `10` segundos).
  2. Abrir a **Gaveta de Edicao**: mostrar etiquetas coloridas, agendamento de lembrete e os **`6` blocos ricos** (`notas_em_blocos` salvos no MongoDB) com exportacao em `.md` ou `.json`.
  3. **Colaboracao em Tarefas em Conjunto:**
     - Na conta do **Lider**, compartilhar uma arvore, criar uma **vaga nomeada**, atribuir uma subtarefa e copiar o **link de convite**;
     - Na segunda conta Google (**Membro colaborador**), entrar pelo link `/convite/:token`, mostrar a permissao diferenciada (colaborador edita/conclui sem controle destrutivo do grupo) e a atualizacao no painel da equipe.

---

## 4. Quatro visoes complementares e audio opt-in (2 min)

- **Telas:** `/mapa`, `/foco`, `/calendario`, `/estatisticas` e botao de som na barra lateral/inferior.
- **O que falar e mostrar:**
  1. **Mapa Visual Constelacao/Ramos (`/mapa`, `@xyflow/react`):** mostrar os nos da mesma arvore em ramos/constelacoes, arrastar ou mover por teclado e destacar que as posicoes ficam no MongoDB por usuario (`layouts_constelacao`).
  2. **Modo Foco Imersivo (`/foco`):** iniciar brevemente um temporizador focado em uma tarefa real (persistido em `sessoes_foco` no PostgreSQL).
  3. **Calendario Mensal (`/calendario`):** mostrar prazos, recorrencias projetadas e fases lunares nos dias do mes.
  4. **Dashboard de Estatisticas e Diario do Ciclo (`/estatisticas`):** apresentar os graficos `Recharts`, mapa de calor, taxa/tempo de conclusao, analise de **repeticoes e reaberturas** e o historico cronologico (`eventos_ciclo`) no MongoDB.
  5. Mencionar rapidamente a **Experiencia Sonora opt-in** (sintese 100% procedural via Web Audio API sem arquivos de audio externos).

---

## 5. PWA instalavel, Web Push e Cron gratuito (2 min)

- **Tela:** `/perfil` (Painel PWA e Notificacoes) + celular ou barra **Instalar** do Chrome + `cron-job.org`.
- **O que falar e mostrar:**
  1. Mostrar o Lume instalavel como **PWA** (`manifest.webmanifest` + `sw.js`) e o registro opt-in do dispositivo via **`Web Push (VAPID)`**.
  2. Explicar o papel do **`cron-job.org`** chamando `POST /api/interno/disparar-lembretes` a cada `5` minutos com o header `X-Token-Interno` (comparado com `hmac.compare_digest`), alem dos disparos automaticos ao atribuir ou concluir subtarefas em grupo.

---

## 6. Bastidores de Engenharia para Web II (3 min)

- **Documentos de referencia aberta:** [Arquitetura-e-dados-Web-II.md](Arquitetura-e-dados-Web-II.md), [openapi.json](openapi.json), [Publicacao-producao.md](Publicacao-producao.md) e [Processo-de-desenvolvimento-com-IA.md](Processo-de-desenvolvimento-com-IA.md).
- **O que destacar para o professor e a turma:**
  1. **Arquitetura Poliglota Justificada:** PostgreSQL no **Neon** (`11` tabelas, integridade referencial ACID, CTEs recursivas para arvore ate `5` niveis e grupos) vs MongoDB no **Atlas `M0`** (`4` colecoes para notas em blocos, layouts do mapa, eventos do diario e preferencias).
  2. **Publicacao com Custo Zero e Same-Origin:** Vercel (proxy `/api/*` para cookies `HttpOnly` sem dor de cabeca de CORS cross-site) + Render + Neon + MongoDB Atlas + `cron-job.org`.
  3. **Contrato OpenAPI e Qualidade Verificada:** `53` endpoints e `110` schemas em `/docs` e [openapi.json](openapi.json); suítes automatizadas finais passando com **`88` testes** no backend (`pytest` + `ruff` + `mypy --strict`) e **`100` testes** em `28` arquivos no frontend (`vitest` + `eslint` + `tsc -b --noEmit` + `vite build`).
  4. **Engenharia Assistida por IA (SDD + SOLID + TDD + Orchestrator):** mostrar que nao houve *vibe coding*: toda fase partiu de especificacao em `Doc/`, decisões `D01`-`D16` e `ID-01`-`ID-42`, ciclos **TDD** (Vermelho -> Verde -> Refatoracao) e **orquestracao multimodelo no Google Antigravity** (`Gemini 4 Neon` planejando/revisando arquitetura e `Gemini 4 Hydrogen` executando codigo e testes), com historico auditavel fase a fase no GitHub.

---

## 7. Respostas rapidas para perguntas da banca

- **"Por que usar PostgreSQL e MongoDB juntos?"**  
  PostgreSQL garante integridade transacional ACID para arvores hierarquicas (CTEs recursivas), sessoes, grupos e lembretes; MongoDB evita joins artificiais e migracoes constantes para blocos ricos variaveis, posicoes `x/y` do mapa e eventos heterogeneos do diario.
- **"Como voces lidam com falhas se o MongoDB ficar fora do ar?"**  
  Gravacoes criticas comecam no PostgreSQL (fonte de verdade estrutural) e leituras documentais possuem fallback padrao seguro; `GET /api/saude` reporta estado independente de ambos os bancos (`conectado` / `indisponivel`).
- **"Por que o proxy `/api/*` na Vercel em vez de salvar JWT no `localStorage`?"**  
  Manter `/api/*` sob o mesmo dominio da Vercel permite usar cookies `HttpOnly` + `SameSite=Lax` + `Secure` com sessao server-side no banco (revogavel imediatamente em "Sair de todos os aparelhos") e protecao contra XSS e CSRF.
- **"Como funciona sem GPU / WebGL ou com acessibilidade reduzida?"**  
  `CenarioDoHorizonte` detecta suporte WebGL, preferencia do usuario (`Modo Desempenho`) e `prefers-reduced-motion: reduce`, migrando automaticamente para o **Fallback 2D** em SVG com a mesma interpolacao cromatica e fases lunares, e desligando flashes de tempestade.
