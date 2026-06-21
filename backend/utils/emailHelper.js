import nodemailer from "nodemailer";

/**
 * Sends an email with the verification OTP.
 * Falls back to logging to console if OAuth2 SMTP credentials are not configured.
 * @param {string} email - Recipient email address
 * @param {string} otp - The 6-digit OTP code
 */
export const sendOTPEmail = async (email, otp) => {
  const emailUser = process.env.EMAIL_USER;
  const clientId = process.env.GOOGLE_CLINT_ID;
  const clientSecret = process.env.GOOGLE_CLINT_SECRATE_ID;
  const refreshToken = process.env.GOOGLE_REFRESS_TOKEN;

  if (!emailUser || !clientId || !clientSecret || !refreshToken) {
    console.log("\n==============================================");
    console.log(`📧 [EMAIL MOCK / LOCAL DEV]`);
    console.log(`OAuth2 environment variables (EMAIL_USER, GOOGLE_CLINT_ID, etc.) not fully set.`);
    console.log(`Recipient: ${email}`);
    console.log(`Your Aahaar Verification OTP is: ${otp}`);
    console.log("==============================================\n");
    return true; // Bypass email send in local development without breaking flow
  }

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
    });

    const mailOptions = {
      from: `"Aahaar Verification" <${emailUser}>`,
      to: email,
      subject: "Aahaar Account Verification OTP",
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
    console.log(`[SMTP] Verification email sent successfully to ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[SMTP ERROR] Failed to send email to ${email} using OAuth2:`, error);
    // Return false to let caller know
    return false;
  }
};
