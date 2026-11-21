# Roteiro de desenvolvimento - primeira entrega (Lume)

**Registro de situação em 21/11/2026:** **Fases 01, 02 e 03 concluídas** (`D01 = Lume`, `D02 = Alvorada Poética com transição cromática contínua 24h`, `D03 = Fraunces + Plus Jakarta Sans + JetBrains Mono` e `D04 = Soft-3D Clay Matte + Bento UI, marca Sol de 4 Ls com 4 favicons adaptativos por horário, diorama/plantas/sol/lua 3D e 16 avatares` consolidados em [Guia-visual.md](Guia-visual.md)). Em `21/11/2026`, foram incorporadas as evoluções **`ID-24` a `ID-27`** (card opt-in Cidade + Horário + Temperatura via Open-Meteo, Lua 3D na fase lunar real do Hemisfério Sul, Sistema de Lembretes + PWA/Web Push `VAPID` e cenário climático reativo nos 5 estados WMO), expandindo o roteiro de `22` para **24 fases em 5 ciclos**. Próxima etapa: **Fase 04: fechar contratos de API (`Doc/Contratos-api.md`), regras finas da árvore (`D08`-`D10`), limites operacionais (`D09`), primeiro acesso (`D05`), sessão/CSRF (`D07`) e exclusão de conta (`D06`)**. Base SDD em [Regras.md](../Agents/Regras.md), [Detalhes.md](Detalhes.md), [Guia-visual.md](Guia-visual.md), [Planejamento-tecnico.md](Planejamento-tecnico.md), [Processo-de-desenvolvimento-com-IA.md](Processo-de-desenvolvimento-com-IA.md) e [Registro-de-ideias-e-decisoes.md](Registro-de-ideias-e-decisoes.md).

**Escopo da primeira entrega:** aplicação web responsiva e PWA instalável de gerenciamento de tarefas pessoais para Web II com Login exclusivo via Google OAuth, primeiro acesso e exclusão de conta, cadastro e gestão completa de tarefas com 4 prioridades, composição em árvore multinível (até 5 níveis) com progresso automático e cascata inteligente, simulação viva do ciclo do dia (**Manhã**, **Tarde**, **Crepúsculo**, **Noite**) com **Lua 3D na fase lunar real (Hemisfério Sul)**, **clima local opt-in (Cidade + Horário + Temperatura)** e **cenário climático reativo (nuvens, chuva e tempestade suave)** em cena 3D híbrida (com Modo Desempenho / Fallback 2D), Landing com demos interativas locais, Jornada do Dia, Mapa Visual Constelação/Ramos, Modo Foco Imersivo, Calendário Mensal dos Prazos, Estatísticas/Diário do Ciclo, experiência sonora opt-in, **Sistema de Lembretes + Web Push multi-dispositivo** e publicação gratuita na web.

---

## 1. Como executar o roteiro

O desenvolvimento é guiado por **Spec-Driven Development (SDD)** e dividido em **24 fases distribuídas ao longo de 5 ciclos**.

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
- [ ] Fase 04 - fechar contratos de API (incl. clima local e lembretes/push), regras finas da árvore (`D08`-`D10`) e exclusão de conta (`D06`)
- [ ] Fase 05 - prototipar navegação, atmosferas, mini-card de clima/seletor climático, lembretes/push e telas principais
- [ ] Fase 06 - preparar ambiente, revisar `.gitignore`, skeletons FastAPI + React/TS/Vite e CI inicial
- [ ] Fase 07 - migrações PostgreSQL (incl. push e lembretes), conexão MongoDB e adaptadores base (TDD)
- [ ] Fase 08 - autenticação Google OAuth 2.0, sessão segura, primeiro acesso e exclusão de conta (TDD)
- [ ] Fase 09 - motor de domínio da árvore de tarefas compostas (profundidade 5, ciclos, cascata, alerta urgente) (TDD)
- [ ] Fase 10 - API poliglota completa de tarefas, etiquetas, notas ricas e consistência (TDD)
- [ ] Fase 11 - serviço de clima local (Open-Meteo), busca de cidades e consentimento de localização (TDD)
- [ ] Fase 12 - sistema visual adaptativo (4 momentos), astronomia lunar real, clima no Fallback 2D e base PWA (TDD)
- [ ] Fase 13 - cenário 3D vivo em Three.js/R3F com Lua 3D na fase real e nuvens/chuva reativos (TDD)
- [ ] Fase 14 - landing cinematográfica com demos locais e fluxo completo de entrada (TDD)
- [ ] Fase 15 - Jornada do Dia: lista hierárquica, drag-and-drop, filtros, mini-card de clima opt-in e lembretes (TDD)
- [ ] Fase 16 - Mapa Visual de Constelação/Ramos (editor 2D/SVG sobre o 3D + persistência de layout no MongoDB) (TDD)
- [ ] Fase 17 - Modo Foco Imersivo com temporizador solar/lunar e registro de sessões (TDD)
- [ ] Fase 18 - Calendário Mensal dos Prazos com prioridades e fases lunares (TDD)
- [ ] Fase 19 - Estatísticas do ciclo, Diário/Histórico (`eventos_ciclo`) e preferências persistidas (TDD)
- [ ] Fase 20 - experiência sonora opt-in (micro-efeitos, paisagens por momento do dia e som de chuva) (TDD)
- [ ] Fase 21 - PWA instalável, Sistema de Lembretes e Notificações Web Push (`VAPID`) multi-dispositivo (TDD)
- [ ] Fase 22 - revisão de integridade, privacidade/consentimento, segurança, acessibilidade, PWA/Push e desempenho 3D/chuva
- [ ] Fase 23 - provisionar bancos gratuitos na nuvem e publicar ambiente na web (incl. chaves `VAPID` e cron gratuito)
- [ ] Fase 24 - aceitação final, documentação para Web II e roteiro de apresentação

