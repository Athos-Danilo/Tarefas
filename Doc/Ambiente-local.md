# Guia de ambiente local e execucao - Lume

Este documento registra os passos exatos para preparar, validar e executar o **Backend** (`FastAPI`) e o **Frontend** (`React + TypeScript + Vite`) localmente, alem da matriz de compatibilidade de versoes validada na **Fase 06** (`21/11/2026`).

---

## 1. Pre-requisitos e ferramentas verificadas no Windows

Ambiente validado nesta estacao:

- **Python:** `3.13.0` (`pip 25.3+`)
- **Node.js e npm:** `v22.13.0` e `npm 10.9.2`
- **PostgreSQL 18 (servico `postgresql-x64-18`):** binario `psql.exe` encontrado em:
  `C:\Program Files\PostgreSQL\18\bin\psql.exe`
- **MongoDB 8.2 (servico `MongoDB`):** binario `mongod.exe` encontrado em:
  `C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe`
- **Observacao importante no Windows:** caso `psql` ou `mongod` nao estejam no `PATH` do PowerShell, utilize o caminho completo entre aspas (por exemplo, `& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres`). O utilitario `mongosh` nao foi encontrado no `PATH` desta maquina (pode ser instalado a parte caso precise de acesso interativo em linha de comando; o backend usa o driver oficial `PyMongo` na Fase 07).

---

## 2. Matriz de compatibilidade Frontend validada

Verificada diretamente no registro `npm` e validada com `npm install`, `vitest`, `eslint`, `tsc` e `vite build`:

| Pacote | Versao adotada | Motivo tecnico |
| --- | --- | --- |
| `react` e `react-dom` | `~19.3.1` | Compativel com `@react-three/fiber@9.8.2` (`>=19 <19.4`), `@react-three/drei@10.7.9` (`^19`) e `@xyflow/react@13.0.2` (`>=18`), evitando salto automatico para `19.4`. |
| `typescript` | `~5.9.3` | Evita incompatibilidade com `typescript-eslint@8.73.0`, cujo peerDependency exige `typescript >=4.8.4 <6.1.0`. |
| `jsdom` | `~27.4.0` | Compativel com Vitest `5.1.1` e Node `v22.13.0` (`engines.node: ^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0`), evitando erro de `undici@8` presente no `jsdom@31` em Node `<22.19`. |
| `vite` / `@tailwindcss/vite` | `^8.3.8` / `^4.3.5` | Proxy local `/api` integrado e Tailwind CSS v4 sem configuracao extra. |
| `three` / `@react-three/fiber` / `@react-three/drei` | `^0.187.0` / `^9.8.2` / `^10.7.9` | Mundo 3D procedural Soft-3D Clay Matte, Lua 3D na fase real e clima reativo com `React.lazy`. |
| `@xyflow/react` / `recharts` / `motion` / `@dnd-kit/*` | `^13.0.2` / `^3.11.0` / `^14.14.0` / `^6.3.1` | Mapa Constelacao/Ramos, graficos do Dashboard, transicoes respeitando `prefers-reduced-motion` e drag-and-drop acessivel. |
| Backend: `pywebpush` / `certifi` | `>=2.0,<3.0` / `>=2024.0` | Envio gratuito Web Push (`VAPID`) e cadeia TLS para conexoes `mongodb+srv://` no MongoDB Atlas. |

---

## 3. Como preparar e rodar o Backend (FastAPI)

No diretório raiz do repositorio (`Tarefas/`):

```powershell
# 1. Criar ambiente virtual isolado
python -m venv Backend\.venv

# 2. Atualizar pip e instalar o projeto em modo editavel com ferramentas de desenvolvimento
Backend\.venv\Scripts\python.exe -m pip install --upgrade pip
Backend\.venv\Scripts\python.exe -m pip install -e "Backend[dev]"

# 3. Criar arquivo local de ambiente a partir do exemplo ficticio (nao versionado)
Copy-Item Backend\.env.exemplo Backend\.env
```

Em Linux/macOS, o interpretador dentro da `.venv` fica em `Backend/.venv/bin/python`.

### Criar bancos locais no PostgreSQL 18 e aplicar migracoes Alembic

