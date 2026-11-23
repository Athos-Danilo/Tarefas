# Especificação de produto e regras de domínio - Lume

> **Identidade oficial (`D01`):** **`Lume`** é o nome definitivo aprovado em `20/11/2026` (substituindo o provisório *Horizonte Vivo*, termo preservado para o conceito visual do cenário). As definições visuais de transição contínua 24h, tipografia e responsividade estão consolidadas em [Guia-visual.md](Guia-visual.md).

## 1. Visão geral e objetivo acadêmico

O projeto é uma aplicação web pessoal de gerenciamento de tarefas desenvolvida para a disciplina **Web II**, unindo rigor arquitetural (backend em Python/FastAPI, frontend em React/TypeScript, persistência poliglota em PostgreSQL + MongoDB, SOLID e TDD) a uma experiência visual e interativa diferenciada no mercado.

Os requisitos funcionais fundamentais da entrega incluem:

1. **Autenticação de usuários** via Google OAuth 2.0, com primeiro acesso personalizado, gestão de perfil e exclusão da própria conta.
2. **Cadastro e gestão completa de tarefas pessoais** com níveis de prioridade, turnos do dia, status, prazos, etiquetas, ordenação manual e notas ricas.
3. **Composição hierárquica de tarefas:** uma tarefa pode ser composta por outras tarefas em árvore multinível (até 5 níveis), com progresso automático, cascata inteligente e visualização tanto hierárquica quanto em mapa visual interativo.
4. **Simulação viva da passagem do dia:** a interface traduz a passagem do tempo ao longo de **Manhã**, **Tarde**, **Crepúsculo** e **Noite** por meio de um cenário 3D reativo (sol, lua, estrelas, constelações e jardim) combinado a painéis 2D de alta legibilidade.

## 2. Glossário oficial do domínio (`pt-BR`)

Para manter consistência absoluta entre especificações, banco de dados, API e interface, adotam-se os seguintes termos oficiais:

| Termo oficial | Significado no domínio |
| --- | --- |
| `tarefa` | Unidade gerenciável de trabalho pertencente a um único usuário; pode ser raiz ou filha de outra tarefa. |
| `tarefa_pai` | Tarefa imediatamente superior na hierarquia que agrega uma ou mais subtarefas diretas. |
| `subtarefa` | Tarefa vinculada a uma `tarefa_pai`; também pode possuir suas próprias subtarefas até o limite de profundidade. |
| `arvore_de_tarefas` | Estrutura hierárquica completa formada por uma tarefa raiz e todos os seus níveis descendentes. |
| `prioridade` | Grau de importância/urgência da tarefa (`baixa`, `media`, `alta`, `urgente`). |
| `status` | Estado atual da tarefa (`pendente`, `em_andamento`, `concluida`). |
| `turno` | Faixa do ciclo do dia em que a tarefa está planejada (`manha`, `tarde`, `noite`, `livre`). |
| `ciclo_do_dia` | Estado temporal e atmosférico exibido pelo sistema nos 4 momentos (`manha`, `tarde`, `crepusculo`, `noite`). |
| `constelacao` | Representação visual de uma árvore de tarefas compostas no Mapa Visual (ramos/flores sob luz solar e constelação luminosa à noite). |
| `sessao_de_foco` | Período cronometrado de concentração vinculado a uma tarefa no Modo Foco Imersivo. |
| `etiqueta` | Marcador temático personalizado do usuário associado a uma ou mais tarefas. |
| `evento_do_ciclo` | Registro rico no diário/histórico do usuário (conclusões, florescimentos, constelações acesas e sessões de foco). |
| `preferencias_cenario` | Configurações visuais, de simulação temporal, acessibilidade/desempenho 3D, consentimento de clima/localização e áudio do usuário. |
| `estado_climatico` | Condição atmosférica derivada do código WMO (`limpo`, `parcialmente_nublado`, `nublado`, `chuvoso`, `tempestade`), com padrão `limpo` quando clima local está desativado. |
| `lembrete` / `inscricao_push` | Agendamento de aviso vinculado a uma tarefa e credencial Web Push (`VAPID`) de um dispositivo autorizado (PC ou celular). |
| `recorrencia` | Regra opcional de repetição periódica da tarefa (`nenhuma`, `diaria`, `semanal`, `mensal`) e registro de reaberturas (`vezes_reaberta`) que alimentam o Calendário e as Estatísticas. |
| `tarefa_em_conjunto` | Tarefa-raiz compartilhada via link de convite onde um **Líder** organiza vagas nomeadas, atribui subtarefas (`1` responsável por nó) e colabora com **Membros colaboradores**. |
| `modo_tutorial` | Tour interativo guiado em `6` passos exibido uma única vez após a criação de nova conta (podendo ser pulado e revisto depois no Perfil). |

