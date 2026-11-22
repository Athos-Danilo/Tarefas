import { useEffect, useState } from 'react';

export interface PropriedadesTextoEscrito {
  texto: string;
  velocidadeMs?: number;
  reduzirMovimento?: boolean;
  className?: string;
}

interface EstadoEscrita {
  textoBase: string;
  quantidade: number;
}

export function TextoEscrito({
  texto,
  velocidadeMs = 24,
  reduzirMovimento = false,
  className = '',
}: PropriedadesTextoEscrito) {
  const [estado, setEstado] = useState<EstadoEscrita>({
    textoBase: texto,
    quantidade: reduzirMovimento ? texto.length : 0,
  });

  useEffect(() => {
    if (reduzirMovimento || texto.length === 0) {
      return;
    }

    const intervalo = window.setInterval(
      () => {
        setEstado((anterior) => {
          const quantidadeAtual = anterior.textoBase === texto ? anterior.quantidade : 0;
          if (quantidadeAtual >= texto.length) {
            window.clearInterval(intervalo);
            return anterior.textoBase === texto
              ? anterior
              : { textoBase: texto, quantidade: texto.length };
          }
          return {
            textoBase: texto,
            quantidade: quantidadeAtual + 1,
          };
        });
      },
      Math.max(8, velocidadeMs),
    );

    return () => {
      window.clearInterval(intervalo);
    };
  }, [texto, velocidadeMs, reduzirMovimento]);

  const quantidadeVisivel = reduzirMovimento
    ? texto.length
    : estado.textoBase === texto
      ? estado.quantidade
      : 0;
  const visivel = texto.slice(0, quantidadeVisivel);
  const concluido = visivel.length >= texto.length;

  return (
    <span className={className} aria-label={texto}>
      {visivel}
      {!concluido && !reduzirMovimento ? (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-[1em] w-0.5 bg-[var(--primaria)]"
        />
      ) : null}
    </span>
  );
}
