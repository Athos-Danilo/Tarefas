# Regras de desenvolvimento para IAs - Lume

## 1. Leitura e fonte das decisões

- Antes de implementar ou propor alterações estruturais, leia este arquivo, [Detalhes.md](../Doc/Detalhes.md), [Planejamento-tecnico.md](../Doc/Planejamento-tecnico.md), [Guia-visual.md](../Doc/Guia-visual.md), [Roteiro-primeira-entrega.md](../Doc/Roteiro-primeira-entrega.md) e [Registro-de-ideias-e-decisoes.md](../Doc/Registro-de-ideias-e-decisoes.md). Releia os trechos afetados sempre que qualquer especificação for atualizada.
- Este projeto segue **Spec-Driven Development (SDD)**: especificações aprovadas precedem o código. As instruções explícitas do responsável pelo projeto prevalecem sobre convenções locais; os detalhes funcionais vêm de [Detalhes.md](../Doc/Detalhes.md), o sistema visual e tipográfico de [Guia-visual.md](../Doc/Guia-visual.md), as escolhas técnicas de [Planejamento-tecnico.md](../Doc/Planejamento-tecnico.md), o histórico cronológico de decisões e ideias autorais está em [Registro-de-ideias-e-decisoes.md](../Doc/Registro-de-ideias-e-decisoes.md) e a ordem das fases e decisões pendentes estão em [Roteiro-primeira-entrega.md](../Doc/Roteiro-primeira-entrega.md).
- **Documentação obrigatória de ideias e decisões do responsável:** toda nova ideia, preferência de produto/design ou decisão aprovada por Athos deve ser registrada formalmente em [Registro-de-ideias-e-decisoes.md](../Doc/Registro-de-ideias-e-decisoes.md) (com data, contexto e impacto) e refletida nos documentos SDD afetados.
- **Nunca resolva silenciosamente uma decisão pendente (`D01` a `D16`)**. Quando uma tarefa depender de uma decisão aberta que afete comportamento, dados, identidade visual ou escopo, avance nas partes independentes e apresente opções concretas ao responsável.
- Resolva escolhas rotineiras de implementação com bom senso técnico, sem solicitar aprovação para cada função auxiliar, arquivo interno ou ajuste reversível dentro das regras aprovadas.
- Nunca declare concluída, implementada ou testada uma funcionalidade, fase ou verificação que não tenha sido efetivamente executada e observada.

## 2. Português obrigatório (100% pt-BR)

Todo o código de autoria do projeto deve ser escrito em **português do Brasil**, do banco de dados à interface e à documentação. Isso abrange:

- Variáveis, funções, métodos, classes, interfaces, tipos, componentes, propriedades, parâmetros e constantes próprias.
- Arquivos, pastas e módulos de código próprios.
- Tabelas, colunas, chaves, restrições, índices, coleções e campos de documentos nomeados pelo projeto.
- Rotas da API, campos JSON de entrada e saída, códigos de erro, mensagens de erro e eventos do domínio.
- Testes automatizados, comentários, docstrings, documentação e mensagens de commit.

Use identificadores sem acentos, cedilhas ou espaços (ex.: `prioridade`, `tarefa_pai_id`, `sessao_de_foco`, `configuracoes_cenario`). Textos visíveis na interface, comentários, docstrings e documentação devem preservar a ortografia e a acentuação corretas do português do Brasil.

- **Proibição de travessão:** nunca utilize travessão (`U+2014`) nem meia-risca (`U+2013`) em documentação, código, comentários, textos da interface, mensagens de commit ou respostas. Sempre que precisar separar títulos, intervalos ou explicações, utilize hífen simples (`-`), vírgula, dois-pontos ou parênteses.

### Convenções de nomes

| Elemento | Convenção | Exemplo |
| --- | --- | --- |
| Funções e variáveis Python | `snake_case` | `calcular_progresso_arvore` |
| Funções e variáveis TypeScript | `camelCase` | `calcularPosicaoSolar` |
| Classes, tipos e componentes | `PascalCase` | `ArvoreDeTarefas`, `CenarioDoHorizonte` |
| Constantes | `UPPER_SNAKE_CASE` | `PROFUNDIDADE_MAXIMA_ARVORE` |
| Tabelas e coleções | `snake_case`, substantivos no plural | `tarefas`, `eventos_ciclo` |
| Colunas, campos MongoDB e JSON da API | `snake_case` | `tarefa_pai_id`, `momento_do_dia` |
| Arquivos de componentes React | Nome do componente em `PascalCase` | `PainelDaJornada.tsx` |
| Arquivos Python | `snake_case` | `servico_de_tarefas.py` |
| Demais módulos TypeScript | `kebab-case` | `cliente-da-api.ts` |
| Rotas próprias da API | Português sem acentos; hífen entre palavras | `/api/tarefas`, `/api/sessoes-foco` |

