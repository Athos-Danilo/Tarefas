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
- **Clima local e Web Push:** `httpx` para consulta gratuita à API **Open-Meteo** (previsão climática e busca de cidades) com cache em memória (`15-30 min`) e fallback seguro; `pywebpush` para envio gratuito de notificações **Web Push (`VAPID`)**.
- **Qualidade e TDD:** `pytest`, `pytest-asyncio`, `httpx` (`AsyncClient` / `TestClient`), `ruff` (lint e formatação) e `mypy` (verificação estrita de tipos).

### 2.2 Frontend & Ecossistema de Design (React + TypeScript + Vite)
- **Núcleo:** `React`, `TypeScript` (`strict: true`), `Vite`.
- **Estilização e Design System:** `Tailwind CSS v4` alimentado por variáveis CSS semânticas dinâmicas com **interpolação cromática contínua ao longo das 24 horas** (sobre os keyframes da direção *Alvorada Poética* nos 4 momentos: `manha`, `tarde`, `crepusculo` e `noite`), utilizando faixas de polaridade luminosa e noturna para preservar contraste WCAG AA (`>= 4.5:1`) em todos os 1.440 minutos do dia.
- **Primitivos acessíveis:** `Radix UI` (diálogos, menus, popovers, seletores e tooltips com foco e teclado acessíveis).
- **Animações de interface:** `motion` (Framer Motion) para transições fluidas, **animações tipográficas e efeitos de escrita/revelação**, **microinterações táteis de hover** e coreografia de movimento em árvore e cartões conforme [Guia-visual.md](Guia-visual.md) (`ID-19`), sempre respeitando `prefers-reduced-motion`.
- **Arrastar e soltar acessível:** `@dnd-kit` para reordenação manual e movimentação de tarefas na Jornada do Dia com suporte a ponteiro e teclado.
- **Mundo 3D (WebGL):** `three` (`0.187.0`), `@react-three/fiber` (`9.8.2`) e `@react-three/drei` (`10.7.9`).
  - **Compatibilidade verificada na Fase 06 e aplicada na Fase 14 (`22/11/2026`):** `react` e `react-dom` fixados em `~19.3.1` (compativel com `@react-three/fiber@9.8.2` que exige `>=19 <19.4`, `@react-three/drei@10.7.9` e `@xyflow/react@13.0.2`), `typescript` fixado em `~5.9.3` (exigido pelo `typescript-eslint@8.73.0`) e `jsdom ~27.4.0` para Node `v22.13.0`.
- **Mapa Visual de Constelação / Ramos:** `@xyflow/react` aprovado em `D11` (Fase 05) com nós e arestas customizados (ramos botânicos durante o dia e constelações luminosas à noite), zoom/pan nativo, minimapa e navegação acessível por teclado.
- **Gráficos e Visualização de Dados (`D14`):** `Recharts` combinado a mapa de calor SVG customizado para o Dashboard completo de Estatísticas (Fase 21), adaptando cores e contraste aos 4 momentos do dia.
- **Dados, formulários e estado:** `@tanstack/react-query` (cache e sincronização com a API, incluindo *polling* inteligente `10-15s` com aba ativa para Tarefas em Conjunto), `react-hook-form` + `zod` (validação tipada de formulários), `zustand` (estado efêmero de UI, Modo Simulador do Arco do Dia e controlador de foco/áudio).
- **Iconografia, assets Soft-3D e favicons adaptativos:** `Lucide React` combinado com SVGs autorais para ícones do mapa/fases lunares, os renders **Soft-3D Clay Matte** catalogados em `Doc/Identidade-visual/assets-3d/` (publicados em `Frontend/public/favicons/` e `Frontend/public/assets-3d/` na Fase 13) e um controlador leve no cliente que atualiza `<link rel="icon">` somente na troca entre os 4 turnos do dia (`Manhã`, `Tarde`, `Entardecer` e `Noite`), evitando cintilação na aba.
- **PWA, Web Push e astronomia lunar offline:** `manifest.webmanifest`, *Service Worker* próprio com suporte a `PushManager` (Web Push `VAPID` multi-dispositivo) e módulo astronômico puro offline para cálculo da fase lunar real atual com orientação do **Hemisfério Sul**.
- **Tipografia:** trio tipográfico aprovado em `D03` (**`Fraunces`** Display + **`Plus Jakarta Sans`** Sans UI + **`JetBrains Mono`** Mono tabular para horários/timers), com uso expressivo de **bold** e **itálico** em títulos, saudações, Modo Foco e notas ricas (`ID-17`), hospedando localmente todas as variantes (incluindo itálicos) sob licença `SIL OFL 1.1`.
- **Responsividade:** arquitetura **desktop-first** (base principal para computador) com layout fluido e componentes adaptados para total usabilidade em **tablets e celulares** (`ID-18`).
- **Qualidade e TDD:** `Vitest`, `@testing-library/react`, `@testing-library/user-event`, `Playwright` (testes E2E e inspeção visual), `ESLint` e `Prettier`.

