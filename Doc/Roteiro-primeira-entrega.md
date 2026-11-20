# Roteiro de desenvolvimento — primeira entrega (Horizonte Vivo — nome provisório)

**Registro de situação em 20/11/2026:** **Fase 01 concluída** (escopo consolidado após entrevista `/grill-me`, regras em [Regras.md](../Agents/Regras.md), especificação em [Detalhes.md](Detalhes.md), planejamento técnico em [Planejamento-tecnico.md](Planejamento-tecnico.md), processo com agentes de IA em [Processo-de-desenvolvimento-com-IA.md](Processo-de-desenvolvimento-com-IA.md) e ambiente local verificado). Próxima etapa: **Fase 02 — decidir nome definitivo (`D01`), paletas dos 4 momentos do dia (`D02`) e trio tipográfico (`D03`)**.

**Escopo da primeira entrega:** aplicação web de gerenciamento de tarefas pessoais para Web II com Login exclusivo via Google OAuth, primeiro acesso e exclusão de conta, cadastro e gestão completa de tarefas com 4 prioridades, composição em árvore multinível (até 5 níveis) com progresso automático e cascata inteligente, simulação viva do ciclo do dia (**Manhã**, **Tarde**, **Crepúsculo**, **Noite**) em cena 3D híbrida (com Modo Desempenho / Fallback 2D), Landing com demos interativas locais, Jornada do Dia, Mapa Visual Constelação/Ramos, Modo Foco Imersivo, Calendário Mensal dos Prazos, Estatísticas/Diário do Ciclo, experiência sonora opt-in e publicação gratuita na web.

---

## 1. Como executar o roteiro

O desenvolvimento é guiado por **Spec-Driven Development (SDD)** e dividido em **22 fases distribuídas ao longo de 5 ciclos**.

### Responsabilidades
- **IA de desenvolvimento:** elaborar especificações, alternativas concretas para decisões abertas, implementar seguindo `pt-BR`, **SOLID** e **TDD**, executar verificações reais, registrar limitações e atualizar este roteiro.
- **Responsável pelo projeto (Athos):** escolher direção visual, nome definitivo, paletas, tipografia, responder às decisões `D01`–`D16`, revisar protótipos/entregas e configurar acessos pessoais em contas externas (Google Cloud, Vercel, Render, Neon, MongoDB Atlas, GitHub).
- **Decisão conjunta:** ajustes de escopo, tratamento de casos de borda, substituição de bibliotecas incompatíveis e aceitação final da entrega.

### Regra para concluir uma fase
- **TDD e SOLID desde a primeira fase de código executável:** toda criação ou alteração de comportamento executável (backend e frontend) exige ciclo completo **Vermelho → Verde → Refatoração** e revisão quanto aos cinco princípios **SOLID**, conforme [Regras.md](../Agents/Regras.md).
- **Estados permitidos por fase:** `não iniciada`, `em andamento`, `aguardando decisão`, `em revisão` e `concluída`.
- Uma fase só recebe `[x]` quando sua entrega foi produzida, seus critérios objetivos de conclusão foram verificados e eventuais limitações foram explicitadas.
- **Git / commits:** repositório local conectado a `https://github.com/Athos-Danilo/Tarefas.git` na branch `main`. O responsável autorizou expressamente em `20/11/2026` realizar `git commit` e `git push` automaticamente ao concluir cada fase, no padrão `Fase NN: objetivo da fase`, sempre após revisar `git status`, `git diff` (garantindo ausência de segredos) e executar as verificações pertinentes.

### Controle geral de conclusão das fases