Mapeie explicitamente campos `snake_case` da API para tipos internos `camelCase` da interface na camada de integração/adaptadores, sem espalhar traduções ou conversões ad-hoc pelos componentes visuais.

### Exceções necessárias de compatibilidade

- Não traduza palavras reservadas das linguagens, comandos de ferramentas, protocolos HTTP/OAuth ou APIs nativas de bibliotecas externas. Por exemplo: `import`, `async`, `useState`, `useEffect`, `useQuery`, `onClick`, `className`, `children`, `Canvas`, `meshStandardMaterial`, métodos HTTP e parâmetros oficiais do Google OAuth permanecem conforme definidos pelas bibliotecas.
- Preserve arquivos e campos obrigatórios do ecossistema, como `package.json`, `tsconfig.json`, `pyproject.toml`, `alembic.ini`, configurações oficiais e `_id` do MongoDB. Dados externos (como payload de perfil do Google) devem ser mapeados na fronteira de integração para os nomes internos em português.
- Hooks próprios do React preservam o prefixo `use` exigido pelas regras e ferramentas do React, seguido de um nome em português em `camelCase`, como `useCicloDoDia` ou `usePreferenciasCenario`; o arquivo do módulo mantém padrão em português (`usar-ciclo-do-dia.ts`). Essa exceção não se aplica a funções comuns.
- Diretórios estruturais raiz consolidados como `Backend/`, `Frontend/`, `Agents/`, `Doc/` e `src/` podem ser mantidos; todos os subdiretórios, módulos e arquivos de código próprios dentro deles devem seguir o português.

## 3. Arquitetura modular e princípios SOLID

A aplicação dos cinco princípios **SOLID** é **obrigatória desde a primeira fase de código executável**, tanto no backend quanto no frontend:

- **Estrutura em camadas claras:** separe explicitamente apresentação/rotas, serviços de domínio/regras de negócio, contratos/portas e adaptadores de infraestrutura (PostgreSQL, MongoDB, Google OAuth, WebGL, Web Audio API). Rotas FastAPI apenas validam entrada, autenticam a sessão, delegam ao serviço e serializam a resposta; componentes React focam em apresentação e interação.
- **S - Responsabilidade Única (SRP):** cada módulo, classe, serviço ou componente deve ter um único motivo de mudança. Não misture validação de hierarquia de tarefas, persistência SQL, escrita no MongoDB e orquestração HTTP no mesmo arquivo; no frontend, separe estado do ciclo do dia, renderização 3D, editor 2D do mapa e painéis da jornada.
- **O - Aberto para Extensão, Fechado para Modificação (OCP):** modele pontos de extensão reais (como os 4 momentos do dia: `manha`, `tarde`, `crepusculo`, `noite`; temas visuais; blocos de notas ricas; tipos de eventos do ciclo; e provedores/estratégias de cálculo) por meio de tabelas de configuração, composição ou protocolos, sem espalhar cadeias gigantes de `if/elif` por vários módulos.
- **L - Substituição de Liskov (LSP):** implementações reais e substitutos usados em testes para um mesmo contrato (repositórios, provedor OAuth, adaptador de áudio) devem honrar as mesmas pré-condições, pós-condições, garantias de ordenação e exceções de domínio. Dublês de teste não podem mascarar restrições reais do banco ou da regra de negócio.
- **I - Segregação de Interfaces (ISP):** prefina contratos/protocolos pequenos e coesos orientados às necessidades de cada caso de uso (por exemplo, separar repositório estrutural de tarefas, repositório de detalhes ricos/layout e registrador de eventos do ciclo), sem obrigar consumidores a depender de métodos que não utilizam.
- **D - Inversão de Dependência (DIP):** serviços de domínio e casos de uso dependem de abstrações (`Protocol`/interfaces) definidas por suas necessidades, recebendo dependências por injeção explícita (`Depends` ou composição). Detalhes de SQLAlchemy, PyMongo, Google OAuth, Three.js e Web Audio ficam isolados nos adaptadores.
- Use composição e funções/protocolos objetivos; não crie fábricas, heranças ou camadas vazias apenas para simular complexidade. Evite duplicar lógica e só extraia abstrações compartilhadas quando houver equivalência real de regra.

