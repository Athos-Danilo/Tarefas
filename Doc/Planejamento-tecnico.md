# Planejamento técnico - Lume

Este documento consolida a arquitetura, a stack tecnológica, a divisão poliglota de dados, a estratégia de renderização 3D híbrida, a segurança e a infraestrutura de execução local e publicação gratuita do projeto **Lume**. Todas as implementações seguem as regras de [Regras.md](../Agents/Regras.md), o sistema visual de [Guia-visual.md](Guia-visual.md) e os requisitos de [Detalhes.md](Detalhes.md).

## 1. Ambiente local verificado (20/11/2026)

Levantamento executado diretamente na máquina de desenvolvimento (`c:\Users\Athos\ADS\Meus Projetos\Tarefas`):

| Ferramenta / Serviço | Versão observada | Situação observada em 20/11/2026 |
| --- | --- | --- |
| Sistema operacional | Windows | Workspace alvo em `c:\Users\Athos\ADS\Meus Projetos\Tarefas` |
| Git | `2.47.1.windows.1` | Instalado; repositório local inicializado em `main` e conectado a `https://github.com/Athos-Danilo/Tarefas.git` |
| Python | `3.13.0` | Instalado e disponível no `PATH` |
| Node.js / npm | `v22.13.0` / `10.9.2` | Instalados e disponíveis no `PATH` |
| PostgreSQL | `18.0` | Serviço Windows `postgresql-x64-18` ativo (`Running`); binário em `C:\Program Files\PostgreSQL\18\bin\psql.exe` (não está no `PATH` padrão do PowerShell) |
| MongoDB | `8.2.5` | Serviço Windows `MongoDB` ativo (`Running`); binário em `C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe` (não está no `PATH` padrão do PowerShell) |

## 2. Stack tecnológica aprovada

### 2.1 Backend (Python + FastAPI)
- **Linguagem e servidor:** Python `3.13`, `FastAPI`, `Uvicorn` (com suporte ASGI assíncrono).
- **Validação e configuração:** `Pydantic v2` e `pydantic-settings`.
- **PostgreSQL:** `SQLAlchemy 2.x` (modo assíncrono), driver `psycopg` (v3 async) e `Alembic` para migrações versionadas.
- **MongoDB:** `PyMongo` oficial com `AsyncMongoClient` nativo (evitando o legado `Motor`, descontinuado pela MongoDB Inc.).
- **Autenticação:** `httpx` e `google-auth` para fluxo Google OAuth 2.0 no servidor e verificação segura de tokens/claims.
- **Qualidade e TDD:** `pytest`, `pytest-asyncio`, `httpx` (`AsyncClient` / `TestClient`), `ruff` (lint e formatação) e `mypy` (verificação estrita de tipos).

### 2.2 Frontend & Ecossistema de Design (React + TypeScript + Vite)
- **Núcleo:** `React`, `TypeScript` (`strict: true`), `Vite`.
- **Estilização e Design System:** `Tailwind CSS v4` alimentado por variáveis CSS semânticas dinâmicas com **interpolação cromática contínua ao longo das 24 horas** (sobre os keyframes da direção *Alvorada Poética* nos 4 momentos: `manha`, `tarde`, `crepusculo` e `noite`), utilizando faixas de polaridade luminosa e noturna para preservar contraste WCAG AA (`>= 4.5:1`) em todos os 1.440 minutos do dia.
- **Primitivos acessíveis:** `Radix UI` (diálogos, menus, popovers, seletores e tooltips com foco e teclado acessíveis).
- **Animações de interface:** `motion` (Framer Motion) para transições fluidas, **animações tipográficas e efeitos de escrita/revelação**, **microinterações táteis de hover** e coreografia de movimento em árvore e cartões conforme [Guia-visual.md](Guia-visual.md) (`ID-19`), sempre respeitando `prefers-reduced-motion`.
- **Arrastar e soltar acessível:** `@dnd-kit` para reordenação manual e movimentação de tarefas na Jornada do Dia com suporte a ponteiro e teclado.
- **Mundo 3D (WebGL):** `three`, `@react-three/fiber` e `@react-three/drei`.
  - **Atenção obrigatória antes da Fase 06:** verificar na documentação oficial a matriz de compatibilidade exata entre a versão instalada do `React` (`18` vs `19`) e a versão correspondente do `@react-three/fiber` / `@react-three/drei` antes de fixar o `package.json`.