- [x] Fase 01 — consolidar escopo, SDD inicial e verificar ambiente local
- [ ] Fase 02 — escolher nome definitivo, paletas dos 4 momentos do dia e trio tipográfico
- [ ] Fase 03 — definir marca, elementos do jardim, constelações e coleção de avatares
- [ ] Fase 04 — fechar contratos de API, regras finas da árvore (`D08`–`D11`) e exclusão de conta (`D06`)
- [ ] Fase 05 — prototipar navegação, atmosferas e telas principais
- [ ] Fase 06 — preparar ambiente, revisar `.gitignore`, skeletons FastAPI + React/TS/Vite e CI inicial
- [ ] Fase 07 — migrações PostgreSQL, conexão MongoDB e adaptadores base (TDD)
- [ ] Fase 08 — autenticação Google OAuth 2.0, sessão segura, primeiro acesso e exclusão de conta (TDD)
- [ ] Fase 09 — motor de domínio da árvore de tarefas compostas (profundidade 5, ciclos, cascata, alerta urgente) (TDD)
- [ ] Fase 10 — API poliglota completa de tarefas, etiquetas, notas ricas e consistência PostgreSQL/MongoDB (TDD)
- [ ] Fase 11 — sistema visual adaptativo (4 momentos), tokens, tipografia e Modo Desempenho / Fallback 2D (TDD)
- [ ] Fase 12 — cenário 3D vivo em Three.js/R3F (céu, sol, lua, constelações 3D, jardim reativo e arco do dia) (TDD)
- [ ] Fase 13 — landing cinematográfica com demonstrações interativas locais e fluxo completo de entrada
- [ ] Fase 14 — Jornada do Dia: lista hierárquica por turnos, drag-and-drop acessível, filtros e editor de notas ricas (TDD)
- [ ] Fase 15 — Mapa Visual de Constelação/Ramos (editor 2D/SVG sobre o 3D + persistência de layout no MongoDB) (TDD)
- [ ] Fase 16 — Modo Foco Imersivo com temporizador solar/lunar e registro de sessões (TDD)
- [ ] Fase 17 — Calendário Mensal dos Prazos com prioridades e fases lunares (TDD)
- [ ] Fase 18 — Estatísticas do ciclo, Diário/Histórico (`eventos_ciclo`) e preferências persistidas (TDD)
- [ ] Fase 19 — experiência sonora opt-in (micro-efeitos e paisagens por momento do dia) (TDD)
- [ ] Fase 20 — revisão de integridade, segurança, acessibilidade, responsividade e desempenho 3D/2D
- [ ] Fase 21 — provisionar bancos gratuitos na nuvem e publicar ambiente na web
- [ ] Fase 22 — aceitação final, documentação para Web II e roteiro de apresentação

---

## 2. Distribuição dos 5 ciclos

| Ciclo | Fases | Objetivo principal | Foco metodológico |
| --- | --- | --- | --- |
| Ciclo 1 | 01–05 | Especificação SDD, nome/identidade visual, contratos e protótipos navegáveis | Descoberta guiada e decisões `D01`–`D16` |
| Ciclo 2 | 06–10 | Fundação técnica, Git/CI, bancos poliglotas, Google OAuth e motor de tarefas compostas | TDD rigoroso de backend, SOLID e ACID |
| Ciclo 3 | 11–15 | Design System dos 4 momentos, cena 3D híbrida + fallback 2D, Landing, Jornada e Mapa Constelação | TDD frontend, WebGL leve e acessibilidade |
| Ciclo 4 | 16–19 | Modo Foco Imersivo, Calendário Mensal, Estatísticas/Diário e Experiência Sonora opt-in | Integração poliglota completa e acabamento interativo |
| Ciclo 5 | 20–22 | Auditoria de segurança/acessibilidade/desempenho, deploy gratuito na web e apresentação Web II | Verificação real em produção e documentação final |

---

## 3. Matriz de decisões (`D01`–`D16`)

Decisões arquiteturais centrais já fechadas na Fase 01: conceito **Horizonte Vivo** (simulação do dia + jardim + sol/lua/constelações), composição multinível até **5 níveis** com bloqueio de ciclos e cascata inteligente, modelo equilibrado de tarefa com **4 prioridades independentes + alerta de filha urgente**, **Landing com demos interativas locais**, **apenas Google OAuth**, divisão poliglota **PostgreSQL (estrutural) + MongoDB (notas ricas, layouts, eventos, preferências)**, **3D híbrido inteligente em Three.js/R3F + editor 2D/SVG**, **áudio opt-in** e **execução local + publicação gratuita na web**.

A tabela abaixo lista exclusivamente as decisões ainda em aberto (ou de detalhamento fino) que exigem confirmação explícita:

| ID | Decisão | Preparação esperada da IA | Responsável | Fase limite | Situação |
| --- | --- | --- | --- | --- | --- |
| D01 | Nome definitivo da aplicação | Apresentar 4–5 opções refinadas (ex.: Solstício, Horizonte Vivo, Zênite, Alvorada) com racional de marca | IA propõe; Athos escolhe | Fase 02 | Em aberto |
| D02 | Paletas dos 4 momentos do dia (Manhã, Tarde, Crepúsculo, Noite) + contraste | Preparar 2–3 direções cromáticas completas aplicadas a amostras reais com checagem WCAG | IA propõe; Athos escolhe | Fase 02 | Em aberto |
| D03 | Trio tipográfico (Display + Sans + Mono) e licenças locais | Comparar combinações legíveis em títulos, listas densas, acentos pt-BR e timers | IA propõe; Athos escolhe | Fase 02 | Em aberto |
| D04 | Marca, logotipo, ícones do jardim/constelações e coleção inicial de avatares | Apresentar conceitos vetoriais reutilizáveis e catálogo inicial de avatares | IA propõe; Athos aprova | Fase 03 | Em aberto |
| D05 | Primeiro acesso: formato de nome de usuário, avatar e tarefas-guia iniciais | Definir regras de nome de exibição e se usuário novo pode importar exemplos editáveis | IA propõe; Athos decide | Fase 04 | Em aberto |
| D06 | Exclusão de conta: fluxo de confirmação e remoção definitiva em ambos os bancos | Detalhar aviso, palavra/ação de confirmação e remoção completa de dados pessoais | IA propõe; Athos aprova | Fase 04 | Em aberto |
| D07 | Política de sessão, cookie e ambiente local/produção para Google OAuth | Mapear uso de mesma origem/rewrite `/api`, expiração de sessão e proteção CSRF | IA propõe; Athos valida | Fase 04 | Em aberto |
| D08 | Detalhes finos da cascata: cálculo do %, desfazer conclusão em lote e regra ao excluir mãe com filhas | Demonstrar cenários práticos (ponderação igual vs folhas; excluir cascata vs promover filhas) | IA propõe; Athos escolhe | Fase 04 | Em aberto |
| D09 | Limites operacionais (tamanho de título/notas, máx. etiquetas, máx. tarefas ativas por usuário) | Propor limites saudáveis contra abuso e para boa legibilidade do mapa/3D | IA propõe; Athos aprova | Fase 04 | Em aberto |
| D10 | Blocos suportados em `notas_em_blocos` (MongoDB) e formato de exportação/diário | Definir conjunto enxuto e rico (parágrafos, subtítulos, citações, listas, código/links) | IA propõe; Athos aprova | Fase 04 | Em aberto |
| D11 | Biblioteca do editor do Mapa Visual (`@xyflow/react` vs motor SVG customizado) | Comparar flexibilidade visual orgânica (ramos/constelação), acessibilidade e tamanho de bundle | IA analisa; Athos confirma | Fase 05 | Em aberto |
| D12 | Navegação principal e organização responsiva das 5 visões | Protótipo interativo em desktop, tablet e celular (Jornada, Mapa, Foco, Calendário, Estatísticas) | IA prototipa; Athos aprova | Fase 05 | Em aberto |
| D13 | Modelos 3D / assets do jardim e desempenho máximo (orçamento de triângulos e FPS) | Escolher abordagem procedural/low-poly autoral ou assets livres documentados + Fallback 2D | IA propõe; Athos aprova | Fase 12 | Em aberto |
| D14 | Métricas exatas e visualizações do painel de Estatísticas e Diário do Ciclo | Propor indicadores (taxa diária, equilíbrio por turno, foco, constelações concluídas) | IA propõe; Athos escolhe | Fase 18 | Em aberto |
| D15 | Seleção das paisagens sonoras e micro-efeitos com licença livre comprovada | Preparar prévias audíveis e registro de procedência/licença (CC0/MIT/sintetizado) | IA prepara; Athos escolhe | Fase 19 | Em aberto |
| D16 | Contas externas e URLs finais de publicação gratuita | Auxiliar configuração no Google Cloud, Vercel, Render, Neon e MongoDB Atlas | Athos configura contas; IA integra | Fase 21 | Em aberto |

---

## 4. Ciclo 1 — Especificação, identidade visual e protótipos (Fases 01–05)

### Fase 01 — consolidar escopo, SDD inicial e verificar ambiente local

**Depende de:** entrevista `/grill-me` com o responsável; não depende de código.

