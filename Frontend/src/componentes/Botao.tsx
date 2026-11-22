import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'motion/react';

type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo';
type TamanhoBotao = 'sm' | 'md' | 'lg';

export interface PropriedadesBotao extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart'
> {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  reduzirMovimento?: boolean;
  children: ReactNode;
}

const CLASSES_VARIANTE: Record<VarianteBotao, string> = {
  primario: 'bg-[var(--primaria)] text-[var(--primaria-texto)] border border-transparent shadow-sm',
  secundario: 'bg-[var(--superficie-alt)] text-[var(--texto)] border border-[var(--borda)]',
  fantasma:
    'bg-transparent text-[var(--texto)] border border-transparent hover:bg-[var(--superficie-alt)]',
  perigo: 'bg-[var(--erro)] text-white border border-transparent shadow-sm',
};

const CLASSES_TAMANHO: Record<TamanhoBotao, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-xs rounded-lg',
  md: 'min-h-11 px-4 py-2 text-sm rounded-xl',
  lg: 'min-h-12 px-5 py-2.5 text-base rounded-xl',
};

export function Botao({
  variante = 'primario',
  tamanho = 'md',
  reduzirMovimento = false,
  className = '',
  disabled = false,
  type = 'button',
  children,
  ...restante
}: PropriedadesBotao) {
  const classeEstado = disabled
    ? 'bg-[var(--superficie-alt)] text-[var(--texto-sec)] border border-dashed border-[var(--borda)] cursor-not-allowed'
    : `${CLASSES_VARIANTE[variante]} cursor-pointer transition-colors duration-200`;

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={disabled || reduzirMovimento ? undefined : { y: -1.5 }}
      whileTap={disabled || reduzirMovimento ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.16 }}
      className={`inline-flex items-center justify-center gap-2 font-semibold ${CLASSES_TAMANHO[tamanho]} ${classeEstado} ${className}`}
      {...restante}
    >
      {children}
    </motion.button>
  );
}
