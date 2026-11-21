# Contratos de API e regras operacionais - Lume

Este documento especifica os contratos HTTP/JSON oficiais entre o frontend (`React + TypeScript`) e o backend (`FastAPI`), consolidando as decisões **`D05` a `D10`** aprovadas na **Fase 04** (`21/11/2026`) além das definições de produto em [Detalhes.md](Detalhes.md) e arquitetura em [Planejamento-tecnico.md](Planejamento-tecnico.md).

---

## 1. Convenções gerais, autenticação, CSRF e envelope de erro

- **Prefixo base:** todas as rotas da API respondem sob `/api` (proxy local do Vite em desenvolvimento e rewrite `/api/*` na Vercel apontando para o Render em produção, mantendo mesma origem para cookies).
- **Formato e nomenclatura:** JSON em UTF-8, chaves em `snake_case` em português do Brasil (`pt-BR`) e timestamps em ISO 8601 UTC (ex.: `2026-11-21T14:30:00Z`).
- **Política de sessão (`D07`):**
  - Autenticação exclusiva via Google OAuth 2.0 (Authorization Code + `state` + PKCE no servidor).
  - Cookie de sessão **`lume_sessao`**: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure=true` em produção (HTTPS).
  - Validade deslizante de **`7` dias** a cada atividade autenticada, respeitando teto máximo absoluto de **`30` dias** a contar da criação da sessão.
- **Proteção CSRF (`D07`):**
  - Cookie legível pelo cliente **`lume_csrf`**: `SameSite=Lax`, `Path=/` (não `HttpOnly`, rotacionado no login).
  - Toda requisição mutável autenticada (`POST`, `PUT`, `PATCH`, `DELETE`, exceto fluxo público de saída/callback OAuth e endpoint interno `/api/interno/*` que usa token próprio) exige cabeçalho `X-CSRF-Token` igual ao token correspondente ao da sessão/cookie.
- **Isolamento multiusuário:** todas as rotas privadas filtram e validam estritamente `usuario_id` da sessão autenticada.

### 1.1 Limites operacionais aprovados (`D09`)

| Recurso / Campo | Limite aprovado | Código de erro ao exceder |
| --- | --- | --- |
| `nome_exibicao` (usuário) | `2` a `60` caracteres | `422 VALIDACAO_INVALIDA` |
| `titulo` da tarefa | `1` a `140` caracteres | `422 VALIDACAO_INVALIDA` |
| Profundidade da árvore | `1` (raiz) a `5` níveis | `422 PROFUNDIDADE_EXCEDIDA` |
| Filhas diretas por tarefa-mãe | Máximo `50` | `422 LIMITE_FILHAS_EXCEDIDO` |
| Tarefas por usuário | Máximo `500` ativas (`pendente` / `em_andamento`) e `2.000` totais | `422 LIMITE_TAREFAS_EXCEDIDO` |
| Blocos e texto em `notas_em_blocos` | Máximo `50` blocos e `15.000` caracteres somados por tarefa | `422 LIMITE_BLOCOS_EXCEDIDO` |
| Etiquetas | Máximo `30` por usuário e `8` associadas por tarefa | `422 LIMITE_ETIQUETAS_EXCEDIDO` |
| Nome da etiqueta | `1` a `30` caracteres (único por usuário, case-insensitive) | `409 ETIQUETA_DUPLICADA` |
| Upload de avatar (`D05`) | Máximo `2 MB` (`2.097.152` bytes), `PNG`, `JPG` ou `WebP`, normalizado para `256x256` | `413 ARQUIVO_MUITO_GRANDE` / `422 FORMATO_IMAGEM_INVALIDO` |
| Dispositivos Web Push (`inscricoes_push`) | Máximo `10` por usuário | `422 LIMITE_DISPOSITIVOS_PUSH` |
| Lembretes ativos por tarefa | Máximo `3` pendentes por tarefa | `422 LIMITE_LEMBRETES_EXCEDIDO` |
| Janela do `token_desfazer` (cascata) | Exibição `10s` na interface; expiração no servidor `15s` | `409 DESFAZER_EXPIRADO` |
| Membros e vagas em Tarefa em Conjunto | Máximo `10` membros ativos e `10` vagas por tarefa-raiz | `422 LIMITE_MEMBROS_GRUPO_EXCEDIDO` |

### 1.2 Envelope padrão de erro e códigos estáveis

Todas as respostas `4xx` e `5xx` utilizam o envelope único abaixo:

```json
{
  "erro": {
    "codigo": "PROFUNDIDADE_EXCEDIDA",
    "mensagem": "A árvore de tarefas permite no máximo 5 níveis de profundidade.",
    "detalhes": {
      "profundidade_maxima": 5,
      "profundidade_resultante": 6
    }
  }
}
```

| HTTP | Código estável | Quando ocorre |
| --- | --- | --- |
| `400` | `REQUISICAO_INVALIDA` | JSON malformado, parâmetro ausente ou tipo incompatível |
| `401` | `NAO_AUTENTICADO` | Cookie `lume_sessao` ausente, inválido, revogado ou expirado |
| `401` | `OAUTH_INVALIDO` | Falha na verificação `state`, `code` ou assinatura Google |
| `403` | `CSRF_INVALIDO` | Cabeçalho `X-CSRF-Token` ausente ou divergente |
| `403` | `PRIMEIRO_ACESSO_PENDENTE` | Tentativa de acessar rotas do workspace antes de concluir `/api/conta/primeiro-acesso` |
| `403` | `CLIMA_NAO_AUTORIZADO` | Consulta a `/api/clima/atual` com `preferencias_cenario.clima.habilitado = false` |
| `403` | `PERMISSAO_GRUPO_INSUFICIENTE` | Membro colaborador tenta ação exclusiva do Líder ou fora das suas subtarefas atribuídas |
| `403` | `TOKEN_INTERNO_INVALIDO` | Acesso ao disparo interno de lembretes sem `X-Token-Interno` válido |
| `404` | `TAREFA_NAO_ENCONTRADA` | `tarefa_id` inexistente ou pertencente a outro usuário |
| `404` | `CONVITE_INVALIDO_OU_REVOGADO` | Link de convite de tarefa em conjunto inexistente, revogado ou expirado |
| `404` | `RECURSO_NAO_ENCONTRADO` | Etiqueta, sessão de foco, dispositivo, vaga ou lembrete inexistente |
| `409` | `CICLO_DETECTADO` | Tentativa de mover tarefa para si mesma ou para um descendente |
| `409` | `CONFIRMACAO_ESTRATEGIA_OBRIGATORIA` | `DELETE /api/tarefas/{id}` em tarefa-mãe com filhas sem `estrategia` |
| `409` | `CONFIRMACAO_EXCLUSAO_INVALIDA` | Texto diferente de `EXCLUIR` em `/api/conta/excluir` |
| `409` | `LIDER_DEVE_TRANSFERIR_OU_EXCLUIR` | Líder tenta sair de tarefa em conjunto com outros membros antes de transferir liderança |
| `409` | `VAGA_JA_OCUPADA` | Tentativa de vincular-se a uma vaga nomeada já associada a outro usuário |
| `409` | `SESSAO_FOCO_JA_ATIVA` | Abertura de segunda sessão de foco enquanto existe outra `em_andamento` |
| `409` | `DESFAZER_EXPIRADO` | Uso de `token_desfazer` após `15s` ou já consumido |
| `409` | `ETIQUETA_DUPLICADA` | Nome normalizado de etiqueta já cadastrado pelo usuário |
| `413` | `ARQUIVO_MUITO_GRANDE` | Avatar enviado maior que `2 MB` |
| `422` | `VALIDACAO_INVALIDA` / `URL_NAO_SEGURA` / `LIMITE_MEMBROS_GRUPO_EXCEDIDO` | Regra Pydantic violada, link fora de `http://`/`https://` ou teto de `10` membros/vagas atingido |
| `503` | `SERVICO_EXTERNO_INDISPONIVEL` | Falha temporária do provedor Open-Meteo (quando sem cache válido) ou Google OAuth |

---

## 2. Saúde da aplicação

### `GET /api/saude` (público)
Verifica disponibilidade da API, PostgreSQL e MongoDB sem expor credenciais.

```json
{
  "status": "ok",
  "servico": "lume-api",
  "versao": "0.1.0",
  "banco_relacional": "conectado",
  "banco_documental": "conectado",
  "timestamp": "2026-11-21T14:30:00Z"
}
```

---

## 3. Autenticação Google OAuth 2.0, sessão, primeiro acesso e exclusão de conta (`D05`, `D06`, `D07`)

### `GET /api/autenticacao/google/iniciar` (público)
- Gera `state`, `code_verifier` (PKCE) e redireciona (`302 Found`) para a tela de consentimento Google (escopos mínimos `openid email profile`).

### `GET /api/autenticacao/google/callback?code=...&state=...` (público)
- Valida `state`, troca `code` no Google, valida `id_token` (`email_verified == true`), cria ou localiza usuário por `google_sub`, grava sessão na tabela `sessoes`, define cookies `lume_sessao` (`HttpOnly`) e `lume_csrf`, e redireciona (`302 Found`) para `/primeiro-acesso` (se `primeiro_acesso_concluido == false`) ou `/jornada`.

### `GET /api/autenticacao/sessao` (autenticado)
Retorna o estado atual da sessão e se há redirecionamento pendente de primeiro acesso.

```json
{
  "autenticado": true,
  "usuario": {
    "id": "5b7c1e12-8a4f-4a7e-9c12-104d2c9b0001",
    "email": "athos@exemplo.com",
    "nome_exibicao": "Athos Danilo",
    "avatar_tipo": "preset",
    "avatar_id": "vagalume-estelar",
    "avatar_url": "/assets-3d/avatares/vagalume-estelar.png",
    "primeiro_acesso_concluido": true
  },
  "sessao": {
    "expira_em": "2026-11-28T14:30:00Z",
    "expiracao_absoluta_em": "2026-12-21T14:30:00Z"
  }
}
```

### `POST /api/autenticacao/sair` e `POST /api/autenticacao/sair-todos` (autenticado + CSRF)
- **`/sair`**: revoga apenas a sessão do cookie atual (`revogada_em = NOW()`) e limpa `lume_sessao` e `lume_csrf`. Resposta `204 No Content`.
- **`/sair-todos`**: revoga todas as sessões ativas do `usuario_id` em todos os aparelhos (`D07`) e limpa os cookies da requisição atual.

```json
{
  "sessoes_revogadas": 3
}
```

### `POST /api/conta/primeiro-acesso` (autenticado + CSRF, `D05`)
Conclui a configuração inicial. Quando `criar_arvore_guia == true` (padrão sugerido na tela, desmarcável pelo usuário), cria em transação atômica `1` tarefa-raiz editável com subtarefas mostrando prioridades e níveis, grava `preferencias_cenario` padrão (com `clima.habilitado = false` e `audio.habilitado = false`) e marca `primeiro_acesso_concluido = true`.

Requisição:

```json
{
  "nome_exibicao": "Athos",
  "avatar_tipo": "preset",
  "avatar_id": "sol-nascente",
  "criar_arvore_guia": true
}
```

Resposta (`200 OK`):

```json
{
  "primeiro_acesso_concluido": true,
  "arvore_guia_criada": true,
  "tarefa_guia_id": "a9d0b411-3c2a-498c-94f2-558801122334"
}
```

### `GET /api/conta/perfil` e `PATCH /api/conta/perfil` (autenticado; `PATCH` exige CSRF)
Permite consultar ou editar `nome_exibicao` (`2-60` chars) e alternar `avatar_tipo` (`"preset"` | `"google"` | `"upload"`) + `avatar_id` (um dos `16` IDs oficiais).

```json
{
  "nome_exibicao": "Athos Danilo",
  "avatar_tipo": "google",
  "avatar_id": null
}
```

### `POST /api/conta/avatar` (autenticado + CSRF, `multipart/form-data`)
Recebe campo `arquivo` (`PNG`, `JPG` ou `WebP`, máximo `2 MB`), valida assinatura mágica dos bytes da imagem, converte/redimensiona centralizado para `256x256` removendo metadados EXIF, atualiza `avatar_tipo = "upload"` e retorna:

```json
{
  "avatar_tipo": "upload",
  "avatar_url": "/api/conta/avatar/atual?v=1763735400",
  "largura": 256,
  "altura": 256
}
```

### `POST /api/conta/excluir` (autenticado + CSRF, `D06`)
Exige exatamente `"confirmacao": "EXCLUIR"`. Qualquer valor divergente retorna `409 CONFIRMACAO_EXCLUSAO_INVALIDA`. Remove definitivamente todos os documentos no MongoDB (`detalhes_tarefas`, `layouts_constelacao`, `eventos_ciclo`, `preferencias_cenario`), eventual arquivo de avatar enviado, e o registro de `usuarios` no PostgreSQL (propagando `ON DELETE CASCADE` para `sessoes`, `tarefas`, `etiquetas`, `tarefa_etiquetas`, `sessoes_foco`, `inscricoes_push` e `lembretes_tarefas`), limpando os cookies.

Requisição:

```json
{
  "confirmacao": "EXCLUIR"
}
```

Resposta (`200 OK`):

```json
{
  "conta_excluida": true,
  "mensagem": "Conta e todos os dados pessoais removidos em definitivo."
}
```

---

## 4. Tarefas compostas, árvore 5 níveis, cascata, desfazer e exclusão (`D08`, `D09`)

### Representação canônica da tarefa (`D08`)
- **`percentual_conclusao`:** calculado recursivamente sobre as **tarefas-folha** da subárvore: `round((folhas_concluidas / total_folhas) * 100)`. Para uma tarefa sem filhas (`total_folhas = 1`), retorna `100` se `status == "concluida"` ou `0` caso contrário.
- **`tem_filha_urgente_aberta`:** booleano derivado `true` se qualquer descendente direta ou indireta possuir `prioridade == "urgente"` e `status != "concluida"`.

### `GET /api/tarefas` (autenticado)
Parâmetros de query opcionais: `turno` (`manha|tarde|noite|livre`), `status` (`pendente|em_andamento|concluida`), `prioridade` (`baixa|media|alta|urgente`), `etiqueta_id`, `busca` (textual), `incluir_concluidas` (`true|false`, padrão `true`), `formato` (`arvore|plano`, padrão `arvore`).

```json
{
  "itens": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "tarefa_pai_id": null,
      "titulo": "Projeto Web II",
      "prioridade": "alta",
      "status": "em_andamento",
      "turno": "tarde",
      "prazo": "2026-11-30T23:59:00Z",
      "profundidade": 1,
      "ordem_manual": 1,
      "percentual_conclusao": 50,
      "total_folhas": 4,
      "folhas_concluidas": 2,
      "tem_filha_urgente_aberta": true,
      "etiquetas": [
        {
          "id": "e1000000-0000-4000-8000-000000000001",
          "nome": "Faculdade",
          "cor": "#1D5C87"
        }
      ],
      "recorrencia": {
        "tipo": "semanal",
        "dias_semana": [2, 5]
      },
      "vezes_reaberta": 0,
      "compartilhada": false,
      "responsavel": null,
      "lembretes_pendentes": 1,
      "criado_em": "2026-11-21T12:00:00Z",
      "atualizado_em": "2026-11-21T14:20:00Z",
      "subtarefas": [
        {
          "id": "22222222-2222-4222-8222-222222222222",
          "tarefa_pai_id": "11111111-1111-4111-8111-111111111111",
          "titulo": "Finalizar contratos da API",
          "prioridade": "urgente",
          "status": "em_andamento",
          "turno": "manha",
          "prazo": null,
          "profundidade": 2,
          "ordem_manual": 1,
          "percentual_conclusao": 0,
          "total_folhas": 1,
          "folhas_concluidas": 0,
          "tem_filha_urgente_aberta": false,
          "etiquetas": [],
          "recorrencia": {
            "tipo": "nenhuma",
            "dias_semana": []
          },
          "vezes_reaberta": 1,
          "compartilhada": false,
          "responsavel": null,
          "lembretes_pendentes": 0,
          "criado_em": "2026-11-21T12:05:00Z",
          "atualizado_em": "2026-11-21T14:20:00Z",
          "subtarefas": []
        }
      ]
    }
  ],
  "totais": {
    "ativas": 14,
    "concluidas": 6,
    "limite_ativas": 500
  }
}
```

### `POST /api/tarefas` (autenticado + CSRF)
Valida limites (`D09`: máximo `5` níveis, `50` filhas diretas, `500` ativas, `2.000` totais, `8` etiquetas por tarefa). Aceita opcionalmente `recorrencia` (`nenhuma` | `diaria` | `semanal` | `mensal`) e, em árvores compartilhadas, `responsavel_usuario_id` ou `vaga_responsavel_id`. Retorna `201 Created` com o nó criado e resumo atualizado dos ancestrais se houver `tarefa_pai_id`.

```json
{
  "titulo": "Criar testes de ciclo no dominio",
  "tarefa_pai_id": "11111111-1111-4111-8111-111111111111",
  "prioridade": "media",
  "turno": "tarde",
  "prazo": "2026-11-25T18:00:00Z",
  "recorrencia": {
    "tipo": "nenhuma",
    "dias_semana": []
  },
  "etiqueta_ids": ["e1000000-0000-4000-8000-000000000001"]
}
```

### `GET /api/tarefas/{tarefa_id}` e `PATCH /api/tarefas/{tarefa_id}` (autenticado; `PATCH` exige CSRF)
- `GET` retorna a tarefa com subárvore imediata/completa, resumo de `detalhes_tarefas` e lista de lembretes.
- `PATCH` atualiza campos editáveis (`titulo`, `prioridade`, `status`, `turno`, `prazo`, `etiqueta_ids`), mantendo regras de consistência (para conclusão/reabertura em cascata, usar rotas dedicadas abaixo).

### `POST /api/tarefas/{tarefa_id}/concluir` (autenticado + CSRF, `D08`)
- Se a tarefa possuir descendentes em aberto e `confirmar_cascata == false`, retorna `409` solicitando confirmação ou o frontend envia `confirmar_cascata: true` diretamente após confirmação do usuário.
- Conclui a tarefa e descendentes em transação atômica, propaga conclusão ascendente automática aos ancestrais quando todas as irmãs fecham, recalcula percentuais, cancela lembretes pendentes e gera evento no MongoDB (`eventos_ciclo`).
- Quando há conclusão em lote de mais de 1 nó, retorna `token_desfazer` (TTL `15s`, exibido `10s` na UI).

Requisição:

```json
{
  "confirmar_cascata": true
}
```

Resposta (`200 OK`):

```json
{
  "tarefa_id": "11111111-1111-4111-8111-111111111111",
  "nos_concluidos": [
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222"
  ],
  "ancestrais_atualizados": [],
  "token_desfazer": "undo_9f8e7d6c5b4a3210",
  "expira_em": "2026-11-21T14:30:15Z"
}
```

### `POST /api/tarefas/desfazer-cascata` (autenticado + CSRF, `D08`)
Recebe `token_desfazer` dentro do prazo de `15s` no servidor e restaura exatamente o `status` e `concluida_em` anteriores de cada nó afetado (incluindo ancestrais).

```json
{
  "token_desfazer": "undo_9f8e7d6c5b4a3210"
}
```

Resposta (`200 OK`):

```json
{
  "restaurados": 2,
  "tarefa_id": "11111111-1111-4111-8111-111111111111"
}
```

### `POST /api/tarefas/{tarefa_id}/reabrir` (autenticado + CSRF)
Move tarefa `concluida` para `pendente` ou `em_andamento` (`status_destino`), reabrindo automaticamente ancestrais que estavam concluídos para `em_andamento` e recalculando percentuais.

```json
{
  "status_destino": "em_andamento"
}
```

### `POST /api/tarefas/{tarefa_id}/mover` (autenticado + CSRF)
Executa `reparenting` (anexando sob `novo_pai_id`) ou promoção a raiz (`novo_pai_id: null`). Valida em transação atômica com CTE recursiva que não há ciclo (`409 CICLO_DETECTADO`), que a subárvore não excede profundidade `5` (`422 PROFUNDIDADE_EXCEDIDA`) e que o destino não excede `50` filhas diretas (`422 LIMITE_FILHAS_EXCEDIDO`).

```json
{
  "novo_pai_id": null,
  "nova_ordem": 2
}
```

### `PATCH /api/tarefas/reordenar` (autenticado + CSRF)
Atualiza a sequência manual entre irmãs no mesmo `tarefa_pai_id` (ou `null` para raiz) e `turno`.

```json
{
  "tarefa_pai_id": null,
  "ordenacao": [
    { "tarefa_id": "11111111-1111-4111-8111-111111111111", "ordem_manual": 1 },
    { "tarefa_id": "33333333-3333-4333-8333-333333333333", "ordem_manual": 2 }
  ]
}
```

### `DELETE /api/tarefas/{tarefa_id}?estrategia=cascata|promover_filhas` (autenticado + CSRF, `D08`)
- Se a tarefa não possuir filhas: exclui imediatamente em transação (e limpa `detalhes_tarefas`, `lembretes_tarefas`, `layouts_constelacao` se raiz) retornando `200 OK`.
- Se possuir filhas e `estrategia` não for informada: retorna `409 CONFIRMACAO_ESTRATEGIA_OBRIGATORIA` com `total_descendentes` para o diálogo oferecer explicitamente as 2 escolhas ao usuário:
  - `estrategia=cascata`: apaga a tarefa-mãe e toda a sua subárvore descendente.
  - `estrategia=promover_filhas`: apaga apenas a tarefa-mãe e promove suas filhas diretas para o pai anterior dela (ou raiz se era nível `1`), decrementando a profundidade da subárvore em transação atômica e recalculando percentuais.

Resposta (`200 OK`):

```json
{
  "estrategia_aplicada": "promover_filhas",
  "tarefas_removidas": 1,
  "filhas_promovidas": 3
}
```

---

## 5. Etiquetas (`D09`)

- `GET /api/etiquetas` (autenticado): lista todas as etiquetas do usuário (`max 30`).
- `POST /api/etiquetas` (autenticado + CSRF): cria etiqueta com `nome` (`1-30` chars) e `cor` hexadecimal válida (`#RRGGBB`).
- `PATCH /api/etiquetas/{etiqueta_id}` (autenticado + CSRF): edita nome ou cor.
- `DELETE /api/etiquetas/{etiqueta_id}` (autenticado + CSRF): remove etiqueta e desvincula de `tarefa_etiquetas`.

```json
{
  "nome": "Web II",
  "cor": "#256B4E"
}
```

---

## 6. Notas ricas em blocos (MongoDB) e exportação (`D10`)

### `GET /api/tarefas/{tarefa_id}/detalhes` e `PUT /api/tarefas/{tarefa_id}/detalhes` (autenticado; `PUT` exige CSRF)
Persiste o documento `detalhes_tarefas` no MongoDB com exatamente **`6` tipos de bloco** aprovados em `D10` (máximo `50` blocos e `15.000` caracteres por tarefa):
1. `paragrafo` (aceita texto e marcação inline `**negrito**` e `*itálico*`)
2. `subtitulo` (`nivel`: `2` ou `3`)
3. `lista` (`ordenada`: booleano, `itens`: lista de strings)
4. `checklist` (`itens`: lista de `{ texto, marcado }`)
5. `citacao` (`texto`, `autor` opcional)
6. `codigo_ou_link` (`subtipo`: `"codigo"` ou `"link"`; se `"link"`, exige URL estritamente `http://` ou `https://`, rejeitando `javascript:`/`data:` com `422 URL_NAO_SEGURA`)

Exemplo completo de `PUT /api/tarefas/{tarefa_id}/detalhes`:

```json
{
  "metadados_visuais": {
    "forma_botanica": "girassol",
    "cor_estrela": "#FFD166"
  },
  "notas_em_blocos": [
    {
      "id": "blk-1",
      "tipo": "subtitulo",
      "nivel": 2,
      "texto": "Checklist da apresentação"
    },
    {
      "id": "blk-2",
      "tipo": "paragrafo",
      "texto": "Demonstrar o **ciclo de 24h** com *Lua 3D* e árvore multinível."
    },
    {
      "id": "blk-3",
      "tipo": "lista",
      "ordenada": false,
      "itens": ["Subir backend FastAPI", "Validar Google OAuth"]
    },
    {
      "id": "blk-4",
      "tipo": "checklist",
      "itens": [
        { "texto": "Testar Web Push no celular", "marcado": true },
        { "texto": "Simular chuva no Arco do Dia", "marcado": false }
      ]
    },
    {
      "id": "blk-5",
      "tipo": "citacao",
      "texto": "Cada pequena subtarefa concluída acende uma estrela no horizonte.",
      "autor": "Lume"
    },
    {
      "id": "blk-6",
      "tipo": "codigo_ou_link",
      "subtipo": "link",
      "rotulo": "Documentação FastAPI",
      "conteudo": "https://fastapi.tiangolo.com/"
    }
  ]
}
```

### Exportação em Markdown e JSON (`D10`)
- **`GET /api/exportacao/tarefas?formato=md|json&tarefa_id=<opcional>`** (autenticado): exporta a árvore completa (ou subárvore específica) com notas ricas em `.md` (`text/markdown; charset=utf-8`) ou `.json` (`application/json`).
- **`GET /api/exportacao/diario?formato=md|json&de=<iso>&ate=<iso>`** (autenticado): exporta o histórico do diário (`eventos_ciclo`) no intervalo em `.md` ou `.json`.

---

## 7. Mapa Visual Constelação / Ramos (`layouts_constelacao`)

- **`GET /api/constelacoes/{tarefa_raiz_id}/layout`** (autenticado): retorna posições `(x, y, fixado)` e `viewport` salvas no MongoDB; se ainda não houver layout personalizado, devolve estrutura vazia padrão para organização automática no frontend.
- **`PUT /api/constelacoes/{tarefa_raiz_id}/layout`** (autenticado + CSRF): salva coordenadas personalizadas dos nós no MongoDB (`upserted` por `(usuario_id, tarefa_raiz_id)`).
- **`DELETE /api/constelacoes/{tarefa_raiz_id}/layout`** (autenticado + CSRF): limpa posições fixadas para voltar ao arranjo automático ("Reorganizar constelação").

```json
{
  "nos": {
    "11111111-1111-4111-8111-111111111111": { "x": 420.5, "y": 180.0, "fixado": true },
    "22222222-2222-4222-8222-222222222222": { "x": 580.0, "y": 295.0, "fixado": false }
  },
  "viewport": {
    "zoom": 1.0,
    "centro_x": 450.0,
    "centro_y": 240.0
  }
}
```

---

## 8. Modo Foco Imersivo (`sessoes_foco`)

- **`GET /api/foco/sessoes/ativa`** (autenticado): retorna sessão `em_andamento` ou `{ "sessao_ativa": null }`.
- **`POST /api/foco/sessoes`** (autenticado + CSRF): inicia sessão vinculada a uma `tarefa_id` (`duracao_planejada_seg` entre `60` e `14400`). Retorna `409 SESSAO_FOCO_JA_ATIVA` se já existir outra em andamento.
- **`POST /api/foco/sessoes/{sessao_id}/concluir`** (autenticado + CSRF): encerra como `concluida`, grava `duracao_real_seg` no PostgreSQL e registra `eventos_ciclo` no MongoDB.
- **`POST /api/foco/sessoes/{sessao_id}/interromper`** (autenticado + CSRF): encerra como `interrompida` registrando tempo real decorrido.
- **`GET /api/foco/sessoes?limite=20`** (autenticado): lista histórico recente de sessões do usuário.

```json
{
  "tarefa_id": "11111111-1111-4111-8111-111111111111",
  "duracao_planejada_seg": 1500
}
```

---

## 9. Calendário Mensal dos Prazos

### `GET /api/calendario/mensal?ano=2026&mes=11&fuso_horario=America/Sao_Paulo&prioridade=&turno=` (autenticado)
Consulta tarefas com `prazo` dentro da janela mensal corrigida para o fuso do cliente (sem misturar usuários). A fase lunar de cada dia é calculada no módulo astronômico puro do frontend e pode ser acompanhada pela resposta resumida por dia:

```json
{
  "ano": 2026,
  "mes": 11,
  "fuso_horario": "America/Sao_Paulo",
  "dias": [
    {
      "data": "2026-11-30",
      "total_tarefas": 2,
      "maior_prioridade": "urgente",
      "tem_atrasada": false,
      "tarefas": [
        {
          "id": "11111111-1111-4111-8111-111111111111",
          "titulo": "Projeto Web II",
          "prioridade": "alta",
          "status": "em_andamento",
          "turno": "tarde",
          "prazo": "2026-11-30T23:59:00Z",
          "atrasada": false
        }
      ]
    }
  ]
}
```

---

## 10. Estatísticas, Diário do Ciclo e Preferências (`D14`, `ID-36`, `ID-38`)

- **`GET /api/estatisticas/resumo?periodo=30d&escopo=todas&etiqueta_id=`** (autenticado): retorna KPIs completos, séries temporais, mapa de calor diário, distribuição por `prioridade`, `turno` e `etiqueta`, acompanhamento de **tarefas recorrentes** e **análise de repetições/reaberturas (`vezes_reaberta`)** (`periodo`: `7d|30d|90d|tudo`; `escopo`: `todas|pessoais|grupo`).

```json
{
  "periodo": "30d",
  "escopo": "todas",
  "kpis": {
    "total_criadas": 42,
    "total_concluidas": 34,
    "taxa_conclusao_pct": 81,
    "tempo_medio_conclusao_horas": 18.4,
    "pontualidade_pct": 88,
    "sequencia_atual_dias": 6,
    "sequencia_recorde_dias": 12,
    "minutos_foco_totais": 640,
    "taxa_foco_concluido_pct": 85
  },
  "serie_temporal": [
    { "data": "2026-11-20", "criadas": 3, "concluidas": 4, "minutos_foco": 50 },
    { "data": "2026-11-21", "criadas": 2, "concluidas": 3, "minutos_foco": 75 }
  ],
  "mapa_calor": [
    { "data": "2026-11-20", "intensidade": 3, "acoes": 5 },
    { "data": "2026-11-21", "intensidade": 4, "acoes": 6 }
  ],
  "por_turno": { "manha": 12, "tarde": 11, "noite": 7, "livre": 4 },
  "por_prioridade": { "baixa": 8, "media": 14, "alta": 8, "urgente": 4 },
  "por_etiqueta": [
    { "etiqueta_id": "e1000000-0000-4000-8000-000000000001", "nome": "Faculdade", "cor": "#1D5C87", "concluidas": 15 }
  ],
  "recorrencias": {
    "rotinas_ativas": 4,
    "ocorrencias_cumpridas": 22,
    "taxa_consistencia_pct": 79
  },
  "repeticoes_e_retrabalho": {
    "total_reaberturas": 5,
    "tarefas_reabertas_distintas": 3,
    "titulos_mais_repetidos": [
      { "titulo_normalizado": "revisar resumo de aula", "ocorrencias": 6, "concluidas": 5 }
    ]
  },
  "arvores": {
    "constelacoes_concluidas": 3,
    "profundidade_media": 2.4
  }
}
```

- **`GET /api/diario/eventos?limite=20&cursor=<opcional>&tipo=<opcional>&busca=<opcional>`** (autenticado): pagina eventos ricos em `eventos_ciclo` (`tarefa_criada`, `tarefa_concluida`, `cascata_concluida`, `tarefa_reaberta`, `arvore_iluminada`, `foco_concluido`, `foco_interrompido`, `grupo_atribuicao`, etc.) ordenados de forma decrescente por `criado_em`.
- **`GET /api/preferencias` e `PATCH /api/preferencias`** (autenticado; `PATCH` exige CSRF): lê e atualiza `preferencias_cenario` (modo temporal, qualidade 3D / Fallback 2D, movimento reduzido, áudio opt-in com volumes independentes e estado do **Modo Tutorial Guiado** `tutorial.status`: `pendente|pulado|concluido`).

```json
{
  "modo_temporal": "relogio_real",
  "qualidade_3d": "auto",
  "reduzir_movimento": false,
  "audio": {
    "habilitado": false,
    "volume_geral": 0.7,
    "volume_efeitos": 0.8,
    "volume_ambiente": 0.5
  },
  "tutorial": {
    "status": "pulado",
    "etapa_atual": 6
  }
}
```

---

## 11. Clima local opt-in (`Open-Meteo`) e busca de cidades (`ID-24`, `ID-27`)

- **`GET /api/clima/cidades?q=Brasilia`** (autenticado): consulta gratuita de geocoding Open-Meteo e devolve até `8` sugestões (`cidade`, `uf`, `pais`, `latitude_aprox`, `longitude_aprox`) arredondadas para `2` casas decimais (~`1 km`, nunca salvando endereço exato).
- **`PUT /api/clima/consentimento`** (autenticado + CSRF): grava decisão explícita em `preferencias_cenario.clima`. Quando `habilitado == false`, **limpa imediatamente** `cidade`, `uf`, `latitude_aprox` e `longitude_aprox` no banco e retorna `{ "habilitado": false, "estado_climatico": "limpo" }`.
- **`GET /api/clima/atual`** (autenticado): retorna `403 CLIMA_NAO_AUTORIZADO` se `clima.habilitado == false`. Caso autorizado, consulta Open-Meteo com cache em memória (`15-30 min`) e devolve os dados normalizados em um dos `5` estados oficiais:

```json
{
  "habilitado": true,
  "cidade": "Brasília",
  "uf": "DF",
  "temperatura_c": 24.5,
  "codigo_wmo": 61,
  "estado_climatico": "chuvoso",
  "descricao": "Chuva leve",
  "origem_cache": false,
  "atualizado_em": "2026-11-21T14:25:00Z"
}
```

---

## 12. Lembretes por tarefa e Notificações Web Push (`VAPID`) (`ID-26`)

- **`GET /api/push/chave-publica`** (autenticado): retorna a chave pública `VAPID` em Base64 URL-safe para o frontend chamar `PushManager.subscribe()`.
- **`GET /api/push/dispositivos`** (autenticado): lista inscrições em `inscricoes_push` do usuário (ocultando segredos `chave_p256dh`/`chave_auth`, expondo `id`, `rotulo_dispositivo`, `plataforma`, `criado_em`, `ultimo_envio_em`).
- **`POST /api/push/dispositivos`** (autenticado + CSRF): registra ou atualiza inscrição Web Push (`endpoint`, `chaves.p256dh`, `chaves.auth`, `rotulo_dispositivo`, `plataforma`), respeitando limite de `10` dispositivos por conta.
- **`DELETE /api/push/dispositivos/{dispositivo_id}`** (autenticado + CSRF): revoga o dispositivo imediatamente.
- **`GET /api/tarefas/{tarefa_id}/lembretes`**, **`POST /api/tarefas/{tarefa_id}/lembretes`** (máximo `3` ativos por tarefa) e **`DELETE /api/lembretes/{lembrete_id}`** (autenticados; mutações exigem CSRF).

Exemplo de criação de lembrete (`POST /api/tarefas/{tarefa_id}/lembretes`):

```json
{
  "disparar_em": "2026-11-30T23:44:00Z",
  "antecedencia_min": 15
}
```

### `POST /api/interno/disparar-lembretes` (uso interno por cron gratuito, `X-Token-Interno`)
Acionado periodicamente (ex.: cron gratuito a cada `5` min para mitigar hibernação do `Render Free`). Valida token secreto por comparação em tempo constante (`hmac.compare_digest`), seleciona `lembretes_tarefas` com `status = "pendente"` e `disparar_em <= NOW()`, envia notificações via `pywebpush` (`VAPID`), marca lembretes como `enviado` com `enviado_em` e remove automaticamente endpoints que responderem `404` ou `410 Gone`.

```json
{
  "lembretes_processados": 4,
  "notificacoes_enviadas": 7,
  "inscricoes_removidas_expiradas": 1
}
```

---

## 13. Tarefas em Conjunto (Grupos, Vagas e Link de Convite, `ID-37`)

- **`POST /api/grupos/{tarefa_raiz_id}/compartilhar`** (autenticado + CSRF, exclusivo do criador): transforma a tarefa-raiz em tarefa em conjunto (`compartilhada = true`), registra o criador como `lider` em `membros_tarefa` e gera o primeiro token de convite ativo.
- **`POST /api/grupos/{tarefa_raiz_id}/vagas`** e **`DELETE /api/grupos/{tarefa_raiz_id}/vagas/{vaga_id}`** (autenticado + CSRF, exclusivo do Líder): cria ou remove vaga nomeada com `nome_exibicao` (`2-60` chars) e `email_opcional`, respeitando o teto de `10` vagas/membros. Ao remover vaga ou membro, subtarefas associadas passam automaticamente para *Sem responsável* (`responsavel_usuario_id = null`, `vaga_responsavel_id = null`).
- **`POST /api/grupos/{tarefa_raiz_id}/convites/regenerar`** e **`DELETE /api/grupos/{tarefa_raiz_id}/convites`** (autenticado + CSRF, exclusivo do Líder): gera novo link invalidando o anterior ou revoga o link ativo sem afetar membros que já entraram.
- **`GET /api/grupos/convites/{token}`** (autenticado): retorna prévia segura do projeto compartilhado (título da tarefa-raiz, nome do Líder, membros já ativos e vagas ainda disponíveis para seleção).
- **`POST /api/grupos/convites/{token}/entrar`** (autenticado + CSRF): aceita `{ "vaga_id": "<opcional>" }`. Se houver vaga livre com `email_opcional` igual ao e-mail Google verificado do usuário, realiza vínculo automático e herda suas subtarefas pré-atribuídas; caso contrário usa `vaga_id` escolhido ou entra como colaborador disponível.
- **`PATCH /api/tarefas/{tarefa_id}/atribuir`** (autenticado + CSRF, exclusivo do Líder): define `{ "responsavel_usuario_id": ..., "vaga_responsavel_id": ... }` (no máximo `1` preenchido ou ambos `null` para *Sem responsável*) e dispara evento + Web Push opcional ao membro atribuído.
- **`GET /api/grupos/{tarefa_raiz_id}/desempenho`** (autenticado para qualquer membro): retorna painel consolidado da equipe para *polling* inteligente (`10-15s` com aba ativa).
- **`POST /api/grupos/{tarefa_raiz_id}/transferir-lideranca`** (Líder), **`DELETE /api/grupos/{tarefa_raiz_id}/membros/{usuario_id}`** (Líder remove membro) e **`POST /api/grupos/{tarefa_raiz_id}/sair`** (se Líder tentar sair com outros membros presentes sem transferir liderança antes, retorna `409 LIDER_DEVE_TRANSFERIR_OU_EXCLUIR`).

Exemplo de resposta de `GET /api/grupos/{tarefa_raiz_id}/desempenho`:

```json
{
  "tarefa_raiz_id": "11111111-1111-4111-8111-111111111111",
  "titulo": "Trabalho em Trio de Web II",
  "meu_papel": "lider",
  "link_convite_ativo": true,
  "resumo_geral": {
    "total_subtarefas_folha": 9,
    "folhas_concluidas": 5,
    "percentual_geral": 56
  },
  "integrantes": [
    {
      "usuario_id": "5b7c1e12-8a4f-4a7e-9c12-104d2c9b0001",
      "nome_exibicao": "Athos Danilo",
      "papel": "lider",
      "avatar_url": "/assets-3d/avatares/vagalume-estelar.png",
      "atribuidas": 3,
      "concluidas": 2,
      "percentual": 67
    },
    {
      "usuario_id": "5b7c1e12-8a4f-4a7e-9c12-104d2c9b0002",
      "nome_exibicao": "Maria Silva",
      "papel": "colaborador",
      "avatar_url": "/assets-3d/avatares/lua-crescente.png",
      "atribuidas": 3,
      "concluidas": 3,
      "percentual": 100
    }
  ],
  "vagas_abertas": [
    {
      "vaga_id": "v1000000-0000-4000-8000-000000000003",
      "nome_exibicao": "Integrante 3 (Frontend)",
      "atribuidas": 3
    }
  ],
  "atividade_recente": [
    {
      "evento_id": "evt-901",
      "autor_nome": "Maria Silva",
      "tipo_evento": "tarefa_concluida",
      "resumo": "Maria Silva concluiu a etapa Testes do mapa",
      "criado_em": "2026-11-21T16:40:00Z"
    }
  ]
}
```