## 3. Conceito central: o ciclo vivo do dia

A aplicação transforma o planejamento diário em uma paisagem viva que acompanha o passar do tempo:

### Os 4 momentos do ciclo
1. **Manhã:** luz fresca e clara, sol nascente baixo no horizonte, jardim despertando com orvalho e tons suaves.
2. **Tarde:** sol alto e energia dourada, vegetação vibrante, visibilidade nítida dos ramos e tarefas em curso.
3. **Crepúsculo:** transição quente coral e violeta, sol poente cedendo espaço às primeiras estrelas, momento de fechamento e revisão do dia.
4. **Noite:** céu índigo profundo, **Lua 3D iluminada na fase lunar real do dia** (cálculo astronômico offline fiel à orientação do **Hemisfério Sul** com leve luz cinérea na face escura), estrelas e **constelações** formadas pelas tarefas compostas concluídas ou em progresso.

### Modos de controle do tempo, clima atmosférico e transição contínua 24h
- **Transição cromática contínua:** as cores atmosféricas do céu, colinas, astros e superfícies evoluem gradualmente minuto a minuto ao longo das 24 horas sobre os keyframes de *Alvorada Poética*, preservando contraste acessível WCAG AA em qualquer horário conforme detalhado em [Guia-visual.md](Guia-visual.md).
- **Identidade e favicon adaptativos por horário (`ID-23`):** tanto no Modo Relógio Real quanto no Simulador, o símbolo da marca (**Sol de 4 Ls**) e o **favicon da aba do navegador** alternam automaticamente entre as 4 variações oficiais (`Manhã` `05:45-11:59`, `Tarde` `12:00-16:59`, `Entardecer` `17:00-18:59` e `Noite` `19:00-05:44`) conforme especificado em [Guia-visual.md](Guia-visual.md).
- **Clima local consentido (`Open-Meteo`) e cenário reativo (`ID-24`, `ID-27`):** recurso **desativado por padrão** (100% opt-in). Somente quando o usuário autoriza a localização pelo navegador ou escolhe manualmente sua cidade, o sistema consulta a previsão via **Open-Meteo** no backend e adapta o cenário em 5 estados climáticos (`limpo`, `parcialmente_nublado`, `nublado`, `chuvoso`, `tempestade`), com nuvens Soft-3D, chuva instanciada e tempestade suave (sem flashes quando `prefers-reduced-motion` está ativo). Se desativado, o padrão visual permanece `limpo` e os dados de cidade são removidos.
- **Modo Relógio Real (padrão):** calcula o momento do dia, a posição do sol/lua e a fase lunar atual a partir do horário e data locais do usuário, com transição contínua entre os 4 períodos.
- **Modo Simulador / Arco do Dia:** controle interativo visível que permite arrastar o sol/lua ao longo das 24 horas (ou selecionar diretamente Manhã/Tarde/Crepúsculo/Noite) e alternar o **seletor de clima simulado** (*Automático*, *Limpo*, *Nublado*, *Chuva*, *Tempestade*) para testar a estética ou apresentar o projeto ao vivo sem alterar o relógio real nem o clima salvo.
- A reatividade do jardim e do céu traduz o avanço real das tarefas do dia: concluir tarefas e subtarefas acende pontos estelares e faz elementos do jardim florescerem sem interferir na clareza da lista.
- **Experiência responsiva desktop-first:** concebida com base em computador para aproveitar palco 3D e painéis lado a lado, mantendo operação completa em tablets (`768px-1023px`) e celulares (`320px-767px`), inclusive por toque e Modo Desempenho / Fallback 2D.

## 4. Regras de domínio da árvore de tarefas compostas