## 3. Estratégia de renderização 3D híbrida e desempenho

Para entregar um visual cinematográfico sem comprometer legibilidade, acessibilidade nem dispositivos simples:

1. **Cenário 3D vivo ao fundo (`CenarioDoHorizonte` + `Cenario3D` carregado via `React.lazy`):**
   - Céu procedural / shader com **transição cromática contínua ao longo das 24 horas** (sobre os keyframes de *Alvorada Poética* atravessando `manha`, `tarde`, `crepusculo` e `noite`), arco orbital real do Sol e da **Lua 3D com `ShaderMaterial` iluminada exatamente na fase lunar do dia atual** (orientação do Hemisfério Sul + luz cinérea sutil na face escura), campo de estrelas, vagalumes e constelações panorâmicas 3D que se iluminam conforme as tarefas compostas avançam, além de jardim procedural **Soft-3D Clay Matte** (`InstancedMesh`, sem arquivos `.glb` externos conforme `D13`/`ID-39`).
   - **Clima atmosférico reativo (`ID-27`):** reage aos 5 estados WMO (`limpo`, `parcialmente_nublado`, `nublado`, `chuvoso`, `tempestade`) com nuvens **Soft-3D**, gotas de chuva via `InstancedMesh` e tempestade suave (com `intensidadeRelampagoMax === 0` quando `prefers-reduced-motion: reduce` ou `Reduzir movimento` está ativo), controlado pelo clima local opt-in ou pelo seletor de clima no Modo Simulador.
   - **Orçamento WebGL (`D13` / `ID-39`):** no desktop (`>= 768px`), riqueza visual máxima com teto de `70.000` triângulos, `DPR [1, 2]`, sombras suaves e paralaxe suave no ponteiro; abaixo de `768px`, reduz automaticamente para teto de `28.000` triângulos, `DPR [1, 1.25]` e sem sombras dinâmicas. Inclui pausa automática em aba oculta (`visibilitychange`), descarte explícito de geometrias e tratamento automático de perda de contexto (`webglcontextlost`) migrando para Fallback 2D.
2. **Camada 2D de alta nitidez por cima:**
   - Todos os textos, listas hierárquicas, formulários, notas ricas, **mini-card opt-in de Cidade + Horário + Temperatura**, Calendário Mensal, Modo Foco e o editor interativo do Mapa Constelação/Ramos são renderizados em DOM/SVG nítido com superfícies translúcidas que acompanham a progressão horária sem cruzar a faixa de baixo contraste.
