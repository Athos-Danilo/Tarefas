export const COOKIE_CSRF = 'lume_csrf';

export class ErroApi extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly mensagem: string;
  readonly detalhes?: Record<string, unknown>;

  constructor(
    status: number,
    codigo: string,
    mensagem: string,
    detalhes?: Record<string, unknown>,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.codigo = codigo;
    this.mensagem = mensagem;
    this.detalhes = detalhes;
  }
}

export function lerCookieCsrf(cookiesBrutos?: string): string | null {
  const origem =
    cookiesBrutos !== undefined
      ? cookiesBrutos
      : typeof document !== 'undefined'
        ? document.cookie
        : '';

  if (!origem) {
    return null;
  }

  for (const parte of origem.split(';')) {
    const limpa = parte.trim();
    if (!limpa.startsWith(`${COOKIE_CSRF}=`)) {
      continue;
    }
    const valorBruto = limpa.slice(COOKIE_CSRF.length + 1);
    if (!valorBruto) {
      return null;
    }
    try {
      return decodeURIComponent(valorBruto);
    } catch {
      return valorBruto;
    }
  }

  return null;
}

const METODOS_MUTAVEIS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function ehCorpoErroApi(dados: unknown): dados is {
  erro?: {
    codigo?: unknown;
    mensagem?: unknown;
    detalhes?: unknown;
  };
} {
  return typeof dados === 'object' && dados !== null && 'erro' in dados;
}

export async function requisitarJson<T>(
  url: string,
  opcoes: RequestInit = {},
  funcaoFetch: typeof fetch = fetch,
): Promise<T> {
  const metodo = (opcoes.method ?? 'GET').toUpperCase();
  const cabecalhos = new Headers(opcoes.headers);
  const headersPlanos: Record<string, string> = {};

  if (opcoes.headers instanceof Headers) {
    opcoes.headers.forEach((valor, chave) => {
      headersPlanos[chave] = valor;
    });
  } else if (Array.isArray(opcoes.headers)) {
    for (const [chave, valor] of opcoes.headers) {
      headersPlanos[chave] = valor;
    }
  } else if (opcoes.headers) {
    Object.assign(headersPlanos, opcoes.headers);
  }

  if (!cabecalhos.has('Accept')) {
    headersPlanos['Accept'] = 'application/json';
  }

  const ehFormData = typeof FormData !== 'undefined' && opcoes.body instanceof FormData;
  if (opcoes.body !== undefined && !ehFormData && !cabecalhos.has('Content-Type')) {
    headersPlanos['Content-Type'] = 'application/json';
  }

  if (METODOS_MUTAVEIS.has(metodo)) {
    const tokenCsrf = lerCookieCsrf();
    if (tokenCsrf && !cabecalhos.has('X-CSRF-Token')) {
      headersPlanos['X-CSRF-Token'] = tokenCsrf;
    }
  }

  const resposta = await funcaoFetch(url, {
    ...opcoes,
    method: metodo,
    headers: headersPlanos,
    credentials: 'same-origin',
  });

  if (!resposta.ok) {
    let codigo = `HTTP_${resposta.status}`;
    let mensagem = `Falha na requisicao (${resposta.status}).`;
    let detalhes: Record<string, unknown> | undefined;

    try {
      const jsonErro: unknown = await resposta.json();
      if (ehCorpoErroApi(jsonErro) && jsonErro.erro) {
        if (typeof jsonErro.erro.codigo === 'string') {
          codigo = jsonErro.erro.codigo;
        }
        if (typeof jsonErro.erro.mensagem === 'string') {
          mensagem = jsonErro.erro.mensagem;
        }
        if (typeof jsonErro.erro.detalhes === 'object' && jsonErro.erro.detalhes !== null) {
          detalhes = jsonErro.erro.detalhes as Record<string, unknown>;
        }
      }
    } catch {
      // Resposta sem corpo JSON estruturado.
    }

    throw new ErroApi(resposta.status, codigo, mensagem, detalhes);
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  return (await resposta.json()) as T;
}