---

## 2. Distribuição dos 5 ciclos

| Ciclo | Fases | Objetivo principal | Foco metodológico |
| --- | --- | --- | --- |
| Ciclo 1 | 01-05 | Especificação SDD, nome/identidade visual, contratos e protótipos navegáveis | Descoberta guiada e decisões `D01`-`D16` |
| Ciclo 2 | 06-11 | Fundação técnica, Git/CI, bancos poliglotas, OAuth, motor de tarefas e clima local | TDD rigoroso de backend, SOLID, ACID e opt-in |
| Ciclo 3 | 12-16 | Design System 24h + astronomia lunar + PWA base, mundo 3D reativo ao clima, Landing, Jornada e Mapa | TDD frontend, WebGL leve, privacidade e acessibilidade |
| Ciclo 4 | 17-21 | Modo Foco, Calendário Mensal, Estatísticas/Diário, Experiência Sonora opt-in e Lembretes/Web Push | Integração poliglota completa e avisos multi-dispositivo |
| Ciclo 5 | 22-24 | Auditoria de segurança/consentimento/PWA/desempenho, deploy gratuito na web e apresentação Web II | Verificação real em produção e documentação final |

---

## 3. Matriz de decisões (`D01`-`D16`)

Decisões arquiteturais centrais já fechadas nas Fases 01 a 03 e nas evoluções `ID-24` a `ID-27`: conceito **Horizonte Vivo** (simulação do dia + jardim + sol + Lua 3D na fase real do Hemisfério Sul + constelações + clima reativo opt-in), composição multinível até **5 níveis** com bloqueio de ciclos e cascata inteligente, modelo equilibrado de tarefa com **4 prioridades independentes + alerta de filha urgente**, **Landing com demos interativas locais**, **apenas Google OAuth**, divisão poliglota **PostgreSQL (estrutural + push/lembretes) + MongoDB (notas ricas, layouts, eventos, preferências)**, **3D híbrido inteligente em Three.js/R3F + editor 2D/SVG + Fallback 2D**, **áudio opt-in**, **PWA + Lembretes Web Push sem vínculo a calendários externos** e **execução local + publicação gratuita na web**.

A tabela abaixo lista todas as decisões estruturantes (`D01`-`D16`) que governam o desenvolvimento:

| ID | Decisão | Preparação esperada da IA | Responsável | Fase limite | Situação |
| --- | --- | --- | --- | --- | --- |
| D01 | Nome definitivo da aplicação | Apresentar opções refinadas com racional de marca | IA propõe; Athos escolhe | Fase 02 | Aprovada em 20/11/2026: **Lume** |
| D02 | Paletas dos 4 momentos do dia + transição cromática contínua 24h | Preparar direções cromáticas e validar transição contínua minuto a minuto com checagem WCAG | IA propõe; Athos escolhe | Fase 02 | Aprovada em 20/11/2026: **Alvorada Poética com transição contínua 24h** |
| D03 | Trio tipográfico (Display + Sans + Mono) e licenças locais | Comparar combinações legíveis em títulos, listas densas, acentos pt-BR e timers | IA propõe; Athos escolhe | Fase 02 | Aprovada em 20/11/2026: **Fraunces + Plus Jakarta Sans + JetBrains Mono** (`SIL OFL 1.1`) |
| D04 | Marca, logotipo, ícones do jardim/constelações e coleção inicial de avatares | Apresentar conceitos visuais reutilizáveis e catálogo inicial de avatares | IA propõe; Athos aprova | Fase 03 | Aprovada em 20/11/2026: Soft-3D Clay Matte + Bento UI, marca Sol de 4 Ls (4 favicons por horário), diorama/plantas/sol/lua 3D e 16 avatares (+ Google/upload) |
| D05 | Primeiro acesso: formato de nome de usuário, avatar e tarefas-guia iniciais | Definir regras de nome de exibição e se usuário novo pode importar exemplos editáveis | IA propõe; Athos decide | Fase 04 | Em aberto |
| D06 | Exclusão de conta: fluxo de confirmação e remoção definitiva em ambos os bancos | Detalhar aviso, palavra/ação de confirmação e remoção completa de dados pessoais | IA propõe; Athos aprova | Fase 04 | Em aberto |
| D07 | Política de sessão, cookie e ambiente local/produção para Google OAuth | Mapear uso de mesma origem/rewrite `/api`, expiração de sessão e proteção CSRF | IA propõe; Athos valida | Fase 04 | Em aberto |
| D08 | Detalhes finos da cascata: cálculo do %, desfazer conclusão em lote e regra ao excluir mãe com filhas | Demonstrar cenários práticos (ponderação igual vs folhas; excluir cascata vs promover filhas) | IA propõe; Athos escolhe | Fase 04 | Em aberto |
| D09 | Limites operacionais (tamanho de título/notas, máx. etiquetas, máx. tarefas ativas por usuário) | Propor limites saudáveis contra abuso e para boa legibilidade do mapa/3D | IA propõe; Athos aprova | Fase 04 | Em aberto |
| D10 | Blocos suportados em `notas_em_blocos` (MongoDB) e formato de exportação/diário | Definir conjunto enxuto e rico (parágrafos, subtítulos, citações, listas, código/links) | IA propõe; Athos aprova | Fase 04 | Em aberto |
| D11 | Biblioteca do editor do Mapa Visual (`@xyflow/react` vs motor SVG customizado) | Comparar flexibilidade visual orgânica (ramos/constelação), acessibilidade e tamanho de bundle | IA analisa; Athos confirma | Fase 05 | Em aberto |
| D12 | Navegação principal e organização responsiva das 5 visões | Protótipo interativo em desktop, tablet e celular (Jornada, Mapa, Foco, Calendário, Estatísticas) | IA prototipa; Athos aprova | Fase 05 | Em aberto |
| D13 | Modelos 3D / assets do jardim e desempenho máximo (orçamento de triângulos e FPS) | Escolher abordagem autoral Soft-3D / instanciada ou assets livres documentados + Fallback 2D | IA propõe; Athos aprova | Fase 13 | Em aberto |
| D14 | Métricas exatas e visualizações do painel de Estatísticas e Diário do Ciclo | Propor indicadores (taxa diária, equilíbrio por turno, foco, constelações concluídas) | IA propõe; Athos escolhe | Fase 19 | Em aberto |
| D15 | Seleção das paisagens sonoras e micro-efeitos com licença livre comprovada | Preparar prévias audíveis e registro de procedência/licença (CC0/MIT/sintetizado) | IA prepara; Athos escolhe | Fase 20 | Em aberto |
| D16 | Contas externas e URLs finais de publicação gratuita | Auxiliar configuração no Google Cloud, Vercel, Render, Neon e MongoDB Atlas | Athos configura contas; IA integra | Fase 23 | Em aberto |

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

---

### Fase 05 - prototipar navegação, atmosferas e telas principais

**Depende de:** Fases 02, 03 e 04; decisões `D11` e `D12`.

- Decidir entre `@xyflow/react` ou motor SVG customizado (`D11`) para o editor 2D do Mapa Constelação/Ramos.
- Construir protótipo navegável estático em `Doc/Prototipos/` cobrindo Landing com demos, Primeiro Acesso, Jornada do Dia (incluindo **mini-card opt-in de Cidade + Horário + Temperatura** e **seletor climático** no Simulador), Mapa Constelação/Ramos, Modo Foco, Calendário Mensal, Estatísticas/Diário, Perfil/Preferências (**consentimento de clima** e **painel de Lembretes/Dispositivos Web Push com guia iOS**) e estados de vazio/erro/carregamento.
- Validar fluxo e adaptação visual em desktop, tablet e celular (`D12`) nos 4 momentos do dia.