### 4.1 Estrutura, profundidade e integridade
- **Profundidade máxima de 5 níveis:** uma tarefa sem pai está no nível `1` (raiz); sua filha direta no nível `2`, e assim sucessivamente até o nível `5`.
- É proibido criar uma subtarefa sob uma tarefa já no nível `5` ou mover uma subárvore cujo nó mais profundo ultrapassaria o nível `5` após o deslocamento.
- **Bloqueio rígido contra ciclos:** nenhuma tarefa pode ter como `tarefa_pai_id` a si mesma ou qualquer um de seus próprios descendentes diretos ou indiretos.

### 4.2 Progresso automático e cascata inteligente
- **Cálculo automático de progresso (`%`) por tarefas-folha (`D08`):** toda tarefa composta exibe percentual calculado exclusivamente sobre suas **tarefas-folha** descendentes (`round((folhas_concluidas / total_folhas) * 100)`), refletindo com precisão quanto trabalho executável falta na subárvore. Tarefas sem subtarefas têm progresso `0%` quando abertas e `100%` quando concluídas.
- **Conclusão automática de baixo para cima:** ao marcar como `concluida` a última subtarefa pendente/em andamento de uma `tarefa_pai`, a `tarefa_pai` é concluída automaticamente (propagando para ancestrais elegíveis acima dela).
- **Conclusão em cascata de cima para baixo (`D08`):** ao tentar marcar uma `tarefa_pai` com subtarefas em aberto como `concluida`, a aplicação oferece/aplica a conclusão em cascata de toda a subárvore descendente, exibindo ação imediata de **desfazer por `10s`** (via `token_desfazer` com validade de `15s` no servidor) que restaura exatamente o estado anterior de todos os nós afetados.
- **Reabertura inteligente:** ao reabrir (mover de `concluida` para `pendente` ou `em_andamento`) qualquer subtarefa filha de uma `tarefa_pai` concluída, a `tarefa_pai` e seus ancestrais concluídos passam automaticamente para `em_andamento`, recalculando o progresso.

### 4.3 Operações de gestão da hierarquia e limites (`D08`, `D09`, `D10`)
O usuário pode, a qualquer momento:
- Criar tarefa raiz ou criar subtarefa diretamente dentro de uma tarefa existente (título `1-140` chars; máximo `50` filhas diretas por mãe, `500` tarefas ativas e `2.000` totais por conta).
- Editar qualquer atributo da tarefa mantendo a posição na árvore, incluindo `notas_em_blocos` no MongoDB com **`6` tipos de bloco** (`parágrafo` com bold/itálico, `subtítulo`, `lista`, `checklist`, `citação` e `código/link` restrito a `http://` ou `https://`), limitados a `50` blocos e `15.000` caracteres por tarefa, além de **exportação em Markdown (`.md`) ou JSON (`.json`)**.
- **Mover na hierarquia (`reparenting`):** anexar uma tarefa raiz ou subárvore existente como filha de outra tarefa, ou transferir entre pais diferentes, respeitando limite de 5 níveis e bloqueio de ciclos.
- **Promover a raiz:** desvincular uma subtarefa de sua mãe para torná-la tarefa principal independente.
- **Reordenar manualmente** tarefas entre irmãs do mesmo nível e turno (com suporte a arrastar/soltar e controles por teclado).
- **Excluir tarefa (`D08`):** se possuir subtarefas, exibe diálogo informando a contagem de descendentes com **2 opções explícitas** para escolha do usuário: **excluir tudo em cascata** ou **excluir apenas a tarefa-mãe e promover suas filhas diretas um nível acima**.
- **Buscar e filtrar:** busca textual e filtros por prioridade, status, turno, prazo e etiqueta (máximo `30` por usuário e `8` por tarefa) preservando a visibilidade do contexto hierárquico.

## 5. Modelo completo de atributos da tarefa

