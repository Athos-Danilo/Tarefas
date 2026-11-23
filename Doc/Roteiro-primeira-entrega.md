# Roteiro de desenvolvimento - primeira entrega (Lume)

**Registro de situação em 23/11/2026:** **Fases 01 a 18 concluídas** (Ciclo 1 completo com `D01`-`D12` fechadas e protótipo V2 aprovado; Ciclo 2 completo com backend FastAPI + PostgreSQL `18` + MongoDB `8.2.5`, OAuth Google/PKCE/CSRF, motor de árvore composta, recorrência periódica, etiquetas, notas ricas, Tarefas em Conjunto e clima local opt-in Open-Meteo em TDD; Ciclo 3 completo com **Fases 13 a 18 concluídas**, entregando sistema cromático contínuo 24h com contraste WCAG AA nos `1.440` minutos, tipografia local `SIL OFL 1.1`, `4` favicons adaptativos, astronomia lunar real, Fallback 2D, base PWA, cenário 3D procedural com Lua 3D real/nuvens/chuva e fallback automático, porta de entrada com Landing cinematográfica, demos locais, `16` avatares Soft-3D, Primeiro Acesso, Perfil e exclusão `EXCLUIR`, **Jornada do Dia** com árvore até 5 níveis, recorrência visual, drag-and-drop `@dnd-kit`, busca/filtros/etiquetas, mini-card de clima opt-in (`ID-24`), gaveta de edição com 6 blocos ricos e exportação `.md`/`.json`, **interface de Tarefas em Conjunto** com compartilhamento, vagas nomeadas, link de convite (`/convite/:token`), atribuição por subtarefa, painel da equipe e *polling* inteligente `12s`, e **Mapa Visual de Constelação/Ramos** em `@xyflow/react` sobre o cenário com layouts salvos em `layouts_constelacao` no MongoDB, responsáveis em tarefas em conjunto e atalhos completos por teclado em TDD; incorporadas ainda as evoluções `ID-36` a `ID-40` em roteiro de **`27` fases + `Fase 24B`** dedicada à reformulação visual do cenário 3D após as fases funcionais). Próxima etapa: **Fase 19: Modo Foco Imersivo com temporizador solar/lunar e registro de sessões (TDD)**. Base SDD em [Regras.md](../Agents/Regras.md), [Detalhes.md](Detalhes.md), [Guia-visual.md](Guia-visual.md), [Contratos-api.md](Contratos-api.md), [Planejamento-tecnico.md](Planejamento-tecnico.md), [Ambiente-local.md](Ambiente-local.md), [Processo-de-desenvolvimento-com-IA.md](Processo-de-desenvolvimento-com-IA.md) e [Registro-de-ideias-e-decisoes.md](Registro-de-ideias-e-decisoes.md).

**Escopo da primeira entrega:** aplicação web responsiva e PWA instalável de gerenciamento de tarefas pessoais e em conjunto para Web II com Login exclusivo via Google OAuth, primeiro acesso e exclusão de conta, cadastro e gestão completa de tarefas com 4 prioridades, **recorrência periódica** (`diaria`, `semanal`, `mensal`) e rastreio de reaberturas, composição em árvore multinível (até 5 níveis) com progresso automático e cascata inteligente, **Tarefas em Conjunto** por link de convite com vagas nomeadas e painel da equipe, simulação viva do ciclo do dia (**Manhã**, **Tarde**, **Crepúsculo**, **Noite**) com **Lua 3D na fase lunar real (Hemisfério Sul)**, **clima local opt-in** e **cenário climático reativo** em cena 3D híbrida (com Modo Desempenho / Fallback 2D), Landing com demos interativas, Jornada do Dia, Mapa Visual Constelação/Ramos (`@xyflow/react`), Modo Foco Imersivo, Calendário Mensal dos Prazos, **Dashboard completo de Estatísticas e Diário do Ciclo** (`D14`), **Modo Tutorial Guiado** para novos usuários, experiência sonora opt-in, **Sistema de Lembretes + Web Push multi-dispositivo** e publicação gratuita na web.

---

## 1. Como executar o roteiro

O desenvolvimento é guiado por **Spec-Driven Development (SDD)** e dividido em **27 fases distribuídas ao longo de 5 ciclos**.

### Responsabilidades
- **IA de desenvolvimento:** elaborar especificações, alternativas concretas para decisões abertas, implementar seguindo `pt-BR`, **SOLID** e **TDD**, executar verificações reais, registrar limitações e atualizar este roteiro.
- **Responsável pelo projeto (Athos):** escolher direção visual, nome definitivo, paletas, tipografia, responder às decisões `D01`-`D16`, revisar protótipos/entregas e configurar acessos pessoais em contas externas (Google Cloud, Vercel, Render, Neon, MongoDB Atlas, GitHub).
- **Decisão conjunta:** ajustes de escopo, tratamento de casos de borda, substituição de bibliotecas incompatíveis e aceitação final da entrega.

### Regra para concluir uma fase
- **TDD e SOLID desde a primeira fase de código executável:** toda criação ou alteração de comportamento executável (backend e frontend) exige ciclo completo **Vermelho → Verde → Refatoração** e revisão quanto aos cinco princípios **SOLID**, conforme [Regras.md](../Agents/Regras.md).
- **Estados permitidos por fase:** `não iniciada`, `em andamento`, `aguardando decisão`, `em revisão` e `concluída`.
- Uma fase só recebe `[x]` quando sua entrega foi produzida, seus critérios objetivos de conclusão foram verificados e eventuais limitações foram explicitadas.
- **Git / commits:** repositório local conectado a `https://github.com/Athos-Danilo/Tarefas.git` na branch `main`. O responsável autorizou expressamente em `20/11/2026` realizar `git commit` e `git push` automaticamente ao concluir cada fase, no padrão `Fase NN: objetivo da fase`, sempre após revisar `git status`, `git diff` (garantindo ausência de segredos) e executar as verificações pertinentes.

### Controle geral de conclusão das fases

- [x] Fase 01 - consolidar escopo, SDD inicial e verificar ambiente local
- [x] Fase 02 - escolher nome definitivo, paletas dos 4 momentos do dia e trio tipográfico
- [x] Fase 03 - definir marca, elementos do jardim, constelações e coleção de avatares
- [x] Fase 04 - fechar contratos de API (incl. clima local e lembretes/push), regras finas da árvore (`D08`-`D10`) e exclusão de conta (`D06`)
- [x] Fase 05 - prototipar navegação, atmosferas, mini-card de clima/seletor climático, lembretes/push e telas principais
- [x] Fase 06 - preparar ambiente, revisar `.gitignore`, skeletons FastAPI + React/TS/Vite e CI inicial
- [x] Fase 07 - migrações PostgreSQL (incl. push e lembretes), conexão MongoDB e adaptadores base (TDD)
- [x] Fase 08 - autenticação Google OAuth 2.0, sessão segura, primeiro acesso (incl. estado do tutorial) e exclusão de conta (TDD)
- [x] Fase 09 - motor de domínio da árvore de tarefas compostas, recorrência periódica e rastreio de reaberturas (TDD)
- [x] Fase 10 - API poliglota de tarefas, migração de recorrência/reaberturas, etiquetas, notas ricas e consistência (TDD)
- [x] Fase 11 - backend de Tarefas em Conjunto: migração de grupos/vagas/convites, permissões, vínculo de entrada e painel da equipe (TDD)
- [x] Fase 12 - serviço de clima local (Open-Meteo), busca de cidades e consentimento de localização (TDD)
- [x] Fase 13 - sistema visual adaptativo (4 momentos), astronomia lunar real, clima no Fallback 2D e base PWA (TDD)
- [x] Fase 14 - cenário 3D vivo em Three.js/R3F com Lua 3D na fase real e nuvens/chuva reativos (TDD)
- [x] Fase 15 - landing cinematográfica com demos locais e fluxo completo de entrada/perfil/exclusão (TDD)
- [x] Fase 16 - Jornada do Dia: lista hierárquica, recorrência visual, drag-and-drop, filtros, clima opt-in e lembretes (TDD)
- [x] Fase 17 - interface de Tarefas em Conjunto: vagas, link de convite, painel de desempenho da equipe, notas e polling `10-15s` (TDD)
- [x] Fase 18 - Mapa Visual de Constelação/Ramos (`@xyflow/react`, responsáveis no grupo e layout no MongoDB) (TDD)
- [ ] Fase 19 - Modo Foco Imersivo com temporizador solar/lunar e registro de sessões (TDD)
- [ ] Fase 20 - Calendário Mensal dos Prazos com recorrências, prioridades e fases lunares (TDD)
- [ ] Fase 21 - Dashboard completo de Estatísticas (`D14`), análise de repetições/reaberturas, Diário (`eventos_ciclo`) e preferências (TDD)
- [ ] Fase 22 - Modo Tutorial Guiado em 6 passos após criação de conta e opção de pular/rever (TDD)
- [ ] Fase 23 - experiência sonora opt-in (micro-efeitos, paisagens por momento do dia e som de chuva) (TDD)
- [ ] Fase 24 - PWA instalável, Sistema de Lembretes e Notificações Web Push (`VAPID`) multi-dispositivo e eventos de grupo (TDD)
- [ ] Fase 24B - reformulação visual completa do cenário 3D e enquadramento do horizonte (`ID-40`) (TDD)
- [ ] Fase 25 - revisão de integridade, privacidade/consentimento, permissões de grupo, segurança, acessibilidade, PWA/Push e desempenho 3D/chuva
- [ ] Fase 26 - provisionar bancos gratuitos na nuvem e publicar ambiente na web (incl. chaves `VAPID` e cron gratuito)
- [ ] Fase 27 - aceitação final, documentação para Web II e roteiro de apresentação

---

## 2. Distribuição dos 5 ciclos

| Ciclo | Fases | Objetivo principal | Foco metodológico |
| --- | --- | --- | --- |
| Ciclo 1 | 01-05 | Especificação SDD, nome/identidade visual, contratos e protótipos navegáveis | Descoberta guiada e decisões `D01`-`D12` |
| Ciclo 2 | 06-12 | Fundação técnica, Git/CI, bancos poliglotas, OAuth, motor de tarefas/recorrência, Tarefas em Conjunto (API) e clima local | TDD rigoroso de backend, SOLID, ACID, permissões e opt-in |
| Ciclo 3 | 13-18 | Design System 24h + astronomia lunar + PWA base, mundo 3D reativo, Landing, Jornada, interface de Grupos e Mapa `@xyflow/react` | TDD frontend, WebGL leve, colaboração e acessibilidade |
| Ciclo 4 | 19-24 | Modo Foco, Calendário Mensal, Dashboard completo de Estatísticas (`D14`), Modo Tutorial Guiado, Áudio opt-in e Web Push | Integração poliglota completa, gráficos `Recharts` e avisos multi-dispositivo |
| Ciclo 5 | 24B, 25-27 | Reformulação visual do cenário 3D (`ID-40`), auditoria de segurança/grupos/consentimento/PWA/desempenho, deploy gratuito na web e apresentação Web II | Redesign visual 3D, verificação real em produção e documentação final |