3. **Modo Desempenho / Fallback 2D obrigatório:**
   - Substitui a cena WebGL por uma paisagem equivalente em camadas SVG/CSS suaves com a mesma interpolação contínua de 24h, fase lunar real em SVG e nuvens/chuva leves, garantindo funcionamento integral quando:
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
│   ├── Contratos-api.md
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
│   │   ├── dominio/             # entidades, enums, erros de domínio e regras puras da árvore e recorrência
│   │   ├── contratos/           # Protocolos (portas) para repositórios, OAuth, clima, grupos e Web Push
│   │   ├── servicos/            # casos de uso (autenticacao, tarefas, arvore, recorrencia, grupos, clima, lembretes, foco, calendario, estatisticas)
│   │   ├── infraestrutura/
│   │   │   ├── postgres/        # modelos ORM, sessao async e repositórios SQLAlchemy
│   │   │   ├── mongo/           # cliente PyMongo async e repositórios de documentos
│   │   │   ├── google/          # adaptador Google OAuth 2.0
│   │   │   ├── open_meteo/      # adaptador de clima local e busca de cidades com cache
│   │   │   └── web_push/        # adaptador pywebpush (VAPID)
│   │   └── rotas/               # roteadores FastAPI e esquemas Pydantic (entrada/saída)
│   └── testes/
│       ├── unitarios/
│       └── integracao/
└── Frontend/
    ├── package.json
    ├── index.html
    ├── public/
    │   ├── manifest.webmanifest # manifesto PWA com ícone Sol de 4 Ls
    │   └── assets-3d/           # renders Soft-3D e os 4 favicons por horário
    ├── src/
    │   ├── sw.ts                # Service Worker (PWA + recebimento/clique de Push)
    │   ├── aplicacao/           # rotas, provedores, guarda de autenticacao
    │   ├── dominios/            # tarefas, grupos, mapa-constelacao, foco, calendario, estatisticas, tutorial, lembretes, conta
    │   ├── astronomia/          # cálculo puro offline da fase lunar real (Hemisfério Sul)
    │   ├── cenario/             # mundo 3D R3F, shaders/luz do ciclo, Lua 3D, nuvens/chuva, jardim, fallback 2D
    │   ├── audio/               # controlador central Web Audio opt-in e paisagens sonoras (incl. chuva)
    │   ├── servicos/            # cliente HTTP, notificacoes Web Push, mapeadores snake_case <-> camelCase
    │   ├── componentes/         # sistema visual base (botões, cartões, mini-card clima/hora, graficos, modais, badges)
    │   ├── hooks/               # hooks React (`usar-*.ts` exportando `use*`)
    │   └── estilos/             # tokens CSS contínuos 24h e tipografia local SIL OFL 1.1
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
- **`tarefas`:** `id` (UUID), `usuario_id` (FK), `tarefa_pai_id` (FK auto-referenciada anulável com índice), `titulo`, `prioridade` (`baixa` | `media` | `alta` | `urgente`), `status` (`pendente` | `em_andamento` | `concluida`), `turno` (`manha` | `tarde` | `noite` | `livre`), `prazo` (anulável, indexado por `(usuario_id, prazo)`), `profundidade` (`1` a `5`, com restrição `CHECK`), `ordem_manual`, `recorrencia_tipo` (`nenhuma` | `diaria` | `semanal` | `mensal`, adicionado na Fase 10), `recorrencia_config` (JSON/texto opcional), `serie_recorrencia_id` (UUID anulável), `vezes_reaberta` (inteiro padrão `0`), `compartilhada` (booleano padrão `false`, adicionado na Fase 11), `responsavel_usuario_id` (FK anulável com `ON DELETE SET NULL`), `vaga_responsavel_id` (FK anulável com `ON DELETE SET NULL`), `concluida_em`, `criado_em`, `atualizado_em`.
  - Consultas de árvore completa e subárvores utilizam `WITH RECURSIVE` (CTE recursiva) filtrada por `usuario_id` ou associação em `membros_tarefa` para garantir consistência e bloqueio de ciclos em transação atômica.
