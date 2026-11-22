import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '../../componentes/Botao';
import { ModalAcessivel } from '../../componentes/ModalAcessivel';
import { CONFIRMACAO_EXCLUSAO_EXATA } from './catalogo-avatares';

export interface PropriedadesModalExclusaoConta {
  reduzirMovimento: boolean;
  aoConfirmarExclusao: (confirmacao: string) => Promise<void>;
}

export function ModalExclusaoConta({
  reduzirMovimento,
  aoConfirmarExclusao,
}: PropriedadesModalExclusaoConta) {
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const confirmacaoValida = confirmacao === CONFIRMACAO_EXCLUSAO_EXATA;

  const lidarConfirmar = async () => {
    if (!confirmacaoValida) {
      return;
    }
    setErro(null);
    setExcluindo(true);
    try {
      await aoConfirmarExclusao(confirmacao);
      setAberto(false);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Nao foi possivel excluir a conta.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <ModalAcessivel
      aberto={aberto}
      aoMudarAbertura={(proximo) => {
        setAberto(proximo);
        if (!proximo) {
          setConfirmacao('');
          setErro(null);
        }
      }}
      titulo="Excluir conta em definitivo"
      descricao="Esta ação é irreversível e remove permanentemente todos os seus dados nos bancos PostgreSQL e MongoDB."
      gatilho={
        <Botao variante="perigo" tamanho="md" reduzirMovimento={reduzirMovimento}>
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          Excluir minha conta
        </Botao>
      }
    >
      <div className="space-y-4">
        <ul className="list-disc space-y-1 pl-5 text-xs text-[var(--texto-sec)]">
          <li>Conta, sessões ativas, tarefas compostas, etiquetas e sessões de foco;</li>
          <li>Inscrições de notificações Web Push e lembretes agendados;</li>
          <li>Participação em Tarefas em Conjunto (desvinculando suas vagas);</li>
          <li>Notas em blocos, layouts do mapa, histórico de eventos e preferências de clima.</li>
        </ul>

        <div className="space-y-1.5">
          <label
            htmlFor="campo-confirmacao-exclusao"
            className="block text-xs font-semibold text-[var(--texto)]"
          >
            Digite EXCLUIR para confirmar
          </label>
          <input
            id="campo-confirmacao-exclusao"
            type="text"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            placeholder={CONFIRMACAO_EXCLUSAO_EXATA}
            className="w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2 text-sm text-[var(--texto)]"
          />
        </div>

        {erro ? (
          <p role="alert" className="text-xs font-semibold text-[var(--erro)]">
            {erro}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Botao
            variante="secundario"
            tamanho="sm"
            reduzirMovimento={reduzirMovimento}
            onClick={() => setAberto(false)}
          >
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            tamanho="sm"
            disabled={!confirmacaoValida || excluindo}
            reduzirMovimento={reduzirMovimento}
            onClick={() => {
              void lidarConfirmar();
            }}
          >
            {excluindo ? 'Excluindo...' : 'Confirmar exclusão definitiva'}
          </Botao>
        </div>
      </div>
    </ModalAcessivel>
  );
}
