/** Página mínima exibida ao abrir o link de verificação, com os tokens do Design System. */
export function verificationPage(ok: boolean): string {
  const title = ok ? 'E-mail confirmado' : 'Link inválido ou expirado';
  const body = ok
    ? 'Tudo certo! Volte ao app Fast Street e entre com seu e-mail e senha.'
    : 'Peça um novo link na tela de login do app (Reenviar e-mail de verificação).';
  const accent = ok ? '#22C55E' : '#EF4444';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Fast Street</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1A2730;color:#F5F7FA;font-family:Inter,system-ui,sans-serif}
main{max-width:340px;padding:24px}h1{font:600 36px/1 'Barlow Condensed',system-ui;text-transform:uppercase;margin:16px 0 8px}
p{color:#9AA4B2;line-height:1.5}.mark{width:48px;height:4px;border-radius:2px;background:${accent}}</style></head>
<body><main><div class="mark"></div><h1>${title}</h1><p>${body}</p></main></body></html>`;
}