## 4. Contratos, tipos e validação

- Use **TypeScript em modo estrito (`strict: true`)** no frontend e **anotações de tipo completas em Python** nas fronteiras, serviços e adaptadores (verificadas com `mypy`). Evite `any`, supressões silenciosas (`# type: ignore`, `@ts-ignore`) e coerções forçadas sem justificativa documentada.
- Valide toda entrada de API no servidor com **Pydantic v2**. Validação no navegador existe para resposta rápida e acessibilidade, jamais para substituir a segurança e a integridade do backend.
- Separe modelos de entrada (payloads de criação/edição/movimentação), entidades/registros persistidos e esquemas de resposta expostos pela API.
- Valide rigorosamente as invariantes de árvore no servidor:
  - Profundidade máxima permitida de **5 níveis** (raiz no nível 1, subtarefas até o nível 5).
  - Bloqueio absoluto de ciclos na criação ou movimentação (`reparenting`): nenhuma tarefa pode apontar para si mesma nem para qualquer descendente seu.
  - Transições válidas de status e propagação coerente em cascata/reabertura.
- Padronize todos os erros da API com um contrato único contendo código estável em português (ex.: `CICLO_DETECTADO`, `PROFUNDIDADE_EXCEDIDA`, `TAREFA_NAO_ENCONTRADA`, `NAO_AUTORIZADO`) e mensagem clara em português. O frontend deve tratar erros pelo código estável, nunca comparando texto livre de mensagens.

## 5. Integridade dos dados e persistência poliglota

- **Divisão clara de responsabilidades:**
  - **PostgreSQL (transacional ACID):** guarda `usuarios`, `sessoes`, `tarefas` (incluindo `tarefa_pai_id`, `profundidade`, `prioridade`, `status`, `turno`, `prazo`, `ordem_manual`), `etiquetas`, `tarefa_etiquetas` e `sessoes_foco`.
  - **MongoDB (documentos flexíveis):** guarda `detalhes_tarefas` (notas ricas em blocos e metadados visuais de planta/estrela), `layouts_constelacao` (posições personalizadas e estado de câmera/zoom do mapa 2D), `eventos_ciclo` (diário/histórico rico do ciclo) e `preferencias_cenario` (modo relógio/simulador, qualidade 3D, acessibilidade e áudio).
- Todas as operações relacionadas na árvore de tarefas (conclusão em cascata, reabertura ascendente, movimentação com recálculo de profundidade, exclusão em lote e gravação de sessão de foco) devem ocorrer em **transação atômica no PostgreSQL**, protegidas contra reenvios duplicados e condições de corrida.
- **Nunca presuma transação distribuída entre PostgreSQL e MongoDB:**
  - O PostgreSQL é a fonte de verdade estrutural e de autorização.
  - Operações combinadas devem confirmar primeiro no PostgreSQL e, em seguida, persistir ou atualizar o documento correspondente no MongoDB de forma idempotente (identificada por `tarefa_id`/`usuario_id`), aplicando compensação explícita ou degradação segura (valores padrão na leitura caso um documento auxiliar ainda não exista) em caso de falha parcial.
- Use **Alembic** para toda criação ou alteração de esquema relacional no PostgreSQL; nunca recrie tabelas automaticamente na inicialização nem apague dados em produção/desenvolvimento sem comando explícito.
- Crie restrições (`FOREIGN KEY`, `CHECK`, `UNIQUE`) e índices alinhados às consultas reais do calendário, árvore por usuário, turnos e coleções MongoDB.
- Não compartilhe a mesma sessão assíncrona do banco entre requisições concorrentes.

## 6. Segurança e configuração

