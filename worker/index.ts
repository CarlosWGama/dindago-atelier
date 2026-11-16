/**
 * Worker da Cloudflare.
 *
 * - Arquivos estáticos e rotas do React Router: servidos pelo binding ASSETS
 *   (configurado em wrangler.jsonc, com fallback de SPA).
 * - /api/* e /uploads/*: repassados ao backend Express hospedado fora da
 *   Cloudflare, cujo endereço vem da variável API_ORIGIN. Assim o navegador
 *   fala sempre com o mesmo domínio: o cookie de sessão do painel (SameSite=Lax)
 *   continua funcionando e as fotos enviadas (/uploads/...) continuam abrindo.
 */

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  /** Ex.: https://dindago-api.onrender.com (sem barra no final). */
  API_ORIGIN?: string;
}

const CAMINHOS_DO_BACKEND = ['/api/', '/uploads/'];

function vaiParaOBackend(caminho: string) {
  return CAMINHOS_DO_BACKEND.some((prefixo) => caminho.startsWith(prefixo));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!vaiParaOBackend(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    if (!env.API_ORIGIN) {
      // Mesmo formato de erro da API: o site cai no conteúdo local sem quebrar.
      return Response.json(
        { success: false, message: 'Servidor da API não configurado.' },
        { status: 503 },
      );
    }

    const destino = new URL(url.pathname + url.search, env.API_ORIGIN);

    const cabecalhos = new Headers(request.headers);
    cabecalhos.set('X-Forwarded-Host', url.host);
    cabecalhos.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

    return fetch(
      new Request(destino, {
        method: request.method,
        headers: cabecalhos,
        body: request.body,
        // Redirecionamentos do backend chegam intactos ao navegador.
        redirect: 'manual',
      }),
    );
  },
};