**Entrega:** `Doc/Prototipos/` aprovado e decisões `D11`-`D12` fechadas.

**Concluída quando:** o responsável percorre e aprova toda a navegação e organização visual das telas antes da implementação.

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

---

### Fase 07 - migrações PostgreSQL (incl. push e lembretes), conexão MongoDB e adaptadores base (TDD)

**Depende de:** Fases 04 e 06.

- Configurar ambientes separados de desenvolvimento e teste no PostgreSQL `18.0` e no MongoDB `8.2.5`.
- Criar esquema inicial no PostgreSQL via Alembic (`usuarios`, `sessoes`, `tarefas`, `etiquetas`, `tarefa_etiquetas`, `sessoes_foco`, `inscricoes_push`, `lembretes_tarefas`) com restrições, chaves cascata e índices definidos em `Planejamento-tecnico.md`.
- Configurar cliente `PyMongo` (`AsyncMongoClient`), índices das coleções (`detalhes_tarefas`, `layouts_constelacao`, `eventos_ciclo`, `preferencias_cenario` incluindo o bloco opt-in `clima`) e protocolos/adaptadores com injeção de dependência (SOLID).
- Escrever e validar testes de integração reais de conexão, migrações e isolamento do banco de testes seguindo TDD.

**Entrega:** camada de persistência poliglota inicial testada em integração real.

**Concluída quando:** migrações Alembic aplicam/revertem limpas e testes de integração passam nos dois bancos de teste.

---

### Fase 08 - autenticação Google OAuth 2.0, sessão segura, primeiro acesso e exclusão de conta (TDD)

**Depende de:** Fases 04 (`D05`, `D06`, `D07`) e 07.

- Implementar adaptador Google OAuth 2.0 atrás de contrato (DIP), fluxo Authorization Code + `state`, criação de sessão server-side com cookie `HttpOnly` e proteção CSRF.
- Implementar fluxo de primeiro acesso (`nome_exibicao`, `avatar_id`, tarefas-guia opcionais conforme `D05`), leitura/edição de perfil e exclusão definitiva de conta (`D06`) removendo todos os dados do usuário no PostgreSQL (incluindo `inscricoes_push` e `lembretes_tarefas`) e no MongoDB (`preferencias_cenario` com clima/cidade, notas, layouts e eventos).
- Cobrir tudo com TDD (substituto controlado do Google nos testes unitários + testes de integração de sessão, CSRF e exclusão).

**Entrega:** autenticação completa e segura operando de ponta a ponta na API e nos endpoints de sessão.

**Concluída quando:** login, bloqueio de rotas privadas, primeiro acesso, edição de perfil e exclusão completa passam em TDD.

---

### Fase 09 - motor de domínio da árvore de tarefas compostas (TDD)

**Depende de:** Fase 04 (`D08`, `D09`) e Fase 06.

- Implementar em `Backend/src/dominio/` as regras puras da árvore de tarefas sem dependência de banco ou HTTP:
  - Profundidade máxima de `5` níveis.
  - Bloqueio de ciclos em criação e movimentação (`reparenting`).
  - Cálculo recursivo automático de progresso (%) conforme `D08`.
  - Conclusão automática de baixo para cima, conclusão em cascata com desfazer e reabertura ascendente para `em_andamento`.
  - Prioridade independente por nó com cálculo derivado de alerta de descendente `urgente` em aberto.
- Testar exaustivamente casos de borda via TDD unitário.

**Entrega:** núcleo de domínio puro 100% coberto por testes unitários e revisado quanto a SOLID.

**Concluída quando:** todas as invariantes e cenários de árvore multinível passam em TDD sem I/O externo.

---

### Fase 10 - API poliglota completa de tarefas, etiquetas, notas ricas e consistência (TDD)

**Depende de:** Fases 07, 08 e 09.

- Implementar repositórios PostgreSQL (CTEs recursivas `WITH RECURSIVE`, transações atômicas de cascata/reparenting/promoção a raiz/reordenação) e MongoDB (`detalhes_tarefas`, `eventos_ciclo`).
- Implementar rotas FastAPI para CRUD de tarefas, subtarefas, reparenting, promoção, ordenação, filtros, busca, etiquetas e notas ricas (`D10`), aplicando estratégia de consistência eventual e fallback seguro entre os dois bancos.
- Validar isolamento estrito por `usuario_id`, códigos de erro estáveis e contratos Pydantic via testes de integração TDD.