---

## 3. Matriz de decisões (`D01`-`D16`)

Decisões arquiteturais centrais já fechadas nas Fases 01 a 05 e nas evoluções `ID-24` a `ID-38`: conceito **Horizonte Vivo** (simulação do dia + jardim + sol + Lua 3D na fase real do Hemisfério Sul + constelações + clima reativo opt-in), composição multinível até **5 níveis** com bloqueio de ciclos, cascata inteligente e recorrência periódica, modelo equilibrado de tarefa com **4 prioridades independentes + alerta de filha urgente**, **Tarefas em Conjunto por link de convite com vagas nomeadas**, **Landing com demos interativas locais**, **apenas Google OAuth**, divisão poliglota **PostgreSQL + MongoDB**, **3D híbrido inteligente em Three.js/R3F + `@xyflow/react` + Fallback 2D**, **Dashboard completo de Estatísticas (`D14`)**, **Modo Tutorial Guiado**, **áudio opt-in**, **PWA + Lembretes Web Push sem vínculo a calendários externos** e **execução local + publicação gratuita na web**.

A tabela abaixo lista todas as decisões estruturantes (`D01`-`D16`) que governam o desenvolvimento:

| ID | Decisão | Preparação esperada da IA | Responsável | Fase limite | Situação |
| --- | --- | --- | --- | --- | --- |
| D01 | Nome definitivo da aplicação | Apresentar opções refinadas com racional de marca | IA propõe; Athos escolhe | Fase 02 | Aprovada em 20/11/2026: **Lume** |
| D02 | Paletas dos 4 momentos do dia + transição cromática contínua 24h | Preparar direções cromáticas e validar transição contínua minuto a minuto com checagem WCAG | IA propõe; Athos escolhe | Fase 02 | Aprovada em 20/11/2026: **Alvorada Poética com transição contínua 24h** |
| D03 | Trio tipográfico (Display + Sans + Mono) e licenças locais | Comparar combinações legíveis em títulos, listas densas, acentos pt-BR e timers | IA propõe; Athos escolhe | Fase 02 | Aprovada em 20/11/2026: **Fraunces + Plus Jakarta Sans + JetBrains Mono** (`SIL OFL 1.1`) |
| D04 | Marca, logotipo, ícones do jardim/constelações e coleção inicial de avatares | Apresentar conceitos visuais reutilizáveis e catálogo inicial de avatares | IA propõe; Athos aprova | Fase 03 | Aprovada em 20/11/2026: Soft-3D Clay Matte + Bento UI, marca Sol de 4 Ls (4 favicons por horário), diorama/plantas/sol/lua 3D e 16 avatares (+ Google/upload) |
| D05 | Primeiro acesso: formato de nome de usuário, avatar e tarefas-guia iniciais | Definir regras de nome de exibição e se usuário novo pode importar exemplos editáveis | IA propõe; Athos decide | Fase 04 | Aprovada em 21/11/2026: nome Google editável (`2`-`60` chars), escolha de avatar (`16` Soft-3D/Google/upload) e opção marcada (desmarcável) de `1` árvore-guia editável |
| D06 | Exclusão de conta: fluxo de confirmação e remoção definitiva em ambos os bancos | Detalhar aviso, palavra/ação de confirmação e remoção completa de dados pessoais | IA propõe; Athos aprova | Fase 04 | Aprovada em 21/11/2026: modal de aviso + digitar `EXCLUIR` para remover tudo no MongoDB, PostgreSQL (`CASCADE` incl. push/lembretes) e avatar |
| D07 | Política de sessão, cookie e ambiente local/produção para Google OAuth | Mapear uso de mesma origem/rewrite `/api`, expiração de sessão e proteção CSRF | IA propõe; Athos valida | Fase 04 | Aprovada em 21/11/2026: sessão deslizante `7d` (teto `30d`), `lume_sessao` (`HttpOnly`, `SameSite=Lax`) via `/api`, `X-CSRF-Token` e sair de todos os aparelhos |
| D08 | Detalhes finos da cascata: cálculo do %, desfazer conclusão em lote e regra ao excluir mãe com filhas | Demonstrar cenários práticos (ponderação igual vs folhas; excluir cascata vs promover filhas) | IA propõe; Athos escolhe | Fase 04 | Aprovada em 21/11/2026: `%` por tarefas-folha, Desfazer cascata por `10s` (`TTL 15s`) e exclusão de mãe com 2 opções (`cascata` ou `promover_filhas`) |
| D09 | Limites operacionais (tamanho de título/notas, máx. etiquetas, máx. tarefas ativas por usuário) | Propor limites saudáveis contra abuso e para boa legibilidade do mapa/3D | IA propõe; Athos aprova | Fase 04 | Aprovada em 21/11/2026: perfil equilibrado (título `140`, `50` blocos/`15k`, `30` tags, `500` ativas/`2k`, avatar `2 MB`, `3` lembretes/tarefa, `10` push, `10` membros/grupo) |
| D10 | Blocos suportados em `notas_em_blocos` (MongoDB) e formato de exportação/diário | Definir conjunto enxuto e rico (parágrafos, subtítulos, citações, listas, código/links) | IA propõe; Athos aprova | Fase 04 | Aprovada em 21/11/2026: `6` blocos ricos (parágrafo, subtítulo, lista, checklist, citação e código/link `http`/`https`) + exportação `.md`/`.json` |
| D11 | Biblioteca do editor do Mapa Visual (`@xyflow/react` vs motor SVG customizado) | Comparar flexibilidade visual orgânica (ramos/constelação), acessibilidade e tamanho de bundle | IA analisa; Athos confirma | Fase 05 | Aprovada em 21/11/2026: **`@xyflow/react`** com nós e arestas customizados (ramos botânicos de dia e constelações à noite), zoom/pan, minimapa e teclado |
| D12 | Navegação principal e organização responsiva das 5 visões | Protótipo interativo em desktop, tablet e celular (Jornada, Mapa, Foco, Calendário, Estatísticas) | IA prototipa; Athos aprova | Fase 05 | Aprovada em 21/11/2026: **Sidebar Bento à esquerda** no Desktop (`78px` compacta no Tablet), **Bottom Nav fixa** no Celular e **gaveta lateral/modal** de notas e lembretes (validados na V2 em `Doc/Prototipos/`) |
| D13 | Modelos 3D / assets do jardim e desempenho máximo (orçamento de triângulos e FPS) | Escolher abordagem autoral Soft-3D / instanciada ou assets livres documentados + Fallback 2D | IA propõe; Athos aprova | Fase 14 | Aprovada em 22/11/2026 (`ID-39`): Procedural Soft-3D Clay Matte (`InstancedMesh`, zero `.glb`), teto de `70k` triângulos / `DPR [1, 2]` no desktop (`28k` / `DPR [1, 1.25]` `< 768px`) e paralaxe suave no mouse |
| D14 | Métricas exatas e visualizações do painel de Estatísticas e Diário do Ciclo | Propor indicadores, gráficos e histórico detalhado (incl. recorrência e repetições) | IA propõe; Athos escolhe | Fase 21 | Aprovada em 21/11/2026 (`ID-36`): Dashboard completo (`Recharts` + mapa de calor, KPIs, turnos/prioridades/etiquetas, recorrência e análise de repetições/reaberturas + filtro pessoal/grupo) |
| D15 | Seleção das paisagens sonoras e micro-efeitos com licença livre comprovada | Preparar prévias audíveis e registro de procedência/licença (CC0/MIT/sintetizado) | IA prepara; Athos escolhe | Fase 23 | Em aberto |
| D16 | Contas externas e URLs finais de publicação gratuita | Auxiliar configuração no Google Cloud, Vercel, Render, Neon e MongoDB Atlas | Athos configura contas; IA integra | Fase 26 | Em aberto |

---

## 4. Ciclo 1 - Especificação, identidade visual e protótipos (Fases 01-05)

### Fase 01 - consolidar escopo, SDD inicial e verificar ambiente local

**Depende de:** entrevista `/grill-me` com o responsável; não depende de código.

- Consolidar visão de produto, glossário, regras da árvore multinível, modelo de tarefas, 5 visões e matriz de cenários em [Detalhes.md](Detalhes.md).
- Definir arquitetura, divisão poliglota PostgreSQL/MongoDB, estratégia 3D híbrida + fallback 2D e stack de design/backend em [Planejamento-tecnico.md](Planejamento-tecnico.md).
- Formalizar regras de `pt-BR`, SOLID, TDD obrigatório e segurança em [Regras.md](../Agents/Regras.md).
- Verificar versões e status real de Git, Python, Node/npm, PostgreSQL e MongoDB na máquina local.
- Catalogar decisões abertas `D01`-`D16` sem presumir respostas.

**Entrega:** base documental SDD completa (`Agents/Regras.md`, `Doc/Detalhes.md`, `Doc/Planejamento-tecnico.md`, `Doc/Roteiro-primeira-entrega.md`).

**Concluída quando:** os quatro documentos estão gravados, coerentes entre si e refletem fielmente o ambiente local observado e as decisões da entrevista.

#### Registro de execução da fase 01

**Estado:** concluída em 20/11/2026.

- **Escopo consolidado:** todas as decisões da entrevista `/grill-me` foram consolidadas em `Agents/Regras.md` e `Doc/*.md`, deixando `D01`-`D16` explicitamente abertas para as fases correspondentes.
- **Ambiente local verificado em 20/11/2026:**
  - Git `2.47.1.windows.1` instalado; repositório local inicializado em `main`, com `.gitignore` criado e conectado ao remoto `origin` (`https://github.com/Athos-Danilo/Tarefas.git`).
  - Python `3.13.0` ativo.
  - Node.js `v22.13.0` e npm `10.9.2` ativos.
  - PostgreSQL `18.0` com serviço `postgresql-x64-18` `Running` (binário em `C:\Program Files\PostgreSQL\18\bin\psql.exe`, ausente do `PATH`).
  - MongoDB `8.2.5` com serviço `MongoDB` `Running` (binário em `C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe`, ausente do `PATH`).
- **Checklist interno da fase 01:**
  - [x] Criar `Agents/Regras.md` adaptado ao projeto (`pt-BR`, SOLID, TDD desde o primeiro código).
  - [x] Criar `Doc/Detalhes.md` com especificação completa de domínio e fluxos.
  - [x] Criar `Doc/Planejamento-tecnico.md` com arquitetura poliglota, stack 3D/design e ambiente local real.
  - [x] Criar `Doc/Roteiro-primeira-entrega.md` com 22 fases, 5 ciclos e decisões `D01`-`D16`.
  - [x] Criar `Doc/Processo-de-desenvolvimento-com-IA.md` detalhando o fluxo Google Antigravity (`Orchestrator` com `Gemini 4 Neon` e `Gemini 4 Hydrogen`) e os pilares SDD/SOLID/TDD para apresentação em Web II, além de registrar a autorização recorrente de commit e push por fase.
  - [x] Verificar consistência cruzada entre os documentos SDD.

---

