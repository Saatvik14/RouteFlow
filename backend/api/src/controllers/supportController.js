const nodemailer = require('nodemailer');

// Submit support complaint
const submitSupport = async (req, res) => {
  try {
    const { message, subject, userEmail, userName } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'visiofytech@gmail.com';

    // Nodemailer transport configuration via environment variables
    const smtpUser = process.env.SMTP_USER || process.env.GOOGLE_SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.GOOGLE_SMTP_PASS;
    const smtpHost = process.env.SMTP_HOST || (smtpUser ? 'smtp.gmail.com' : undefined);
    const smtpPortEnv = process.env.SMTP_PORT || (smtpUser ? '465' : undefined);
    const smtpPort = smtpPortEnv ? Number(smtpPortEnv) : undefined;
    const smtpSecure = typeof process.env.SMTP_SECURE !== 'undefined'
      ? process.env.SMTP_SECURE === 'true'
      : smtpPort === 465;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
    });

    const fromAddress = userEmail ? `${userName || ''} <${userEmail}>` : smtpUser || SUPPORT_EMAIL;

    const mailOptions = {
      from: fromAddress,
      to: SUPPORT_EMAIL,
      subject: subject || `Support request from ${userEmail || 'app user'}`,
      text: `Support message:\n\n${message}\n\nFrom: ${userName || ''} <${userEmail || 'unknown'}>`,
      replyTo: userEmail || undefined,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Support request submitted' });
  } catch (error) {
    console.error('Support submit error:', error);
    return res.status(500).json({ message: 'Failed to submit support request' });
  }
};

module.exports = { submitSupport };
