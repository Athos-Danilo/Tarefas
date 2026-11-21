# Origem e licenças dos assets visuais - Lume

Este documento registra a procedência, o método de produção e as condições de uso de todos os ativos visuais e tipográficos aprovados na **Fase 03** (`D04`) do projeto **Lume** (Web II), garantindo uso livre em ambiente acadêmico e publicação gratuita na web sem dependência de bancos pagos ou direitos autorais restritivos.

---

## 1. Assets visuais Soft-3D Clay Matte (`Doc/Identidade-visual/assets-3d/`)

Todos os elementos abaixo foram criados sob medida para a identidade do **Lume**, inspirados nas referências visuais escolhidas por Athos na Fase 03:

| Arquivo | Formato e uso no produto | Origem e método de produção | Licença / Uso |
| --- | --- | --- | --- |
| `assets-3d/diorama-jardim-dia-3d.png` | Ilustração 3D panorâmica (camada diurna do jardim) | Render autoral gerado via subagente de imagem (`image-generator`) para uso exclusivo do projeto | Autoral do projeto Web II / uso livre no repositório |
| `assets-3d/diorama-jardim-noite-3d.png` | Ilustração 3D panorâmica (camada noturna com constelações e vagalumes) | Render autoral gerado via subagente de imagem (`image-generator`) alinhado ao diorama diurno | Autoral do projeto Web II / uso livre no repositório |
| `assets-3d/prancha-sol-lua-3d.png` | Prancha de 5 variações do Sol + fases lunares e estrelas | Render autoral gerado via subagente de imagem (`image-generator`) para o horizonte e Calendário Mensal | Autoral do projeto Web II / uso livre no repositório |
| `assets-3d/prancha-plantas-evolucao-3d.png` | Prancha 2x4 com 4 estágios evolutivos e espécies do jardim | Render autoral gerado via subagente de imagem (`image-generator`) para tarefas compostas e jardim | Autoral do projeto Web II / uso livre no repositório |
| `assets-3d/prancha-avatares-16-3d.png` | Grade 4x4 com os 16 avatares oficiais do perfil (`256x256` efetivo na entrega) | Render autoral gerado via subagente de imagem (`image-generator`) cobrindo Astros, Botânicos, Criaturas e Observatório | Autoral do projeto Web II / uso livre no repositório |

---

## 2. Marca "Sol de 4 Ls" e favicons adaptativos por horário (`Doc/Identidade-visual/assets-3d/favicons/`)

Símbolo radial proprietário aprovado em `ID-23`, modelado e renderizado proceduralmente em **3D SDF Clay Matte** via script Python autoral (com fundo `PNG RGBA 256x256` 100% transparente e geometria simétrica idêntica entre os 4 arquivos):

| Arquivo | Turno e faixa horária | Composição cromática dos 4 Ls | Origem e licença |
| --- | --- | --- | --- |
| `assets-3d/favicons/favicon-lume-manha.png` | Manhã (`05:45` - `11:59`) | 4 Ls em Ouro Solar uniforme | Render procedural 3D autoral / uso livre no projeto |
| `assets-3d/favicons/favicon-lume-tarde.png` | Tarde (`12:00` - `16:59`) | 2 Ls Ouro da Manhã + 2 Ls Laranja mais escuro | Render procedural 3D autoral / uso livre no projeto |
| `assets-3d/favicons/favicon-lume-entardecer.png` | Entardecer (`17:00` - `18:59`) | 2 Ls Coral Poente + 2 Ls Ametista Crepúsculo | Render procedural 3D autoral / uso livre no projeto |
| `assets-3d/favicons/favicon-lume-noite.png` | Noite (`19:00` - `05:44`) | 2 Ls Índigo Estelar + 2 Ls Ciano Vagalume | Render procedural 3D autoral / uso livre no projeto |

---

## 3. Tipografia e avatares de usuário

| Família / Recurso | Escopo de uso | Licença oficial | Observação técnica |
| --- | --- | --- | --- |
| **Fraunces** (Display variável, incl. Bold e Italic) | Marca `Lume`, saudações, títulos e citações | `SIL Open Font License 1.1` (`SIL OFL 1.1`) | Hospedagem local em `Frontend/src/estilos/fontes/` na Fase 11 |
| **Plus Jakarta Sans** (400-700 + Italic) | Listas de tarefas, notas ricas, formulários e menus | `SIL Open Font License 1.1` (`SIL OFL 1.1`) | Hospedagem local na Fase 11 |
| **JetBrains Mono** (400-600 tabular) | Relógio 24h, timers do Modo Foco, prazos e percentuais | `SIL Open Font License 1.1` (`SIL OFL 1.1`) | Hospedagem local na Fase 11 |
| **Avatares adicionais de usuário (`ID-22`)** | Foto vinculada à conta Google OAuth e upload próprio (`PNG/JPG/WebP`) | Dados fornecidos pelo próprio usuário autenticado | Redimensionamento/otimização a `256x256` e remoção integral ao excluir a conta (`D06`) |
