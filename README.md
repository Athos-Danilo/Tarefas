# Lume - Horizonte Vivo

> *"Suas tarefas no ritmo vivo do dia."*

Aplicacao web responsiva e **PWA instalavel** de gestao de tarefas pessoais e colaborativas desenvolvida para a disciplina **Web II**, unindo organizacao hierarquica multinivel (ate `5` niveis), **Tarefas em Conjunto** por link de convite, calendario mensal, modo foco imersivo, dashboard de estatisticas, notificacoes **Web Push (`VAPID`)** e simulacao continua das `24` horas do dia com **Lua 3D na fase lunar real (Hemisferio Sul)** e **clima atmosferico reativo**.

---

## Enderecos publicados (custo zero)

- **Aplicacao Web (Vercel Hobby / Free):** `https://lume-fawn.vercel.app`
- **API Backend (Render Free - Ohio US East):** `https://lume-api-7cmw.onrender.com`
- **Verificacao de saude poliglota:** `https://lume-fawn.vercel.app/api/saude` (via proxy mesma origem) ou `https://lume-api-7cmw.onrender.com/api/saude`
- **Documentacao OpenAPI / Swagger UI:** `https://lume-api-7cmw.onrender.com/docs`

---

## Principais funcionalidades entregues

- **Horizonte Vivo 24h (`Three.js` / `React Three Fiber` + Fallback 2D):** interpolacao cromatica continua ao longo dos `1.440` minutos com contraste WCAG AA, `4` favicons adaptativos, jardim procedural *Soft-3D Clay Matte*, Lua 3D real do Hemisferio Sul, `5` estados climaticos com chuva instanciada e troca automatica/manual para Fallback 2D.
- **Autenticacao e privacidade:** login exclusivo via **Google OAuth 2.0** (PKCE `S256` + `state` HMAC), sessao server-side em cookie `HttpOnly`, protecao `X-CSRF-Token`, **Primeiro Acesso** com `16` avatares Soft-3D, **Modo Tutorial Guiado** em `6` passos e exclusao definitiva de conta mediante confirmacao `EXCLUIR`.
- **Arvore composta e Jornada do Dia (`/jornada`):** ate `5` niveis de subtarefas sem ciclos, progresso ponderado por folhas, alerta de filha urgente, conclusao em cascata com **Desfazer** (`10s`), reordenacao acessível (`@dnd-kit`), **recorrencia periodica** (`diaria`, `semanal`, `mensal`), etiquetas coloridas, gaveta de edicao com `6` blocos ricos, exportacao `.md`/`.json` e **mini-card de clima opt-in (`Open-Meteo`)**.
- **Tarefas em Conjunto (`/convite/:token`):** compartilhamento de arvores com **Lider** e **Membro colaborador**, vagas nomeadas, link de convite revogavel, atribuicao por subtarefa, painel de desempenho da equipe e atualizacao via *polling* inteligente (`12s`).
- **Visoes complementares:** **Mapa Visual de Constelacao/Ramos** (`@xyflow/react`), **Modo Foco Imersivo** (`/foco`), **Calendario Mensal dos Prazos** (`/calendario`), **Dashboard completo de Estatisticas e Diario do Ciclo** (`/estatisticas` com `Recharts`), **Experiencia Sonora opt-in** (Web Audio API procedural) e **PWA + Web Push multi-dispositivo** (`VAPID` + `cron-job.org`).

---

## Stack e arquitetura poliglota

- **Backend:** Python `3.13`, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy `2.x` async + `psycopg` (PostgreSQL), `Alembic`, `PyMongo` (`AsyncMongoClient`), `httpx`, `google-auth`, `pywebpush` e `certifi`.
- **Frontend:** React `19.3`, TypeScript (`strict`), Vite `8`, Tailwind CSS v4, Radix UI, Motion, `@dnd-kit`, `Three.js` / `@react-three/fiber` / `@react-three/drei`, `@xyflow/react`, `Recharts`, TanStack Query, React Hook Form + Zod e Zustand.
- **Bancos de dados em producao:** **Neon PostgreSQL** (`11` tabelas relacionais ACID) e **MongoDB Atlas `M0`** (`4` colecoes documentais e `7` indices).

```text
Tarefas/
├── Agents/
│   └── Regras.md                           # Regras permanentes (pt-BR, SOLID, TDD, seguranca)
├── Backend/                                # API FastAPI, Alembic, dominio puro, testes pytest
├── Doc/                                    # Base SDD, diagramas, OpenAPI e roteiros Web II
├── Frontend/                               # App React/TS/Vite, Three.js, PWA, vercel.json e testes
└── .github/workflows/ci.yml                # CI automatizada (Postgres 18 + Mongo 8 + Node 22)
```