**Entrega:** backend funcional completo de gestão de tarefas compostas e persistência poliglota.

**Concluída quando:** todos os endpoints do núcleo passam em testes unitários e de integração com PostgreSQL e MongoDB de teste.

---

### Fase 11 - serviço de clima local (Open-Meteo), busca de cidades e consentimento de localização (TDD)

**Depende de:** Fases 04, 07 e 08.

- Implementar adaptador `Open-Meteo` atrás de contrato (`Backend/src/contratos/`) para consulta gratuita de previsão atual (temperatura e código climático WMO) e busca textual de cidades, sem depender de chave paga.
- Mapear códigos climáticos WMO para os `5` estados oficiais (`limpo`, `parcialmente_nublado`, `nublado`, `chuvoso`, `tempestade`), com cache em memória (`15-30 min`) por coordenada arredondada e fallback seguro (nunca derrubando o app se a API externa oscilar).
- Implementar endpoints autenticados de consentimento opt-in (`preferencias_cenario.clima`): recurso **desativado por padrão** (`habilitado: false`); só consulta após autorização explícita (geolocalização do navegador ou escolha manual de cidade) e **remove imediatamente cidade/coordenadas aproximadas quando desativado**.
- Cobrir mapeamento WMO, cache, fallback e privacidade/consentimento em TDD com dublês HTTP.

**Entrega:** serviço backend seguro e opt-in de clima local e busca de cidades testado em TDD.

**Concluída quando:** nenhuma chamada externa ocorre sem consentimento, a revogação limpa dados salvos e os `5` estados retornam padronizados.

---

## 6. Ciclo 3 - Design System 24h, mundo 3D reativo, Landing, Jornada e Mapa (Fases 12-16)

### Fase 12 - sistema visual adaptativo (4 momentos), astronomia lunar real, Fallback 2D e base PWA (TDD)

**Depende de:** Fases 02, 03, 05 e 06.

- Implementar tokens CSS no Tailwind v4 para a transição contínua 24h sobre **Manhã**, **Tarde**, **Crepúsculo** e **Noite**, fontes hospedadas localmente (`SIL OFL 1.1` com **bold** e **itálico**, `ID-17`), controlador dos **4 favicons adaptativos por horário (`Sol de 4 Ls`)** atualizando `<link rel="icon">` apenas na troca de faixa, componentes base acessíveis sobre Radix UI e primitivas de **animação de texto, efeitos de escrita, hover tátil e movimento** (`ID-19`, respeitando `prefers-reduced-motion`).
- Construir em `Frontend/src/astronomia/` o **módulo astronômico puro offline** (TDD) calculando posição solar/lunar e **fase lunar real + percentual iluminado com orientação do Hemisfério Sul**, além do motor temporal **Relógio Real vs Modo Simulador**.
- Construir o **Modo Desempenho / Fallback 2D** em SVG/CSS com detecção de suporte WebGL e `prefers-reduced-motion`, exibindo fase lunar real em SVG e camadas leves para os `5` estados climáticos (`limpo` a `tempestade`).
- Configurar base do **PWA** (`manifest.webmanifest` com o ícone `Sol de 4 Ls` e *Service Worker* base pronto para receber Push na Fase 21).

**Entrega:** sistema visual, favicons adaptativos, módulo lunar offline, paisagem 2D fallback e base PWA testados.

**Concluída quando:** alternar momentos do dia ou estados climáticos no Modo Desempenho transforma toda a UI com contraste WCAG AA, fase lunar exata e zero erros.

---

### Fase 13 - cenário 3D vivo em Three.js/R3F com Lua 3D real e nuvens/chuva reativos (TDD)

**Depende de:** Fases 03 e 12; decisão `D13`.