| Atributo | Especificação | Observações e regras |
| --- | --- | --- |
| `titulo` | Texto curto obrigatório | Nome principal da tarefa ou subtarefa. |
| `notas_em_blocos` | Documento rico estruturado (MongoDB) | Parágrafos, listas, destaques e anotações detalhadas da tarefa. |
| `prioridade` | `baixa`, `media`, `alta`, `urgente` | **Independente por nó:** a prioridade da mãe não sobrescreve a da filha; porém, se existir qualquer subtarefa descendente `urgente` em aberto, a tarefa-mãe exibe um **alerta visual de urgência herdada/filha urgente**. |
| `status` | `pendente`, `em_andamento`, `concluida` | Controlado por ações do usuário e pelas regras de cascata/reabertura. |
| `turno` | `manha`, `tarde`, `noite`, `livre` | Organiza a Jornada do Dia; subtarefas podem seguir o turno da mãe ou ter turno próprio. |
| `prazo` | Data/hora opcional | Alimenta o Calendário Mensal e indicadores de atraso/proximidade. |
| `etiquetas` | Coleção de tags do usuário | Cada etiqueta possui nome único por usuário e cor compatível com o tema. |
| `ordem_manual` | Inteiro sequencial por nível/contexto | Permite ordenação personalizada persistida no servidor. |
| `metadados_visuais` | Documento leve no MongoDB | Tipo/estética de planta/estrela e cor de destaque no cenário/mapa. |
| `recorrencia` | `nenhuma`, `diaria`, `semanal`, `mensal` (+ dias/dia opcional e `vezes_reaberta`) | Permite rotinas repetitivas automáticas e mede reaberturas e repetições no Dashboard (`ID-36`). |
| `grupo_e_responsavel` | `compartilhada`, `responsavel_usuario_id`, `vaga_responsavel_id` | Marca árvores compartilhadas por link e define até `1` responsável (usuário ou vaga) por subtarefa (`ID-37`). |

## 6. Telas, fluxos e experiências da primeira entrega

### 6.1 Landing cinematográfica com demonstrações interativas
- Apresentação imersiva do mundo 3D logo na entrada, explicando o conceito do ciclo do dia, prioridades e tarefas compostas.
- Inclui **pequenas demonstrações interativas locais** (ex.: deslizar o Arco do Dia entre Manhã/Tarde/Crepúsculo/Noite e marcar uma subtarefa de exemplo vendo a árvore/constelação reagir em tempo real), **sem persistência no servidor**.
- Chamada principal clara para **Entrar com Google** (autenticação obrigatória para abrir o espaço real de gestão de tarefas).

### 6.2 Autenticação Google, Primeiro Acesso, Perfil e Exclusão de Conta
- **Acesso exclusivo via Google OAuth 2.0 (`D07`):** sem senha própria e sem criação manual de senha. Sessão mantida server-side no PostgreSQL com expiração deslizante de `7` dias (teto absoluto de `30` dias), cookie `lume_sessao` (`HttpOnly`, `SameSite=Lax`) em mesma origem, proteção CSRF por cabeçalho `X-CSRF-Token` e opção de **sair de todos os aparelhos**.
- **Primeiro acesso (`D05`):** após o primeiro login Google bem-sucedido, o usuário edita o nome sugerido pelo Google (`2` a `60` chars), escolhe um avatar (`16` Soft-3D, foto Google ou upload até `2 MB` normalizado a `256x256`) e encontra marcada por padrão (podendo desmarcar) a criação de **`1` árvore-guia de boas-vindas editável**.
- **Perfil:** visualização e edição do nome de exibição, avatar, e-mail Google vinculado (somente leitura) e acesso às preferências gerais.
- **Exclusão de conta (`D06`):** fluxo explícito mediante modal detalhando todos os dados afetados e digitação exata da palavra **`EXCLUIR`**, removendo em definitivo todos os registros no PostgreSQL (incluindo inscrições Web Push e lembretes) e no MongoDB (notas, layouts, eventos e preferências de clima), além de eventual avatar enviado.

### 6.3 Jornada do Dia (visão principal)
- Cenário 3D vivo ocupando a atmosfera do ambiente com controle do Arco do Dia (Relógio Real vs Simulador + seletor climático), indicador imediato de progresso diário e **mini-card Bento compacto** com horário local e, quando autorizado pelo usuário (`ID-24`), **cidade atual, temperatura e ícone climático**.
- Lista hierárquica interativa agrupada ou filtrável por turnos (`manha`, `tarde`, `noite`, `livre`) e prioridades, com expansão de subtarefas até 5 níveis, barras de progresso automático, alerta visual para filhas urgentes, arrastar-e-soltar (com alternativa por teclado), criação rápida, filtros, busca, seleção opcional de **lembretes** por tarefa (`ID-26`) e gaveta/painel lateral de edição e notas ricas.