- **Zero segredos no repositório:** nunca grave senhas de banco, `CLIENT_SECRET` do Google, chaves de assinatura de sessão ou URIs com credenciais em código, documentos ou arquivos versionados. Forneça apenas arquivos `.env.exemplo` com valores fictícios e mantenha `.env*` reais fora do controle de versão.
- Autenticação exclusiva via **Google OAuth 2.0**: não implemente armazenamento de senha própria nem fluxo de login por senha.
- Gerencie sessões autenticadas no servidor com cookie `HttpOnly`, `Secure` em produção, `SameSite` adequado e proteção CSRF nas operações de escrita.
- Toda consulta e mutação em tarefas, etiquetas, sessões de foco, notas, layouts, eventos e preferências deve validar estritamente a posse pelo `usuario_id` da sessão autenticada.
- Utilize consultas parametrizadas do SQLAlchemy e APIs tipadas do PyMongo; nunca concatene texto arbitrário do usuário em SQL ou filtros BSON.
- Não exponha stack traces, SQL bruto ou mensagens internas de drivers para o navegador; registre logs estruturados úteis no servidor sem vazar tokens, cookies ou dados pessoais sensíveis.

## 7. Frontend, mundo 3D, acessibilidade e áudio

- Siga o **modelo híbrido inteligente**: o cenário 3D vivo (`Three.js` / `@react-three/fiber`) compõe a atmosfera dinâmica de céu, sol, lua, constelações e jardim ao fundo, enquanto os painéis da Jornada, Calendário, Modo Foco e o editor interativo de Constelação/Ramos usam interface 2D/SVG de alta nitidez e legibilidade.
- **Modo Desempenho / Fallback 2D obrigatório:** garanta alternativa visual em 2D/CSS/SVG para dispositivos sem aceleração WebGL, preferência do usuário por economia de bateria/desempenho, `prefers-reduced-motion: reduce` e testes automatizados sem GPU.
- Mantenha um **sistema visual único e coerente** seguindo [Guia-visual.md](../Doc/Guia-visual.md): **transição cromática contínua 24h** (*Alvorada Poética*) com proteção de polaridade para garantir contraste WCAG AA (`>= 4.5:1`) em todos os 1.440 minutos do dia, além do trio tipográfico aprovado (`Fraunces`, `Plus Jakarta Sans` e `JetBrains Mono`) com uso oportuno e expressivo de **bold** e **itálico**.
- Projete com **base desktop-first (computador) plenamente funcional em tablets e celulares** (`320px` até telas amplas), garantindo alvos de toque confortáveis, ausência de transbordamento horizontal e adaptação clara do cenário 3D/2D e do Mapa Constelação/Ramos.
- Garanta uso completo por **mouse, toque e teclado**: drag-and-drop para reordenar tarefas ou posicionar nós no mapa deve sempre ter alternativa acessível por teclado e botões/seletores. Nunca dependa apenas de cor ou som para indicar prioridade, turno, status ou erro.
- Gerencie foco corretamente em modais, gavetas laterais e confirmações (ex.: cascata de tarefas, reparenting, exclusão de conta), com rótulos acessíveis (`aria-label`) e foco visível consistente.
- Faça limpeza rigorosa de recursos WebGL (geometrias, materiais, listeners, animações) e áudio ao desmontar componentes ou alternar o Modo Desempenho.
- **Áudio opt-in e centralizado:** todas as trilhas ambientes e micro-efeitos começam silenciados/desativados até escolha explícita do usuário; centralize o controlador de áudio (Web Audio API / player) com volumes independentes persistidos em `preferencias_cenario`.
- Todo asset externo (fontes, modelos 3D, texturas, imagens, efeitos sonoros e trilhas) deve ter procedência e licença gratuita compatível documentadas.

## 8. Dependências e restrição de custo zero

- Utilize as bibliotecas aprovadas em [Planejamento-tecnico.md](../Doc/Planejamento-tecnico.md) e instale apenas os pacotes necessários à fase atual.
- Confira documentação oficial e compatibilidade de versões (especialmente compatibilidade entre versão do React e `@react-three/fiber`) antes de fixar dependências.
- Mantenha arquivos de lock (`package-lock.json` e arquivo de dependências/lock Python) atualizados e reproduzíveis.
- Se alguma dependência aprovada se mostrar incompatível ou descontinuada (como o antigo driver `Motor`), documente o motivo e atualize [Planejamento-tecnico.md](../Doc/Planejamento-tecnico.md) antes de consolidar a substituição.
- **Restrição estrita de custo zero:** não utilize APIs, bancos, provedores ou hospedagens pagas.

## 9. Testes e verificação (TDD obrigatório)

Todo desenvolvimento de comportamento executável (no backend e no frontend, incluindo regras de domínio, rotas, persistência, hooks, componentes interativos e utilitários) **deve seguir TDD desde a primeira fase de código executável**.

### Ciclo obrigatório em incrementos pequenos