- Consolidar visão de produto, glossário, regras da árvore multinível, modelo de tarefas, 5 visões e matriz de cenários em [Detalhes.md](Detalhes.md).
- Definir arquitetura, divisão poliglota PostgreSQL/MongoDB, estratégia 3D híbrida + fallback 2D e stack de design/backend em [Planejamento-tecnico.md](Planejamento-tecnico.md).
- Formalizar regras de `pt-BR`, SOLID, TDD obrigatório e segurança em [Regras.md](../Agents/Regras.md).
- Verificar versões e status real de Git, Python, Node/npm, PostgreSQL e MongoDB na máquina local.
- Catalogar decisões abertas `D01`–`D16` sem presumir respostas.

**Entrega:** base documental SDD completa (`Agents/Regras.md`, `Doc/Detalhes.md`, `Doc/Planejamento-tecnico.md`, `Doc/Roteiro-primeira-entrega.md`).

**Concluída quando:** os quatro documentos estão gravados, coerentes entre si e refletem fielmente o ambiente local observado e as decisões da entrevista.

#### Registro de execução da fase 01

**Estado:** concluída em 20/11/2026.

- **Escopo consolidado:** todas as decisões da entrevista `/grill-me` foram consolidadas em `Agents/Regras.md` e `Doc/*.md`, deixando `D01`–`D16` explicitamente abertas para as fases correspondentes.
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
  - [x] Criar `Doc/Roteiro-primeira-entrega.md` com 22 fases, 5 ciclos e decisões `D01`–`D16`.
  - [x] Criar `Doc/Processo-de-desenvolvimento-com-IA.md` detalhando o fluxo Google Antigravity (`Orchestrator` com `Gemini 4 Neon` e `Gemini 4 Hydrogen`) e os pilares SDD/SOLID/TDD para apresentação em Web II, além de registrar a autorização recorrente de commit e push por fase.
  - [x] Verificar consistência cruzada entre os documentos SDD.

---

### Fase 02 — escolher nome definitivo, paletas dos 4 momentos do dia e trio tipográfico

**Depende de:** Fase 01; decisões `D01`, `D02` e `D03`.

- Apresentar propostas de nome definitivo (`D01`) alinhadas ao conceito poético do ciclo do dia e constelações.
- Preparar 2 a 3 direções cromáticas (`D02`) aplicadas aos 4 momentos (**Manhã**, **Tarde**, **Crepúsculo**, **Noite**) com tokens de fundo, superfície translúcida, texto, acentos de prioridade e estados de erro/sucesso/foco.
- Comparar combinações de fontes Display + Sans + Mono (`D03`) testando acentuação em português, títulos poéticos, densidade de listas hierárquicas e números tabulares para timers/horários.
- Validar contraste WCAG entre cartões e céu variável, criando `Doc/Guia-visual.md`.

**Entrega:** `D01`, `D02` e `D03` aprovadas e registradas em `Doc/Guia-visual.md`.

**Concluída quando:** há nome oficial, paleta completa para os 4 períodos e fontes definidas prontas para virar tokens CSS.

---

### Fase 03 — definir marca, elementos do jardim, constelações e coleção de avatares

**Depende de:** Fase 02; decisão `D04`.

- Criar variações do logotipo/ícone da marca aprovada (cabeçalho, landing, favicon e tela de login).
- Definir direção visual dos elementos do jardim (espécies/formas que florescem por conclusão), estrelas/constelações e fases lunares.
- Propor coleção inicial de avatares para escolha no primeiro acesso e no perfil, registrando origem/licença em `Doc/Identidade-visual/`.

**Entrega:** estudos de marca, direção do jardim/constelações e avatares aprovados em `Doc/Identidade-visual/`.

**Concluída quando:** a identidade visual base está fechada sem bloqueios para prototipação.

---

### Fase 04 — fechar contratos de API, regras finas da árvore (`D08`–`D10`) e exclusão de conta (`D06`)

**Depende de:** Fase 01; decisões `D05`, `D06`, `D07`, `D08`, `D09` e `D10`.

- Resolver regras finas pendentes com exemplos concretos: primeiro acesso e tarefas-guia (`D05`), exclusão de conta (`D06`), política de sessão/CSRF (`D07`), ponderação do progresso % + desfazer cascata + exclusão de tarefa-mãe (`D08`), limites operacionais (`D09`) e esquema de blocos ricos (`D10`).
- Consolidar todos os contratos HTTP/JSON, envelopes de erro e códigos estáveis em português em `Doc/Contratos-api.md`.
- Atualizar `Doc/Detalhes.md` com as decisões resolvidas.