- Construir cena 3D em `@react-three/fiber` + `@react-three/drei` no estilo **Soft-3D Clay Matte** (`ID-21`) com céu atmosférico dinâmico, trajetória do Sol e da **Lua 3D iluminada exatamente pela fase lunar atual** (orientação do Hemisfério Sul + luz cinérea sutil), estrelas, constelações panorâmicas ligadas ao progresso e jardim estilizado reativo (`D13`).
- Implementar a camada climática 3D reativa nos `5` estados WMO: nuvens **Soft-3D** em camadas graduais, gotas de chuva via `InstancedMesh` e tempestade suave (sem flashes quando `prefers-reduced-motion` estiver ativo).
- Integrar com o **Arco do Dia** e o **seletor de clima no Modo Simulador**, respeitando orçamento de FPS/memória, pausa em aba oculta e descarte limpo ao alternar para o Fallback 2D.
- Garantir testes TDD para lógica de cena, mapeamento fase lunar/clima→iluminação/partículas e troca segura para Fallback 2D.

**Entrega:** cenário 3D vivo integrado ao ciclo do dia, fase lunar real, clima atmosférico e progresso do usuário.

**Concluída quando:** a transição contínua 24h, a Lua 3D na fase atual, o clima 3D (`nuvens`/`chuva`) e o Fallback 2D funcionam sem vazamentos de memória ou erros no console.

---

### Fase 14 - landing cinematográfica com demos locais e fluxo completo de entrada (TDD)

**Depende de:** Fases 05, 08 e 13.

- Construir Landing com o cenário 3D/2D vivo, apresentação do conceito com **efeitos de escrita tipográfica, bold/itálico expressivo e microinterações de hover/movimento** (`ID-17`, `ID-19`) e pequenas **demonstrações interativas locais** (Arco do Dia 24h + seletor rápido de clima + mini tarefa composta reagindo na hora, sem gravar no servidor).
- Integrar botão de login Google, tela de Primeiro Acesso (`nome_exibicao`, escolha entre os `16` avatares Soft-3D + foto Google + upload próprio e opção de tarefas-guia), Perfil e fluxo seguro de Exclusão de Conta.
- Testar interações, acessibilidade por teclado e proteção contra acesso sem autenticação via TDD/Playwright.

**Entrega:** porta de entrada completa do aplicativo do visitante até o usuário autenticado.

**Concluída quando:** visitante experimenta a demo local, autentica com Google, configura primeiro acesso e pode gerenciar/excluir a conta.

---

### Fase 15 - Jornada do Dia: lista hierárquica, drag-and-drop, filtros, clima opt-in e lembretes (TDD)

**Depende de:** Fases 10, 11, 12 e 14.

- Implementar a visão principal **Jornada do Dia** sobre o cenário vivo: **mini-card Bento compacto** exibindo horário local e, mediante **consentimento opt-in explícito** (`ID-24`), **cidade atual, temperatura e ícone do clima** com atalho para autorizar geolocalização, buscar cidade manualmente ou desativar.
- Implementar agrupamento por turnos (`manha`, `tarde`, `noite`, `livre`), árvore expansível até 5 níveis, barras de progresso automático, indicador visual de filha urgente e desfazer conclusão em cascata.
- Implementar arrastar-e-soltar acessível (`@dnd-kit` + comandos de teclado), barra de busca/filtros, gestão de etiquetas, campo de **configuração de lembrete por tarefa** (consumido pelo agendador na Fase 21) e gaveta lateral de edição com editor de notas ricas (`detalhes_tarefas`).
- Cobrir lógica de interface, fluxo de consentimento do card de clima, mapeamento de API e fluxos principais em TDD.

**Entrega:** gerenciamento diário e hierárquico completo conectado aos dois bancos e ao clima opt-in.

**Concluída quando:** todas as operações CRUD, composição até 5 níveis, bloqueio de ciclos, notas ricas e o mini-card opt-in de Cidade/Horário/Temperatura funcionam de ponta a ponta.

---

### Fase 16 - Mapa Visual de Constelação/Ramos (TDD)

**Depende de:** Fases 05 (`D11`), 10 e 15.

- Implementar endpoint/integração de `layouts_constelacao` no MongoDB e a visão **Mapa Visual** híbrida 2D/SVG sobre o cenário 3D.
- Exibir tarefas compostas como **ramos botânicos orgânicos** de dia e **constelações luminosas** no crepúsculo/noite, permitindo navegar, arrastar nós, criar subtarefas, concluir itens e reorganizar automaticamente, com navegação equivalente por teclado.
- Validar persistência de layout e sincronia com o estado real das tarefas em TDD.

**Entrega:** Mapa Visual de Constelação/Ramos funcional e persistente.

**Concluída quando:** mudanças no Mapa refletem imediatamente na Jornada/PostgreSQL e posições personalizadas persistem no MongoDB.

---

## 7. Ciclo 4 - Foco, Calendário, Estatísticas, Áudio e Lembretes/Web Push (Fases 17-21)

