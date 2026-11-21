# Guia visual e sistema de design - Lume

Este documento consolida as decisões **`D01`**, **`D02`**, **`D03`** e **`D04`** aprovadas nas Fases 02 e 03 em [Roteiro-primeira-entrega.md](Roteiro-primeira-entrega.md), além das diretrizes visuais registradas em [Registro-de-ideias-e-decisoes.md](Registro-de-ideias-e-decisoes.md) (`ID-13` a `ID-27`). Ele serve como fonte única para tokens CSS, shaders/iluminação 3D, tipografia e adaptação responsiva do projeto.

---

## 1. Identidade e conceito aprovado (`D01`)

- **Nome oficial:** **`Lume`**
- **Conceito atmosférico:** *Horizonte Vivo - Alvorada Poética*
- **Significado visual:** união da luz solar ao longo do dia, florescimento do jardim e vagalumes/constelações à noite reagindo ao progresso das tarefas compostas.

---

## 2. Sistema cromático contínuo 24h (`D02` - *Alvorada Poética*)

Por ideia do responsável (`ID-15`), o **Lume** adota **transição cromática gradual e contínua minuto a minuto ao longo das 24 horas**, em vez de paletas estáticas isoladas por turno.

### 2.1 Arquitetura em duas camadas (fluidez + garantia WCAG AA)

1. **Camada atmosférica contínua (00:00 → 24:00):** o céu em 3 paradas de gradiente, as 3 camadas de colinas do jardim, o halo e a cor dos astros (Sol e Lua) e a opacidade das estrelas/constelações interpolam linearmente entre **10 keyframes solares** (0 a 1.440 minutos).
2. **Camada de interface com polaridade protegida:** para evitar a "zona morta cinza" (perda de contraste ao cruzar de claro para escuro), a interface interpola suavemente dentro de **duas faixas protegidas** com transição CSS suave (`background-color 420ms ease, color 320ms ease`) nos dois pontos de virada (**05:45** na Aurora e **17:30** no Crepúsculo):
   - **Faixa Luminosa (`05:45`-`17:29`, min `345`-`1049`):** superfícies claras translúcidas (`rgba(..., 0.92-0.93)`), texto escuro e acentos de alto contraste.
   - **Faixa Noturna (`17:30`-`05:44`, min `1050`-`1439` e `0`-`344`):** superfícies escuras translúcidas (`rgba(..., 0.89-0.91)`), texto luminoso e acentos dourados/vagalume.

### 2.2 Keyframes atmosféricos contínuos (`CEU_KEYS`)

| Minuto | Hora | Momento | Céu topo | Céu meio | Céu base | Colina 1 (frente) | Colina 2 (média) | Colina 3 (fundo) | Astro | Estrelas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `0` | `00:00` | Meia-noite Estelar | `#070C1A` | `#0D1730` | `#132040` | `#091124` | `#101D38` | `#1A2C4D` | `#F7E8B5` | `1.00` |
| `285` | `04:45` | Madrugada Profunda | `#0C1229` | `#182144` | `#262D52` | `#0D152E` | `#172245` | `#253159` | `#F7E8B5` | `0.95` |
| `345` | `05:45` | Aurora Rosada | `#5C5E96` | `#E79B9B` | `#FCE2C4` | `#354949` | `#55736A` | `#7FA18C` | `#FFAE63` | `0.30` |
| `450` | `07:30` | Manhã Orvalhada | `#B5DFF8` | `#E2F2F8` | `#F7F1E1` | `#256B4E` | `#467C62` | `#6DA488` | `#F9B84A` | `0.00` |
| `630` | `10:30` | Manhã Plena | `#87C8F2` | `#CDEAFB` | `#F3F4EA` | `#23664C` | `#457D63` | `#6BA68A` | `#FFD166` | `0.00` |
| `810` | `13:30` | Zênite Luminoso | `#5EB3E6` | `#B4DFF4` | `#F7E8C8` | `#2B6148` | `#4D7D63` | `#74A386` | `#FFB703` | `0.00` |
| `975` | `16:15` | Tarde Dourada | `#6CAEDB` | `#E6CFAF` | `#F8D19A` | `#2F5541` | `#53725B` | `#7D957B` | `#F97316` | `0.00` |
| `1050` | `17:30` | Crepúsculo Coral-Ametista | `#47366E` | `#B55A74` | `#F3A172` | `#1E1433` | `#3B234D` | `#5C3763` | `#FF8E61` | `0.45` |
| `1125` | `18:45` | Crepúsculo Profundo | `#1E183E` | `#643563` | `#C8736A` | `#131029` | `#271D45` | `#3E2B5C` | `#F7BD72` | `0.85` |
| `1215` | `20:15` | Noite Estelar | `#070C1A` | `#0D1730` | `#132040` | `#0B1429` | `#152545` | `#21355C` | `#F7E8B5` | `1.00` |
| `1440` | `24:00` | Meia-noite Estelar | `#070C1A` | `#0D1730` | `#132040` | `#091124` | `#101D38` | `#1A2C4D` | `#F7E8B5` | `1.00` |