**Entrega:** `Doc/Contratos-api.md` completo e `D05`–`D10` fechadas.

**Concluída quando:** backend e frontend possuem contratos inequívocos de entrada, saída e erro para iniciar modelagem e código.

---

### Fase 05 — prototipar navegação, atmosferas e telas principais

**Depende de:** Fases 02, 03 e 04; decisões `D11` e `D12`.

- Decidir entre `@xyflow/react` ou motor SVG customizado (`D11`) para o editor 2D do Mapa Constelação/Ramos.
- Construir protótipo navegável estático em `Doc/Prototipos/` cobrindo Landing com demos, Primeiro Acesso, Jornada do Dia, Mapa Constelação/Ramos, Modo Foco, Calendário Mensal, Estatísticas/Diário, Perfil e estados de vazio/erro/carregamento.
- Validar fluxo e adaptação visual em desktop, tablet e celular (`D12`) nos 4 momentos do dia.

**Entrega:** `Doc/Prototipos/` aprovado e decisões `D11`–`D12` fechadas.

**Concluída quando:** o responsável percorre e aprova toda a navegação e organização visual das telas antes da implementação.

---

## 5. Ciclo 2 — Fundação técnica, autenticação e núcleo poliglota (Fases 06–10)

### Fase 06 — preparar ambiente, revisar `.gitignore`, skeletons FastAPI + React/TS/Vite e CI inicial

**Depende de:** Fase 01; verificação de compatibilidade React vs `@react-three/fiber`.

- Revisar o `.gitignore` existente (garantindo exclusão de `.env`, `.venv`, `node_modules`, caches) e manter o fluxo de commits/branches na branch `main` conectada a `origin`.
- Criar `Backend/` (`pyproject.toml`, `ruff`, `mypy`, `pytest`, `/api/saude`) e `Frontend/` (`package.json`, `tsconfig.json` strict, Tailwind v4, `Vitest`, `ESLint`, `Prettier`) com exemplos `.env.exemplo` fictícios.
- Documentar passo a passo de execução local em `Doc/Ambiente-local.md` (incluindo observação sobre caminhos completos do `psql`/`mongod` no Windows).
- Validar comunicação real `React -> proxy Vite -> FastAPI /api/saude` com primeiro ciclo TDD e configurar workflow inicial do GitHub Actions.

**Entrega:** repositório estruturado, ambiente reproduzível e testes/linters iniciais passando.

**Concluída quando:** outra sessão consegue subir API e Frontend localmente e o pipeline de verificação básica executa sem erros.

---

### Fase 07 — migrações PostgreSQL, conexão MongoDB e adaptadores base (TDD)

**Depende de:** Fases 04 e 06.

- Configurar ambientes separados de desenvolvimento e teste no PostgreSQL `18.0` e no MongoDB `8.2.5`.
- Criar esquema inicial no PostgreSQL via Alembic (`usuarios`, `sessoes`, `tarefas`, `etiquetas`, `tarefa_etiquetas`, `sessoes_foco`) com restrições e índices definidos em `Planejamento-tecnico.md`.
- Configurar cliente `PyMongo` (`AsyncMongoClient`), índices das coleções (`detalhes_tarefas`, `layouts_constelacao`, `eventos_ciclo`, `preferencias_cenario`) e protocolos/adaptadores com injeção de dependência (SOLID).
- Escrever e validar testes de integração reais de conexão, migrações e isolamento do banco de testes seguindo TDD.

**Entrega:** camada de persistência poliglota inicial testada em integração real.

**Concluída quando:** migrações Alembic aplicam/revertem limpas e testes de integração passam nos dois bancos de teste.

---

### Fase 08 — autenticação Google OAuth 2.0, sessão segura, primeiro acesso e exclusão de conta (TDD)

**Depende de:** Fases 04 (`D05`, `D06`, `D07`) e 07.

- Implementar adaptador Google OAuth 2.0 atrás de contrato (DIP), fluxo Authorization Code + `state`, criação de sessão server-side com cookie `HttpOnly` e proteção CSRF.
- Implementar fluxo de primeiro acesso (`nome_exibicao`, `avatar_id`, tarefas-guia opcionais conforme `D05`), leitura/edição de perfil e exclusão definitiva de conta (`D06`) removendo dados do PostgreSQL e do MongoDB.
- Cobrir tudo com TDD (substituto controlado do Google nos testes unitários + testes de integração de sessão, CSRF e exclusão).