### 6.4 Mapa Visual de Constelação / Ramos
- Experiência **híbrida inteligente**: constelações panorâmicas brilham no céu 3D de fundo enquanto o usuário opera um **mapa/editor interativo 2D/SVG de altíssima nitidez** sobre o cenário.
- Representa graficamente a tarefa-mãe e suas subtarefas conectadas por **ramos botânicos** nos momentos luminosos do dia (Manhã/Tarde) e **linhas de constelação estelar** no Crepúsculo/Noite.
- Permite navegar pela árvore, expandir/recolher ramos, criar subtarefas, concluir nós e salvar posições personalizadas no MongoDB (`layouts_constelacao`), com botão de reorganização automática.

### 6.5 Modo Foco Imersivo
- Tela dedicada com o cenário 3D em modo contemplativo/foco, reduzindo distrações visuais.
- **Temporizador solar/lunar** configurável ligado à tarefa selecionada e exibição direta de suas subtarefas imediatas para marcação sem sair do foco.
- Ao concluir ou encerrar a etapa, registra a `sessao_de_foco` no PostgreSQL e um `evento_do_ciclo` correspondente no MongoDB.

### 6.6 Calendário Mensal dos Prazos
- Grade mensal clara exibindo tarefas com `prazo` definido, indicadores luminosos por `prioridade` (incluindo destaque para urgentes e atrasadas) e indicação da **fase lunar** de cada dia em harmonia com a temática celeste.
- Permite navegar entre meses, filtrar por prioridade/turno e abrir/editar/concluir a tarefa diretamente a partir do dia selecionado.

### 6.7 Estatísticas e Diário do Ciclo (`D14`, `ID-36`)
- **Dashboard completo com filtro global** (`7 dias`, `30 dias`, `90 dias`, `Todo o período`, além de filtro por etiqueta e escopo **Todas / Pessoais / Em Grupo**).
- **Indicadores-chave (KPIs):** taxa geral de conclusão, tempo médio de conclusão, taxa de pontualidade (no prazo vs. atrasadas), sequência ativa e recorde (*streak*), além de horas acumuladas e taxa de conclusão no Modo Foco.
- **Múltiplos gráficos (`Recharts` + SVG acessível):** curva/área temporal (criadas vs. concluídas e minutos de foco), **mapa de calor de atividade** (*heatmap* diário), rosca por prioridade, barras/radar comparativo por turno (`manha`, `tarde`, `noite`, `livre`), ranking de etiquetas e árvores/constelações finalizadas.
- **Tarefas recorrentes, repetidas e retrabalho (`ID-36`):** suporte a **recorrência periódica** (`diaria`, `semanal`, `mensal`) com percentual de cumprimento da rotina, além de análise de **tarefas repetidas com frequência** (agrupamento por título/etiqueta recorrente) e **taxa de retrabalho/reabertura** (`vezes_reaberta`).
- **Histórico / Diário do Ciclo detalhado (`eventos_ciclo`):** linha do tempo filtrável por tipo de evento (criação, conclusão, cascata, reabertura, sessões de foco, atribuições/conclusões em grupo e constelações acesas) com **exportação em `.md` e `.json`**.

### 6.8 Experiência Sonora e Preferências do Cenário
- **Áudio opt-in:** todo som inicia **silenciado/desativado** até ativação voluntária pelo usuário.
- Micro-efeitos sutis ao concluir tarefa, acender nó da constelação ou finalizar timer + paisagens sonoras opcionais adequadas ao momento do dia, ao Modo Foco e ao estado climático (incluindo **som suave de chuva** quando o cenário estiver chuvoso ou em tempestade e o áudio ambiente estiver ligado).
- Volumes independentes (geral, efeitos, ambiente) + escolha de modo temporal (Relógio Real / Simulador), **toggle opt-in de Clima e Localização** (com escolha entre geolocalização do navegador ou busca de cidade e remoção imediata dos dados de localização ao desativar), **gerenciamento de dispositivos Web Push**, **Modo Desempenho / Fallback 2D** e preferência de movimento reduzido salvos em `preferencias_cenario`.