### 2.3 Keyframes da interface (`UI_LUMINOSA` e `UI_NOTURNA`)

#### Faixa Luminosa (`05:45`-`17:29`)

| Minuto | Hora | Superfície sólida | Superfície alt | Texto principal | Texto secundário | Primária (botão) | Texto botão | Secundária |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `345` | `05:45` | `#FFF8F1` | `#F5E7DA` | `#2B1822` | `#5E3D4B` | `#8A3E52` | `#FFFFFF` | `#9B4D18` |
| `450` | `07:30` | `#FFFDF8` | `#F1EDE0` | `#172430` | `#4A5D6E` | `#256B4E` | `#FFFFFF` | `#B55E0B` |
| `630` | `10:30` | `#FDFEFF` | `#EBF2F7` | `#132230` | `#43586B` | `#1E6663` | `#FFFFFF` | `#B05A12` |
| `810` | `13:30` | `#FFFDF7` | `#F2EFE3` | `#1A2029` | `#4C5361` | `#1F6A73` | `#FFFFFF` | `#AE550B` |
| `975` | `16:15` | `#FFF9EE` | `#F4E8D4` | `#221E1A` | `#594E43` | `#A94F0D` | `#FFFFFF` | `#1F6E8C` |
| `1049` | `17:29` | `#FFF3E8` | `#F3DFCE` | `#281C22` | `#61424E` | `#9C3E32` | `#FFFFFF` | `#1E627D` |

#### Faixa Noturna (`17:30`-`05:44`, normalizada após `1440` para cruzamento contínuo da meia-noite)

| Minuto (norm.) | Hora | Superfície sólida | Superfície alt | Texto principal | Texto secundário | Primária (botão) | Texto botão | Secundária |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `1050` | `17:30` | `#1E1533` | `#2B1F47` | `#FDF5EC` | `#DFC7D9` | `#FFA26B` | `#1E1533` | `#F5CF76` |
| `1125` | `18:45` | `#161533` | `#211F47` | `#F7F3FD` | `#C5BDDC` | `#F7BD72` | `#161533` | `#7BE3D0` |
| `1215` | `20:15` | `#0E172E` | `#162242` | `#F1F5FF` | `#A5B4D4` | `#F5D076` | `#0E172E` | `#6EE7D8` |
| `1440` | `00:00` | `#0B1226` | `#121C38` | `#EEF3FF` | `#A2B2D4` | `#F5D076` | `#0B1226` | `#6EE7D8` |
| `1725` | `04:45` | `#131836` | `#1D244A` | `#F3F2FF` | `#B5BADB` | `#F5C478` | `#131836` | `#7BE3D0` |
| `1784` | `05:44` | `#1F1B3D` | `#2B2552` | `#FBF2F6` | `#D4BFD6` | `#FFA678` | `#1F1B3D` | `#F5CF76` |

### 2.4 Evidência de contraste WCAG (1.440 minutos verificados)

Auditoria automatizada executada diretamente sobre a função de interpolação em [simulacao-transicao-continua.html](Identidade-visual/simulacao-transicao-continua.html) para todos os 1.440 minutos do dia (`00:00` a `23:59`):