- **Mapa Visual de Constelação / Ramos:** `@xyflow/react` ou motor SVG/Canvas 2D customizado (escolha técnica e visual a ser fechada na decisão `D11`, na Fase 04/05).
- **Dados, formulários e estado:** `@tanstack/react-query` (cache e sincronização com a API), `react-hook-form` + `zod` (validação tipada de formulários), `zustand` (estado efêmero de UI, Modo Simulador do Arco do Dia e controlador de foco/áudio).
- **Iconografia, assets Soft-3D e favicons adaptativos:** `Lucide React` combinado com SVGs autorais para ícones do mapa/fases lunares, os renders **Soft-3D Clay Matte** catalogados em `Doc/Identidade-visual/assets-3d/` (publicados em `Frontend/public/favicons/` e `Frontend/public/assets-3d/` na Fase 11) e um controlador leve no cliente que atualiza `<link rel="icon">` somente na troca entre os 4 turnos do dia (`Manhã`, `Tarde`, `Entardecer` e `Noite`), evitando cintilação na aba.
- **Tipografia:** trio tipográfico aprovado em `D03` (**`Fraunces`** Display + **`Plus Jakarta Sans`** Sans UI + **`JetBrains Mono`** Mono tabular para horários/timers), com uso expressivo de **bold** e **itálico** em títulos, saudações, Modo Foco e notas ricas (`ID-17`), hospedando localmente todas as variantes (incluindo itálicos) sob licença `SIL OFL 1.1`.
- **Responsividade:** arquitetura **desktop-first** (base principal para computador) com layout fluido e componentes adaptados para total usabilidade em **tablets e celulares** (`ID-18`).
- **Qualidade e TDD:** `Vitest`, `@testing-library/react`, `@testing-library/user-event`, `Playwright` (testes E2E e inspeção visual), `ESLint` e `Prettier`.

## 3. Estratégia de renderização 3D híbrida e desempenho

Para entregar um visual cinematográfico sem comprometer legibilidade, acessibilidade nem dispositivos simples:

1. **Cenário 3D vivo ao fundo (`CenarioDoHorizonte`):**
   - Céu procedural / shader com **transição cromática contínua ao longo das 24 horas** (sobre os keyframes de *Alvorada Poética* atravessando `manha`, `tarde`, `crepusculo` e `noite`), arco orbital real do Sol e da Lua (com fase lunar), campo de estrelas, vagalumes e constelações panorâmicas 3D que se iluminam conforme as tarefas compostas avançam, além de jardim estilizado Soft-3D Clay Matte / instanciado em camadas.
   - Uso de `InstancedMesh`, controle de `dpr` (`devicePixelRatio`), pausa automática em aba inativa e descarte explícito de recursos WebGL ao desmontar.
2. **Camada 2D de alta nitidez por cima:**
   - Todos os textos, listas hierárquicas, formulários, notas ricas, Calendário Mensal, Modo Foco e o editor interativo do Mapa Constelação/Ramos são renderizados em DOM/SVG nítido com superfícies translúcidas que acompanham a progressão horária sem cruzar a faixa de baixo contraste.
3. **Modo Desempenho / Fallback 2D obrigatório:**
   - Substitui a cena WebGL por uma paisagem equivalente em camadas SVG/CSS suaves com a mesma interpolação contínua de 24h, garantindo funcionamento integral quando:
     - O usuário ativa o **Modo Desempenho** nas preferências;
     - O navegador ou ambiente de CI não suporta contexto WebGL;
     - O sistema operacional sinaliza `prefers-reduced-motion: reduce`.

## 4. Arquitetura modular e aderência a SOLID

### 4.1 Estrutura planejada de diretórios

