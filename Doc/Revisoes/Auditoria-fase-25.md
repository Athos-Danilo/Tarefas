# Auditoria tecnica da Fase 25 - Lume

**Data:** 26/11/2026  
**Escopo:** Revisao de integridade, privacidade/consentimento, permissoes de grupo, seguranca, acessibilidade, PWA/Web Push e desempenho 3D/chuva.  
**Metodologia:** Auditoria estatica e funcional seguida de correcoes guiadas por **TDD de regressao** (ciclo vermelho para verde).  
**Escopo dos testes automatizados:** Os testes de integracao do backend executaram contra bancos `_teste` reais (PostgreSQL e MongoDB) utilizando dubles deterministicos para Google OAuth, Web Push (`ProvedorWebPush`) e consulta meteorologica (`ProvedorClima`), complementados por testes unitarios com mocks de `pywebpush.webpush`. No frontend, a suite foi executada em ambiente `jsdom` com dubles deterministicos dos clientes HTTP, `Notification`/`PushManager` e `clients` do Service Worker.

---

## 1. Achados e correcoes no Backend

| # | Area | Achado na auditoria | Correcao aplicada | Arquivo / simbolo |
| --- | --- | --- | --- | --- |
| 1 | Cabecalhos HTTP e cache | Respostas da API nao aplicavam cabecalhos de seguranca padrao nem `Cache-Control: no-store` uniforme em rotas sensiveis de sessao, conta e push. | Criado middleware HTTP `aplicar_cabecalhos_seguranca` definindo `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy: camera=(), microphone=(), payment=()`, alem de `Cache-Control: no-store` para `/api/autenticacao`, `/api/push`, `/api/interno` e `/api/conta` (preservando `/api/conta/avatar/atual`). | `Backend/src/principal.py` |
| 2 | Cookies OAuth | A limpeza de `lume_oauth_estado` no callback via `delete_cookie` nao replicava `httponly`, `samesite="lax"` e `secure=config.cookie_seguro`, divergindo dos atributos da criacao em HTTPS. | Atualizada a chamada `delete_cookie` em `rotas_autenticacao.py` com `path="/"`, `httponly=True`, `samesite="lax"` e `secure=config.cookie_seguro`. | `Backend/src/rotas/rotas_autenticacao.py` |
| 3 | Exclusao de conta (LGPD/privacidade) | `LimpadorContaMongo.remover_dados_usuario` filtrava `eventos_ciclo` apenas por `{"usuario_id": usuario_id}`, deixando eventos gerados pelo usuario em grupos cujo dono era outro usuario (`autor_usuario_id`). | Atualizada a remocao em `eventos_ciclo` para `{"$or": [{"usuario_id": usuario_id}, {"autor_usuario_id": usuario_id}]}`. | `Backend/src/infraestrutura/mongo/limpador_conta_mongo.py` |
| 4 | Grupos e lembretes | Ao remover um colaborador ou registrar sua saida em um grupo que permanece ativo (`not grupo_desfeito`), os lembretes pendentes daquele ex-membro na arvore do grupo permaneciam com status `pendente`. | Atualizado `remover_ou_sair_membro` para cancelar `LembreteTarefaModelo` com status `pendente` do `usuario_alvo_id` cujo `tarefa_id` pertenca a arvore do grupo quando `not grupo_desfeito`. | `Backend/src/infraestrutura/postgres/repositorio_grupos.py` |
| 5 | Isolamento privada vs compartilhada | `_resolver_raiz_autorizada` curto-circuitava `dono_id == usuario_id` sem explicitar a fronteira booleana de `compartilhada` antes da consulta em `MembroTarefaModelo`. | Reforcada a verificacao explicita em `_resolver_raiz_autorizada`: se `not compartilhada`, autoriza exclusivamente `dono_id == usuario_id`; se compartilhada, exige vinculo ativo em `MembroTarefaModelo`. | `Backend/src/infraestrutura/postgres/repositorio_tarefas.py` |