- **Total de falhas abaixo de `4.5:1`:** **`0`**
- **Menor contraste observado em todo o dia:**
  - Texto principal / Superfície: **`14.92:1`** (`AAA` em 100% do dia)
  - Texto secundário / Superfície: **`6.70:1`** (`AA+`)
  - Botão primário: **`5.51:1`** (`AA+`)
  - Prioridade Baixa / Superfície: **`5.68:1`** (`AA+`)
  - Prioridade Média / Superfície: **`6.79:1`** (`AA+`)
  - Prioridade Alta / Superfície: **`5.15:1`** (`AA+`)
  - Prioridade Urgente / Superfície: **`5.85:1`** (`AA+`)

---

## 3. Semântica visual das 4 prioridades e alertas

Nenhum indicador do **Lume** depende exclusivamente de cor. Cada prioridade combina **cor + ícone geométrico distinto + rótulo textual**:

| Prioridade | Símbolo + Rótulo | Tom na Faixa Luminosa | Tom na Faixa Noturna | Comportamento na hierarquia |
| --- | --- | --- | --- | --- |
| `baixa` | `● Baixa` | `#2A6B4D` - `#2F6F4E` | `#7CE0B0` | Borda fina discreta |
| `media` | `▲ Média` | `#1B5A87` - `#1D5C87` | `#89CCFF` | Borda média |
| `alta` | `◆ Alta` | `#9C4B0C` - `#A6540A` | `#FFC069` | Destaque moderado no cartão |
| `urgente` | `★ Urgente` | `#AD223A` - `#B8293D` | `#FF8A9B` | Realce forte; se for subtarefa em aberto, exibe alerta `★ Filha urgente em aberto` na tarefa-mãe |

---

## 4. Trio tipográfico (`D03`) e uso expressivo de Bold e Itálico (`ID-17`)

Todas as fontes aprovadas possuem licença livre **`SIL Open Font License 1.1` (`SIL OFL 1.1`)**, suporte completo a acentuação em português (`Á, É, Í, Ó, Ú, Ã, Õ, Ê, Ç`) e serão **hospedadas localmente no frontend** (`Frontend/src/estilos/fontes/`) na Fase 12, sem depender de CDN externa em produção.

| Papel | Família aprovada | Pesos e estilos obrigatórios | Onde usar |
| --- | --- | --- | --- |
| **Display poética** | `Fraunces` (variável) | `500`, `600`, **`700 (Bold)`** e ***`Italic 500/600`*** | Marca **Lume**, títulos de tela, saudações dinâmicas do dia, citações do Modo Foco e títulos de constelações |
| **Sans de interface** | `Plus Jakarta Sans` | `400`, `500`, `600`, **`700 (Bold)`** e ***`Italic 400/500`*** | Listas hierárquicas de tarefas, notas ricas em blocos, formulários, botões, menus e cartões do calendário |
| **Mono tabular** | `JetBrains Mono` | `400`, `500`, **`600`**, `tabular-nums` | Relógio 24h, controle do Arco do Dia, temporizador do Modo Foco, prazos, percentuais de progresso e badges numéricas |

### 4.1 Diretriz expressiva de Bold e Itálico (`ID-17`)

Seguindo a preferência do responsável por jogos tipográficos marcantes, os textos e títulos devem alternar peso e inclinação em momentos oportunos, nunca em excesso a ponto de prejudicar listas densas:

- **Títulos de impacto e saudações (Landing, Jornada, Modo Foco):** combinar **Bold** para a ação/substantivo principal com ***Fraunces Italic*** no termo poético ou na marca (exemplo: `Manhã de` **`criação`** `no` ***Lume***; `Suas` **`tarefas`** `iluminam o` ***horizonte***).
- **Notas ricas e destaques editoriais:** disponibilizar formatação de **negrito**, ***itálico*** e combinações em blocos de citação e anotações com `Plus Jakarta Sans`.
- **Números e contadores:** usar sempre `JetBrains Mono` com `font-variant-numeric: tabular-nums` em timers, prazos e porcentagens para evitar trepidação visual durante atualizações em tempo real.

### 4.2 Escala tipográfica base (mínimo `12px`)

