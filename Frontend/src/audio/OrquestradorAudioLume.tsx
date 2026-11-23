import { useEffect } from 'react';
import type { EstadoClimatico, MomentoDoDia } from '../astronomia/tipos';
import { useEstadoAudio } from './estado-audio';

export interface PropriedadesOrquestradorAudio {
  momentoDoDia: MomentoDoDia;
  estadoClimatico: EstadoClimatico;
  modoFocoAtivo: boolean;
  reduzirMovimento: boolean;
}

export function OrquestradorAudioLume({
  momentoDoDia,
  estadoClimatico,
  modoFocoAtivo,
  reduzirMovimento,
}: PropriedadesOrquestradorAudio) {
  const habilitado = useEstadoAudio((s) => s.habilitado);
  const volumeGeral = useEstadoAudio((s) => s.volumeGeral);
  const volumeEfeitos = useEstadoAudio((s) => s.volumeEfeitos);
  const volumeAmbiente = useEstadoAudio((s) => s.volumeAmbiente);
  const sincronizarAmbiente = useEstadoAudio((s) => s.sincronizarAmbiente);
  const encerrarAudio = useEstadoAudio((s) => s.encerrarAudio);

  useEffect(() => {
    const enviarSincronizacao = () => {
      sincronizarAmbiente({
        momentoDoDia,
        estadoClimatico,
        modoFocoAtivo,
        abaVisivel: typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
        reduzirMovimento,
      });
    };

    enviarSincronizacao();

    if (typeof document === 'undefined') {
      return undefined;
    }
    document.addEventListener('visibilitychange', enviarSincronizacao);
    return () => {
      document.removeEventListener('visibilitychange', enviarSincronizacao);
    };
  }, [
    habilitado,
    volumeGeral,
    volumeEfeitos,
    volumeAmbiente,
    momentoDoDia,
    estadoClimatico,
    modoFocoAtivo,
    reduzirMovimento,
    sincronizarAmbiente,
  ]);

  useEffect(() => {
    return () => {
      encerrarAudio();
    };
  }, [encerrarAudio]);

  return null;
}