**Entrega:** autenticação completa e segura operando de ponta a ponta na API e nos endpoints de sessão.

**Concluída quando:** login, bloqueio de rotas privadas, primeiro acesso, edição de perfil e exclusão completa passam em TDD.

---

### Fase 09 — motor de domínio da árvore de tarefas compostas (TDD)

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

### Fase 10 — API poliglota completa de tarefas, etiquetas, notas ricas e consistência (TDD)

**Depende de:** Fases 07, 08 e 09.

- Implementar repositórios PostgreSQL (CTEs recursivas `WITH RECURSIVE`, transações atômicas de cascata/reparenting/promoção a raiz/reordenação) e MongoDB (`detalhes_tarefas`, `eventos_ciclo`).
- Implementar rotas FastAPI para CRUD de tarefas, subtarefas, reparenting, promoção, ordenação, filtros, busca, etiquetas e notas ricas (`D10`), aplicando estratégia de consistência eventual e fallback seguro entre os dois bancos.
- Validar isolamento estrito por `usuario_id`, códigos de erro estáveis e contratos Pydantic via testes de integração TDD.

**Entrega:** backend funcional completo de gestão de tarefas compostas e persistência poliglota.

**Concluída quando:** todos os endpoints do núcleo passam em testes unitários e de integração com PostgreSQL e MongoDB de teste.

---

## 6. Ciclo 3 — Design System, mundo 3D híbrido, Landing, Jornada e Mapa (Fases 11–15)

### Fase 11 — sistema visual adaptativo (4 momentos), tokens, tipografia e Fallback 2D (TDD)

**Depende de:** Fases 02, 05 e 06.

- Implementar tokens CSS no Tailwind v4 para **Manhã**, **Tarde**, **Crepúsculo** e **Noite**, fontes hospedadas localmente e componentes base acessíveis sobre Radix UI.
- Construir motor reativo do **Ciclo do Dia** (Relógio Real vs Modo Simulador / Arco do Dia + cálculo de posição solar/lunar) com testes unitários TDD.
- Construir o **Modo Desempenho / Fallback 2D** em SVG/CSS com detecção de suporte WebGL e `prefers-reduced-motion`.

**Entrega:** sistema visual, motor temporal e paisagem 2D fallback prontos e testados.

**Concluída quando:** alternar momentos do dia ou ativar Modo Desempenho transforma toda a UI com contraste e acessibilidade verificados.

---

### Fase 12 — cenário 3D vivo em Three.js/R3F (TDD)

**Depende de:** Fases 03, 11; decisão `D13`.

- Construir cena 3D em `@react-three/fiber` + `@react-three/drei` com céu atmosférico dinâmico, trajetória do Sol e da Lua (com fase lunar), estrelas, constelações panorâmicas ligadas ao progresso e jardim estilizado reativo (`D13`).
- Integrar com o controle interativo do **Arco do Dia** e respeitar orçamento de FPS/memória, pausa em aba oculta e descarte limpo ao alternar para o Fallback 2D.
- Garantir testes TDD para lógica de cena, mapeamento estado→iluminação/elementos e troca segura para Fallback 2D.

**Entrega:** cenário 3D vivo integrado ao ciclo do dia e ao progresso do usuário.

**Concluída quando:** a transição contínua Manhã → Tarde → Crepúsculo → Noite e o Fallback 2D funcionam sem vazamentos de memória ou erros no console.

---

### Fase 13 — landing cinematográfica com demos locais e fluxo completo de entrada (TDD)

**Depende de:** Fases 05, 08 e 12.

- Construir Landing com o cenário 3D/2D vivo, apresentação do conceito e pequenas **demonstrações interativas locais** (Arco do Dia interativo + mini tarefa composta reagindo na hora, sem gravar no servidor).
- Integrar botão de login Google, tela de Primeiro Acesso (`nome_exibicao`, avatar e opção de tarefas-guia), Perfil e fluxo seguro de Exclusão de Conta.
- Testar interações, acessibilidade por teclado e proteção contra acesso sem autenticação via TDD/Playwright.

