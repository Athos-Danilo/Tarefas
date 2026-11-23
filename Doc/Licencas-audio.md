# Procedência, Licença e Arquitetura Sonora (`D15`)

**Decisão `D15` aprovada em 23/11/2026:** síntese sonora **100% procedural** baseada na Web Audio API nativa do navegador, sem dependência de arquivos `.mp3`, `.wav` ou `.ogg` externos (`0 KB` extras no *bundle* e no cache PWA).

## 1. Procedência e licenciamento

- **Origem:** código TypeScript autoral implementado em `Frontend/src/audio/logica-audio.ts` e `Frontend/src/audio/motor-web-audio.ts`.
- **Licença:** mesma licença do projeto **Lume**, livre de direitos autorais de terceiros e sem requisições de rede externas.

## 2. Catálogo de paisagens e micro-efeitos

| Categoria | Identificador | Perfil sonoro sintetizado | Acoplamento no Lume |
| --- | --- | --- | --- |
| Paisagem ambiente | `manha` | Acorde cristalino quente (senoidal + triângulo suave, filtro passa-baixa `420 Hz`) | Momento do dia `manha` |
| Paisagem ambiente | `tarde` | Pad claro em quinta justa (osciladores suaves, filtro `520 Hz`) | Momento do dia `tarde` |
| Paisagem ambiente | `crepusculo` | Drone dourado contemplativo com harmônico lento (`340 Hz`) | Momento do dia `crepusculo` |
| Paisagem ambiente | `noite` | Base noturna grave e respirada (`240 Hz`) | Momento do dia `noite` |
| Paisagem foco | `foco` | Tapete sonoro minimalista com batimento suave para concentração (`280 Hz`) | Modo Foco com sessão ativa |
| Camada climática | `chuva` | Ruído rosa/marrom determinístico filtrado (`bandpass`) contínuo | `chuvoso` (`0.45`) e `tempestade` (`0.85`, sem sobressaltos se `prefers-reduced-motion`) |
| Micro-efeito | `tarefa_concluida` | Duas notas ascendentes suaves (`C5 -> G5`) | Conclusão de tarefa / subtarefa |
| Micro-efeito | `cascata_concluida` | Arpejo luminoso de 3 notas (`C5 -> E5 -> G5 -> C6`) | Conclusão em cascata / árvore iluminada |
| Micro-efeito | `no_iluminado` | Brilho harmônico agudo breve (`G5 -> B5`) | Conclusão no Mapa de Constelação |
| Micro-efeito | `tarefa_reaberta` | Descida gentil de confirmação (`G4 -> D4`) | Reabertura de tarefa |
| Micro-efeito | `foco_iniciado` | Sino grave de abertura (`D4 -> A4`) | Início de sessão no Modo Foco |
| Micro-efeito | `foco_concluido` | Acorde de encerramento sereno (`C5 -> G5 -> C6`) | Conclusão do timer no Modo Foco |
| Micro-efeito | `foco_interrompido` | Nota descendente suave (`E4 -> C4`) | Interrupção de sessão de foco |

## 3. Opt-in rigoroso, acessibilidade e privacidade

- **Silenciado por padrão:** `preferencias_cenario.audio.habilitado` nasce `false`. Nenhum `AudioContext` é instanciado antes de ativação explícita do usuário.
- **Volumes independentes:** `volume_geral`, `volume_efeitos` e `volume_ambiente` (`0.0..1.0`) são persistidos por usuário via `PATCH /api/preferencias` (protegido por CSRF) em `preferencias_cenario.audio` no MongoDB.
- **Respeito ao navegador e movimento reduzido:** suspende automaticamente quando a aba fica oculta (`visibilitychange`), reduz modulações abruptas quando `reduzirMovimento` está ativo e encerra/desconecta todos os nós de áudio ao desativar ou desmontar.
