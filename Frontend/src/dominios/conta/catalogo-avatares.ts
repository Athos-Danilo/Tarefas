import { z } from 'zod';

export type CategoriaAvatar = 'Astros' | 'Botânicos' | 'Criaturas' | 'Observatório';

export type IdAvatarOficial =
  | 'sol-nascente'
  | 'lua-crescente'
  | 'cometa-dourado'
  | 'aurora-boreal'
  | 'girassol-lume'
  | 'samambaia-orvalho'
  | 'lotus-serena'
  | 'broto-vivo'
  | 'vagalume-estelar'
  | 'coruja-noturna'
  | 'borboleta-aurora'
  | 'beija-flor-solar'
  | 'telescopio-celeste'
  | 'bussola-astral'
  | 'ampulheta-solar'
  | 'estrela-guia';

export interface ItemAvatarOficial {
  id: IdAvatarOficial;
  nome: string;
  categoria: CategoriaAvatar;
  url: string;
}

export const CATALOGO_AVATARES_OFICIAIS: ReadonlyArray<ItemAvatarOficial> = [
  {
    id: 'sol-nascente',
    nome: 'Sol Nascente',
    categoria: 'Astros',
    url: '/assets-3d/avatares/sol-nascente.png',
  },
  {
    id: 'lua-crescente',
    nome: 'Lua Crescente',
    categoria: 'Astros',
    url: '/assets-3d/avatares/lua-crescente.png',
  },
  {
    id: 'cometa-dourado',
    nome: 'Cometa Dourado',
    categoria: 'Astros',
    url: '/assets-3d/avatares/cometa-dourado.png',
  },
  {
    id: 'aurora-boreal',
    nome: 'Aurora Boreal',
    categoria: 'Astros',
    url: '/assets-3d/avatares/aurora-boreal.png',
  },
  {
    id: 'girassol-lume',
    nome: 'Girassol Lume',
    categoria: 'Botânicos',
    url: '/assets-3d/avatares/girassol-lume.png',
  },
  {
    id: 'samambaia-orvalho',
    nome: 'Samambaia Orvalho',
    categoria: 'Botânicos',
    url: '/assets-3d/avatares/samambaia-orvalho.png',
  },
  {
    id: 'lotus-serena',
    nome: 'Lótus Serena',
    categoria: 'Botânicos',
    url: '/assets-3d/avatares/lotus-serena.png',
  },
  {
    id: 'broto-vivo',
    nome: 'Broto Vivo',
    categoria: 'Botânicos',
    url: '/assets-3d/avatares/broto-vivo.png',
  },
  {
    id: 'vagalume-estelar',
    nome: 'Vagalume Estelar',
    categoria: 'Criaturas',
    url: '/assets-3d/avatares/vagalume-estelar.png',
  },
  {
    id: 'coruja-noturna',
    nome: 'Coruja Noturna',
    categoria: 'Criaturas',
    url: '/assets-3d/avatares/coruja-noturna.png',
  },
  {
    id: 'borboleta-aurora',
    nome: 'Borboleta Aurora',
    categoria: 'Criaturas',
    url: '/assets-3d/avatares/borboleta-aurora.png',
  },
  {
    id: 'beija-flor-solar',
    nome: 'Beija-flor Solar',
    categoria: 'Criaturas',
    url: '/assets-3d/avatares/beija-flor-solar.png',
  },
  {
    id: 'telescopio-celeste',
    nome: 'Telescópio Celeste',
    categoria: 'Observatório',
    url: '/assets-3d/avatares/telescopio-celeste.png',
  },
  {
    id: 'bussola-astral',
    nome: 'Bússola Astral',
    categoria: 'Observatório',
    url: '/assets-3d/avatares/bussola-astral.png',
  },
  {
    id: 'ampulheta-solar',
    nome: 'Ampulheta Solar',
    categoria: 'Observatório',
    url: '/assets-3d/avatares/ampulheta-solar.png',
  },
  {
    id: 'estrela-guia',
    nome: 'Estrela Guia',
    categoria: 'Observatório',
    url: '/assets-3d/avatares/estrela-guia.png',
  },
];

export const IDS_AVATARES_OFICIAIS = new Set<string>(
  CATALOGO_AVATARES_OFICIAIS.map((item) => item.id),
);

export const TAMANHO_MAXIMO_AVATAR_BYTES = 2 * 1024 * 1024;
export const TIPOS_IMAGEM_PERMITIDOS = new Set<string>(['image/png', 'image/jpeg', 'image/webp']);
export const CONFIRMACAO_EXCLUSAO_EXATA = 'EXCLUIR';

export function validarArquivoAvatarLocal(arquivo: File): string | null {
  if (!TIPOS_IMAGEM_PERMITIDOS.has(arquivo.type)) {
    return 'Envie uma imagem nos formatos PNG, JPG ou WebP.';
  }
  if (arquivo.size > TAMANHO_MAXIMO_AVATAR_BYTES) {
    return 'A imagem deve ter no máximo 2 MB.';
  }
  if (arquivo.size === 0) {
    return 'O arquivo de imagem esta vazio.';
  }
  return null;
}

const validarPreset = (
  valores: { avatarTipo: 'preset' | 'google' | 'upload'; avatarId: string | null },
  ctx: z.RefinementCtx,
) => {
  if (
    valores.avatarTipo === 'preset' &&
    (!valores.avatarId || !IDS_AVATARES_OFICIAIS.has(valores.avatarId))
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['avatarId'],
      message: 'Escolha um dos 16 avatares oficiais.',
    });
  }
};

export const esquemaPerfil = z
  .object({
    nomeExibicao: z
      .string()
      .trim()
      .min(2, 'O nome de exibição deve ter entre 2 e 60 caracteres.')
      .max(60, 'O nome de exibição deve ter entre 2 e 60 caracteres.'),
    avatarTipo: z.enum(['preset', 'google', 'upload']),
    avatarId: z.string().nullable(),
  })
  .superRefine(validarPreset);

export const esquemaPrimeiroAcesso = z
  .object({
    nomeExibicao: z
      .string()
      .trim()
      .min(2, 'O nome de exibição deve ter entre 2 e 60 caracteres.')
      .max(60, 'O nome de exibição deve ter entre 2 e 60 caracteres.'),
    avatarTipo: z.enum(['preset', 'google', 'upload']),
    avatarId: z.string().nullable(),
    criarArvoreGuia: z.boolean(),
  })
  .superRefine(validarPreset);

export type ValoresPerfilForm = z.infer<typeof esquemaPerfil>;
export type ValoresPrimeiroAcessoForm = z.infer<typeof esquemaPrimeiroAcesso>;
