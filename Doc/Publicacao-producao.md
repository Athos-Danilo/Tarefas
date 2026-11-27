# Publicacao em producao com custo zero - Lume (`D16`)

**Data de conclusao:** 27/11/2026  
**Decisao vinculada:** `D16` / `ID-42` em [Registro-de-ideias-e-decisoes.md](Registro-de-ideias-e-decisoes.md) e **Fase 26** em [Roteiro-primeira-entrega.md](Roteiro-primeira-entrega.md).

---

## 1. Enderecos publicos oficiais

- **Frontend (Vercel Hobby / Free):** `https://lume-fawn.vercel.app`
- **Backend API (Render Free - Ohio US East):** `https://lume-api-7cmw.onrender.com`
- **Saude da API (mesma origem via proxy Vercel):** `https://lume-fawn.vercel.app/api/saude`
- **Saude da API (direto no Render):** `https://lume-api-7cmw.onrender.com/api/saude`
- **Documentacao OpenAPI / Swagger:** `https://lume-api-7cmw.onrender.com/docs`

---

## 2. Servicos gratuitos provisionados

| Camada | Provedor (tier gratuito) | Configuracao aplicada |
| --- | --- | --- |
| Frontend + Proxy `/api` | **Vercel** (`Hobby / Free`) | Diretorio raiz `Frontend`, preset `Vite`, arquivo [vercel.json](../Frontend/vercel.json) com rewrite `/api/:path*` para `https://lume-api-7cmw.onrender.com/api/:path*`, fallback SPA protegido (`assets/`, `assets-3d/`, `favicons/`, `sw.js`, `manifest.webmanifest`) e cabecalhos HTTP de seguranca + `Service-Worker-Allowed: /`. |
| Backend FastAPI | **Render** (`Free`, Ohio `US East`) | Diretorio raiz `Backend`, Python `3.13.0`, Build Command `pip install --upgrade pip && pip install .`, Start Command `alembic upgrade head && uvicorn principal:app --app-dir src --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'`, Health Check Path `/api/saude`. |
| PostgreSQL | **Neon** (`Free`, AWS `us-east-2`) | Conexao direta (sem `-pooler`), URL normalizada em runtime/Alembic para `postgresql+psycopg://` em [conexao.py](../Backend/src/infraestrutura/postgres/conexao.py), com 4 migracoes (`20261121_0001` a `20261122_0004`) aplicadas no startup. |
| MongoDB | **MongoDB Atlas** (`M0 Free`) | Cluster `Lume`, banco documental `lume_prod`, regra de rede `0.0.0.0/0` para IPs dinamicos do Render e CA TLS explicito via `certifi` para `mongodb+srv://` em [conexao.py](../Backend/src/infraestrutura/mongo/conexao.py). |
| Autenticacao OAuth | **Google Cloud Console** (*Google Auth Platform*) | Projeto `Lume`, cliente `Lume Web` publicado em producao (`External`), origens autorizadas `https://lume-fawn.vercel.app` e `http://localhost:5173`, URIs de callback `https://lume-fawn.vercel.app/api/autenticacao/google/callback` e `http://localhost:5173/api/autenticacao/google/callback`. |
| Cron de Lembretes Web Push | **`cron-job.org`** (`Free`) | Job `Lume Lembretes` executando `POST https://lume-api-7cmw.onrender.com/api/interno/disparar-lembretes` a cada `5` minutos com cabecalho `X-Token-Interno`. |

---

## 3. Variaveis de ambiente configuradas no Render

*(Apenas nomes e finalidades documentados; todos os valores reais ficam restritos ao painel seguro do Render, sem versionamento no Git.)*

| Variavel | Finalidade |
| --- | --- |
| `PYTHON_VERSION` | Fixa runtime `3.13.0` no Render. |
| `LUME_AMBIENTE` | Define modo `producao`. |
| `LUME_COOKIE_SEGURO` | Ativa `Secure=True` nos cookies `lume_sessao`, `lume_csrf` e `lume_oauth_estado` em HTTPS. |
| `LUME_POSTGRES_URL` | String de conexao direta do PostgreSQL no Neon (`us-east-2`). |
| `LUME_MONGO_URL` | String `mongodb+srv://` do cluster no MongoDB Atlas `M0`. |
| `LUME_MONGO_BANCO` | Nome do banco documental em producao (`lume_prod`). |
| `LUME_GOOGLE_CLIENT_ID` | Identificador publico do cliente OAuth `Lume Web`. |
| `LUME_GOOGLE_CLIENT_SECRET` | Segredo OAuth do cliente `Lume Web`. |
| `LUME_GOOGLE_REDIRECT_URI` | Callback de producao `https://lume-fawn.vercel.app/api/autenticacao/google/callback`. |
| `LUME_ORIGENS_CORS` | Origens permitidas (`https://lume-fawn.vercel.app,http://localhost:5173`). |
| `LUME_SEGREDO_SESSAO` | Chave secreta usada na assinatura HMAC do estado OAuth. |
| `LUME_TOKEN_CRON_LEMBRETES` | Token secreto exigido no header `X-Token-Interno` para disparo de lembretes por cron. |
| `LUME_VAPID_PUBLIC_KEY` | Chave publica VAPID em Base64 URL-safe entregue ao Service Worker para Web Push. |
| `LUME_VAPID_PRIVATE_KEY` | Chave privada VAPID em Base64 URL-safe usada pelo `pywebpush`. |
| `LUME_VAPID_SUBJECT` | Contato `mailto:` oficial das reivindicacoes VAPID. |

---

## 4. Verificacoes realizadas ao vivo (26-27/11/2026)

1. **Saude poliglota em nuvem:** `GET https://lume-api-7cmw.onrender.com/api/saude` retornou `{"status":"ok","servico":"lume-api","versao":"0.1.0","banco_relacional":"conectado","banco_documental":"conectado"}`, com as 4 migracoes Alembic aplicadas no Neon e indices criados no MongoDB Atlas.
2. **Landing, WebGL 3D e PWA na Vercel:** `https://lume-fawn.vercel.app` carregou a Landing completa com cenario WebGL 3D, sistema cromatico continuo e opcao `Instalar` PWA ativa no navegador Chrome.
3. **Autenticacao Google real em producao:** fluxo OAuth 2.0 via proxy de mesma origem (`/api/autenticacao/google/*`) testado ao vivo pelo responsavel com entrada bem-sucedida na conta.
4. **Cron gratuito de lembretes Web Push:** execucao de teste no `cron-job.org` para `POST https://lume-api-7cmw.onrender.com/api/interno/disparar-lembretes` respondeu `200 OK` em `221 ms`, incluindo `Cache-Control: no-store`, `permissions-policy: camera=(), microphone=(), payment=()` e `referrer-policy: strict-origin-when-cross-origin`.

---

## 5. Observacoes operacionais do tier gratuito

- **Sistema de arquivos efemero no Render Free:** arquivos gravados em disco local do container (como uploads personalizados de avatar em `diretorio_uploads`) nao persistem entre novos deploys ou reinicios do servico; os `16` avatares Soft-3D embarcados no frontend e a foto do perfil Google nao dependem de disco efemero.
- **Intervalo do cron:** o agendador no `cron-job.org` opera a cada `5` minutos para disparar lembretes vencidos e reduzir ocorrencias de *cold start* na instancia gratuita do Render durante uso continuo.