**Teste de regressao criado:** `Backend/testes/integracao/test_auditoria_fase25_seguranca_e_privacidade.py` (`test_auditoria_fase25_cabecalhos_cookies_seguros_lembretes_e_exclusao_mongo`), cobrindo `delete_cookie` sob `cookie_seguro=True` em `https://testserver`, cabecalhos de seguranca e `no-store`, bloqueio `403 CLIMA_NAO_AUTORIZADO` com zero chamadas ao provedor externo, resposta `404` para nao-membro em tarefas/exportacao/lembretes, cancelamento automatico de lembretes apos remocao do membro no grupo ativo e limpeza completa de `autor_usuario_id` em `eventos_ciclo` na exclusao `EXCLUIR`.

---

## 2. Achados e correcoes no Frontend

| # | Area | Achado na auditoria | Correcao aplicada | Arquivo / simbolo |
| --- | --- | --- | --- | --- |
| 1 | Acessibilidade de teclado e marcos ARIA | `CascaWorkspace` nao possuia *skip-link* para o conteudo principal, `<main>` nao tinha `id="conteudo-principal"` focalizavel e os links de navegacao nao sinalizavam `aria-current="page"`. Alem disso, itens da barra movel podiam comprimir em larguras muito estreitas e o botao de saida movel nao tinha `aria-label` explicito. | Adicionado link `Pular para o conteúdo principal` apontando para `#conteudo-principal`, `<main id="conteudo-principal" tabIndex={-1}>`, `aria-current={ativo ? 'page' : undefined}` nas barras desktop/tablet e movel, `shrink-0` nos links e botoes da barra movel e `aria-label="Sair da conta"` no botao de saida movel. | `Frontend/src/aplicacao/CascaWorkspace.tsx` |
| 2 | Estabilidade horizontal em telas pequenas | Faltava trava explicita contra transbordo horizontal no elemento raiz em cenarios de 320px/390px sem quebrar elementos `sticky`. | Adicionado `overflow-x: clip;` em `body`. | `Frontend/src/estilos/global.css` |
| 3 | Foco no Modo Tutorial Guiado | Ao fechar o `TourGuiadoLume` com `Esc`, o foco nao retornava ao elemento disparador anterior. | Capturado `document.activeElement` ao abrir (`elementoAnteriorRef`) e restaurado o foco quando `aberto` transiciona de `true` para `false` (`estavaAbertoRef`), com implementacao compativel com `React.StrictMode`. | `Frontend/src/dominios/tutorial/TourGuiadoLume.tsx` |
| 4 | Orcamento de bundle inicial | Todas as 8 paginas pos-landing eram importadas estaticamente em `Aplicacao.tsx`, elevando o chunk inicial para `1,716.49 kB` (`gzip: 515.53 kB`) por incluir Recharts, `@xyflow/react` e `@dnd-kit` ja na Landing. | Convertidas as 8 paginas pos-landing para `React.lazy` com `<Suspense fallback={<FallbackCarregamentoRota />}>` (`role="status"`), mantendo apenas `PaginaLanding` imediata. | `Frontend/src/aplicacao/Aplicacao.tsx` |

**Teste de regressao criado:** `Frontend/testes/integracao/AuditoriaFase25AcessibilidadeDesempenho.test.tsx`, validando *skip-link*, `#conteudo-principal`, `aria-current="page"` na rota ativa, restauracao de foco ao fechar `TourGuiadoLume` com `Escape` e ausencia de claroes (`data-flashes-ativos="false"` e sem `clarao-tempestade-2d`) no `CenarioFallback2D` em `tempestade` com `reduzirMovimento` ativo.

---

## 3. Comparativo medido de bundle (`vite build`)

