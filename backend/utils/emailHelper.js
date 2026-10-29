import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

/**
 * Sends an email with the verification OTP.
 * Falls back to logging to console if OAuth2 SMTP credentials are not configured.
 * @param {string} email - Recipient email address
 * @param {string} otp - The 6-digit OTP code
 */
export const sendOTPEmail = async (email, otp) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailUser = process.env.EMAIL_USER;
  const rawEmailPass = process.env.EMAIL_PASS;
  const emailPass = rawEmailPass ? rawEmailPass.replace(/\s+/g, '') : '';
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLINT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLINT_SECRATE_ID;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESS_TOKEN;

  // 1. Brevo (Sendinblue) HTTP API - Free 300 emails/day to ANY email address without domain lock!
  if (brevoApiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          sender: { name: 'Aahaar Verification', email: emailUser || 'santoshpatelvns5@gmail.com' },
          to: [{ email: email }],
          subject: `🌾 Aahaar Verification OTP: ${otp}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <h2 style="color: #f97316; text-align: center; margin-bottom: 24px;">🌾 Aahaar Account Verification</h2>
              <p>Hello,</p>
              <p>Thank you for joining Aahaar. To complete your registration, please verify your email address using the following One-Time Password (OTP):</p>
              <div style="background-color: #fff7ed; border: 1px dashed #f97316; padding: 15px; text-align: center; margin: 24px 0; border-radius: 8px;">
                <span style="font-size: 28px; font-weight: bold; color: #f97316; letter-spacing: 6px;">${otp}</span>
              </div>
              <p>This OTP is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
              <p style="color: #888888; font-size: 12px; text-align: center; line-height: 1.5;">
                Aahaar Initiative — Fighting hunger, sharing hope. One meal at a time.
              </p>
            </div>
          `
        })
      });

      if (response.ok) {
        const resData = await response.json();
        console.log(`[BREVO API] Verification email sent instantly to ${email}. ID: ${resData.messageId}`);
        return { success: true, liveDelivered: true, provider: 'brevo', otp };
      } else {
        const errText = await response.text();
        console.warn(`[BREVO API] Skipped for ${email} (IP or quota check required)`);
      }
    } catch (brevoErr) {
      console.warn(`[BREVO API] Skipped for ${email}:`, brevoErr.message);
    }
  }

  // 2. SendGrid HTTP API - Free 100 emails/day to ANY recipient
  if (sendgridApiKey) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          personalizations: [{ to: [{ email: email }] }],
          from: { email: emailUser || 'santoshpatelvns5@gmail.com', name: 'Aahaar Verification' },
          subject: `🌾 Aahaar Verification OTP: ${otp}`,
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #f97316; text-align: center; margin-bottom: 24px;">🌾 Aahaar Account Verification</h2>
                <p>Hello,</p>
                <p>Thank you for joining Aahaar. To complete your registration, please verify your email address using the following One-Time Password (OTP):</p>
                <div style="background-color: #fff7ed; border: 1px dashed #f97316; padding: 15px; text-align: center; margin: 24px 0; border-radius: 8px;">
                  <span style="font-size: 28px; font-weight: bold; color: #f97316; letter-spacing: 6px;">${otp}</span>
                </div>
                <p>This OTP is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
                <p style="color: #888888; font-size: 12px; text-align: center; line-height: 1.5;">
                  Aahaar Initiative — Fighting hunger, sharing hope. One meal at a time.
                </p>
              </div>
            `
          }]
        })
      });

      if (response.ok || response.status === 202) {
        console.log(`[SENDGRID API] Verification email sent instantly to ${email}`);
        return { success: true, liveDelivered: true, provider: 'sendgrid', otp };
      } else {
        const errText = await response.text();
        console.warn(`[SENDGRID API] Skipped for ${email}`);
      }
    } catch (sgErr) {
      console.warn(`[SENDGRID API] Skipped for ${email}:`, sgErr.message);
    }
  }

  // 3. HTTP API (Resend) - Best for Cloud Servers like Render (Port 443 HTTPS, Never Blocked)
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3500),
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'Aahaar Verification <onboarding@resend.dev>',
          to: [email],
          subject: `🌾 Aahaar Verification OTP: ${otp}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
              <h2 style="color: #f97316; text-align: center; margin-bottom: 24px;">🌾 Aahaar Account Verification</h2>
              <p>Hello,</p>
              <p>Thank you for joining Aahaar. To complete your registration, please verify your email address using the following One-Time Password (OTP):</p>
              <div style="background-color: #fff7ed; border: 1px dashed #f97316; padding: 15px; text-align: center; margin: 24px 0; border-radius: 8px;">
                <span style="font-size: 28px; font-weight: bold; color: #f97316; letter-spacing: 6px;">${otp}</span>
              </div>
              <p>This OTP is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
              <p style="color: #888888; font-size: 12px; text-align: center; line-height: 1.5;">
                Aahaar Initiative — Fighting hunger, sharing hope. One meal at a time.
              </p>
            </div>
          `
        })
      });

      if (response.ok) {
        const resData = await response.json();
        console.log(`[RESEND API] Verification email sent instantly to ${email}. ID: ${resData.id}`);
        return { success: true, liveDelivered: true, provider: 'resend', otp };
      } else {
        const errText = await response.text();
        console.warn(`[RESEND API] Skipped for ${email} (test sandbox restriction: only owner email is allowed in free tier)`);
      }
    } catch (resendErr) {
      console.warn(`[RESEND API] Skipped for ${email}:`, resendErr.message);
    }
  }

  const hasOAuth2 = emailUser && clientId && clientSecret && refreshToken;
  const hasAppPassword = emailUser && emailPass;

  // Try App Password first if available
  if (hasAppPassword) {
    // Attempt 1: Port 465 Direct SSL
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: emailPass
        },
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 4000,
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: `"Aahaar Verification" <${emailUser}>`,
        to: email,
        subject: `🌾 Aahaar Verification OTP: ${otp}`,
        headers: {
          "X-Priority": "1 (Highest)",
          "X-MSMail-Priority": "High",
          "Importance": "High"
        },
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #f97316; text-align: center; margin-bottom: 24px;">🌾 Aahaar Account Verification</h2>
            <p>Hello,</p>
            <p>Thank you for joining Aahaar. To complete your registration, please verify your email address using the following One-Time Password (OTP):</p>
            <div style="background-color: #fff7ed; border: 1px dashed #f97316; padding: 15px; text-align: center; margin: 24px 0; border-radius: 8px;">
              <span style="font-size: 28px; font-weight: bold; color: #f97316; letter-spacing: 6px;">${otp}</span>
            </div>
            <p>This OTP is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
            <p style="color: #888888; font-size: 12px; text-align: center; line-height: 1.5;">
              Aahaar Initiative — Fighting hunger, sharing hope. One meal at a time.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP Port 465] Verification email sent successfully to ${email}. MessageId: ${info.messageId}`);
      return { success: true, liveDelivered: true, provider: 'smtp-465', otp };
    } catch (appPass465Err) {
      console.warn(`[SMTP Port 465] Skipped for ${email}:`, appPass465Err.message);
    }

    // Attempt 2: Service 'gmail' (Port 587)
    try {
      const transporter587 = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        },
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 4000
      });
      const mailOptions587 = {
        from: `"Aahaar Verification" <${emailUser}>`,
        to: email,
        subject: `🌾 Aahaar Verification OTP: ${otp}`,
        headers: {
          "X-Priority": "1 (Highest)",
          "X-MSMail-Priority": "High",
          "Importance": "High"
        },
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #f97316; text-align: center; margin-bottom: 24px;">🌾 Aahaar Account Verification</h2>
            <p>Hello,</p>
            <p>Thank you for joining Aahaar. To complete your registration, please verify your email address using the following One-Time Password (OTP):</p>
            <div style="background-color: #fff7ed; border: 1px dashed #f97316; padding: 15px; text-align: center; margin: 24px 0; border-radius: 8px;">
              <span style="font-size: 28px; font-weight: bold; color: #f97316; letter-spacing: 6px;">${otp}</span>
            </div>
            <p>This OTP is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
            <p style="color: #888888; font-size: 12px; text-align: center; line-height: 1.5;">
              Aahaar Initiative — Fighting hunger, sharing hope. One meal at a time.
            </p>
          </div>
        `,
      };
      const info587 = await transporter587.sendMail(mailOptions587);
      console.log(`[SMTP Port 587] Verification email sent successfully to ${email}. MessageId: ${info587.messageId}`);
      return { success: true, liveDelivered: true, provider: 'smtp-587', otp };
    } catch (appPass587Err) {
      console.warn(`[SMTP Port 587] Skipped for ${email}:`, appPass587Err.message);
    }
  }

  // OAuth2 fallback or primary if no App Password
  if (hasOAuth2) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: emailUser,
          clientId: clientId,
          clientSecret: clientSecret,
          refreshToken: refreshToken,
        },
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 4000
      });

      const mailOptions = {
        from: `"Aahaar Verification" <${emailUser}>`,
        to: email,
        subject: `🌾 Aahaar Verification OTP: ${otp}`,
        headers: {
          "X-Priority": "1 (Highest)",
          "X-MSMail-Priority": "High",
          "Importance": "High"
        },
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <h2 style="color: #f97316; text-align: center; margin-bottom: 24px;">🌾 Aahaar Account Verification</h2>
            <p>Hello,</p>
            <p>Thank you for joining Aahaar. To complete your registration, please verify your email address using the following One-Time Password (OTP):</p>
            <div style="background-color: #fff7ed; border: 1px dashed #f97316; padding: 15px; text-align: center; margin: 24px 0; border-radius: 8px;">
              <span style="font-size: 28px; font-weight: bold; color: #f97316; letter-spacing: 6px;">${otp}</span>
            </div>
            <p>This OTP is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
            <p style="color: #888888; font-size: 12px; text-align: center; line-height: 1.5;">
              Aahaar Initiative — Fighting hunger, sharing hope. One meal at a time.
            </p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[SMTP OAuth2] Verification email sent successfully to ${email}. MessageId: ${info.messageId}`);
      return { success: true, liveDelivered: true, provider: 'oauth2', otp };
    } catch (oauthErr) {
      console.warn(`[SMTP OAuth2] Skipped for ${email}:`, oauthErr.message);
    }
  }

  // Graceful Fallback: External email providers failed, IP-blocked, or sandbox-restricted.
  // We log the OTP prominently and return it so registration flow is never blocked.
  console.log("\n==============================================================");
  console.log(`🔑 [AAHAAR OTP DISPATCH - DEVELOPMENT / FALLBACK ACTIVE]`);
  console.log(`Recipient: ${email}`);
  console.log(`Verification OTP: ${otp} (Valid for 5 minutes)`);
  console.log(`Note: Live delivery failed or restricted by email provider.`);
  console.log("==============================================================\n");

  return {
    success: true,
    liveDelivered: false,
    provider: "fallback",
    otp,
  };
};