| Nível | Família | Tamanho (Desktop → Mobile) | Peso / Estilo |
| --- | --- | --- | --- |
| `display-hero` | `Fraunces` | `clamp(2.25rem, 4.5vw, 3.5rem)` | `700` + `Italic` pontual |
| `titulo-secao` | `Fraunces` | `clamp(1.5rem, 2.6vw, 2.125rem)` | `600-700` + `Italic` pontual |
| `subtitulo` | `Fraunces` / `Plus Jakarta Sans` | `1.125rem-1.25rem` (`18-20px`) | `600` |
| `corpo-tarefa` | `Plus Jakarta Sans` | `0.9375rem-1rem` (`15-16px`) | `500-600` |
| `corpo-apoio` | `Plus Jakarta Sans` | `0.875rem` (`14px`) | `400-500` / `Italic` em observações |
| `etiqueta-micro` | `Plus Jakarta Sans` / `JetBrains Mono` | `0.75rem` (`12px` - piso mínimo) | `600-700` |

---

## 5. Estados de interface e acessibilidade

- **Foco de teclado visível:** contorno sólido de `3px` na cor primária do momento atual (`outline-offset: 2px`) em todos os controles interativos.
- **Botão desabilitado:** fundo da superfície alternativa, borda tracejada ou atenuada e cursor `not-allowed`, mantendo rótulo legível (sem transparência extrema que zere o contraste).
- **Sucesso e erro:** sempre acompanhados por ícone (`✓` ou `✕`), borda colorida e mensagem clara em português (nunca apenas cor).
- **Movimento reduzido (`prefers-reduced-motion: reduce`):** desativa animações contínuas decorativas/3D e aciona o **Modo Desempenho / Fallback 2D** suave sem bloquear transições funcionais.

---

## 6. Diretrizes de responsividade (`ID-18` - Base Desktop → Tablet → Celular)

Conforme definido pelo responsável (`ID-18`), **a base principal de criação da interface é para computador (desktop-first)**, aproveitando área útil para o cenário 3D, painéis simultâneos e o editor visual de constelações, **garantindo adaptação funcional completa em tablets e celulares**.

| Faixa de tela | Largura | Adaptação estrutural esperada |
| --- | --- | --- |
| **Desktop amplo (Base principal)** | `>= 1280px` | Navegação lateral fixa/compacta, palco 3D panorâmico, Jornada do Dia com gaveta lateral de detalhes/notas ricas aberta lado a lado e editor amplo do Mapa Constelação/Ramos. |
| **Laptop / Desktop compacto** | `1024px-1279px` | Mantém barra lateral e painel principal; gaveta de edição/notas alterna para painel deslizante sobreposto quando necessário. |
| **Tablet** | `768px-1023px` | Menu lateral colapsável ou barra superior compacta; grade do Calendário Mensal e cartões ajustados para 2 colunas ou coluna única fluida; controles de zoom/pan no Mapa fáceis de tocar. |
| **Celular** | `320px-767px` | Zero transbordamento horizontal a partir de `320px`; barra inferior ou menu gaveta acessível; controle do Arco do Dia compacto no topo; alvos de toque mínimos de `44×44 px`; recuo visual da árvore multinível limitado (`max-indent`) para preservar espaço de leitura; opção destacada de Modo Desempenho / Fallback 2D em aparelhos leves. |

---

## 7. Coreografia de movimento, animações de texto, hover e efeitos de escrita (`ID-19`)

O movimento no **Lume** é pensado para dar vida poética e resposta tátil à interface sem jamais atrapalhar quem está gerenciando tarefas no dia a dia:

### 7.1 Efeitos de escrita e revelação tipográfica
- **Efeito de escrita e entrada escalonada (*stagger*):** frases de impacto na Landing cinematográfica e citações/mensagens do Modo Foco podem usar revelação progressiva caractere a caractere ou palavra a palavra combinada a `Fraunces` **bold** + ***italic***.
- **Transição suave de saudações:** quando o horário muda de fase atmosférica, a saudação do cabeçalho desliza e desvanece suavemente sem saltar layout.
- **Contadores e timers vivos:** o percentual da árvore composta, o relógio 24h e o temporizador do Modo Foco animam suas variações em `JetBrains Mono` (`tabular-nums`) para manter alinhamento firme sem trepidação.

### 7.2 Microinterações de hover e feedback tátil
- **Botões e pílulas:** elevação sutil (`-1px` a `-2px`), brilho/aura na cor primária do horário atual e transição suave de preenchimento.
- **Cartões de tarefa e nós do mapa:** resposta imediata no hover com destaque progressivo de borda, micro-deslocamento de ícones (ex.: seta de expansão, símbolo de prioridade, estrela da constelação) e indicação clara de ações disponíveis sem esconder informações essenciais.
- **Alternativa acessível:** qualquer conteúdo útil revelado em hover também deve ser acessível por foco de teclado (`:focus-visible`) e toque em dispositivos móveis.

