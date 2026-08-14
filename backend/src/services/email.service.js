/**
 * Email Service — Sends consent emails to patients
 * Uses configured SMTP server (Gmail, Outlook, etc.)
 * Falls back to Ethereal test account if no SMTP configured
 */
import nodemailer from 'nodemailer';

let transporter = null;

async function getTransporter() {
    if (transporter) return transporter;

    // Read SMTP config lazily (after loadEnv() has run)
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
        transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort) || 587,
            secure: false,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });
        console.log(`📧 Email: Using SMTP server ${smtpHost}`);
    } else {
        // Create Ethereal test account
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log('📧 Email: Using Ethereal test account (preview at https://ethereal.email)');
    }

    return transporter;
}

/**
 * Send consent email to patient
 */
export async function sendConsentEmail({ to, patientName, procedure, consentId, otp, consentLink }) {
    try {
        const transport = await getTransporter();

        const subject = `Medical Consent Form — ${procedure} — Action Required`;

        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); padding: 32px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px; }
        .content { padding: 32px; }
        .info-box { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-size: 13px; }
        .info-value { color: #1e293b; font-weight: 600; font-size: 14px; }
        .otp-box { background: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: 700; color: #92400e; letter-spacing: 8px; font-family: monospace; }
        .btn { display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #10b981 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .steps { margin: 20px 0; }
        .step { display: flex; gap: 12px; padding: 12px 0; }
        .step-num { width: 28px; height: 28px; background: #0d9488; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .step-text { color: #475569; font-size: 14px; line-height: 1.5; }
        .footer { background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { color: #94a3b8; font-size: 12px; margin: 4px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Medical Consent Form</h1>
            <p>Proof of Consent — Understand Before You Consent</p>
        </div>
        <div class="content">
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">Dear <strong>${patientName}</strong>,</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">Your medical consent form for <strong>${procedure}</strong> is ready for your review and signature. Please read all sections carefully before signing.</p>

            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">Consent ID</span>
                    <span class="info-value" style="font-family: monospace;">${consentId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Procedure</span>
                    <span class="info-value">${procedure}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status</span>
                    <span class="info-value" style="color: #d97706;">⏳ Awaiting Your Review</span>
                </div>
            </div>

            <div class="otp-box">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 13px; font-weight: 600;">YOUR VERIFICATION CODE</p>
                <div class="otp-code">${otp}</div>
                <p style="margin: 8px 0 0; color: #a16207; font-size: 12px;">Enter this code when prompted</p>
            </div>

            <div style="text-align: center;">
                <a href="${consentLink}" class="btn">Review & Sign Consent Form</a>
            </div>

            <div class="steps">
                <p style="color: #1e293b; font-weight: 600; margin-bottom: 12px;">Steps to Complete:</p>
                <div class="step">
                    <div class="step-num">1</div>
                    <div class="step-text">Click the link above to open your consent form</div>
                </div>
                <div class="step">
                    <div class="step-num">2</div>
                    <div class="step-text">Enter the verification code (OTP) when prompted</div>
                </div>
                <div class="step">
                    <div class="step-num">3</div>
                    <div class="step-text">Read through all sections carefully — listen to audio explanations if needed</div>
                </div>
                <div class="step">
                    <div class="step-num">4</div>
                    <div class="step-text">Complete the understanding quiz (score ≥ 80% required)</div>
                </div>
                <div class="step">
                    <div class="step-num">5</div>
                    <div class="step-text">Sign your digital consent to proceed</div>
                </div>
            </div>
        </div>
        <div class="footer">
            <p>This email was sent by Proof of Consent (PoC) — Medical Consent Management System</p>
            <p>If you have questions, please contact your doctor directly.</p>
        </div>
    </div>
</body>
</html>`;

        const textBody = `
Dear ${patientName},

Your medical consent form for "${procedure}" is ready.

Consent ID: ${consentId}
OTP: ${otp}

Review your consent form here: ${consentLink}

Steps:
1. Click the link above
2. Enter the OTP: ${otp}
3. Read all sections carefully
4. Complete the understanding quiz
5. Sign your digital consent

Thank you,
Medical Consent Team
`;

        const info = await transport.sendMail({
            from: '"Medical Consent System" <consent@poc-medical.com>',
            to: to,
            subject: subject,
            text: textBody,
            html: htmlBody
        });

        console.log('📧 Email sent:', info.messageId);

        // Preview URL for Ethereal (demo mode)
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('📧 Preview URL:', previewUrl);
        }

        return {
            success: true,
            messageId: info.messageId,
            previewUrl: previewUrl || null
        };

    } catch (error) {
        console.error('❌ Email failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}