| Artefato | Antes (Fase 24) | Depois (Fase 25) | Observacao |
| --- | --- | --- | --- |
| `dist/assets/index-*.js` (Landing + shell) | `1,716.49 kB` (`gzip: 515.53 kB`) | `629.62 kB` (`gzip: 201.91 kB`) | Reducao aproximada de `63,3%` bruto e `60,8%` em gzip |
| `dist/assets/index-*.css` | `83.01 kB` (`gzip: 20.92 kB`) | `68.38 kB` (`gzip: 18.67 kB`) | CSS do Mapa separado em `PaginaMapaConstelacao-bSyOAvy0.css` (`15.99 kB` \| `gzip: 2.70 kB`) |
| `dist/assets/Cenario3D-*.js` | `929.68 kB` (`gzip: 246.01 kB`) | `929.80 kB` (`gzip: 246.09 kB`) | Mantido isolado em carregamento sob demanda |
| `dist/assets/PaginaEstatisticas-*.js` | Embutido no `index` | `453.55 kB` (`gzip: 124.97 kB`) | Carregado apenas ao acessar `/estatisticas` |
| `dist/assets/PaginaMapaConstelacao-*.js` | Embutido no `index` | `253.13 kB` (`gzip: 84.68 kB`) | Carregado apenas ao acessar `/mapa` |
| `dist/assets/PaginaJornada-*.js` | Embutido no `index` | `70.33 kB` (`gzip: 15.70 kB`) | Carregado apenas ao acessar `/jornada` |
| `dist/assets/PaginaPerfil-*.js` | Embutido no `index` | `19.34 kB` (`gzip: 6.17 kB`) | Carregado apenas ao acessar `/perfil` |
| `dist/assets/PaginaModoFoco-*.js` | Embutido no `index` | `14.45 kB` (`gzip: 4.58 kB`) | Carregado apenas ao acessar `/foco` |
| `dist/assets/PaginaCalendarioMensal-*.js` | Embutido no `index` | `14.04 kB` (`gzip: 4.49 kB`) | Carregado apenas ao acessar `/calendario` |
| `dist/assets/PaginaConviteGrupo-*.js` | Embutido no `index` | `7.97 kB` (`gzip: 2.44 kB`) | Carregado apenas ao acessar `/convite/:token` |
| `dist/assets/PaginaPrimeiroAcesso-*.js` | Embutido no `index` | `4.02 kB` (`gzip: 1.65 kB`) | Carregado apenas ao acessar `/primeiro-acesso` |

---

## 4. Controles auditados sem pendencias criticas abertas

- **Autenticacao e sessao:** PKCE S256 sem padding, `state` assinado com expiracao curta, sessao deslizante de `7` dias com teto absoluto de `30` dias, CSRF por header e cookies `HttpOnly` / `SameSite=Lax`.
- **Autorizacao em Tarefas em Conjunto:** separacao estrita entre **Lider**, **Membro colaborador** e nao-membros (respostas `404` sem vazamento de existencia em tarefas, exportacoes e lembretes).
- **Disparo interno de cron:** comparacao em tempo constante via `hmac.compare_digest` para `X-Token-Interno` e limpeza automatica de inscricoes expiradas (`404`/`410 Gone`).
- **Privacidade de clima e som:** preferencias iniciais padronizadas com `habilitado: false` para clima e audio desligado por padrao; zero consultas externas sem opt-in.
- **Conforto visual e 3D:** `prefers-reduced-motion` desligando claroes de tempestade no Fallback 2D e no Cenario 3D, onde nuvens e gotas de chuva sao instanciadas com fallback automatico para 2D em ausencia de WebGL.

---

## 5. Resultados finais das suites de verificacao

### Backend
- `.venv\Scripts\python.exe -m ruff check src testes`: `All checks passed!`
- `.venv\Scripts\python.exe -m ruff format --check src testes`: `133 files already formatted`
- `.venv\Scripts\python.exe -m mypy src`: `Success: no issues found in 102 source files`
- `.venv\Scripts\python.exe -m pytest -v`: `84 passed, 1 warning in 16.32s` (aviso `StarletteDeprecationWarning` preexistente de `httpx` no `TestClient`)

### Frontend
- `npm run formatar:verificar` (`prettier --check .`): aprovado em todos os arquivos
- `npm run lint` (`eslint .`): aprovado sem erros
- `npm run tipo` (`tsc -b --noEmit`): aprovado sem erros
- `npx vitest run testes/integracao/AuditoriaFase25AcessibilidadeDesempenho.test.tsx`: `1 passed (1)` arquivo, `3 passed (3)` testes (`3.27s`)
- `npx vitest run --maxWorkers=2`: `28 passed (28)` arquivos, `100 passed (100)` testes (`46.23s`), mantendo apenas avisos preexistentes de `act(...)` no stderr de `SistemaVisualFallback2D.test.tsx` e `ExperienciaSonoraOptIn.test.tsx`
- `npm run build` (`tsc -b && vite build`): `3291 modules transformed`, concluido em `1.23s`, emitindo apenas os avisos de chunk superior a `500 kB` referentes a `index-Bi8cZuW-.js` (`629.62 kB`) e `Cenario3D-CuQjTjyr.js` (`929.80 kB`) e diretiva `"use no memo"` em `react-compiler-runtime`