```text
Tarefas/
├── Agents/
│   └── Regras.md
├── Doc/
│   ├── Detalhes.md
│   ├── Guia-visual.md
│   ├── Identidade-visual/
│   ├── Planejamento-tecnico.md
│   ├── Processo-de-desenvolvimento-com-IA.md
│   ├── Registro-de-ideias-e-decisoes.md
│   └── Roteiro-primeira-entrega.md
├── Backend/
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   ├── src/
│   │   ├── principal.py
│   │   ├── configuracao/        # settings por ambiente, validação sem segredos no código
│   │   ├── dominio/             # entidades, enums, erros de domínio e regras puras da árvore
│   │   ├── contratos/           # Protocolos (portas) para repositórios, OAuth e relógio
│   │   ├── servicos/            # casos de uso (autenticacao, tarefas, arvore, foco, calendario, estatisticas)
│   │   ├── infraestrutura/
│   │   │   ├── postgres/        # modelos ORM, sessao async e repositórios SQLAlchemy
│   │   │   ├── mongo/           # cliente PyMongo async e repositórios de documentos
│   │   │   └── google/          # adaptador Google OAuth 2.0
│   │   └── rotas/               # roteadores FastAPI e esquemas Pydantic (entrada/saída)
│   └── testes/
│       ├── unitarios/
│       └── integracao/
└── Frontend/
    ├── package.json
    ├── index.html
    ├── src/
    │   ├── aplicacao/           # rotas, provedores, guarda de autenticacao
    │   ├── dominios/            # tarefas, mapa-constelacao, foco, calendario, estatisticas, conta
    │   ├── cenario/             # mundo 3D R3F, shaders/luz do ciclo, jardim, fallback 2D
    │   ├── audio/               # controlador central Web Audio opt-in e paisagens sonoras
    │   ├── servicos/            # cliente HTTP, mapeadores snake_case <-> camelCase
    │   ├── componentes/         # sistema visual base (botões, cartões, modais, badges)
    │   ├── hooks/               # hooks React (`usar-*.ts` exportando `use*`)
    │   └── estilos/             # tokens CSS por momento do dia e tipografia local
    └── testes/
```

### 4.2 Separação de responsabilidades (SOLID na prática)
- **Domínio puro testável sem I/O (`dominio/`):** validação de profundidade máxima `5`, detecção de ciclos na árvore, cálculo recursivo de progresso, alerta de filha urgente e transições do ciclo do dia rodam em memória sem depender de FastAPI, SQLAlchemy ou PyMongo.
- **Serviços orquestram casos de uso (`servicos/`):** dependem exclusivamente de protocolos definidos em `contratos/`.
- **Adaptadores isolados (`infraestrutura/`):** PostgreSQL, MongoDB e Google OAuth ficam atrás dos protocolos; trocar ou mockar em testes unitários preserva os contratos de Liskov.
- **Fronteira API (`rotas/`):** valida entrada com Pydantic v2, extrai usuário da sessão autenticada e traduz erros de domínio em códigos HTTP e códigos de erro padronizados em português.

## 5. Modelagem poliglota de dados (PostgreSQL + MongoDB)

### 5.1 PostgreSQL: Fonte de verdade estrutural e transacional (ACID)
- **`usuarios`:** `id` (UUID), `google_sub` (único), `email`, `nome_exibicao`, `avatar_id`, `primeiro_acesso_concluido`, `criado_em`, `atualizado_em`.
- **`sessoes`:** `id` (UUID), `usuario_id` (FK), `token_hash` (único), `csrf_token_hash`, `expira_em`, `criado_em`, `revogada_em`.
- **`tarefas`:** `id` (UUID), `usuario_id` (FK), `tarefa_pai_id` (FK auto-referenciada anulável com índice), `titulo`, `prioridade` (`baixa` | `media` | `alta` | `urgente`), `status` (`pendente` | `em_andamento` | `concluida`), `turno` (`manha` | `tarde` | `noite` | `livre`), `prazo` (anulável, indexado por `(usuario_id, prazo)`), `profundidade` (`1` a `5`, com restrição `CHECK`), `ordem_manual`, `concluida_em`, `criado_em`, `atualizado_em`.
  - Consultas de árvore completa e subárvores utilizam `WITH RECURSIVE` (CTE recursiva) filtrada por `usuario_id` para garantir consistência e bloqueio de ciclos em transação atômica.
- **`etiquetas` e `tarefa_etiquetas`:** etiquetas nomeadas e coloridas por usuário (`UNIQUE (usuario_id, nome_normalizado)`) com tabela associativa `N:N`.
- **`sessoes_foco`:** `id` (UUID), `usuario_id` (FK), `tarefa_id` (FK), `duracao_planejada_seg`, `duracao_real_seg`, `iniciada_em`, `encerrada_em`, `status` (`concluida` | `interrompida`).