- **`membros_tarefa` (Fase 11):** `id` (UUID), `tarefa_raiz_id` (FK -> `tarefas.id` com `ON DELETE CASCADE`), `usuario_id` (FK -> `usuarios.id` com `ON DELETE CASCADE`), `papel` (`lider` | `colaborador`), `entrou_em` (`UNIQUE (tarefa_raiz_id, usuario_id)`).
- **`vagas_tarefa` (Fase 11):** `id` (UUID), `tarefa_raiz_id` (FK -> `tarefas.id` com `ON DELETE CASCADE`), `nome_exibicao`, `email_opcional` (anulável, indexado), `ocupada_por_usuario_id` (FK -> `usuarios.id` com `ON DELETE SET NULL`), `criada_em`.
- **`convites_tarefa` (Fase 11):** `id` (UUID), `tarefa_raiz_id` (FK -> `tarefas.id` com `ON DELETE CASCADE`), `codigo_token` (único), `criado_por_usuario_id` (FK), `ativo` (booleano), `expira_em` (anulável), `criado_em`, `revogado_em` (anulável).
- **`etiquetas` e `tarefa_etiquetas`:** etiquetas nomeadas e coloridas por usuário (`UNIQUE (usuario_id, nome_normalizado)`) com tabela associativa `N:N`.
- **`sessoes_foco`:** `id` (UUID), `usuario_id` (FK), `tarefa_id` (FK), `duracao_planejada_seg`, `duracao_real_seg`, `iniciada_em`, `encerrada_em`, `status` (`concluida` | `interrompida`).
- **`inscricoes_push`:** `id` (UUID), `usuario_id` (FK com `ON DELETE CASCADE`), `endpoint` (único), `chave_p256dh`, `chave_auth`, `rotulo_dispositivo`, `plataforma` (`desktop` | `android` | `ios` | `outro`), `criado_em`, `ultimo_envio_em`.
- **`lembretes_tarefas`:** `id` (UUID), `usuario_id` (FK com `ON DELETE CASCADE`), `tarefa_id` (FK com `ON DELETE CASCADE`), `disparar_em`, `antecedencia_min`, `status` (`pendente` | `enviado` | `cancelado`), `enviado_em`, `criado_em` (indexado por `(status, disparar_em)` para varredura eficiente do agendador).

### 5.2 MongoDB: Documentos flexíveis, mapa visual, eventos e preferências
- **`detalhes_tarefas`:** `{ _id, tarefa_id (único), usuario_id, notas_em_blocos: [...], metadados_visuais: { forma_botanica, cor_estrela, icone }, atualizado_em }`.
- **`layouts_constelacao`:** `{ _id, usuario_id, tarefa_raiz_id (único por usuário), nos: { [tarefa_id]: { x, y, fixado } }, viewport: { zoom, centro_x, centro_y }, atualizado_em }`.
- **`eventos_ciclo`:** `{ _id, usuario_id, autor_usuario_id, tarefa_id, tarefa_raiz_id, tipo_evento, momento_do_dia, resumo, detalhes: {...}, criado_em }` (indexado por `(usuario_id, criado_em DESC)` e `(tarefa_raiz_id, criado_em DESC)` para diário pessoal e linha do tempo da equipe).
- **`preferencias_cenario`:** `{ _id, usuario_id (único), modo_temporal, hora_simulada, qualidade_3d, reduzir_movimento, clima: { habilitado, modo_localizacao, cidade, uf, latitude_aprox, longitude_aprox }, audio: { habilitado, volume_geral, volume_efeitos, volume_ambiente }, tutorial: { status: 'pendente'|'pulado'|'concluido', etapa_atual, atualizado_em }, atualizado_em }` (por padrão `clima.habilitado = false` e `tutorial.status = 'pendente'` após criação de conta; ao desativar clima, cidade e coordenadas aproximadas são limpas).

### 5.3 Estratégia de consistência poliglota (sem transação distribuída)
1. Toda criação, edição estrutural, movimentação, conclusão em cascata ou reabertura é concluída primeiro em **transação atômica no PostgreSQL**.
2. Em seguida, o serviço grava ou atualiza de forma idempotente os documentos correspondentes no **MongoDB** (`detalhes_tarefas`, `layouts_constelacao`, `eventos_ciclo`).
3. Caso o MongoDB falhe momentaneamente após uma leitura ou atualização:
   - Leituras de `detalhes_tarefas`, `layouts_constelacao` e `preferencias_cenario` possuem **fallback seguro de criação/retorno padrão**, impedindo que uma falha em documento auxiliar bloqueie o acesso à tarefa estrutural.
   - Operações críticas de criação com notas ou exclusão de conta registram falha explícita e realizam compensação/retentativa idempotente conforme definido na Fase 10.