**Entrega:** porta de entrada completa do aplicativo do visitante até o usuário autenticado.

**Concluída quando:** visitante experimenta a demo local, autentica com Google, configura primeiro acesso e pode gerenciar/excluir a conta.

---

### Fase 14 — Jornada do Dia: lista hierárquica, drag-and-drop, filtros e notas ricas (TDD)

**Depende de:** Fases 10, 11 e 13.

- Implementar a visão principal **Jornada do Dia** sobre o cenário vivo: agrupamento por turnos (`manha`, `tarde`, `noite`, `livre`), árvore expansível até 5 níveis, barras de progresso automático, indicador visual de filha urgente e desfazer conclusão em cascata.
- Implementar arrastar-e-soltar acessível (`@dnd-kit` + comandos de teclado) para reordenar e mover tarefas na hierarquia, barra de busca/filtros, gestão de etiquetas e gaveta lateral de edição com editor de notas ricas (`detalhes_tarefas`).
- Cobrir lógica de interface, mapeamento de API e fluxos principais em TDD.

**Entrega:** gerenciamento diário e hierárquico completo conectado aos dois bancos.

**Concluída quando:** todas as operações CRUD, composição até 5 níveis, bloqueio de ciclos e notas ricas funcionam de ponta a ponta.

---

### Fase 15 — Mapa Visual de Constelação/Ramos (TDD)

**Depende de:** Fases 05 (`D11`), 10 e 14.

- Implementar endpoint/integração de `layouts_constelacao` no MongoDB e a visão **Mapa Visual** híbrida 2D/SVG sobre o cenário 3D.
- Exibir tarefas compostas como **ramos botânicos orgânicos** de dia e **constelações luminosas** no crepúsculo/noite, permitindo navegar, arrastar nós, criar subtarefas, concluir itens e reorganizar automaticamente, com navegação equivalente por teclado.
- Validar persistência de layout e sincronia com o estado real das tarefas em TDD.

**Entrega:** Mapa Visual de Constelação/Ramos funcional e persistente.

**Concluída quando:** mudanças no Mapa refletem imediatamente na Jornada/PostgreSQL e posições personalizadas persistem no MongoDB.

---

## 7. Ciclo 4 — Foco, Calendário, Estatísticas e Áudio (Fases 16–19)

### Fase 16 — Modo Foco Imersivo com temporizador solar/lunar (TDD)

**Depende de:** Fases 10, 12 e 14.

- Implementar endpoints de `sessoes_foco` (iniciar, concluir, interromper) gerando também `eventos_ciclo` no MongoDB.
- Construir tela **Modo Foco Imersivo** com temporizador visual solar/lunar, adaptação contemplativa do cenário 3D/2D e lista imediata de subtarefas da tarefa em foco.
- Cobrir regras de sessão única ativa, registro de duração e ações na UI com TDD.

**Entrega:** experiência completa de Modo Foco integrada ao backend poliglota.

**Concluída quando:** iniciar, pausar/interromper e concluir sessões grava corretamente no PostgreSQL e alimenta o Diário.

---

### Fase 17 — Calendário Mensal dos Prazos com prioridades e fases lunares (TDD)

**Depende de:** Fases 10, 11 e 14.

- Implementar consulta otimizada de tarefas por janela mensal no PostgreSQL e cálculo astronômico da fase lunar por data.
- Construir visão **Calendário Mensal** com indicadores luminosos de prioridade/atraso, seleção de dia, abertura rápida para edição/conclusão e total navegabilidade por teclado.
- Validar fusos horários, virada de mês e filtros com TDD.

**Entrega:** Calendário Mensal integrado aos prazos reais das tarefas compostas.

**Concluída quando:** qualquer tarefa com prazo aparece no dia correto com prioridade, status e interação direta funcional.

---

### Fase 18 — Estatísticas, Diário do Ciclo e preferências persistidas (TDD)

**Depende de:** Fases 10, 16 e 17; decisão `D14`.

- Fechar definição de indicadores (`D14`) e implementar consultas agregadas no PostgreSQL + leitura paginada de `eventos_ciclo` e persistência completa de `preferencias_cenario` no MongoDB.
- Construir painel de **Estatísticas & Diário do Ciclo** com visualização clara de progresso, equilíbrio entre turnos, horas focadas e linha do tempo de conquistas.
- Testar agregações, isolamento por usuário e restauração de preferências ao relogar em TDD.