### Fase 02 - escolher nome definitivo, paletas dos 4 momentos do dia e trio tipográfico

**Depende de:** Fase 01; decisões `D01`, `D02` e `D03`.

- Apresentar propostas de nome definitivo (`D01`) alinhadas ao conceito poético do ciclo do dia e constelações.
- Preparar 2 a 3 direções cromáticas (`D02`) aplicadas aos 4 momentos (**Manhã**, **Tarde**, **Crepúsculo**, **Noite**) com tokens de fundo, superfície translúcida, texto, acentos de prioridade e estados de erro/sucesso/foco.
- Comparar combinações de fontes Display + Sans + Mono (`D03`) testando acentuação em português, títulos poéticos, densidade de listas hierárquicas e números tabulares para timers/horários.
- Validar contraste WCAG entre cartões e céu variável, criando `Doc/Guia-visual.md`.

**Entrega:** `D01`, `D02` e `D03` aprovadas e registradas em `Doc/Guia-visual.md`.

**Concluída quando:** há nome oficial, paleta completa para os 4 períodos e fontes definidas prontas para virar tokens CSS.

#### Registro de execução da fase 02

**Estado:** concluída em 20/11/2026.

- **Decisões aprovadas por Athos:**
  - `D01`: **`Lume`**.
  - `D02`: **Alvorada Poética** com evolução autoral (`ID-15`) para **transição cromática contínua minuto a minuto (24h)** e proteção de polaridade luminosa/noturna.
  - `D03`: **`Fraunces` (Display) + `Plus Jakarta Sans` (Sans UI) + `JetBrains Mono` (Mono tabular)**, licença `SIL OFL 1.1`, com uso expressivo de **bold** e **itálico** em momentos oportunos (`ID-17`), estratégia responsiva **desktop-first funcional em tablets e celulares** (`ID-18`) e diretrizes de **animações de texto, hover, movimento e efeitos de escrita** (`ID-19`).
- **Verificação automatizada WCAG (1.440 minutos do dia):** script Node validou `0` falhas abaixo de `4.5:1` diretamente sobre a função de interpolação em [simulacao-transicao-continua.html](Identidade-visual/simulacao-transicao-continua.html) (menor contraste observado: `14.92:1` texto principal, `6.70:1` secundário, `5.51:1` botão primário, `>= 5.15:1` nas 4 prioridades).
- **Checklist interno da fase 02:**
  - [x] Propor opções de nome e registrar escolha oficial (`Lume`).
  - [x] Construir estúdio comparativo com 3 direções cromáticas e 3 trios tipográficos ([previa-fase-02.html](Identidade-visual/previa-fase-02.html)).
  - [x] Construir e validar simulação de transição contínua 24h ([simulacao-transicao-continua.html](Identidade-visual/simulacao-transicao-continua.html)).
  - [x] Consolidar sistema visual, uso de bold/itálico e responsividade em [Guia-visual.md](Guia-visual.md).
  - [x] Atualizar [Registro-de-ideias-e-decisoes.md](Registro-de-ideias-e-decisoes.md) e base SDD com o nome oficial `Lume`.

---

### Fase 03 - definir marca, elementos do jardim, constelações e coleção de avatares

**Depende de:** Fase 02; decisão `D04`.

- Criar variações do logotipo/ícone da marca aprovada (cabeçalho, landing, favicon e tela de login).
- Definir direção visual dos elementos do jardim (espécies/formas que florescem por conclusão), estrelas/constelações e fases lunares.
- Propor coleção inicial de avatares para escolha no primeiro acesso e no perfil, registrando origem/licença em `Doc/Identidade-visual/`.

**Entrega:** estudos de marca, direção do jardim/constelações e avatares aprovados em `Doc/Identidade-visual/`.

**Concluída quando:** a identidade visual base está fechada sem bloqueios para prototipação.

#### Registro de execução da fase 03

**Estado:** concluída em 20/11/2026.

- **Decisão fechada (`D04`) e ideias registradas (`ID-21` a `ID-23`):**
  - Direção artística **Soft-3D Clay Matte + Bento UI** substituindo o estudo inicial low-poly plano.
  - Logotipo **`Lume`** (`Fraunces Bold`), chamada oficial *"Suas tarefas no ritmo vivo do dia."* e símbolo radial **"Sol de 4 Ls"** em **4 variações de favicon adaptativas por horário** (`Manhã 05:45-11:59`, `Tarde 12:00-16:59`, `Entardecer 17:00-18:59` e `Noite 19:00-05:44`).
  - Coleção de **16 avatares Soft-3D** em 4 grupos temáticos, mais foto da conta **Google OAuth** e **upload próprio** (`256x256`).
- **Verificações executadas antes do fechamento:**
  - Validação automatizada em Node sobre [estudo-fase-03-soft3d.html](Identidade-visual/estudo-fase-03-soft3d.html): sintaxe JS aprovada via `new Function`, `9` caminhos de assets confirmados em disco e cobertura exata dos `1.440` minutos do dia pelas 4 faixas de favicon (`manha: 375`, `tarde: 300`, `entardecer: 120`, `noite: 645`).
  - Limpeza de `9` arquivos descartados em `Doc/Identidade-visual/`, registro de procedência/licenças em [ORIGEM-E-LICENCAS.md](Identidade-visual/ORIGEM-E-LICENCAS.md) e checagem de UTF-8 com zero travessões (`U+2014`/`U+2013`).
- **Checklist interno da fase 03:**
  - [x] Definir símbolo, logotipo, chamada da marca e os 4 favicons adaptativos por horário (`Doc/Identidade-visual/assets-3d/favicons/`).
  - [x] Produzir e aprovar diorama do jardim (dia/noite), 5 variações do Sol, fases lunares e estágios botânicos em Soft-3D (`Doc/Identidade-visual/assets-3d/`).
  - [x] Consolidar coleção de 16 avatares Soft-3D + Google + upload e documentar procedência/licenças em [ORIGEM-E-LICENCAS.md](Identidade-visual/ORIGEM-E-LICENCAS.md).
  - [x] Validar tudo ao vivo em [estudo-fase-03-soft3d.html](Identidade-visual/estudo-fase-03-soft3d.html) e refletir nos documentos SDD ([Guia-visual.md](Guia-visual.md), [Detalhes.md](Detalhes.md), [Planejamento-tecnico.md](Planejamento-tecnico.md) e [Registro-de-ideias-e-decisoes.md](Registro-de-ideias-e-decisoes.md)).

---

### Fase 04 - fechar contratos de API, regras finas da árvore (`D08`-`D10`) e exclusão de conta (`D06`)

**Depende de:** Fase 01; decisões `D05`, `D06`, `D07`, `D08`, `D09` e `D10`.

- Resolver regras finas pendentes com exemplos concretos: primeiro acesso e tarefas-guia (`D05`), exclusão de conta (`D06`), política de sessão/CSRF (`D07`), ponderação do progresso % + desfazer cascata + exclusão de tarefa-mãe (`D08`), limites operacionais (`D09`) e esquema de blocos ricos (`D10`).
- Consolidar todos os contratos HTTP/JSON, envelopes de erro e códigos estáveis em português em `Doc/Contratos-api.md` (cobrindo também endpoints opt-in de **clima local/busca de cidades Open-Meteo** e de **lembretes por tarefa + inscrições Web Push `VAPID`**).
- Atualizar `Doc/Detalhes.md` com as decisões resolvidas.

**Entrega:** `Doc/Contratos-api.md` completo e `D05`-`D10` fechadas.

**Concluída quando:** backend e frontend possuem contratos inequívocos de entrada, saída e erro para iniciar modelagem e código.

#### Registro de execução da fase 04

**Estado:** concluída em 21/11/2026.

- **Decisões fechadas por Athos (`D05`-`D10`, registradas em `ID-28` a `ID-33`):**
  - `D05`: nome sugerido do Google (`2`-`60` chars), escolha de avatar (`16` Soft-3D, foto Google ou upload `2 MB` a `256x256`) e opção marcada (desmarcável) de criar `1` árvore-guia de boas-vindas editável.
  - `D06`: exclusão definitiva exige confirmação `EXCLUIR` em modal de aviso e limpa MongoDB, avatar e PostgreSQL (`CASCADE`, incl. `inscricoes_push` e `lembretes_tarefas`).
  - `D07`: sessão deslizante de `7` dias (teto `30` dias), cookies `lume_sessao` (`HttpOnly`) e `lume_csrf` em mesma origem `/api`, `X-CSRF-Token` e ação de sair de todos os aparelhos.
  - `D08`: percentual da mãe calculado pelas **tarefas-folha**, conclusão em cascata com **Desfazer por `10s`** (`token_desfazer` TTL `15s`) e exclusão de tarefa-mãe com `2` escolhas explícitas (`cascata` ou `promover_filhas`).
  - `D09`: perfil de limites equilibrados (`140` chars de título, `50` blocos/`15.000` chars de notas, `30` etiquetas / `8` por tarefa, `500` tarefas ativas / `2.000` totais, `50` filhas diretas/mãe, avatar `2 MB`, `3` lembretes/tarefa, `10` dispositivos push).
  - `D10`: `6` blocos ricos (`paragrafo`, `subtitulo`, `lista`, `checklist`, `citacao`, `codigo_ou_link` validando `http`/`https`) e exportação `.md`/`.json`.
- **Entrega verificada:** [Contratos-api.md](Contratos-api.md) criado em `12` seções (cobrindo saúde, Google OAuth/sessão, tarefas compostas/cascata, etiquetas, blocos ricos/exportação, Mapa Constelação, Modo Foco, Calendário Mensal, Estatísticas/Diário/Preferências, Clima opt-in `Open-Meteo` e Lembretes/Web Push `VAPID`), validado por script automatizado com `JSON.parse()` em todos os exemplos JSON e checagem de UTF-8 sem travessões.
- **Checklist interno da fase 04:**
  - [x] Resolver com Athos e documentar decisões `D05` a `D10` em [Registro-de-ideias-e-decisoes.md](Registro-de-ideias-e-decisoes.md), [Detalhes.md](Detalhes.md) e [Planejamento-tecnico.md](Planejamento-tecnico.md).
  - [x] Redigir [Contratos-api.md](Contratos-api.md) cobrindo todas as rotas, limites, envelopes de erro e exemplos JSON validados.
  - [x] Atualizar matriz `D01`-`D16` e concluir `Fase 04` no roteiro.

---

### Fase 05 - prototipar navegação, atmosferas e telas principais

**Depende de:** Fases 02, 03 e 04; decisões `D11` e `D12`.

- Decidir entre `@xyflow/react` ou motor SVG customizado (`D11`) para o editor 2D do Mapa Constelação/Ramos.
- Construir protótipo navegável estático em `Doc/Prototipos/` cobrindo Landing com demos, Primeiro Acesso, Jornada do Dia (incluindo **mini-card opt-in de Cidade + Horário + Temperatura** e **seletor climático** no Simulador), Mapa Constelação/Ramos, Modo Foco, Calendário Mensal, Estatísticas/Diário, Perfil/Preferências (**consentimento de clima** e **painel de Lembretes/Dispositivos Web Push com guia iOS**) e estados de vazio/erro/carregamento.
- Validar fluxo e adaptação visual em desktop, tablet e celular (`D12`) nos 4 momentos do dia.