### 7.3 Efeitos de movimento, hierarquia e celebração
- **Física de mola suave (`motion` / Framer Motion):** expansão e recolhimento dos 5 níveis da árvore de subtarefas com abertura fluida da subárvore, reordenação animada no drag-and-drop (`@dnd-kit` + layout transitions) e troca orgânica de telas/gavetas.
- **Conclusão e celebração:** ao concluir uma subtarefa, o risco tipográfico desliza suavemente e a barra de progresso avança em mola; ao concluir uma constelação inteira, estrelas/flores correspondentes pulsam no cenário 3D/2D.
- **Ritmo e acessibilidade:** interações frequentes (abrir tarefa, marcar checkbox, filtrar) permanecem rápidas (`150ms-300ms`) para não cansar o uso diário; animações de entrada e efeitos de escrita ficam concentrados na Landing, transições de turno e Modo Foco. Tudo respeita estritamente `prefers-reduced-motion: reduce` e o Modo Desempenho.

---

## 8. Identidade visual, marca "Sol de 4 Ls", favicon adaptativo por horário e assets Soft-3D (`D04`, `ID-21` a `ID-23`)

### 8.1 Logotipo, chamada oficial e estética Soft-3D Clay Matte
- **Logotipo oficial:** palavra **`Lume`** em `Fraunces Bold` (`700`) acompanhada pelo símbolo radial **"Sol de 4 Ls"** em **Soft-3D Clay Matte** com fundo 100% transparente (`PNG RGBA 256x256`).
- **Chamada oficial (subtítulo da marca):** *"Suas tarefas no ritmo vivo do dia."* (combinando **`tarefas`** em peso `700` e ***`ritmo vivo`*** em `Fraunces Italic 600` na cor primária do horário atual).
- **Linguagem visual:** troca do estilo low-poly geométrico plano por modelagem **Soft-3D Clay Matte** (cantos macios, iluminação difusa tátil e profundidade em relevo) combinada a painéis **Bento UI** translúcidos sobre o céu contínuo de 24h.

### 8.2 Sistema oficial de 4 favicons adaptativos por horário (`Sol de 4 Ls`)
O símbolo mantém exatamente a mesma geometria simétrica em todos os arquivos (`PNG RGBA 256x256`, traço leve e estrela negativa central sem deslocamento de bounding box), alternando as cores dos pares diagonais de braços conforme o horário exibido pelo **Modo Relógio Real** ou pelo **Simulador do Arco do Dia**:

| Turno | Faixa horária | Minutos do dia | Arquivo oficial (`Doc/Identidade-visual/assets-3d/favicons/`) | Composição cromática dos 4 Ls |
| --- | --- | --- | --- | --- |
| **Manhã** | `05:45` - `11:59` | `345` - `719` | `favicon-lume-manha.png` | **4 Ls Ouro Solar** uniforme (mesmo tom em todos os braços) |
| **Tarde** | `12:00` - `16:59` | `720` - `1019` | `favicon-lume-tarde.png` | **2 Ls Ouro Solar (Manhã) + 2 Ls Laranja mais escuro** alternados em diagonal |
| **Entardecer** | `17:00` - `18:59` | `1020` - `1139` | `favicon-lume-entardecer.png` | **2 Ls Coral Poente + 2 Ls Ametista Crepúsculo** alternados em diagonal |
| **Noite** | `19:00` - `05:44` | `1140` - `1439` e `0` - `344` | `favicon-lume-noite.png` | **2 Ls Índigo Estelar + 2 Ls Ciano Vagalume** alternados em diagonal |

**Regra técnica no frontend (Fase 12 em diante):** manter o estado da faixa ativa (`manha`, `tarde`, `entardecer` ou `noite`) e atualizar o `href` de `<link rel="icon">` **somente quando houver mudança de faixa** (evitando recarregamentos e piscadas na aba ao deslizar o Arco do Dia ou durante o Timelapse 24h), sincronizando também o símbolo exibido no cabeçalho/logotipo.