**Entrega:** acompanhamento de progresso e persistência de preferências concluídos.

**Concluída quando:** estatísticas refletem fielmente sessões e conclusões reais e preferências sobrevivem entre dispositivos/sessões.

---

### Fase 19 — experiência sonora opt-in (TDD)

**Depende de:** Fases 11, 16 e 18; decisão `D15`.

- Selecionar e documentar procedência/licença de paisagens sonoras (Manhã, Tarde, Crepúsculo, Noite, Modo Foco) e micro-efeitos (`D15`).
- Construir controlador centralizado baseado na Web Audio API (opt-in, silenciado por padrão, volumes independentes geral/efeitos/ambiente, transições suaves por momento do dia e limpeza ao desmontar).
- Testar máquina de estados do controlador de áudio em TDD e realizar verificação auditiva prática.

**Entrega:** camada sonora opcional integrada às ações, transições do dia e preferências no MongoDB.

**Concluída quando:** áudio respeita opt-in rigoroso, sliders de volume persistem no MongoDB e desabilitação libera recursos sem falhas.

---

## 8. Ciclo 5 — Acabamento, publicação e entrega acadêmica (Fases 20–22)

### Fase 20 — revisão de integridade, segurança, acessibilidade, responsividade e desempenho

**Depende de:** Fases 13 a 19.

- Auditar segurança: OAuth, CSRF, cookies `HttpOnly`, isolamento multiusuário em todas as rotas SQL/MongoDB, cabeçalhos e ausência de segredos expostos.
- Auditar responsividade e interação real em computador, tablet e celular (320/390/768/1280 px), nos 4 momentos do dia e no Fallback 2D.
- Auditar acessibilidade (foco em modais, leitores de tela, atalhos, `prefers-reduced-motion`) e orçamento de desempenho 3D (FPS, tempo de carregamento inicial e code-splitting).
- Corrigir eventuais bugs encontrados seguindo rigorosamente **TDD de regressão**.

**Entrega:** relatório de auditoria em `Doc/Revisoes/` e correções validadas por testes.

**Concluída quando:** zero falhas críticas de segurança, acessibilidade ou quebra de layout permanecem abertas.

---

### Fase 21 — provisionar bancos gratuitos na nuvem e publicar ambiente na web

**Depende de:** Fase 20; decisão `D16`.

- Provisionar bancos gratuitos (**Neon** PostgreSQL e **MongoDB Atlas** `M0`) e aplicar migrações Alembic de produção.
- Publicar backend no **Render** e frontend na **Vercel** com rewrite `/api/*` para mesma origem e variáveis configuradas no Google Cloud Console (`D16`).
- Executar testes manuais e verificações smoke no ambiente publicado (login Google real, criação/edição composta, Mapa, Foco, Calendário, exclusão de conta de teste).

**Entrega:** aplicação publicada online com custo zero e URLs documentadas.

**Concluída quando:** todas as funcionalidades principais operam no endereço publicado em HTTPS com OAuth Google ativo.

---

### Fase 22 — aceitação final, documentação para Web II e roteiro de apresentação

**Depende de:** Fase 21.

- Executar suíte completa final (`pytest`, `ruff`, `mypy`, `vitest`, `tsc`, `eslint`, build de produção e E2E Playwright) sem alterações pendentes.
- Atualizar `README.md` na raiz, `Doc/Ambiente-local.md` e documentação acadêmica (diagrama ER + esquema MongoDB + diagrama de arquitetura poliglota + OpenAPI exportável).
- Preparar roteiro demonstrativo para apresentação na disciplina **Web II**, apoiado em [Processo-de-desenvolvimento-com-IA.md](Processo-de-desenvolvimento-com-IA.md), destacando a simulação do ciclo do dia, o 3D híbrido, as tarefas compostas multinível, a arquitetura poliglota, a orquestração multimodelo (`Orchestrator` com `Gemini 4 Neon` e `Gemini 4 Hydrogen`) e a engenharia SDD/SOLID/TDD.

**Entrega:** primeira entrega encerrada, verificada e pronta para apresentação em Web II.

**Concluída quando:** todos os checklists das 22 fases estão concluídos e o projeto roda de forma impecável tanto localmente quanto na web.