/**
 * Sends a donation receipt with a PDF attachment.
 * @param {string} email - Recipient email address
 * @param {Buffer} pdfBuffer - The PDF data
 * @param {string} receiptNo - The receipt number (e.g. AHR-XXXXXX)
 */
export const sendDonationReceiptEmail = async (email, pdfBuffer, receiptNo, guidePdfBuffer) => {
  const emailUser = process.env.EMAIL_USER;
  const rawEmailPass = process.env.EMAIL_PASS;
  const emailPass = rawEmailPass ? rawEmailPass.replace(/\s+/g, '') : '';
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLINT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLINT_SECRATE_ID;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESS_TOKEN;

  const hasOAuth2 = emailUser && clientId && clientSecret && refreshToken;
  const hasAppPassword = emailUser && emailPass;

  if (!hasOAuth2 && !hasAppPassword) {
    // Local dev file saving fallback
    try {
      const receiptsDir = path.join(path.resolve(), 'uploads', 'receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }
      const localFilePath = path.join(receiptsDir, `Donation_Receipt_${receiptNo}.pdf`);
      fs.writeFileSync(localFilePath, pdfBuffer);

      if (guidePdfBuffer) {
        const localGuidePath = path.join(receiptsDir, `Aahaar_Section_80G_Tax_Exemption_Guide.pdf`);
        fs.writeFileSync(localGuidePath, guidePdfBuffer);
      }

      console.log("\n==============================================");
      console.log(`📧 [EMAIL MOCK / LOCAL DEV]`);
      console.log(`Email credentials not configured.`);
      console.log(`Saved receipt PDF locally to: ${localFilePath}`);
      if (guidePdfBuffer) {
        console.log(`Saved tax guide PDF locally to: ${path.join(receiptsDir, 'Aahaar_Section_80G_Tax_Exemption_Guide.pdf')}`);
      }
      console.log(`Recipient: ${email}`);
      console.log("==============================================\n");
    } catch (fsErr) {
      console.error("[LOCAL DEV ERROR] Failed to save receipt PDF locally:", fsErr);
    }
    return true;
  }

  try {
    const transporter = nodemailer.createTransport(
      hasAppPassword ? {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: emailPass
        },
        tls: {
          rejectUnauthorized: false
        }
      } : {
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: emailUser,
          clientId: clientId,
          clientSecret: clientSecret,
          refreshToken: refreshToken,
        },
      }
    );

    const mailOptions = {
      from: `"Aahaar Initiative" <${emailUser}>`,
      to: email,
      subject: `🌾 Aahaar Donation Receipt: ${receiptNo}`,
      text: `Hello, thank you for your generous donation. Please find your official Section 80G tax exemption receipt and Tax Exemption Guide attached to this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fafafa;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 40px;">🌾</span>
            <h2 style="color: #f97316; margin: 10px 0 0; font-size: 24px; font-weight: 800;">Thank You for Your Generous Donation!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 4px 0 0;">Your contribution changes lives</p>
          </div>
          
          <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
            <p style="margin-top: 0; color: #334155; font-size: 15px; line-height: 1.6;">Hello,</p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
              We are incredibly grateful for your donation to <strong>Aahaar</strong>. Your contribution has been verified, matched, and safely delivered to our NGO partner.
            </p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
              By redirecting this surplus food, you have fed hungry families and helped protect the environment by reducing landfill methane emissions.
            </p>
            
            <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid #f97316; border-radius: 4px;">
              <h4 style="margin: 0 0 8px; color: #1e293b; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Attached Documents</h4>
              <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13.5px; line-height: 1.5;">
                <li><strong>Donation Receipt (${receiptNo})</strong>: Your official certificate and Section 80G tax receipt.</li>
                <li><strong>Tax Exemption Guide</strong>: A guide outlining how to claim your 50% tax deduction under Section 80G in your ITR.</li>
              </ul>
            </div>
          </div>
          
          <div style="text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
            <p style="margin-bottom: 4px;">Aahaar Initiative — Fighting hunger, sharing hope. One meal at a time.</p>
            <p style="margin-top: 0;">© 2026 Aahaar. All rights reserved.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Donation_Receipt_${receiptNo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
        ...(guidePdfBuffer ? [{
          filename: `Aahaar_Section_80G_Tax_Exemption_Guide.pdf`,
          content: guidePdfBuffer,
          contentType: 'application/pdf',
        }] : [])
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Donation receipt ${receiptNo} emailed to ${email}`);
    return true;
  } catch (error) {
    console.error(`[SMTP ERROR] Failed to email receipt ${receiptNo}:`, error);
    return false;
  }
};