**Entrega:** `Doc/Prototipos/` aprovado e decisões `D11`-`D12` fechadas.

**Concluída quando:** o responsável percorre e aprova toda a navegação e organização visual das telas antes da implementação.

**Registro de conclusão (21/11/2026):** Protótipo interativo V2 entregue e aprovado por Athos em [Doc/Prototipos/index.html](Prototipos/index.html) (`estilos.css`, `dados-e-astronomia.js`, `prototipo.js`), funcionando diretamente via `file:///`. Validado via Node (`4` arquivos, `8` assets locais e testes unitários de fase lunar no Hemisfério Sul, progresso por folhas e cobertura dos `1440` minutos do dia) e inspeção visual no navegador (`0` erros de console/HTTP e `0px` de transbordamento horizontal em Desktop `1280x800`, Tablet `820px` e Celular `390px`), com decisões `D11` (`@xyflow/react`) e `D12` (Sidebar Bento + Bottom Nav + gaveta/modal) fechadas e refinamentos visuais finos direcionados para a implementação oficial em React + TypeScript + Vite no Ciclo 2.

---

## 5. Ciclo 2 - Fundação técnica, autenticação, núcleo poliglota e clima local (Fases 06-11)

### Fase 06 - preparar ambiente, revisar `.gitignore`, skeletons FastAPI + React/TS/Vite e CI inicial

**Depende de:** Fase 01; verificação de compatibilidade React vs `@react-three/fiber`.

- Revisar o `.gitignore` existente (garantindo exclusão de `.env`, `.venv`, `node_modules`, caches) e manter o fluxo de commits/branches na branch `main` conectada a `origin`.
- Criar `Backend/` (`pyproject.toml`, `ruff`, `mypy`, `pytest`, `/api/saude`) e `Frontend/` (`package.json`, `tsconfig.json` strict, Tailwind v4, `Vitest`, `ESLint`, `Prettier`) com exemplos `.env.exemplo` fictícios.
- Documentar passo a passo de execução local em `Doc/Ambiente-local.md` (incluindo observação sobre caminhos completos do `psql`/`mongod` no Windows).
- Validar comunicação real `React -> proxy Vite -> FastAPI /api/saude` com primeiro ciclo TDD e configurar workflow inicial do GitHub Actions.

**Entrega:** repositório estruturado, ambiente reproduzível e testes/linters iniciais passando.

**Concluída quando:** outra sessão consegue subir API e Frontend localmente e o pipeline de verificação básica executa sem erros.

**Registro de conclusão (21/11/2026):** Ambiente e skeletons entregues em [Backend/](../Backend/pyproject.toml) (Python `3.13.0`, FastAPI, `ruff`, `mypy --strict`, `pytest` `7 passed`, lock em `requirements-lock.txt`) e [Frontend/](../Frontend/package.json) (`react ~19.3.1`, `typescript ~5.9.3` strict, `jsdom ~27.4.0`, Tailwind v4, Vite `8.3.8`, Vitest `5.1.1` `5 passed`, ESLint, Prettier, build limpo), `.gitignore` atualizado, CI configurado em [.github/workflows/ci.yml](../.github/workflows/ci.yml) e guia em [Ambiente-local.md](Ambiente-local.md). Comunicação ponta a ponta `React -> proxy Vite -> FastAPI /api/saude` verificada ao vivo no navegador (`200 OK`, `0` erros no console).

---

### Fase 07 - migrações PostgreSQL (incl. push e lembretes), conexão MongoDB e adaptadores base (TDD)

**Depende de:** Fases 04 e 06.

- Configurar ambientes separados de desenvolvimento e teste no PostgreSQL `18.0` e no MongoDB `8.2.5`.
- Criar esquema inicial no PostgreSQL via Alembic (`usuarios`, `sessoes`, `tarefas`, `etiquetas`, `tarefa_etiquetas`, `sessoes_foco`, `inscricoes_push`, `lembretes_tarefas`) com restrições, chaves cascata e índices definidos em `Planejamento-tecnico.md`.
- Configurar cliente `PyMongo` (`AsyncMongoClient`), índices das coleções (`detalhes_tarefas`, `layouts_constelacao`, `eventos_ciclo`, `preferencias_cenario` incluindo o bloco opt-in `clima`) e protocolos/adaptadores com injeção de dependência (SOLID).
- Escrever e validar testes de integração reais de conexão, migrações e isolamento do banco de testes seguindo TDD.

**Entrega:** camada de persistência poliglota inicial testada em integração real.

**Concluída quando:** migrações Alembic aplicam/revertem limpas e testes de integração passam nos dois bancos de teste.

**Registro de conclusão (21/11/2026):** Bancos `lume_dev` e `tarefas_teste` configurados no PostgreSQL `18.0` e no MongoDB `8.2.5`; esquema relacional criado via Alembic (`20261121_0001_esquema_inicial_lume.py`) com as `8` tabelas (`usuarios`, `sessoes`, `tarefas`, `etiquetas`, `tarefa_etiquetas`, `sessoes_foco`, `inscricoes_push`, `lembretes_tarefas`), restrições `CHECK`/`UNIQUE`, índice único parcial e `ON DELETE CASCADE`; camada documental com `PyMongo` (`AsyncMongoClient`), índices idempotentes nas `4` coleções e `RepositorioPreferenciasMongo`; `.github/workflows/ci.yml` atualizado com containers `postgres:18` e `mongo:8`; `ruff check`, `ruff format --check`, `mypy --strict` e `pytest` (`15 passed` em testes unitários e integração real nos dois bancos) aprovados após a última edição.

---

### Fase 08 - autenticação Google OAuth 2.0, sessão segura, primeiro acesso e exclusão de conta (TDD)

**Depende de:** Fases 04 (`D05`, `D06`, `D07`), 07 e `ID-38`.

- Implementar adaptador Google OAuth 2.0 atrás de contrato (DIP), fluxo Authorization Code + `state`, criação de sessão server-side com cookie `HttpOnly` e proteção CSRF.
- Implementar fluxo de primeiro acesso (`nome_exibicao`, `avatar_id`, tarefas-guia opcionais conforme `D05`, inicializando `preferencias_cenario.tutorial.status = "pendente"` para contas recém-criadas), leitura/edição de perfil e exclusão definitiva de conta (`D06`) removendo todos os dados do usuário no PostgreSQL (incluindo `inscricoes_push`, `lembretes_tarefas`, `membros_tarefa` e desvincular vagas/responsabilidades) e no MongoDB (`preferencias_cenario` com clima/cidade/tutorial, notas, layouts e eventos).
- Cobrir tudo com TDD (substituto controlado do Google nos testes unitários + testes de integração de sessão, CSRF e exclusão).

**Entrega:** autenticação completa e segura operando de ponta a ponta na API e nos endpoints de sessão.

**Concluída quando:** login, bloqueio de rotas privadas, primeiro acesso, edição de perfil e exclusão completa passam em TDD.

**Registro de conclusão (21/11/2026):** Implementados e verificados via ciclo completo TDD (`Vermelho -> Verde -> Refatoração`) o adaptador `ProvedorGoogleOAuthReal` atrás de protocolo DIP (`ProvedorGoogleOAuth`) com PKCE (`S256`) e `state` assinado por HMAC-SHA256; sessões server-side no PostgreSQL com validade deslizante de `7` dias, teto absoluto de `30` dias (`lume_sessao` `HttpOnly`), proteção CSRF (`lume_csrf` + `X-CSRF-Token`), renovação e revogação individual/global (`/sair`, `/sair-todos`); migração Alembic `20261121_0002_avatar_usuario.py` adicionando `foto_google_url` e `avatar_arquivo` em `usuarios`; primeiro acesso (`POST /api/conta/primeiro-acesso`) com validação de `nome_exibicao` (`2`-`60` caracteres), coleção dos `16` presets oficiais, árvores-guia opcionais (`D05`) e inicialização de `preferencias_cenario.tutorial.status = "pendente"` no MongoDB (`ID-38`); leitura/edição de perfil e upload de avatar (`POST /api/conta/avatar`, `GET /api/conta/avatar/atual`) com limite `<= 2 MiB` e reencode `Pillow` para `WebP` `256x256` sem EXIF; e exclusão definitiva (`POST /api/conta/excluir` exigindo `"EXCLUIR"`, `D06`) limpando avatar em disco, PostgreSQL (`ON DELETE CASCADE`, incluindo `inscricoes_push` e `lembretes_tarefas`) e as `4` coleções MongoDB (o desvínculo de vagas de Tarefas em Conjunto será acoplado na `Fase 11` com a respectiva migração). Limitação explícita: o fluxo foi validado com `ProvedorGoogleControlado`, restando configurar `LUME_GOOGLE_CLIENT_ID` e `LUME_GOOGLE_CLIENT_SECRET` reais no `.env` para autenticar contra o Google Cloud. Verificações aprovadas com `ruff check`, `ruff format --check` (`56` arquivos), `mypy src` (`--strict` em `42` arquivos) e `pytest -v` (`22 passed`).

---

### Fase 09 - motor de domínio da árvore de tarefas compostas, recorrência e reaberturas (TDD)

**Depende de:** Fases 04 (`D08`, `D09`), 06 e `ID-36`.

- Implementar em `Backend/src/dominio/` as regras puras da árvore de tarefas sem dependência de banco ou HTTP:
  - Profundidade máxima de `5` níveis.
  - Bloqueio de ciclos em criação e movimentação (`reparenting`).
  - Cálculo recursivo automático de progresso (%) conforme `D08`.
  - Conclusão automática de baixo para cima, conclusão em cascata com desfazer e reabertura ascendente para `em_andamento` (incrementando `vezes_reaberta` para métricas de retrabalho).
  - Prioridade independente por nó com cálculo derivado de alerta de descendente `urgente` em aberto.
  - Motor puro de cálculo da próxima ocorrência para tarefas recorrentes (`diaria`, `semanal` em dias escolhidos e `mensal`).
- Testar exaustivamente casos de borda via TDD unitário.

**Entrega:** núcleo de domínio puro 100% coberto por testes unitários e revisado quanto a SOLID.

**Concluída quando:** todas as invariantes de árvore multinível, recorrência e rastreio de reaberturas passam em TDD sem I/O externo.