## 6. Segurança, autenticação e API (`D05`-`D10`, [Contratos-api.md](Contratos-api.md))

- **Google OAuth 2.0 (Fluxo Authorization Code com `state` e PKCE no servidor):**
  - Usuário inicia login pelo frontend; o backend redireciona ao Google, valida retorno (`state`, `code`, `id_token` / assinatura e audiência) e cria sessão server-side no PostgreSQL.
  - **Sessão deslizante e revogação (`D07`):** cookie **`lume_sessao`** (`HttpOnly`, `SameSite=Lax`, `Secure` em produção) em mesma origem (`/api` local e rewrite Vercel -> Render) com validade deslizante de **`7` dias** e teto absoluto de **`30` dias**, incluindo ação `POST /api/autenticacao/sair-todos` para encerrar todas as sessões ativas. Sem tokens em `localStorage`.
  - **Proteção CSRF (`D07`):** cookie `lume_csrf` + cabeçalho obrigatório **`X-CSRF-Token`** nas rotas mutáveis (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Exclusão definitiva de conta (`D06`) e limites (`D09`-`D10`):** remoção exige confirmação textual exata `EXCLUIR` e limpa ambos os bancos + avatar enviado; camada Pydantic/domínio aplica limites equilibrados (`D09`), `token_desfazer` com TTL de `15s`, `estrategia=cascata|promover_filhas` (`D08`), validação estrita `http://`/`https://` nos `6` tipos de blocos ricos e exportação `.md`/`.json` (`D10`).
- **OpenAPI / Swagger:** documentação interativa automática do FastAPI organizada em português para avaliação acadêmica de Web II, protegendo endpoints privados.
- **Códigos de erro padronizados:** envelope consistente `{ "erro": { "codigo": "...", "mensagem": "...", "detalhes": ... } }`, especificado integralmente em [Contratos-api.md](Contratos-api.md).

## 7. Experiência sonora opt-in

- Arquitetura baseada em controlador único (`controlador-de-audio.ts`) sobre a **Web Audio API** (micro-efeitos sintetizados ou arquivos leves com licença livre documentada + trilhas ambientes carregadas sob demanda apenas quando o usuário ativar o áudio, incluindo **som suave de chuva** acoplado aos estados climáticos `chuvoso` e `tempestade`).
- Estado inicial sempre silenciado (`habilitado: false`), respeitando bloqueio automático de autoplay dos navegadores e desabilitando imediatamente quando o usuário desligar.

## 8. Execução local, publicação gratuita e CI

- **Execução local:** scripts e guia documentado (`Doc/Ambiente-local.md` a ser criado na Fase 06), proxy do Vite (`/api` → FastAPI local), bancos locais PostgreSQL `18.0` e MongoDB `8.2.5` com instâncias/bases separadas para desenvolvimento e teste.
- **Publicação gratuita (custo zero):**
  - Frontend: **Vercel** (com rewrite `/api/*` para a API em produção para preservar cookie de mesma origem).
  - Backend: **Render** (Web Service gratuito com saúde `/api/saude`, chaves `VAPID` em variáveis seguras e endpoint protegido por token para disparo de lembretes).
  - Agendador gratuito de lembretes: cron externo gratuito (ex.: GitHub Actions ou `cron-job.org` a cada 5 minutos) acionando o endpoint protegido de varredura/envio de lembretes, evitando atrasos caso a instância gratuita do Render hiberne após inatividade.
  - PostgreSQL gerenciado: **Neon** (tier gratuito).
  - MongoDB gerenciado: **MongoDB Atlas** (cluster `M0` gratuito).
  - Google Cloud Console configurado com URLs autorizadas local e de produção.
- **Integração contínua (CI):** workflow em **GitHub Actions** executando testes unitários/integração do backend (`pytest`, `ruff`, `mypy`) e testes/tipagem/build do frontend (`vitest`, `tsc`, `eslint`, `vite build`) com bancos de serviço em container e sem depender de GPU WebGL (usando o Fallback 2D quando necessário).