1. Crie os bancos `lume_dev` (desenvolvimento) e `tarefas_teste` (testes isolados) no PostgreSQL local informando a sua senha local no prompt ou via variavel temporaria da sessao PowerShell:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE DATABASE lume_dev ENCODING 'UTF8';"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE DATABASE tarefas_teste ENCODING 'UTF8';"
```

2. Preencha `LUME_POSTGRES_URL`, `LUME_POSTGRES_TESTE_URL` e `LUME_MONGO_URL` dentro de `Backend/.env` e aplique/verifique o esquema inicial via Alembic:

```powershell
cd Backend
.\.venv\Scripts\python.exe -m alembic upgrade head
# Opcional para reverter migracoes em ambiente local/teste:
.\.venv\Scripts\python.exe -m alembic downgrade base
```

### Verificacoes do Backend

```powershell
cd Backend
.\.venv\Scripts\python.exe -m ruff check src testes alembic
.\.venv\Scripts\python.exe -m ruff format --check src testes alembic
.\.venv\Scripts\python.exe -m mypy src
.\.venv\Scripts\python.exe -m pytest -v
```

*(Observacao: os testes de integracao exigem que `LUME_POSTGRES_TESTE_URL` e `LUME_MONGO_BANCO_TESTE` apontem para bancos cujo nome termine em `_teste`, como `tarefas_teste`.)*

### Subir a API em desenvolvimento (porta `8000`)

```powershell
Backend\.venv\Scripts\python.exe -m uvicorn principal:app --app-dir Backend/src --host 127.0.0.1 --port 8000 --reload
```

Endpoint inicial de saude: `http://127.0.0.1:8000/api/saude` (documentacao Swagger em `http://127.0.0.1:8000/docs`).

---

## 4. Como preparar e rodar o Frontend (React + TypeScript + Vite)

```powershell
cd Frontend
npm install
Copy-Item .env.exemplo .env
```

### Verificacoes do Frontend

```powershell
cd Frontend
npm run formatar:verificar
npm run lint
npm run tipo
npx vitest run --maxWorkers=2
npm run build
```

*(Dica no Windows: utilizar `--maxWorkers=2` evita contencao excessiva de CPU ao inicializar os `28` ambientes `jsdom`; [configuracao-testes.ts](../Frontend/testes/configuracao-testes.ts) define `asyncUtilTimeout: 4000` para acomodar o primeiro carregamento dinamico das rotas com `React.lazy`.)*

### Subir o servidor de desenvolvimento (porta `5173`)

```powershell
cd Frontend
npm run dev
```

No PowerShell, caso deseje passar flags extras (como `--host 127.0.0.1`) ao `vite` via `npm`, utilize `--%` antes do `--` (`npm run dev --% --host 127.0.0.1 --port 5173`) ou execute `.\node_modules\.bin\vite.cmd --host 127.0.0.1 --port 5173`.

Com ambos os servidores ativos (`8000` e `5173`), acesse `http://127.0.0.1:5173/` (ou `http://localhost:5173/`). Todas as requisicoes para `/api/*` sao encaminhadas pelo proxy do Vite diretamente para o FastAPI.

---

## 5. Integracao Continua (CI)

O workflow [.github/workflows/ci.yml](../.github/workflows/ci.yml) executa automaticamente a cada `push` ou `pull_request` na branch `main` as duas baterias independentes:

1. **Backend:** sobe containers de servico `postgres:18` e `mongo:8`, executa `ruff check`, `ruff format --check`, `mypy src` e `pytest` (incluindo migracoes Alembic `upgrade`/`downgrade` e integracao real nos bancos isolados de teste).
2. **Frontend:** `prettier --check`, `eslint .`, `tsc -b --noEmit`, `vitest run` e `vite build`.

---

## 6. Exportacao do contrato OpenAPI e publicacao online

Para regenerar o arquivo [openapi.json](openapi.json) a partir da aplicacao FastAPI na raiz do repositorio:

```powershell
Backend\.venv\Scripts\python.exe -c "import json, pathlib, sys; sys.path.insert(0, 'Backend/src'); from principal import app; pathlib.Path('Doc/openapi.json').write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + '\n', encoding='utf-8')"
```

Para detalhes do ambiente publicado gratuitamente (`Vercel` + `Render` + `Neon` + `MongoDB Atlas M0` + `Google Cloud OAuth` + `cron-job.org`), consulte [Publicacao-producao.md](Publicacao-producao.md).