**Registro de conclusão (21/11/2026):** Implementado o núcleo de domínio puro em memória (sem dependências de FastAPI, SQLAlchemy ou PyMongo) via TDD (`Vermelho -> Verde -> Refatoração`) em `Backend/src/dominio/modelos_tarefa.py`, `Backend/src/dominio/arvore_tarefas.py` e `Backend/src/dominio/recorrencia.py`: validação de títulos, limites operacionais (`5` níveis, `50` filhas diretas, `500` ativas, `2.000` totais) e normalização de título para análise de repetições; integridade estrutural com detecção de ciclos (`CICLO_DETECTADO`) e profundidade máxima (`PROFUNDIDADE_EXCEDIDA`); métricas recursivas por tarefas-folha (`percentual_conclusao`) e alerta independente de descendente `urgente` em aberto (`tem_filha_urgente_aberta`); conclusão automática bottom-up, conclusão em cascata com janela de desfazer de `15s` (`RegistroDesfazerCascata` / `DESFAZER_EXPIRADO`) sem incrementar retrabalho, e reabertura ascendente incrementando `vezes_reaberta`; movimentação (`reparenting`/promoção a raiz) e planejamento de exclusão (`cascata` ou `promover_filhas` com reconciliação ascendente); e motor de recorrência periódica (`diaria`, `semanal` com dias `0`-`6` e `mensal` preservando `dia_mes` em anos comuns e bissextos). Verificações aprovadas com `ruff check`, `ruff format --check` (`61` arquivos), `mypy src` (`--strict` em `45` arquivos) e `pytest -v` (`36 passed`, sendo `14` novos testes unitários em `test_arvore_tarefas.py` e `test_recorrencia.py`).

---

### Fase 10 - API poliglota completa de tarefas, recorrência, etiquetas, notas ricas e consistência (TDD)

**Depende de:** Fases 07, 08 e 09.

- Criar migração Alembic adicionando em `tarefas` as colunas de recorrência e rastreio de retrabalho (`recorrencia_tipo`, `recorrencia_config`, `serie_recorrencia_id`, `vezes_reaberta`).
- Implementar repositórios PostgreSQL (CTEs recursivas `WITH RECURSIVE`, transações atômicas de cascata/reparenting/promoção a raiz/reordenação e geração da próxima ocorrência ao concluir tarefa recorrente) e MongoDB (`detalhes_tarefas`, `eventos_ciclo`).
- Implementar rotas FastAPI para CRUD de tarefas, subtarefas, reparenting, promoção, ordenação, filtros, busca, etiquetas e notas ricas (`D10`), aplicando estratégia de consistência eventual e fallback seguro entre os dois bancos.
- Validar isolamento estrito por `usuario_id`, códigos de erro estáveis e contratos Pydantic via testes de integração TDD.

**Entrega:** backend funcional completo de gestão de tarefas compostas, recorrência e persistência poliglota.

**Concluída quando:** todos os endpoints do núcleo passam em testes unitários e de integração com PostgreSQL e MongoDB de teste.

**Registro de conclusão (22/11/2026):** Implementados e verificados via TDD (`Vermelho -> Verde -> Refatoração`) a migração Alembic `20261122_0003_recorrencia_e_reaberturas_tarefas.py` (`recorrencia_tipo`, `recorrencia_config` JSONB, `serie_recorrencia_id` e `vezes_reaberta` aplicados em `lume_dev` e no ciclo `upgrade/downgrade/upgrade` em `tarefas_teste`); domínio complementar de etiquetas, notas em blocos e exportação (`Backend/src/dominio/notas_e_etiquetas.py`); contratos DIP (`Backend/src/contratos/tarefas.py`); repositórios PostgreSQL (`RepositorioTarefasPostgres` com `WITH RECURSIVE`, transações atômicas de criação/atualização/cascata/reabertura/movimentação/reordenação/geração de próxima ocorrência recorrente/promoção segura de filhas antes do `DELETE`, e `RepositorioEtiquetasPostgres`); repositórios MongoDB (`RepositorioDetalhesTarefasMongo` e `RepositorioEventosCicloMongo`) além de `ArmazenamentoDesfazerMemoria`; serviços `ServicoEtiquetas` e `ServicoTarefas` com consistência eventual e fallback seguro em leitura; guardas de primeiro acesso (`403 PRIMEIRO_ACESSO_PENDENTE`) e roteadores `/api/etiquetas`, `/api/tarefas` e `/api/exportacao/tarefas` com isolamento multiusuário validado em teste de integração real. Verificações aprovadas com `ruff check`, `ruff format --check` (`77` arquivos), `mypy src` (`--strict` em `58` arquivos) e `pytest -v` (`41 passed`).

---

### Fase 11 - backend de Tarefas em Conjunto: grupos, vagas, convites e painel da equipe (TDD)

**Depende de:** Fases 07, 08 e 10; `ID-37`.

- Criar migração Alembic criando `membros_tarefa`, `vagas_tarefa` e `convites_tarefa` e adicionando `compartilhada`, `responsavel_usuario_id` e `vaga_responsavel_id` em `tarefas` (com restrição de `1` responsável por subtarefa e `ON DELETE SET NULL` ao desvincular membro).
- Implementar regras puras e serviços de autorização (**Líder** vs. **Membro colaborador**, teto de `10` membros/vagas em `D09`, transferência de liderança antes de o Líder sair, preservação automática como *Sem responsável* quando alguém sai ou é removido).
- Implementar endpoints da Seção 13 de [Contratos-api.md](Contratos-api.md): ativar compartilhamento, CRUD de vagas nomeadas (com e-mail opcional), gerar/revogar/regenerar link de convite, prévia e entrada automática por e-mail ou escolha de vaga, painel de desempenho por membro, notas compartilhadas e registro de eventos em `eventos_ciclo`.
- Cobrir tudo com testes unitários e de integração reais no PostgreSQL + MongoDB (incluindo tentativas de acesso não autorizado entre papéis e não-membros).

**Entrega:** API segura e testada de Tarefas em Conjunto pronta para consumo no frontend.

**Concluída quando:** criação de vagas, vínculo pelo link de convite, permissões por papel, painel da equipe e saída/remoção preservando subtarefas passam em TDD.

**Registro de conclusão (22/11/2026):** Implementados e verificados via TDD (`Vermelho -> Verde -> Refatoração`) a migração Alembic `20261122_0004_tarefas_em_conjunto.py` (criando `membros_tarefa`, `vagas_tarefa` e `convites_tarefa` com `uq_membros_tarefa_lider_unico`, adicionando `compartilhada`, `responsavel_usuario_id` e `vaga_responsavel_id` em `tarefas` com `ck_tarefas_no_maximo_um_responsavel` e aplicando em `lume_dev`) e o índice `ix_eventos_raiz_criado_em` no MongoDB; domínio puro em `Backend/src/dominio/grupos.py` (teto de `10` membros/vagas, atribuição exclusiva, vínculo automático por e-mail ou vaga manual na entrada, matriz de permissões entre Líder e colaborador, saída/remoção preservando subtarefas como Sem responsável e cálculo de desempenho da equipe); contratos DIP em `Backend/src/contratos/grupos.py` e `Backend/src/contratos/tarefas.py`; repositórios e adaptadores (`RepositorioGruposPostgres`, atualização de `RepositorioTarefasPostgres`, notas compartilhadas por `tarefa_id` e transferência de liderança em `RepositorioDetalhesTarefasMongo` e histórico por raiz em `RepositorioEventosCicloMongo`); serviços (`Backend/src/servicos/servico_grupos.py` e `Backend/src/servicos/servico_tarefas.py`) e rotas (`/api/grupos/*` em `Backend/src/rotas/rotas_grupos.py`, ocultando `codigo_token` no painel para colaboradores). Verificações aprovadas com `ruff check`, `ruff format --check` (`86` arquivos), `mypy src` (`64` arquivos) e `pytest -v` (`46 passed`, incluindo `4` testes unitários em `test_grupos_dominio.py` e fluxo E2E com `4` usuários em `test_grupos_tarefas_em_conjunto_api.py`).

---

### Fase 12 - serviço de clima local (Open-Meteo), busca de cidades e consentimento de localização (TDD)

**Depende de:** Fases 04, 07 e 08.

- Implementar adaptador `Open-Meteo` atrás de contrato (`Backend/src/contratos/`) para consulta gratuita de previsão atual (temperatura e código climático WMO) e busca textual de cidades, sem depender de chave paga.
- Mapear códigos climáticos WMO para os `5` estados oficiais (`limpo`, `parcialmente_nublado`, `nublado`, `chuvoso`, `tempestade`), com cache em memória (`15-30 min`) por coordenada arredondada e fallback seguro (nunca derrubando o app se a API externa oscilar).
- Implementar endpoints autenticados de consentimento opt-in (`preferencias_cenario.clima`): recurso **desativado por padrão** (`habilitado: false`); só consulta após autorização explícita (geolocalização do navegador ou escolha manual de cidade) e **remove imediatamente cidade/coordenadas aproximadas quando desativado**.
- Cobrir mapeamento WMO, cache, fallback e privacidade/consentimento em TDD com dublês HTTP.

**Entrega:** serviço backend seguro e opt-in de clima local e busca de cidades testado em TDD.

**Concluída quando:** nenhuma chamada externa ocorre sem consentimento, a revogação limpa dados salvos e os `5` estados retornam padronizados.

**Registro de conclusão (22/11/2026):** Implementados e verificados via TDD (`Vermelho -> Verde -> Refatoração`) o domínio puro `Backend/src/dominio/clima.py` (mapeamento WMO para os `5` estados oficiais com fallback seguro, normalização de UF brasileira, validação de busca textual e arredondamento de coordenadas para `2` casas decimais); os contratos DIP em `Backend/src/contratos/clima.py` (`ProvedorClima` e `CacheClima`); o cache em memória em `Backend/src/infraestrutura/open_meteo/cache_clima_memoria.py` (`20 min` TTL e tolerância stale de `2h` por coordenada aproximada); o adaptador HTTP `AdaptadorOpenMeteo` em `Backend/src/infraestrutura/open_meteo/adaptador_open_meteo.py` com parâmetros configuráveis em `Backend/src/configuracao/configuracoes.py`; o serviço `ServicoClima` (`Backend/src/servicos/servico_clima.py`) garantindo bloqueio `403 CLIMA_NAO_AUTORIZADO` antes do consentimento e limpeza imediata de cidade/UF/coordenadas no MongoDB ao desativar; e as rotas `/api/clima/cidades`, `/api/clima/consentimento` e `/api/clima/atual` em `Backend/src/rotas/rotas_clima.py` e `Backend/src/rotas/esquemas_clima.py` integradas em `Backend/src/principal.py`. Verificações aprovadas com `ruff check`, `ruff format --check` (`96` arquivos), `mypy src` (`72` arquivos) e `pytest -v` (`51 passed`, incluindo `4` testes unitários em `test_clima_dominio_e_adaptador.py` com `httpx.MockTransport` e fluxo E2E real no PostgreSQL + MongoDB em `test_clima_api.py`).

---

## 6. Ciclo 3 - Design System 24h, mundo 3D reativo, Landing, Jornada, Grupos e Mapa (Fases 13-18)

### Fase 13 - sistema visual adaptativo (4 momentos), astronomia lunar real, Fallback 2D e base PWA (TDD)

**Depende de:** Fases 02, 03, 05 e 06.