### 8.3 Catálogo de assets Soft-3D aprovados (`Doc/Identidade-visual/assets-3d/`)
- `diorama-jardim-dia-3d.png`: diorama panorâmico diurno do jardim vivo em Soft-3D.
- `diorama-jardim-noite-3d.png`: diorama panorâmico noturno com constelações e vagalumes para transição cruzada contínua com a camada diurna.
- `prancha-sol-lua-3d.png`: 5 variações solares do dia e fases lunares esculpidas para o cenário e Calendário Mensal.
- `prancha-plantas-evolucao-3d.png`: grade com 4 estágios evolutivos das tarefas compostas (Broto Inicial, Muda Viva, Botões Dourados e Florescimento Pleno) e espécies colecionáveis para os cartões Bento.
- `prancha-avatares-16-3d.png`: prancha 4x4 com os **16 avatares Soft-3D oficiais** (`256x256` efetivo na entrega):
  - **Astros:** `sol-nascente`, `lua-crescente`, `cometa-dourado`, `aurora-boreal`
  - **Botânicos:** `girassol-lume`, `samambaia-orvalho`, `lotus-serena`, `broto-vivo`
  - **Criaturas:** `vagalume-estelar`, `coruja-noturna`, `borboleta-aurora`, `beija-flor-solar`
  - **Observatório:** `telescopio-celeste`, `bussola-astral`, `ampulheta-solar`, `estrela-guia`
- **Opções adicionais de perfil (`ID-22`):** além dos 16 avatares Soft-3D, o usuário pode manter a foto importada da conta **Google OAuth** ou realizar **upload de imagem própria** (`PNG`, `JPG` ou `WebP`, padronizada para `256x256`).

### 8.4 Clima atmosférico reativo, mini-card de clima opt-in e Lua 3D real (`ID-24`, `ID-25`, `ID-27`)
- **Mini-card Bento de clima e horário (Jornada do Dia):** cartão compacto translúcido na faixa protegida do momento atual exibindo hora local (`JetBrains Mono`), e somente quando autorizado pelo usuário (`habilitado: true`), **nome da cidade, temperatura atual e ícone do clima**, além de atalho rápido para ligar/desligar ou trocar cidade.
- **Cinco estados climáticos no cenário (`limpo`, `parcialmente_nublado`, `nublado`, `chuvoso`, `tempestade`):** nuvens **Soft-3D** com densidade gradual, escurecimento sutil apenas na camada atmosférica de fundo (sem alterar a legibilidade WCAG AA das superfícies 2D de texto/cartões), gotas de chuva leves via `InstancedMesh` (ou SVG no Fallback 2D) e clarões suaves de tempestade **estritamente desativados quando `prefers-reduced-motion: reduce` estiver ativo**.
- **Lua 3D iluminada pela fase real (Hemisfério Sul):** shader/iluminação lunar alinhada ao percentual real de iluminação da data atual, exibindo o arco iluminado pela **esquerda na fase Crescente** (visão padrão no Brasil) e mantendo leve **luz cinérea** na metade sombreada para preservar recorte estético no céu noturno.

---

## 9. Referências visuais e protótipos desta fase

- [ORIGEM-E-LICENCAS.md](Identidade-visual/ORIGEM-E-LICENCAS.md): inventário oficial de origem e licenças dos assets Soft-3D, dos 4 favicons por horário, das fontes `SIL OFL 1.1` e dos avatares.
- [estudo-fase-03-soft3d.html](Identidade-visual/estudo-fase-03-soft3d.html): estúdio interativo oficial da Fase 03 integrando a marca **Sol de 4 Ls**, os **4 favicons adaptativos por horário** ao vivo na aba, diorama dia/noite com paralaxe, evolução botânica de subtarefas e galeria dos **16 avatares Soft-3D + Google + upload**.
- [simulacao-transicao-continua.html](Identidade-visual/simulacao-transicao-continua.html): estúdio interativo aprovado da **Transição Cromática Contínua 24h** com timelapse, hora real e auditoria WCAG dos 1.440 minutos.
- [previa-fase-02.html](Identidade-visual/previa-fase-02.html): comparativo inicial das 3 direções cromáticas e 3 trios tipográficos avaliados na Fase 02.
