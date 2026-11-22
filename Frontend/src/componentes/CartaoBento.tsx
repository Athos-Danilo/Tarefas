import type { HTMLAttributes, ReactNode } from 'react';

export interface PropriedadesCartaoBento extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  destacado?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside' | 'header';
}

export function CartaoBento({
  children,
  destacado = false,
  as: Tag = 'section',
  className = '',
  ...restante
}: PropriedadesCartaoBento) {
  const sombra = destacado ? 'shadow-xl' : 'shadow-md';

  return (
    <Tag
      className={`superficie-bento rounded-2xl p-5 text-[var(--texto)] ${sombra} ${className}`}
      {...restante}
    >
      {children}
    </Tag>
  );
}