- Implementar tokens CSS no Tailwind v4 para a transição contínua 24h sobre **Manhã**, **Tarde**, **Crepúsculo** e **Noite**, fontes hospedadas localmente (`SIL OFL 1.1` com **bold** e **itálico**, `ID-17`), controlador dos **4 favicons adaptativos por horário (`Sol de 4 Ls`)** atualizando `<link rel="icon">` apenas na troca de faixa, componentes base acessíveis sobre Radix UI e primitivas de **animação de texto, efeitos de escrita, hover tátil e movimento** (`ID-19`, respeitando `prefers-reduced-motion`).
- Construir em `Frontend/src/astronomia/` o **módulo astronômico puro offline** (TDD) calculando posição solar/lunar e **fase lunar real + percentual iluminado com orientação do Hemisfério Sul**, além do motor temporal **Relógio Real vs Modo Simulador**.
- Construir o **Modo Desempenho / Fallback 2D** em SVG/CSS com detecção de suporte WebGL e `prefers-reduced-motion`, exibindo fase lunar real em SVG e camadas leves para os `5` estados climáticos (`limpo` a `tempestade`).
- Configurar base do **PWA** (`manifest.webmanifest` com o ícone `Sol de 4 Ls` e *Service Worker* base pronto para receber Push na Fase 24).

**Entrega:** sistema visual, favicons adaptativos, módulo lunar offline, paisagem 2D fallback e base PWA testados.

**Concluída quando:** alternar momentos do dia ou estados climáticos no Modo Desempenho transforma toda a UI com contraste WCAG AA, fase lunar exata e zero erros.

**Registro de conclusão (22/11/2026):** Implementados e verificados via TDD (`Vermelho -> Verde -> Refatoração`) o módulo puro em `Frontend/src/astronomia/` (`tipos.ts`, `fase-lunar.ts` com cálculo sinódico offline e `gerarCaminhoLuaSvg` orientado ao Hemisfério Sul, `ciclo-solar.ts`, `sistema-cromatico.ts` com interpolação contínua 24h auditada em `1.440` minutos `>= 4.5:1` WCAG AA, e `motor-temporal.ts` em Zustand); tipografia local `SIL OFL 1.1` (`@fontsource-variable/fraunces`, `@fontsource-variable/plus-jakarta-sans` e `@fontsource-variable/jetbrains-mono` com variantes normal e itálica em `Frontend/src/estilos/fontes.css` e `global.css`, `0` referências a CDNs externos no bundle); controlador dos `4` favicons adaptativos `Sol de 4 Ls` em `Frontend/src/estilos/controlador-favicon.ts` e hook `useTemaContinuo` (`Frontend/src/hooks/usar-tema-continuo.ts`); biblioteca base acessível sobre Radix UI + Motion + Lucide (`Botao`, `CartaoBento`, `BadgePrioridade`, `ModalAcessivel`, `DicaAcessivel`, `InterruptorAcessivel`, `AbasAcessiveis`, `SeloMarcaLume`, `TextoEscrito`, `RevelacaoSuave` e atualização de `CartaoStatusApi`); paisagem reativa de Fallback 2D em `Frontend/src/cenario/` (`detector-capacidade.ts`, `LuaFaseSvg.tsx`, `CenarioFallback2D.tsx` com os `5` estados climáticos e bloqueio de clarões com movimento reduzido, e `BarraArcoDoDia.tsx`) integrada em `Frontend/src/aplicacao/Aplicacao.tsx`; além da base PWA (`Frontend/public/manifest.webmanifest`, `Frontend/public/sw.js`, `Frontend/src/pwa/registro-sw.ts`, meta/links em `Frontend/index.html` e assets copiados para `Frontend/public/favicons/` e `Frontend/public/assets-3d/`). Verificações aprovadas com `npm run formatar:verificar`, `npm run lint`, `npm run tipo`, `npm test` (`5` arquivos, `15` testes), `npm run build` (`vite build` com `.woff2` e assets PWA em `dist/`) e suíte completa do Backend. Observação explícita: os pacotes WebGL (`three`, `@react-three/fiber` e `@react-three/drei`) serão instalados na Fase 14 após confirmação de `D13`.

---

### Fase 14 - cenário 3D vivo em Three.js/R3F com Lua 3D real e nuvens/chuva reativos (TDD)

**Depende de:** Fases 03 e 13; decisão `D13`.

- Construir cena 3D em `@react-three/fiber` + `@react-three/drei` no estilo **Soft-3D Clay Matte** (`ID-21`) com céu atmosférico dinâmico, trajetória do Sol e da **Lua 3D iluminada exatamente pela fase lunar atual** (orientação do Hemisfério Sul + luz cinérea sutil), estrelas, constelações panorâmicas ligadas ao progresso e jardim estilizado reativo (`D13`).
- Implementar a camada climática 3D reativa nos `5` estados WMO: nuvens **Soft-3D** em camadas graduais, gotas de chuva via `InstancedMesh` e tempestade suave (sem flashes quando `prefers-reduced-motion` estiver ativo).
- Integrar com o **Arco do Dia** e o **seletor de clima no Modo Simulador**, respeitando orçamento de FPS/memória, pausa em aba oculta e descarte limpo ao alternar para o Fallback 2D.
- Garantir testes TDD para lógica de cena, mapeamento fase lunar/clima→iluminação/partículas e troca segura para Fallback 2D.

**Entrega:** cenário 3D vivo integrado ao ciclo do dia, fase lunar real, clima atmosférico e progresso do usuário.

**Concluída quando:** a transição contínua 24h, a Lua 3D na fase atual, o clima 3D (`nuvens`/`chuva`) e o Fallback 2D funcionam sem vazamentos de memória ou erros no console.

**Registro de conclusão (22/11/2026):** Decisão `D13` fechada com Athos (`ID-39`) e Fase 14 implementada e verificada via TDD (`Vermelho -> Verde -> Refatoração`): instaladas as dependências `three` (`0.187.0`), `@react-three/fiber` (`9.8.2`), `@react-three/drei` (`10.7.9`) e `@types/three` mantendo `react` e `react-dom` em `~19.3.1`; construída a lógica pura em `Frontend/src/cenario/logica-cena-3d.ts` (perfis `desktop_riqueza_maxima` com teto `70.000` triângulos/`DPR [1, 2]` e `mobile_adaptado` `< 768px` com teto `28.000` triângulos/`DPR [1, 1.25]`, vetor unitário de iluminação lunar para o Hemisfério Sul/Norte, mapeamento dos `5` estados climáticos com bloqueio de relâmpagos sob movimento reduzido, paralaxe segura de câmera, reação de florescimento/constelações/vagalumes ao progresso e PRNG determinístico); construídos os componentes R3F em `Frontend/src/cenario/cena3d/` (`CeuAtmosferico3D.tsx`, `Astros3D.tsx` com `ShaderMaterial` lunar real + luz cinérea, `JardimSoft3D.tsx` com colinas esculpidas e `InstancedMesh` de arbustos/flores/vagalumes, `ClimaAtmosferico3D.tsx` com nuvens fofas e chuva instanciada, `ControladorCameraParalaxe3D.tsx` e `Cenario3D.tsx` em chunk `React.lazy` com pausa automática em `visibilitychange` e captura de `webglcontextlost`); e criado o orquestrador `Frontend/src/cenario/CenarioDoHorizonte.tsx` (com `ErrorBoundary3D` e fallback imediato para `CenarioFallback2D`) integrado a `Frontend/src/aplicacao/Aplicacao.tsx`. Verificações aprovadas com `npm run formatar:verificar`, `npm run lint`, `npm run tipo`, `npm test` (`7` arquivos, `23` testes incluindo `4` unitários em `logica-cena-3d.test.ts` e `4` de integração em `CenarioDoHorizonte.test.tsx`), `npm run build` (`vite build` gerando chunk isolado `Cenario3D-*.js`) e suíte completa do Backend.

---

### Fase 15 - landing cinematográfica com demos locais e fluxo completo de entrada (TDD)

**Depende de:** Fases 05, 08 e 14.

- Construir Landing com o cenário 3D/2D vivo, apresentação do conceito com **efeitos de escrita tipográfica, bold/itálico expressivo e microinterações de hover/movimento** (`ID-17`, `ID-19`) e pequenas **demonstrações interativas locais** (Arco do Dia 24h + seletor rápido de clima + mini tarefa composta reagindo na hora, sem gravar no servidor).
- Integrar botão de login Google, tela de Primeiro Acesso (`nome_exibicao`, escolha entre os `16` avatares Soft-3D + foto Google + upload próprio e opção de tarefas-guia), Perfil (incluindo atalho para rever tutorial) e fluxo seguro de Exclusão de Conta.
- Testar interações, acessibilidade por teclado e proteção contra acesso sem autenticação via TDD/Playwright.

**Entrega:** porta de entrada completa do aplicativo do visitante até o usuário autenticado.

**Concluída quando:** visitante experimenta a demo local, autentica com Google, configura primeiro acesso e pode gerenciar/excluir a conta.

**Registro de conclusão (22/11/2026):** Fase 15 concluída e validada em TDD (ciclo vermelho para verde): instalados `react-router`, `@tanstack/react-query`, `react-hook-form`, `zod` e `@hookform/resolvers`; recortados os `16` avatares Soft-3D oficiais (`256x256 RGBA`) em `Frontend/public/assets-3d/avatares/`; implementados cliente HTTP com cabeçalho `X-CSRF-Token` a partir do cookie `lume_csrf` e mapeamento de sessão/conta em snake_case para camelCase; adicionadas a Landing pública (`/`) com árvore composta local e simulação do arco do dia sem gravar no servidor, guardas de sessão entre `/`, `/primeiro-acesso`, `/jornada` e `/perfil`, casca responsiva do workspace (`D12`), Primeiro Acesso e Perfil com validação Zod e upload de avatar, acionador de revisão de tutorial (`ID-38`), encerramento de sessão local e multiaparelho (`D07`) e exclusão irreversível com palavra exata `EXCLUIR` (`D06`). Observação: nos testes automatizados do frontend, os contratos de OAuth Google e conta foram validados com dublês determinísticos de sessão/fetch enquanto as credenciais reais do Google Cloud continuam configuráveis via `.env`. Validação completa verde no frontend (`9` arquivos, `32` testes no Vitest, Prettier, ESLint, TypeScript e `vite build` com `16` avatares empacotados em `dist/assets-3d/avatares`).

---

### Fase 16 - Jornada do Dia: lista hierárquica, recorrência, drag-and-drop, filtros, clima opt-in e lembretes (TDD)

**Depende de:** Fases 10, 12, 13 e 15.

- Implementar a visão principal **Jornada do Dia** sobre o cenário vivo: **mini-card Bento compacto** exibindo horário local e, mediante **consentimento opt-in explícito** (`ID-24`), **cidade atual, temperatura e ícone do clima** com atalho para autorizar geolocalização, buscar cidade manualmente ou desativar.
- Implementar agrupamento por turnos (`manha`, `tarde`, `noite`, `livre`), árvore expansível até 5 níveis, configuração e selo visual de **recorrência periódica** (`diaria`, `semanal`, `mensal`), barras de progresso automático, indicador visual de filha urgente e desfazer conclusão em cascata.
- Implementar arrastar-e-soltar acessível (`@dnd-kit` + comandos de teclado), barra de busca/filtros, gestão de etiquetas, campo de **configuração de lembrete por tarefa** (consumido pelo agendador na Fase 24) e gaveta lateral de edição com editor de notas ricas (`detalhes_tarefas`).
- Cobrir lógica de interface, fluxo de consentimento do card de clima, criação de recorrência, mapeamento de API e fluxos principais em TDD.

