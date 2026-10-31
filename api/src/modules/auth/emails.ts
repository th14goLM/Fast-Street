import type { MailMessage } from '../../shared/mailer.js';

/** Escapa texto do usuário antes de entrar no HTML (o nome é digitado no cadastro). */
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const firstName = (nome: string) => nome.trim().split(/\s+/)[0] ?? '';

/**
 * E-mail de confirmação de conta (UC-00). Layout em tabelas com estilos inline,
 * o formato que Gmail, Outlook e apps de e-mail do celular exibem de forma consistente.
 * Cores do Design System do app (fundo #1A2730, botão em contorno laranja).
 */
export function verificationEmail(nome: string, link: string, validadeHoras: number): Omit<MailMessage, 'to'> {
  const nomeHtml = escapeHtml(firstName(nome));
  const linkHtml = escapeHtml(link);
  const display = "'Barlow Condensed','Arial Narrow',Arial,sans-serif";
  const body = "Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<title>Confirme seu e-mail · Fast Street</title>
</head>
<body style="margin:0;padding:0;background:#0F171D;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">Falta só um passo para entrar no Fast Street.</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F171D;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1A2730;border:1px solid #2C3D4B;border-radius:16px;">
      <tr><td style="padding:32px 28px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="width:40px;height:40px;border:1px solid #E95D2C;border-radius:10px;text-align:center;font:600 20px/40px ${display};color:#F28A62;">FS</td>
          <td style="padding-left:12px;font:600 18px/1 ${display};letter-spacing:2px;text-transform:uppercase;color:#F5F7FA;">Fast Street</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:24px 28px 0;">
        <p style="margin:0 0 6px;font:600 12px/1 ${display};letter-spacing:2px;text-transform:uppercase;color:#F28A62;">Confirmação de conta</p>
        <h1 style="margin:0;font:600 36px/1 ${display};text-transform:uppercase;color:#F5F7FA;">Confirme seu e-mail</h1>
      </td></tr>
      <tr><td style="padding:16px 28px 0;font:400 15px/1.6 ${body};color:#C9D2DC;">
        Olá, ${nomeHtml}! Falta só um passo para você entrar no Fast Street e se inscrever em eventos autorizados perto de você.
      </td></tr>
      <tr><td style="padding:28px 28px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="center" style="border:1px solid #E95D2C;border-radius:12px;">
            <a href="${linkHtml}" target="_blank" style="display:block;padding:16px 24px;font:500 15px/1 ${body};color:#F28A62;text-decoration:none;">Confirmar e-mail</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:16px 28px 0;font:400 13px/1.5 ${body};color:#9AA4B2;">
        O link vale por ${validadeHoras} horas e só pode ser usado uma vez. Se o botão não funcionar, copie e cole este endereço no navegador:
      </td></tr>
      <tr><td style="padding:8px 28px 0;font:400 12px/1.5 ${body};color:#B0CEE2;word-break:break-all;">${linkHtml}</td></tr>
      <tr><td style="padding:28px 28px 32px;">
        <div style="height:1px;background:#2C3D4B;"></div>
        <p style="margin:16px 0 0;font:400 12px/1.5 ${body};color:#6B7F95;">
          Você recebeu este e-mail porque criaram uma conta no Fast Street com este endereço. Se não foi você, ignore a mensagem: nenhuma conta será ativada.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `Olá, ${firstName(nome)}!`,
    '',
    'Falta só um passo para você entrar no Fast Street. Confirme seu e-mail abrindo o link abaixo:',
    link,
    '',
    `O link vale por ${validadeHoras} horas e só pode ser usado uma vez.`,
    'Se você não criou uma conta no Fast Street, ignore este e-mail.',
  ].join('\n');

  return { subject: 'Confirme seu e-mail · Fast Street', text, html };
}