### Fase 17 - Modo Foco Imersivo com temporizador solar/lunar (TDD)

**Depende de:** Fases 10, 13 e 15.

- Implementar endpoints de `sessoes_foco` (iniciar, concluir, interromper) gerando também `eventos_ciclo` no MongoDB.
- Construir tela **Modo Foco Imersivo** com temporizador visual solar/lunar, adaptação contemplativa do cenário 3D/2D e lista imediata de subtarefas da tarefa em foco.
- Cobrir regras de sessão única ativa, registro de duração e ações na UI com TDD.

**Entrega:** experiência completa de Modo Foco integrada ao backend poliglota.

**Concluída quando:** iniciar, pausar/interromper e concluir sessões grava corretamente no PostgreSQL e alimenta o Diário.

---

### Fase 18 - Calendário Mensal dos Prazos com prioridades e fases lunares (TDD)

**Depende de:** Fases 10, 12 e 15.

- Implementar consulta otimizada de tarefas por janela mensal no PostgreSQL e reutilizar o módulo astronômico puro da Fase 12 para exibir a fase lunar real e percentual iluminado de cada dia (Hemisfério Sul).
- Construir visão **Calendário Mensal** com indicadores luminosos de prioridade/atraso, seleção de dia, abertura rápida para edição/conclusão e total navegabilidade por teclado.
- Validar fusos horários, virada de mês e filtros com TDD.

**Entrega:** Calendário Mensal integrado aos prazos reais das tarefas compostas.

**Concluída quando:** qualquer tarefa com prazo aparece no dia correto com prioridade, fase lunar e interação direta funcional.

---

### Fase 19 - Estatísticas, Diário do Ciclo e preferências persistidas (TDD)

**Depende de:** Fases 10, 17 e 18; decisão `D14`.

- Fechar definição de indicadores (`D14`) e implementar consultas agregadas no PostgreSQL + leitura paginada de `eventos_ciclo` e persistência completa de `preferencias_cenario` no MongoDB (incluindo consentimento opt-in de clima/localização).
- Construir painel de **Estatísticas & Diário do Ciclo** com visualização clara de progresso, equilíbrio entre turnos, horas focadas e linha do tempo de conquistas.
- Testar agregações, isolamento por usuário e restauração de preferências ao relogar em TDD.

**Entrega:** acompanhamento de progresso e persistência de preferências concluídos.

**Concluída quando:** estatísticas refletem fielmente sessões e conclusões reais e preferências sobrevivem entre dispositivos/sessões.

---

### Fase 20 - experiência sonora opt-in (TDD)

**Depende de:** Fases 12, 13, 17 e 19; decisão `D15`.

- Selecionar e documentar procedência/licença de paisagens sonoras (Manhã, Tarde, Crepúsculo, Noite, Modo Foco e **som suave de chuva** acoplado aos estados climáticos `chuvoso`/`tempestade`) e micro-efeitos (`D15`).
- Construir controlador centralizado baseado na Web Audio API (opt-in, silenciado por padrão, volumes independentes geral/efeitos/ambiente, transições suaves por momento do dia e clima, e limpeza ao desmontar).
- Testar máquina de estados do controlador de áudio em TDD e realizar verificação auditiva prática.

**Entrega:** camada sonora opcional integrada às ações, transições do dia, clima e preferências no MongoDB.

**Concluída quando:** áudio respeita opt-in rigoroso, sliders de volume persistem no MongoDB e desabilitação libera recursos sem falhas.

---

### Fase 21 - PWA instalável, Sistema de Lembretes e Notificações Web Push (`VAPID`) multi-dispositivo (TDD)

**Depende de:** Fases 04, 07, 08, 12 e 15.

- Completar experiência **PWA instalável** em Desktop e Android com o ícone **Sol de 4 Ls**, adicionando na interface um **mini-guia visual de 2 passos para iOS `16.4+`** (*Compartilhar -> Adicionar à Tela de Início*) quando o aparelho exigir instalação prévia para push.
- Implementar endpoints autenticados para registrar, listar, nomear e revogar dispositivos em `inscricoes_push` (permitindo ativar avisos no PC e no celular na mesma conta, 100% opt-in) e para criar/atualizar/cancelar `lembretes_tarefas` (com escolha de antecedência e cancelamento automático ao concluir ou excluir a tarefa).
- Implementar adaptador `pywebpush` (`VAPID`) no backend + varredura e **endpoint interno protegido por token** para disparo em lote por cron gratuito no `Render Free`, limpando automaticamente inscrições expiradas (`404`/`410 Gone`).
- Cobrir tudo em TDD (opt-in por aparelho, isolamento por usuário, limpeza de inscrições inválidas, proteção do endpoint do cron e fluxo de clique na notificação do *Service Worker*).