### 5.2 MongoDB: Documentos flexíveis, mapa visual, eventos e preferências
- **`detalhes_tarefas`:** `{ _id, tarefa_id (único), usuario_id, notas_em_blocos: [...], metadados_visuais: { forma_botanica, cor_estrela, icone }, atualizado_em }`.
- **`layouts_constelacao`:** `{ _id, usuario_id, tarefa_raiz_id (único por usuário), nos: { [tarefa_id]: { x, y, fixado } }, viewport: { zoom, centro_x, centro_y }, atualizado_em }`.
- **`eventos_ciclo`:** `{ _id, usuario_id, tipo_evento, tarefa_id, momento_do_dia, resumo, detalhes: {...}, criado_em }` (indexado por `(usuario_id, criado_em DESC)` para histórico e diário).
- **`preferencias_cenario`:** `{ _id, usuario_id (único), modo_temporal, hora_simulada, qualidade_3d, reduzir_movimento, audio: { habilitado, volume_geral, volume_efeitos, volume_ambiente }, atualizado_em }`.

### 5.3 Estratégia de consistência poliglota (sem transação distribuída)
1. Toda criação, edição estrutural, movimentação, conclusão em cascata ou reabertura é concluída primeiro em **transação atômica no PostgreSQL**.
2. Em seguida, o serviço grava ou atualiza de forma idempotente os documentos correspondentes no **MongoDB** (`detalhes_tarefas`, `layouts_constelacao`, `eventos_ciclo`).
3. Caso o MongoDB falhe momentaneamente após uma leitura ou atualização:
   - Leituras de `detalhes_tarefas`, `layouts_constelacao` e `preferencias_cenario` possuem **fallback seguro de criação/retorno padrão**, impedindo que uma falha em documento auxiliar bloqueie o acesso à tarefa estrutural.
   - Operações críticas de criação com notas ou exclusão de conta registram falha explícita e realizam compensação/retentativa idempotente conforme definido na Fase 10.

## 6. Segurança, autenticação e API

- **Google OAuth 2.0 (Fluxo Authorization Code com `state` e PKCE no servidor):**
  - Usuário inicia login pelo frontend; o backend redireciona ao Google, valida retorno (`state`, `code`, `id_token` / assinatura e audiência) e cria sessão server-side no PostgreSQL.
  - Sessão mantida via **cookie `HttpOnly`**, `SameSite=Lax` (ou configuração equivalente de mesma origem via proxy/rewrite `/api` em produção), sem expor tokens em `localStorage`.
  - Rotas mutáveis (`POST`, `PUT`, `PATCH`, `DELETE`) protegidas contra CSRF.
- **OpenAPI / Swagger:** documentação interativa automática do FastAPI organizada em português para avaliação acadêmica de Web II, protegendo endpoints privados.
- **Códigos de erro padronizados:** envelope consistente `{ "erro": { "codigo": "...", "mensagem": "...", "detalhes": ... } }`.

## 7. Experiência sonora opt-in

- Arquitetura baseada em controlador único (`controlador-de-audio.ts`) sobre a **Web Audio API** (micro-efeitos sintetizados ou arquivos leves com licença livre documentada + trilhas ambientes carregadas sob demanda apenas quando o usuário ativar o áudio).
- Estado inicial sempre silenciado (`habilitado: false`), respeitando bloqueio automático de autoplay dos navegadores e desabilitando imediatamente quando o usuário desligar.

## 8. Execução local, publicação gratuita e CI

- **Execução local:** scripts e guia documentado (`Doc/Ambiente-local.md` a ser criado na Fase 06), proxy do Vite (`/api` → FastAPI local), bancos locais PostgreSQL `18.0` e MongoDB `8.2.5` com instâncias/bases separadas para desenvolvimento e teste.
- **Publicação gratuita (custo zero):**
  - Frontend: **Vercel** (com rewrite `/api/*` para a API em produção para preservar cookie de mesma origem).
  - Backend: **Render** (Web Service gratuito com saúde `/api/saude` e variáveis seguras).
  - PostgreSQL gerenciado: **Neon** (tier gratuito).
  - MongoDB gerenciado: **MongoDB Atlas** (cluster `M0` gratuito).
  - Google Cloud Console configurado com URLs autorizadas local e de produção.
- **Integração contínua (CI):** workflow em **GitHub Actions** executando testes unitários/integração do backend (`pytest`, `ruff`, `mypy`) e testes/tipagem/build do frontend (`vitest`, `tsc`, `eslint`, `vite build`) com bancos de serviço em container e sem depender de GPU WebGL (usando o Fallback 2D quando necessário).