### 6.9 PWA Instalável, Sistema de Lembretes e Notificações Web Push (`ID-26`)
- **PWA instalável:** manifesto (`manifest.webmanifest`) e *Service Worker* utilizando o ícone **Sol de 4 Ls**, permitindo instalar o **Lume** na tela inicial do celular (Android/iOS) ou no computador sem precisar de loja de aplicativos.
- **Notificações Web Push multi-dispositivo (100% opt-in):** o usuário autenticado decide em cada aparelho (PC ou celular) se deseja ativar avisos nativos (`PushManager` + protocolo `VAPID`), podendo listar, nomear ou revogar dispositivos conectados a qualquer momento.
- **Suporte guiado a Android, Desktop e iOS 16.4+:** funciona diretamente no navegador em Desktop/Android (e como app instalado); no iPhone/iPad, quando necessário, exibe um mini-guia visual de 2 passos (*Compartilhar -> Adicionar à Tela de Início*) para habilitar Web Push nativo da Apple.
- **Lembretes por tarefa:** tarefas com prazo ou horário definido permitem configurar antecedência de lembrete (ex.: na hora, 15 min antes, 1 hora antes), disparados automaticamente pelo backend (incluindo alertas para atribuições e conclusões em **Tarefas em Conjunto**) e removidos em definitivo caso o usuário exclua a tarefa ou sua própria conta.

### 6.10 Tarefas em Conjunto (Projetos em Grupo, `ID-37`)
- **Fluxo do Líder e pré-atribuição:** qualquer tarefa-raiz pode ser marcada como compartilhada pelo seu criador (**Líder**). Antes mesmo de os colegas entrarem, o Líder cria **vagas nomeadas** (com e-mail opcional) e atribui `1` responsável (vaga ou membro) a cada subtarefa.
- **Convite e entrada:** o Líder gera um **link de convite** único (revogável/regenerável a qualquer momento, com limite de `10` membros por grupo). Ao abrir o link e entrar com Google, o participante é vinculado automaticamente pelo e-mail da vaga ou escolhe sua vaga na tela de entrada (com ajuste livre pelo Líder).
- **Papéis claros:** **Líder** administra toda a árvore, vagas, convites e membros (podendo transferir liderança ou excluir o projeto); **Membro colaborador** visualiza toda a árvore e o progresso do time, conclui/reabre, edita notas e pode criar subetapas apenas dentro das suas subtarefas atribuídas.
- **Saída/remoção segura:** caso um integrante saia ou seja removido, todas as suas subtarefas permanecem intactas na árvore com responsável limpo (*Sem responsável*) para o Líder reatribuir.
- **Painel de desempenho e sincronização:** exibe progresso individual de cada integrante e linha do tempo de conclusões, notas compartilhadas, avisos Web Push e atualização automática quase em tempo real via *polling* inteligente (`10-15s` com aba ativa + recarga ao focar a aba).

### 6.11 Modo Tutorial Guiado (`ID-38`)
- **Exibição única para novas contas:** logo após finalizar o Primeiro Acesso de uma conta recém-criada (`tutorial.status = "pendente"` no MongoDB), o **Lume** inicia um tour interativo em `6` passos (*spotlight*) cobrindo Horizonte Vivo/clima, árvore e recorrência, Tarefas em Conjunto, notas/Web Push e as demais visões.
- **Pular e rever:** o usuário pode clicar em **"Pular tutorial"** ou pressionar `Esc` a qualquer momento (gravando `status = "pulado"` para não abrir mais sozinho em nenhum dispositivo), ou acessar **"Rever tutorial"** em Perfil sempre que desejar.

## 7. Matriz inicial de cenários principais