**Entrega:** sistema próprio de Lembretes e Notificações Web Push gratuito operando no computador e no celular, sem vínculos externos.

**Concluída quando:** um lembrete agendado no PC dispara Web Push real para os dispositivos autorizados da mesma conta com segurança e revogação verificadas em TDD.

---

## 8. Ciclo 5 - Acabamento, publicação e entrega acadêmica (Fases 22-24)

### Fase 22 - revisão de integridade, privacidade, segurança, acessibilidade, PWA/Push e desempenho

**Depende de:** Fases 14 a 21.

- Auditar segurança e privacidade: OAuth, CSRF, cookies `HttpOnly`, isolamento multiusuário em todas as rotas SQL/MongoDB, proteção do endpoint de disparo de lembretes, garantia de zero consulta de localização/clima sem consentimento explícito (`habilitado: false` padrão) e remoção integral na exclusão da conta.
- Auditar responsividade, instalação PWA e fluxo Web Push em computador, tablet e celular (320/390/768/1280 px), nos 4 momentos do dia, nos 5 estados climáticos e no Fallback 2D.
- Auditar acessibilidade (foco em modais, leitores de tela, atalhos, `prefers-reduced-motion` desativando flashes de tempestade) e orçamento de desempenho 3D (FPS com nuvens/chuva instanciadas, tempo de carregamento inicial e code-splitting).
- Corrigir eventuais bugs encontrados seguindo rigorosamente **TDD de regressão**.

**Entrega:** relatório de auditoria em `Doc/Revisoes/` e correções validadas por testes.

**Concluída quando:** zero falhas críticas de segurança, privacidade, acessibilidade ou quebra de layout permanecem abertas.

---

### Fase 23 - provisionar bancos gratuitos na nuvem e publicar ambiente na web

**Depende de:** Fase 22; decisão `D16`.

- Provisionar bancos gratuitos (**Neon** PostgreSQL e **MongoDB Atlas** `M0`) e aplicar migrações Alembic de produção.
- Publicar backend no **Render** e frontend na **Vercel** com rewrite `/api/*` para mesma origem, gerar e configurar **chaves `VAPID`** no ambiente seguro, configurar **cron gratuito** (GitHub Actions ou `cron-job.org`) para disparo de lembretes e validar URLs no Google Cloud Console (`D16`).
- Executar testes manuais e verificações smoke no ambiente publicado (login Google real, card opt-in de clima, criação/edição composta, Mapa, Foco, Calendário, PWA/Web Push em celular/PC e exclusão de conta de teste).

**Entrega:** aplicação publicada online com custo zero e URLs documentadas.

**Concluída quando:** todas as funcionalidades principais (incluindo clima opt-in e Web Push) operam no endereço publicado em HTTPS com OAuth Google ativo.

---

### Fase 24 - aceitação final, documentação para Web II e roteiro de apresentação

**Depende de:** Fase 23.

- Executar suíte completa final (`pytest`, `ruff`, `mypy`, `vitest`, `tsc`, `eslint`, build de produção e E2E Playwright) sem alterações pendentes.
- Atualizar `README.md` na raiz, `Doc/Ambiente-local.md` e documentação acadêmica (diagrama ER + esquema MongoDB + diagrama de arquitetura poliglota + OpenAPI exportável).
- Preparar roteiro demonstrativo para apresentação na disciplina **Web II**, apoiado em [Processo-de-desenvolvimento-com-IA.md](Processo-de-desenvolvimento-com-IA.md), destacando a simulação do ciclo do dia com Lua 3D na fase real, nuvens/chuva reativas, mini-card opt-in de clima, Web Push ao vivo no celular, as tarefas compostas multinível, a arquitetura poliglota, a orquestração multimodelo (`Orchestrator` com `Gemini 4 Neon` e `Gemini 4 Hydrogen`) e a engenharia SDD/SOLID/TDD.

**Entrega:** primeira entrega encerrada, verificada e pronta para apresentação em Web II.

**Concluída quando:** todos os checklists das 24 fases estão concluídos e o projeto roda de forma impecável tanto localmente quanto na web.