1. **Vermelho:** escreva primeiro o teste automatizado descrevendo o comportamento esperado e execute-o antes da implementação. Confirme que falha pela ausência ou incorreção do comportamento testado (e não por erro de sintaxe ou ambiente quebrado).
2. **Verde:** implemente o código mínimo e limpo necessário para fazer o teste passar e execute a suíte afetada para garantir zero regressões.
3. **Refatoração:** melhore clareza, nomes em português, coesão e aderência a **SOLID** sem alterar o comportamento aprovado; execute novamente todos os testes pertinentes e verificadores estáticos (`ruff`, `mypy`, `tsc`, `eslint`).

### Diretrizes de teste

- Para correção de bugs, comece sempre por um teste de regressão que reproduza o defeito no passo Vermelho.
- Para refatorações sem mudança de requisito, garanta primeiro a cobertura de testes passando do comportamento preservado.
- Escolha o nível adequado de teste:
  - **Unitário:** árvore multinível, bloqueio de ciclos, limite de 5 níveis, progresso recursivo, cascata e reabertura, cálculo de fase solar/lunar e estado do ciclo do dia.
  - **Integração:** contratos FastAPI, PostgreSQL real com transações e CTEs, MongoDB real para notas/layouts/eventos/preferências, proteção CSRF e isolamento entre usuários.
  - **Interface e E2E:** fluxos principais no navegador (inclusive fallback 2D, teclado e responsividade em desktop/tablet/celular).
- Use bancos de dados separados para testes (`tarefas_teste` no PostgreSQL e no MongoDB). Nunca execute testes destrutivos contra o banco de desenvolvimento local ou produção.
- Documentação, especificações, estudos visuais e assets estáticos não possuem ciclo TDD próprio, mas devem passar pelas revisões e validações próprias de acessibilidade, contraste, licença e inspeção visual; todo código que manipula, valida ou renderiza esses recursos segue TDD.
- Registre no resumo de conclusão de cada fase: cenários testados, falhas iniciais observadas no Vermelho, resultado após implementação e verificações após refatoração.

## 10. Colaboração, documentação e controle de versão (Git)

- Leia o código e a documentação existentes antes de editar; faça mudanças focadas na fase em execução sem descartar trabalho não relacionado.
- Atualize [Detalhes.md](../Doc/Detalhes.md), [Planejamento-tecnico.md](../Doc/Planejamento-tecnico.md) ou [Roteiro-primeira-entrega.md](../Doc/Roteiro-primeira-entrega.md) sempre que uma decisão aprovada alterar regras, contratos, arquitetura ou escopo.
- **Estado atual do Git e autorização recorrente:** repositório local inicializado na branch `main` e conectado ao remoto `origin` (`https://github.com/Athos-Danilo/Tarefas.git`) em `20/11/2026`. Em `20/11/2026`, o responsável autorizou expressamente executar `git commit` e `git push` para `origin/main` automaticamente ao concluir cada fase do desenvolvimento (após revisar `git status` e `git diff`, confirmar todos os critérios de conclusão e verificações pertinentes, respeitar o `.gitignore` e nunca usar `--force`). Fora do fechamento de fase, operações de commit e push continuam dependendo de solicitação ou autorização expressa do responsável. Confirme sempre o resultado do push antes de declarar a fase publicada.
- Quando o Git estiver ativo e autorizado:
  - Revise sempre `git status` e `git diff` antes de commitar, garantindo que segredos (`.env`), ambientes virtuais (`.venv`), `node_modules`, caches e capturas temporárias fiquem no `.gitignore`.
  - Use mensagens no formato `Fase NN: objetivo da fase`, com resumo objetivo das entregas e verificações no corpo do commit.
  - Nunca force push nem reescreva histórico remoto.

## 11. Critério de conclusão

Uma fase ou entrega só é considerada **concluída** quando:

1. Cumpre integralmente o objetivo e o critério de conclusão definidos em [Roteiro-primeira-entrega.md](../Doc/Roteiro-primeira-entrega.md).
2. Respeita todas as regras de `pt-BR`, segurança, persistência poliglota, acessibilidade e **SOLID** deste documento.
3. Todo comportamento executável novo ou alterado foi construído via **TDD** e verificado após a última edição, com testes, checagem de tipos e linters passando sem atalhos.
4. Todas as limitações conhecidas, decisões pendentes ou simulações visuais permanecem explicitamente declaradas na documentação.