**Entrega:** gerenciamento diário e hierárquico completo conectado aos dois bancos e ao clima opt-in.

**Concluída quando:** todas as operações CRUD, composição até 5 níveis, recorrência, bloqueio de ciclos, notas ricas e o mini-card opt-in de Cidade/Horário/Temperatura funcionam de ponta a ponta.

**Registro de conclusão (22/11/2026):** Fase 16 concluída e validada em TDD (vermelho para verde): instalados `@dnd-kit/core`, `@dnd-kit/sortable` e `@dnd-kit/utilities` mantendo `react` e `react-dom` em `~19.3.1`; implementados tipos e cliente HTTP (`src/servicos/tipos-jornada.ts` e `src/servicos/cliente-jornada.ts`) cobrindo árvore de tarefas, conclusão com cascata e token desfazer, reabertura, movimentação, reordenação manual, detalhes ricos no MongoDB, CRUD de etiquetas, clima opt-in (`403 CLIMA_NAO_AUTORIZADO` mapeado com segurança) e links de exportação `.md`/`.json`; adicionada camada pura `src/dominios/jornada/logica-jornada.ts` e componentes `MiniCardClimaOptIn`, `BarraFiltrosEEtiquetas`, `FormularioNovaTarefa`, `ItemTarefaArvore`, `EditorNotasBlocos`, `GavetaEdicaoTarefa` e `PaginaJornada`, acoplados a `Aplicacao.tsx` com remoção do placeholder `PaginaJornadaInicial.tsx`. Nos testes automatizados de integração do frontend, os contratos de tarefas/etiquetas/clima e `navigator.geolocation` foram validados com dublês determinísticos. Validação completa verde no frontend (`11` arquivos, `39` testes no Vitest, Prettier, ESLint com `0` erros e `0` warnings, TypeScript e `vite build`).

---

### Fase 17 - interface de Tarefas em Conjunto: vagas, convite, painel da equipe e polling inteligente (TDD)

**Depende de:** Fases 11 e 16.

- Construir na interface de árvore/gaveta os controles do **Líder**: transformar uma tarefa-raiz em tarefa em conjunto, criar e editar **vagas nomeadas** (com e-mail opcional), atribuir `1` responsável (vaga ou membro) a cada subtarefa e copiar/revogar/regenerar o **link de convite**.
- Construir a rota e tela de entrada via link (`/convite/:token`): mostra resumo do projeto compartilhado ao convidado, solicita login Google caso não autenticado, realiza vínculo automático por e-mail ou escolha manual da vaga pelo usuário.
- Construir o **painel de desempenho da equipe** dentro da tarefa em conjunto (progresso individual de cada integrante + linha do tempo de conclusões da equipe), suporte a criação de subetapas pelo Membro colaborador dentro de suas subtarefas, notas compartilhadas e sincronização via **polling inteligente (`10-15s` com aba ativa + recarga ao focar a janela)**.
- Cobrir UI de papéis (Líder vs. Colaborador), entrada por link e estado de vagas em TDD.

**Entrega:** colaboração completa em grupo funcionando na interface responsiva em desktop, tablet e celular.

**Concluída quando:** um líder compartilha o projeto por link, colegas entram assumindo vagas, marcam subtarefas com atualização automática para o time e o painel da equipe reflete os avanços em tempo real próximo.

**Registro de conclusão (23/11/2026):** Fase 17 concluída e validada em TDD (vermelho para verde): implementados tipos e cliente HTTP (`src/servicos/tipos-grupos.ts` e `src/servicos/cliente-grupos.ts`, reutilizando `mapearTarefa` de `cliente-jornada.ts`) cobrindo todos os `12` contratos de `/api/grupos/*` e `/api/tarefas/{id}/atribuir` com `X-CSRF-Token`; implementada lógica pura `src/dominios/grupos/logica-grupos.ts` (`esquemaNovaVaga`, vínculo automático por e-mail, matriz de permissões Líder vs. Colaborador, persistência temporária de convite na sessão) e hook `src/hooks/usar-polling-inteligente.ts` (`12s` com pausa em aba oculta e recarga no foco); criados `PainelEquipeGrupo.tsx` (progresso individual, vagas nomeadas, link de convite, linha do tempo, transferência de liderança, remoção e saída tratada para `409 LIDER_DEVE_TRANSFERIR_OU_EXCLUIR`) e `PaginaConviteGrupo.tsx` (`/convite/:token` e `/convites/:token`); acoplada a experiência em `ItemTarefaArvore.tsx`, `GavetaEdicaoTarefa.tsx`, `PaginaJornada.tsx` e `Aplicacao.tsx`. Nos testes automatizados do frontend, os endpoints de grupos/tarefas e sessões foram exercidos com dublês determinísticos. Validação completa verde (`13` arquivos e `46` testes no Vitest, Prettier, ESLint, TypeScript e `vite build`).

---

### Fase 18 - Mapa Visual de Constelação/Ramos (`@xyflow/react`) (TDD)

**Depende de:** Fases 05 (`D11`), 10, 16 e 17.

- Implementar endpoint/integração de `layouts_constelacao` no MongoDB e a visão **Mapa Visual** em `@xyflow/react` com nós/arestas customizados sobre o cenário 3D/2D.
- Exibir tarefas compostas como **ramos botânicos orgânicos** de dia e **constelações luminosas** no crepúsculo/noite (incluindo avatar/indicador do responsável em tarefas em conjunto), permitindo navegar, arrastar nós, criar subtarefas, concluir itens e reorganizar automaticamente, com navegação equivalente por teclado.
- Validar persistência de layout e sincronia com o estado real das tarefas em TDD.

**Entrega:** Mapa Visual de Constelação/Ramos funcional e persistente.

**Concluída quando:** mudanças no Mapa refletem imediatamente na Jornada/PostgreSQL e posições personalizadas persistem no MongoDB.

**Registro de conclusão (23/11/2026):** Fase 18 concluída e validada em TDD (ciclo vermelho para verde no backend e no frontend): implementada a camada de `layouts_constelacao` no backend (`Backend/src/dominio/constelacoes.py`, `Backend/src/contratos/constelacoes.py`, `Backend/src/infraestrutura/mongo/repositorio_layouts_constelacao_mongo.py`, `Backend/src/servicos/servico_constelacoes.py`, `Backend/src/rotas/esquemas_constelacoes.py`, `Backend/src/rotas/rotas_constelacoes.py`, integrados em `dependencias_autenticacao.py` e `principal.py`) com endpoints `GET`/`PUT`/`DELETE /api/constelacoes/{tarefa_raiz_id}/layout`, proteção CSRF em mutações, validação de limites (`250` nós, coordenadas `-50000..50000`, zoom `0.2..3.0`), isolamento de layout por `(usuario_id, tarefa_raiz_id)` inclusive em árvores em conjunto e limpeza de nós inexistentes com coleta CTE via `RepositorioTarefas`; no frontend, instalado `@xyflow/react@^13.0.2` (preservando `react`/`react-dom` `~19.3.1`), adicionado polyfill `DOMMatrixReadOnly` em `Frontend/testes/configuracao-testes.ts`, implementados `src/servicos/tipos-constelacoes.ts`, `src/servicos/cliente-constelacoes.ts`, `src/dominios/mapa/logica-mapa.ts`, `src/dominios/mapa/NoMapaLume.tsx`, `src/dominios/mapa/PaginaMapaConstelacao.tsx` e acoplada a rota `/mapa` com item `Mapa` na `CascaWorkspace.tsx` e `Aplicacao.tsx`, exibindo **ramos botânicos** (manhã/tarde) e **constelações luminosas** (crepúsculo/noite), avatar/indicador de responsável em tarefas compartilhadas, recolhimento de ramos, criação/conclusão de nós em sincronia com `GavetaEdicaoTarefa`, polling inteligente `12s` em árvores compartilhadas, botão `Reorganizar constelação` e navegação/posicionamento completos por teclado. Observação: a integração do backend foi validada em bancos `_teste` (PostgreSQL e MongoDB) e a UI do frontend foi validada com dublês determinísticos dos serviços HTTP. Validação completa verde no Backend (`59` testes no `pytest`, `ruff check`, `ruff format --check`, `mypy src` em `78` arquivos) e no Frontend (`15` arquivos e `55` testes no Vitest, Prettier, ESLint, TypeScript e `vite build`).

---

## 7. Ciclo 4 - Foco, Calendário, Dashboard, Tutorial, Áudio e Web Push (Fases 19-24)

### Fase 19 - Modo Foco Imersivo com temporizador solar/lunar (TDD)

**Depende de:** Fases 10, 14 e 16.

- Implementar endpoints de `sessoes_foco` (iniciar, concluir, interromper) gerando também `eventos_ciclo` no MongoDB.
- Construir tela **Modo Foco Imersivo** com temporizador visual solar/lunar, adaptação contemplativa do cenário 3D/2D e lista imediata de subtarefas da tarefa em foco.
- Cobrir regras de sessão única ativa, registro de duração e ações na UI com TDD.

**Entrega:** experiência completa de Modo Foco integrada ao backend poliglota.

**Concluída quando:** iniciar, pausar/interromper e concluir sessões grava corretamente no PostgreSQL e alimenta o Diário.

---

### Fase 20 - Calendário Mensal dos Prazos com recorrências, prioridades e fases lunares (TDD)

**Depende de:** Fases 10, 13 e 16.

- Implementar consulta otimizada de tarefas (e ocorrências futuras de **tarefas recorrentes**) por janela mensal no PostgreSQL e reutilizar o módulo astronômico puro da Fase 13 para exibir a fase lunar real e percentual iluminado de cada dia (Hemisfério Sul).
- Construir visão **Calendário Mensal** com indicadores luminosos de prioridade/atraso/recorrência, seleção de dia, abertura rápida para edição/conclusão e total navegabilidade por teclado.
- Validar fusos horários, virada de mês, recorrências e filtros com TDD.

**Entrega:** Calendário Mensal integrado aos prazos reais e recorrências das tarefas compostas.

**Concluída quando:** qualquer tarefa com prazo ou recorrência aparece nos dias corretos com prioridade, fase lunar e interação direta funcional.

---

### Fase 21 - Dashboard completo de Estatísticas (`D14`), repetições e Diário do Ciclo (TDD)

**Depende de:** Fases 10, 11, 19 e 20; decisão `D14` aprovada (`ID-36`).