---

## Como executar localmente

O passo a passo completo de configuracao (`.env`, criacao de bancos locais PostgreSQL/MongoDB, migracoes Alembic e execucao dos servidores nas portas `8000` e `5173`) esta documentado em [Doc/Ambiente-local.md](Doc/Ambiente-local.md).

Resumo rapido:

```powershell
# Backend (a partir de Backend/)
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn principal:app --app-dir src --host 127.0.0.1 --port 8000 --reload

# Frontend (em outro terminal, a partir de Frontend/)
npm run dev
```

---

## Verificacoes finais de aceitacao (Fase 27 - 27/11/2026)

- **Backend (em `Backend/`):**
  - `.venv\Scripts\python.exe -m ruff check src testes alembic` -> `All checks passed!`
  - `.venv\Scripts\python.exe -m ruff format --check src testes alembic` -> `140 files already formatted`
  - `.venv\Scripts\python.exe -m mypy src` -> `Success: no issues found in 102 source files`
  - `.venv\Scripts\python.exe -m pytest -v` -> **`88 passed, 1 warning in 18.62s`** (executado contra bancos `_teste` reais e dubles deterministicos para Google OAuth, `ProvedorWebPush` e `ProvedorClima`, alem de mocks de `pywebpush.webpush` nos testes unitarios; aviso `StarletteDeprecationWarning` de `httpx` no `TestClient`).
- **Frontend (em `Frontend/`):**
  - `npm run formatar:verificar` (`prettier --check .`) -> aprovado
  - `npm run lint` (`eslint .`) -> aprovado
  - `npm run tipo` (`tsc -b --noEmit`) -> aprovado
  - `npx vitest run --maxWorkers=2` -> **`28 passed (28)` arquivos, `100 passed (100)` testes** em `49.71s` (ambiente `jsdom` com dubles deterministicos dos clientes HTTP, `Notification`/`PushManager` e `clients`; avisos preexistentes de `act(...)` em `SistemaVisualFallback2D.test.tsx` e `ExperienciaSonoraOptIn.test.tsx`).
  - `npm run build` (`tsc -b && vite build`) -> `3291 modules transformed`, concluido em `1.44s` (avisos padrao do Vite de chunk > `500 kB` em `index` com `629.62 kB` e `Cenario3D` com `929.80 kB`).
- **Observacao sobre E2E em navegador:** o pacote `@playwright/test` nao faz parte das dependencias de `Frontend/package.json`; os fluxos em navegador real foram validados ao vivo no ambiente publicado em producao (`https://lume-fawn.vercel.app`: saude poliglota conectada, Landing WebGL 3D, botao PWA instalavel, login Google real em HTTPS e disparo `cron-job.org` retornando `200 OK` em `221 ms`).

---

## Documentacao SDD, tecnica e academica

- [Doc/Arquitetura-e-dados-Web-II.md](Doc/Arquitetura-e-dados-Web-II.md): diagrama de arquitetura poliglota/nuvem, diagrama ER completo (`11` tabelas PostgreSQL), esquema documental (`4` colecoes MongoDB) e seguranca.
- [Doc/Roteiro-apresentacao-Web-II.md](Doc/Roteiro-apresentacao-Web-II.md): roteiro cronometrado de apresentacao (`12` a `15` minutos) para a disciplina Web II.
- [Doc/openapi.json](Doc/openapi.json): contrato OpenAPI `3.1.0` exportado (`53` rotas e `110` esquemas).
- [Doc/Publicacao-producao.md](Doc/Publicacao-producao.md): configuracao detalhada dos `6` servicos gratuitos na nuvem (`D16`).
- [Doc/Processo-de-desenvolvimento-com-IA.md](Doc/Processo-de-desenvolvimento-com-IA.md): engenharia SDD/SOLID/TDD e orquestracao multimodelo no Google Antigravity (`Gemini 4 Neon` + `Gemini 4 Hydrogen`).
- [Doc/Revisoes/Auditoria-fase-25.md](Doc/Revisoes/Auditoria-fase-25.md): auditoria de integridade, privacidade, seguranca, acessibilidade e *code-splitting*.
- [Doc/Ambiente-local.md](Doc/Ambiente-local.md): guia de instalacao local, scripts de teste e CI.
- [Doc/Roteiro-primeira-entrega.md](Doc/Roteiro-primeira-entrega.md): historico completo das `27` fases concluidas da primeira entrega (com a **Fase 24B** posicionada ao final como etapa dedicada de retoques visuais pos-publicacao).
