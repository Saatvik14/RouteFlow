const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const invitationEmail = ({ inviteeName, organizationName, inviterName, acceptanceUrl, expiresHours }) => {
  const safeName = escapeHtml(inviteeName);
  const safeOrganization = escapeHtml(organizationName);
  const safeInviter = escapeHtml(inviterName);
  const safeUrl = escapeHtml(acceptanceUrl);
  const subject = `Join ${organizationName} on RouteFloww`;
  const text = `Hi ${inviteeName},\n\n${inviterName} invited you to join ${organizationName} on RouteFloww.\n\nAccept invitation: ${acceptanceUrl}\n\nThis single-use link expires in ${expiresHours} hours. If you were not expecting this invitation, you can ignore this email.`;
  const html = `<!doctype html>
  <html><body style="margin:0;background:#f4f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;background:#fff;border:1px solid #dfe7f1;border-radius:16px">
        <tr><td style="padding:32px">
          <div style="font-size:20px;font-weight:700;color:#172033">Route<span style="color:#2f76f6">Floww</span></div>
          <h1 style="font-size:24px;line-height:32px;margin:28px 0 12px">You’re invited to ${safeOrganization}</h1>
          <p style="font-size:16px;line-height:24px;color:#4b5870;margin:0 0 16px">Hi ${safeName},</p>
          <p style="font-size:16px;line-height:24px;color:#4b5870;margin:0 0 24px">${safeInviter} invited you to join their delivery team on RouteFloww.</p>
          <a href="${safeUrl}" style="display:inline-block;background:#2f76f6;color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:10px">Accept invitation</a>
          <p style="font-size:13px;line-height:20px;color:#6c7890;margin:24px 0 0">This link is single-use and expires in ${expiresHours} hours. If you did not expect this invitation, no action is needed.</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;

  return { subject, text, html };
};

module.exports = { escapeHtml, invitationEmail };