- Implementar consultas agregadas avançadas no PostgreSQL e no MongoDB cobrindo o contrato completo da Seção 10 de [Contratos-api.md](Contratos-api.md): filtros por período (`7d`, `30d`, `90d`, `tudo`), por etiqueta e por escopo (`todas`, `pessoais`, `grupo`).
- Implementar métricas e gráficos ricos em `Recharts` + SVG acessível:
  - KPIs de taxa de conclusão, tempo médio de conclusão, pontualidade, *streak* ativo/recorde, horas e taxa de conclusão em foco.
  - Gráficos variados: linha/área temporal, **mapa de calor de atividade**, rosca por prioridade, barras/radar por turno e ranking de etiquetas.
  - Painel específico de **tarefas recorrentes** (consistência) e **análise de repetições e retrabalho** (títulos mais repetidos e contador de reaberturas `vezes_reaberta`).
- Construir **Diário do Ciclo (`eventos_ciclo`)** detalhado com pesquisa, filtros por tipo e exportação em `.md` e `.json`, além da persistência completa de `preferencias_cenario`.
- Testar agregações SQL/Mongo, cálculo de *streak*/pontualidade/retrabalho, isolamento multiusuário e renderização dos painéis em TDD.

**Entrega:** Dashboard completo de Estatísticas, análise de recorrência/repetições e Diário rico em conformidade com `D14`.

**Concluída quando:** todos os KPIs, gráficos, filtros e exportação do Diário refletem fielmente os dados reais e passam em TDD.

---

### Fase 22 - Modo Tutorial Guiado após criação de conta (TDD)

**Depende de:** Fases 08, 15, 16, 17, 18, 19, 20 e 21; `ID-38`.

- Construir o componente acessível de **Tour Interativo (*spotlight* em `6` passos)** destacando progressivamente: (1) Horizonte Vivo e clima opt-in, (2) Jornada e árvore até 5 níveis + recorrência, (3) Tarefas em Conjunto por link, (4) Notas ricas e Lembretes Web Push, (5) Mapa Constelação, Foco, Calendário e Estatísticas, e (6) encerramento.
- Integrar com `preferencias_cenario.tutorial` no MongoDB: inicia automaticamente uma única vez para usuários que acabaram de concluir o Primeiro Acesso (`status === "pendente"`), permite **Pular tutorial** a qualquer momento (ou `Esc`) gravando `status = "pulado"`, conclui com `status = "concluido"`, e oferece botão **"Rever tutorial"** em Perfil.
- Garantir compatibilidade com Desktop, Tablet, Celular (`320px+`), foco por teclado e `prefers-reduced-motion`, testando máquina de estados e persistência em TDD.

**Entrega:** Modo Tutorial Guiado persistido por conta, facilmente pulável e acessível em todas as telas.

**Concluída quando:** apenas novos usuários veem o tour automaticamente na primeira entrada, pular impede reabertura em novos logins/dispositivos e Rever funciona pelo Perfil.

---

### Fase 23 - experiência sonora opt-in (TDD)

**Depende de:** Fases 13, 14, 19 e 21; decisão `D15`.

- Selecionar e documentar procedência/licença de paisagens sonoras (Manhã, Tarde, Crepúsculo, Noite, Modo Foco e **som suave de chuva** acoplado aos estados climáticos `chuvoso`/`tempestade`) e micro-efeitos (`D15`).
- Construir controlador centralizado baseado na Web Audio API (opt-in, silenciado por padrão, volumes independentes geral/efeitos/ambiente, transições suaves por momento do dia e clima, e limpeza ao desmontar).
- Testar máquina de estados do controlador de áudio em TDD e realizar verificação auditiva prática.

**Entrega:** camada sonora opcional integrada às ações, transições do dia, clima e preferências no MongoDB.

**Concluída quando:** áudio respeita opt-in rigoroso, sliders de volume persistem no MongoDB e desabilitação libera recursos sem falhas.

---

### Fase 24 - PWA instalável, Sistema de Lembretes e Notificações Web Push (`VAPID`) multi-dispositivo (TDD)

**Depende de:** Fases 04, 07, 08, 11, 13 e 16.

- Completar experiência **PWA instalável** em Desktop e Android com o ícone **Sol de 4 Ls**, adicionando na interface um **mini-guia visual de 2 passos para iOS `16.4+`** (*Compartilhar -> Adicionar à Tela de Início*) quando o aparelho exigir instalação prévia para push.
- Implementar endpoints autenticados para registrar, listar, nomear e revogar dispositivos em `inscricoes_push` (permitindo ativar avisos no PC e no celular na mesma conta, 100% opt-in) e para criar/atualizar/cancelar `lembretes_tarefas` (com escolha de antecedência e cancelamento automático ao concluir ou excluir a tarefa).
- Integrar disparo de Web Push também para eventos das **Tarefas em Conjunto** (`ID-37`: nova subtarefa atribuída ao membro ou etapa concluída na árvore do grupo), respeitando opt-in de cada usuário.
- Implementar adaptador `pywebpush` (`VAPID`) no backend + varredura e **endpoint interno protegido por token** para disparo em lote por cron gratuito no `Render Free`, limpando automaticamente inscrições expiradas (`404`/`410 Gone`).
- Cobrir tudo em TDD (opt-in por aparelho, isolamento por usuário, eventos de grupo, limpeza de inscrições inválidas, proteção do endpoint do cron e fluxo de clique na notificação do *Service Worker*).

**Entrega:** sistema próprio de Lembretes e Notificações Web Push gratuito operando no computador e no celular (inclusive para Tarefas em Conjunto), sem vínculos externos.

**Concluída quando:** um lembrete agendado ou atribuição em grupo dispara Web Push real para os dispositivos autorizados com segurança e revogação verificadas em TDD.

---

## 8. Ciclo 5 - Reformulação visual 3D, acabamento, publicação e entrega acadêmica (Fases 24B e 25-27)

### Fase 24B - Reformulação visual completa do cenário 3D e enquadramento do horizonte (TDD)

**Depende de:** Fases 14, 15 a 24; decisão `ID-40`.

- Executar refatoração artística e técnica completa do cenário 3D após a conclusão das fases funcionais, elevando fidelidade visual, profundidade atmosférica e acabamento de diorama em todos os 4 momentos do dia e 5 estados climáticos.
- Reavaliar em conjunto com Athos o equilíbrio entre geometria procedural e eventuais modelos `.glb` leves/otimizados com compressão e orçamento responsivo controlado, enriquecendo o jardim/paisagem (árvores estilizadas, iluminação quente noturna, água/reflexos, flores mais expressivas e constelações celestes).
- Ajustar enquadramento de câmera, névoa, transparência e respiro visual dos cartões de interface nas principais telas (Landing, Jornada, Mapa, Foco) para que o horizonte 3D permaneça bem visível e harmonioso sem perder contraste WCAG AA (`>= 4.5:1`).
- Atualizar e expandir testes unitários e de integração garantindo pausa em aba oculta, respeito a `prefers-reduced-motion` e alternância automática/manual para o Fallback 2D.

**Entrega:** cenário 3D visualmente reformulado, expressivo e integrado ao respiro da interface sem comprometer desempenho ou contraste.

**Concluída quando:** o novo cenário 3D é validado visualmente ao vivo nos 4 momentos e 5 climas e todos os testes de lógica 3D e acessibilidade passam em TDD.

---

### Fase 25 - revisão de integridade, privacidade, permissões de grupo, segurança, acessibilidade, PWA/Push e desempenho

**Depende de:** Fases 15 a 24.

- Auditar segurança, privacidade e colaboração: OAuth, CSRF, cookies `HttpOnly`, isolamento multiusuário, autorização rigorosa entre **Líder**, **Membro colaborador** e não-membros em Tarefas em Conjunto, proteção do endpoint de disparo de lembretes, garantia de zero consulta de clima sem consentimento (`habilitado: false` padrão) e remoção integral na exclusão da conta.
- Auditar responsividade, Modo Tutorial Guiado, Dashboard com gráficos, instalação PWA e fluxo Web Push em computador, tablet e celular (`320`/`390`/`768`/`1280` px), nos 4 momentos do dia, nos 5 estados climáticos e no Fallback 2D.
- Auditar acessibilidade (foco em modais/tour, leitores de tela, atalhos, `prefers-reduced-motion` desativando flashes de tempestade) e orçamento de desempenho 3D (FPS com nuvens/chuva instanciadas, tempo de carregamento inicial e code-splitting).
- Corrigir eventuais bugs encontrados seguindo rigorosamente **TDD de regressão**.

**Entrega:** relatório de auditoria em `Doc/Revisoes/` e correções validadas por testes.

**Concluída quando:** zero falhas críticas de segurança, privacidade, autorização de grupos, acessibilidade ou quebra de layout permanecem abertas.

---

### Fase 26 - provisionar bancos gratuitos na nuvem e publicar ambiente na web

**Depende de:** Fase 25; decisão `D16`.

- Provisionar bancos gratuitos (**Neon** PostgreSQL e **MongoDB Atlas** `M0`) e aplicar migrações Alembic de produção.
- Publicar backend no **Render** e frontend na **Vercel** com rewrite `/api/*` para mesma origem, gerar e configurar **chaves `VAPID`** no ambiente seguro, configurar **cron gratuito** (GitHub Actions ou `cron-job.org`) para disparo de lembretes e validar URLs no Google Cloud Console (`D16`).
- Executar testes manuais e verificações smoke no ambiente publicado (login Google real, Modo Tutorial ao criar conta, card opt-in de clima, criação/edição composta com recorrência, Tarefa em Conjunto via link entre duas contas, Mapa, Foco, Calendário, Dashboard de Estatísticas, PWA/Web Push em celular/PC e exclusão de conta de teste).

**Entrega:** aplicação publicada online com custo zero e URLs documentadas.

**Concluída quando:** todas as funcionalidades principais (incluindo grupos por link, Dashboard, tutorial, clima opt-in e Web Push) operam no endereço publicado em HTTPS com OAuth Google ativo.

---

### Fase 27 - aceitação final, documentação para Web II e roteiro de apresentação

**Depende de:** Fase 26.

- Executar suíte completa final (`pytest`, `ruff`, `mypy`, `vitest`, `tsc`, `eslint`, build de produção e E2E Playwright) sem alterações pendentes.
- Atualizar `README.md` na raiz, `Doc/Ambiente-local.md` e documentação acadêmica (diagrama ER completo + esquema MongoDB + diagrama de arquitetura poliglota + OpenAPI exportável).
- Preparar roteiro demonstrativo para apresentação na disciplina **Web II**, apoiado em [Processo-de-desenvolvimento-com-IA.md](Processo-de-desenvolvimento-com-IA.md), destacando a simulação do ciclo do dia com Lua 3D na fase real, nuvens/chuva reativas, mini-card opt-in de clima, Web Push ao vivo no celular, as tarefas compostas multinível com recorrência, a colaboração em **Tarefas em Conjunto**, o **Dashboard de Estatísticas**, o **Modo Tutorial**, a arquitetura poliglota, a orquestração multimodelo (`Orchestrator` com `Gemini 4 Neon` e `Gemini 4 Hydrogen`) e a engenharia SDD/SOLID/TDD.

**Entrega:** primeira entrega encerrada, verificada e pronta para apresentação em Web II.

**Concluída quando:** todos os checklists das 27 fases estão concluídos e o projeto roda de forma impecável tanto localmente quanto na web.
