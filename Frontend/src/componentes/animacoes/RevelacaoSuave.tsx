import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export interface PropriedadesRevelacaoSuave {
  children: ReactNode;
  atrasoSeg?: number;
  reduzirMovimento?: boolean;
  className?: string;
}

export function RevelacaoSuave({
  children,
  atrasoSeg = 0,
  reduzirMovimento = false,
  className = '',
}: PropriedadesRevelacaoSuave) {
  if (reduzirMovimento) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: atrasoSeg, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