| Cenário | Comportamento esperado | Validação crítica |
| --- | --- | --- |
| Visitante na Landing | Vê o cenário 3D animado e testa demos locais (Arco do Dia + subtarefa exemplo) | Nenhuma escrita no servidor; acesso ao app real exige Google OAuth |
| Primeiro login Google | OAuth válido → tela de primeiro acesso (nome/avatar) → entra no workspace com Tutorial inicial | Conta criada no PostgreSQL; preferências padrão e `tutorial.status = "pendente"` criados com segurança |
| Conta existente | Login Google → restaura tarefas, notas, layouts e preferências | Dados privados isolados estritamente pelo `usuario_id`; tutorial não reabre após pulado/concluído |
| Exclusão de conta | Confirmação explícita → remoção dos dados em PostgreSQL e MongoDB → logout | Nova entrada com o mesmo Google reinicia como primeiro acesso |
| Criação e edição composta | Cria tarefa raiz e subtarefas até nível 5; edita prioridades, recorrência e notas ricas | Nível 6 bloqueado no servidor (`PROFUNDIDADE_EXCEDIDA`) |
| Reparenting com ciclo | Tenta mover mãe para dentro de sua própria neta ou exceder 5 níveis | Bloqueio atômico no backend (`CICLO_DETECTADO` / `PROFUNDIDADE_EXCEDIDA`) |
| Cascata e reabertura | Conclui todas as filhas → mãe conclui; reabre uma filha → mãe vira `em_andamento` (`vezes_reaberta++`) | Transação ACID no PostgreSQL; progresso (%) recalculado corretamente |
| Alerta de urgência | Subtarefa nível 3 marcada como `urgente` enquanto mãe tem prioridade `media` | Mãe mantém prioridade `media` e exibe alerta visual de filha urgente |
| Tarefa em Conjunto | Líder cria vagas nomeadas, gera link; colega entra com Google, conclui sua subtarefa; Líder remove outro colega | Vínculo de vaga aplicado; Membro colaborador bloqueado de alterar subtarefa alheia; subtarefas de quem sai preservadas como *Sem responsável* |
| Mapa Constelação/Ramos | Abre tarefa composta no mapa `@xyflow/react`, move nós, conclui nó e recarrega | Posições recuperadas de `layouts_constelacao`; status confirmado no PostgreSQL |
| Modo Foco | Inicia sessão de foco na tarefa, conclui subtarefas e encerra ciclo | Sessão gravada no PostgreSQL e evento gravado no MongoDB |
| Calendário Mensal | Abre mês com prazos e recorrências e clica em tarefa urgente no dia | Datas respeitam fuso e filtros sem misturar dados de outros usuários |
| Dashboard de Estatísticas | Filtra período (`7d`/`30d`/`90d`/`tudo`), consulta taxa de conclusão, recorrências, repetições/retrabalho e Diário | Métricas e gráficos batem fielmente com PostgreSQL e `eventos_ciclo` (inclusive escopo pessoal vs grupo) |
| Clima local opt-in | Usuário ativa clima no card, escolhe geolocalização ou cidade e depois desativa | Nenhuma consulta externa ocorre antes do consentimento; ao desativar, cidade/coordenadas aproximadas são apagadas e o cenário volta a `limpo` |
| Lembrete Web Push | Usuário cria lembrete no computador (ou recebe atribuição em grupo) e recebe aviso no celular/PC inscrito | Apenas dispositivos autenticados e autorizados recebem push `VAPID`; exclusão da conta remove todas as inscrições |
| Fallback 2D / Reduced Motion | Navegador sem WebGL ou usuário ativa Modo Desempenho / movimento reduzido | Cenário 2D/SVG assume suavemente (inclusive nuvens/chuva sem flashes de tempestade) sem quebrar nenhuma funcionalidade |

## 8. O que não entra automaticamente na primeira entrega

- Workspaces corporativos multi-empresa, permissões granulares de empresa ou edição simultânea estilo CRDT/cursor ao vivo em tempo real no mesmo parágrafo de texto (a colaboração implementada foca em **Tarefas em Conjunto por link de convite**, papéis Líder/Colaborador e *polling* inteligente `10-15s`, `ID-37`).
- Login por e-mail/senha própria ou múltiplos provedores de autenticação além do Google.
- **Vinculação ou sincronização com calendários externos** (Google Agenda, Apple Calendar, Samsung Calendar), reservada como evolução futura em favor do sistema próprio de Lembretes + Web Push (`ID-26`).
- Upload livre de anexos binários pesados (PDFs, vídeos, imagens arbitrárias) nas tarefas.
- Aplicativos nativos de loja mobile/desktop (o projeto entrega aplicação web responsiva e **PWA instalável com notificações Web Push** para desktop, tablet e celular).
- Serviços de hospedagem, banco ou assets pagos.

## 9. Contratos de API, decisões em aberto e evolução controlada

Os contratos completos de requisição/resposta HTTP/JSON para as decisões fechadas (`D01`-`D15`, clima opt-in, lembretes/Web Push, Tarefas em Conjunto e Modo Tutorial) residem em [Contratos-api.md](Contratos-api.md), com o registro da arquitetura sonora em [Licencas-audio.md](Licencas-audio.md). Apenas `D16` (contas de deploy) permanece pendente na Seção 3 de [Roteiro-primeira-entrega.md](Roteiro-primeira-entrega.md), com seus respectivos responsáveis e fase-limite. Nenhuma implementação pode presumir respostas para decisões abertas sem registro formal neste documento.
