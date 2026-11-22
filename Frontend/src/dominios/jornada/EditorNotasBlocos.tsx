import {
  CheckSquare,
  Code2,
  Heading2,
  Link2,
  List,
  Pilcrow,
  Quote,
  Save,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Botao } from '../../componentes/Botao';
import type { BlocoNota, MetadadosVisuaisTarefa } from '../../servicos/tipos-jornada';
import {
  contarCaracteresBlocos,
  MAX_BLOCOS_POR_TAREFA,
  MAX_CARACTERES_NOTAS,
  validarListaBlocos,
} from './logica-jornada';

export interface PropriedadesEditorNotasBlocos {
  blocosIniciais: readonly BlocoNota[];
  metadadosIniciais: MetadadosVisuaisTarefa;
  salvando: boolean;
  aoSalvar: (entrada: {
    metadadosVisuais: MetadadosVisuaisTarefa;
    notasEmBlocos: BlocoNota[];
  }) => Promise<void>;
  reduzirMovimento: boolean;
}

function criarIdBloco(): string {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function EditorNotasBlocos({
  blocosIniciais,
  metadadosIniciais,
  salvando,
  aoSalvar,
  reduzirMovimento,
}: PropriedadesEditorNotasBlocos) {
  const [blocos, setBlocos] = useState<BlocoNota[]>(() => [...blocosIniciais]);
  const [formaBotanica, setFormaBotanica] = useState(metadadosIniciais.formaBotanica ?? 'padrao');
  const [erroNotas, setErroNotas] = useState<string | null>(null);
  const [salvoSucesso, setSalvoSucesso] = useState(false);

  const adicionarBloco = (novoBloco: BlocoNota) => {
    if (blocos.length >= MAX_BLOCOS_POR_TAREFA) {
      setErroNotas(`Limite de ${MAX_BLOCOS_POR_TAREFA} blocos por tarefa atingido.`);
      return;
    }
    setErroNotas(null);
    setSalvoSucesso(false);
    setBlocos((atual) => [...atual, novoBloco]);
  };

  const atualizarBloco = (indice: number, atualizado: BlocoNota) => {
    setSalvoSucesso(false);
    setBlocos((atual) => atual.map((item, i) => (i === indice ? atualizado : item)));
  };

  const removerBloco = (indice: number) => {
    setSalvoSucesso(false);
    setBlocos((atual) => atual.filter((_, i) => i !== indice));
  };

  const lidarSalvar = async () => {
    const validacao = validarListaBlocos(blocos);
    if (!validacao.valida) {
      setErroNotas(validacao.mensagem);
      return;
    }
    setErroNotas(null);
    try {
      await aoSalvar({
        metadadosVisuais: {
          ...metadadosIniciais,
          formaBotanica: formaBotanica === 'padrao' ? undefined : formaBotanica,
        },
        notasEmBlocos: blocos,
      });
      setSalvoSucesso(true);
    } catch (erro) {
      setErroNotas(erro instanceof Error ? erro.message : 'Erro ao salvar notas.');
    }
  };

  const totalChars = contarCaracteresBlocos(blocos);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="fonte-display text-base font-bold text-[var(--texto)]">
            Notas ricas em blocos
          </h3>
          <p className="font-mono text-xs text-[var(--texto-sec)]">
            {blocos.length} / {MAX_BLOCOS_POR_TAREFA} blocos · {totalChars} / {MAX_CARACTERES_NOTAS}{' '}
            caracteres
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="meta-forma-botanica"
            className="text-xs font-semibold text-[var(--texto-sec)]"
          >
            Estilo visual
          </label>
          <select
            id="meta-forma-botanica"
            value={formaBotanica}
            onChange={(e) => setFormaBotanica(e.target.value)}
            className="min-h-9 rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2 text-xs text-[var(--texto)]"
          >
            <option value="padrao">Padrão</option>
            <option value="girassol">Girassol</option>
            <option value="lotus">Lótus</option>
            <option value="samambaia">Samambaia</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() =>
            adicionarBloco({ id: criarIdBloco(), tipo: 'subtitulo', nivel: 2, texto: '' })
          }
          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 text-xs font-semibold text-[var(--texto)]"
        >
          <Heading2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>+ Subtítulo</span>
        </button>

        <button
          type="button"
          onClick={() => adicionarBloco({ id: criarIdBloco(), tipo: 'paragrafo', texto: '' })}
          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 text-xs font-semibold text-[var(--texto)]"
        >
          <Pilcrow className="h-3.5 w-3.5" aria-hidden="true" />
          <span>+ Parágrafo</span>
        </button>

        <button
          type="button"
          onClick={() =>
            adicionarBloco({
              id: criarIdBloco(),
              tipo: 'lista',
              ordenada: false,
              itens: [''],
            })
          }
          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 text-xs font-semibold text-[var(--texto)]"
        >
          <List className="h-3.5 w-3.5" aria-hidden="true" />
          <span>+ Lista</span>
        </button>

        <button
          type="button"
          onClick={() =>
            adicionarBloco({
              id: criarIdBloco(),
              tipo: 'checklist',
              itens: [{ texto: '', marcado: false }],
            })
          }
          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 text-xs font-semibold text-[var(--texto)]"
        >
          <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
          <span>+ Checklist</span>
        </button>

        <button
          type="button"
          onClick={() =>
            adicionarBloco({ id: criarIdBloco(), tipo: 'citacao', texto: '', autor: '' })
          }
          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 text-xs font-semibold text-[var(--texto)]"
        >
          <Quote className="h-3.5 w-3.5" aria-hidden="true" />
          <span>+ Citação</span>
        </button>

        <button
          type="button"
          onClick={() =>
            adicionarBloco({
              id: criarIdBloco(),
              tipo: 'codigo_ou_link',
              subtipo: 'codigo',
              rotulo: '',
              conteudo: '',
            })
          }
          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 text-xs font-semibold text-[var(--texto)]"
        >
          <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>+ Código</span>
        </button>

        <button
          type="button"
          onClick={() =>
            adicionarBloco({
              id: criarIdBloco(),
              tipo: 'codigo_ou_link',
              subtipo: 'link',
              rotulo: '',
              conteudo: '',
            })
          }
          className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 text-xs font-semibold text-[var(--texto)]"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>+ Link</span>
        </button>
      </div>

      <div className="space-y-3">
        {blocos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--borda)] p-4 text-xs text-[var(--texto-sec)]">
            Nenhum bloco adicionado ainda. Use os botões acima para compor suas notas.
          </p>
        ) : (
          blocos.map((bloco, indice) => (
            <div
              key={bloco.id}
              className="space-y-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold tracking-wide text-[var(--texto-sec)] uppercase">
                  {bloco.tipo === 'codigo_ou_link'
                    ? bloco.subtipo === 'link'
                      ? 'Link externo'
                      : 'Trecho de código'
                    : bloco.tipo}
                </span>
                <button
                  type="button"
                  aria-label={`Remover bloco ${indice + 1}`}
                  onClick={() => removerBloco(indice)}
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--erro)] hover:bg-[var(--superficie-solida)]"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {bloco.tipo === 'subtitulo' ? (
                <div className="flex flex-wrap gap-2">
                  <select
                    aria-label={`Nível do subtítulo ${indice + 1}`}
                    value={bloco.nivel}
                    onChange={(e) =>
                      atualizarBloco(indice, {
                        ...bloco,
                        nivel: Number(e.target.value) === 3 ? 3 : 2,
                      })
                    }
                    className="min-h-9 rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2 text-xs text-[var(--texto)]"
                  >
                    <option value={2}>H2</option>
                    <option value={3}>H3</option>
                  </select>
                  <input
                    aria-label={`Texto do subtítulo ${indice + 1}`}
                    type="text"
                    value={bloco.texto}
                    onChange={(e) => atualizarBloco(indice, { ...bloco, texto: e.target.value })}
                    placeholder="Título da seção..."
                    className="min-h-9 flex-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2.5 text-sm font-semibold text-[var(--texto)]"
                  />
                </div>
              ) : null}

              {bloco.tipo === 'paragrafo' ? (
                <textarea
                  aria-label={`Texto do parágrafo ${indice + 1}`}
                  rows={2}
                  value={bloco.texto}
                  onChange={(e) => atualizarBloco(indice, { ...bloco, texto: e.target.value })}
                  placeholder="Escreva suas anotações (suporta **negrito** e *itálico*)..."
                  className="w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] p-2 text-sm text-[var(--texto)]"
                />
              ) : null}

              {bloco.tipo === 'lista' ? (
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-xs text-[var(--texto)]">
                    <input
                      type="checkbox"
                      checked={bloco.ordenada}
                      onChange={(e) =>
                        atualizarBloco(indice, { ...bloco, ordenada: e.target.checked })
                      }
                    />
                    <span>Lista numerada</span>
                  </label>
                  <textarea
                    aria-label={`Itens da lista ${indice + 1}`}
                    rows={3}
                    value={bloco.itens.join('\n')}
                    onChange={(e) =>
                      atualizarBloco(indice, {
                        ...bloco,
                        itens: e.target.value.split('\n'),
                      })
                    }
                    placeholder="Um item por linha..."
                    className="w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] p-2 text-sm text-[var(--texto)]"
                  />
                </div>
              ) : null}

              {bloco.tipo === 'checklist' ? (
                <div className="space-y-1.5">
                  {bloco.itens.map((itemChk, idxChk) => (
                    <div key={`${bloco.id}-${idxChk}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={itemChk.marcado}
                        onChange={(e) =>
                          atualizarBloco(indice, {
                            ...bloco,
                            itens: bloco.itens.map((atual, pos) =>
                              pos === idxChk ? { ...atual, marcado: e.target.checked } : atual,
                            ),
                          })
                        }
                      />
                      <input
                        type="text"
                        value={itemChk.texto}
                        onChange={(e) =>
                          atualizarBloco(indice, {
                            ...bloco,
                            itens: bloco.itens.map((atual, pos) =>
                              pos === idxChk ? { ...atual, texto: e.target.value } : atual,
                            ),
                          })
                        }
                        placeholder="Item de checklist..."
                        className="min-h-8 flex-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2 text-xs text-[var(--texto)]"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      atualizarBloco(indice, {
                        ...bloco,
                        itens: [...bloco.itens, { texto: '', marcado: false }],
                      })
                    }
                    className="cursor-pointer text-xs font-semibold text-[var(--primaria)]"
                  >
                    + Adicionar item no checklist
                  </button>
                </div>
              ) : null}

              {bloco.tipo === 'citacao' ? (
                <div className="space-y-2">
                  <textarea
                    aria-label={`Texto da citação ${indice + 1}`}
                    rows={2}
                    value={bloco.texto}
                    onChange={(e) => atualizarBloco(indice, { ...bloco, texto: e.target.value })}
                    placeholder="Trecho citado..."
                    className="w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] p-2 text-sm italic text-[var(--texto)]"
                  />
                  <input
                    aria-label={`Autor da citação ${indice + 1}`}
                    type="text"
                    value={bloco.autor ?? ''}
                    onChange={(e) => atualizarBloco(indice, { ...bloco, autor: e.target.value })}
                    placeholder="Autor ou referência (opcional)"
                    className="min-h-9 w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2.5 text-xs text-[var(--texto)]"
                  />
                </div>
              ) : null}

              {bloco.tipo === 'codigo_ou_link' ? (
                <div className="space-y-2">
                  <input
                    aria-label={
                      bloco.subtipo === 'link' ? 'Rótulo do link' : 'Rótulo do bloco de código'
                    }
                    type="text"
                    value={bloco.rotulo ?? ''}
                    onChange={(e) => atualizarBloco(indice, { ...bloco, rotulo: e.target.value })}
                    placeholder={
                      bloco.subtipo === 'link'
                        ? 'Título do link (opcional)'
                        : 'Linguagem ou título (opcional)'
                    }
                    className="min-h-9 w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2.5 text-xs text-[var(--texto)]"
                  />
                  {bloco.subtipo === 'link' ? (
                    <input
                      aria-label="URL do link"
                      type="url"
                      value={bloco.conteudo}
                      onChange={(e) =>
                        atualizarBloco(indice, { ...bloco, conteudo: e.target.value })
                      }
                      placeholder="https://..."
                      className="min-h-9 w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2.5 font-mono text-xs text-[var(--texto)]"
                    />
                  ) : (
                    <textarea
                      aria-label="Conteúdo do código"
                      rows={3}
                      value={bloco.conteudo}
                      onChange={(e) =>
                        atualizarBloco(indice, { ...bloco, conteudo: e.target.value })
                      }
                      placeholder="Cole seu trecho de código aqui..."
                      className="w-full rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] p-2 font-mono text-xs text-[var(--texto)]"
                    />
                  )}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {erroNotas ? (
        <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
          {erroNotas}
        </p>
      ) : null}

      {salvoSucesso ? (
        <p role="status" className="text-xs font-semibold text-[var(--sucesso)]">
          Notas ricas salvas no MongoDB.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Botao
          type="button"
          variante="primario"
          tamanho="sm"
          reduzirMovimento={reduzirMovimento}
          disabled={salvando}
          onClick={() => {
            void lidarSalvar();
          }}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>{salvando ? 'Salvando notas...' : 'Salvar notas em blocos'}</span>
        </Botao>
      </div>
    </div>
  );
}
