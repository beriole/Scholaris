import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // false car port 587 (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

/**
 * Envoie un code OTP par e-mail
 */
export const sendOTP = async (to: string, otpCode: string, name: string = '') => {
    const mailOptions = {
        from: `"${process.env.EMAIL_SENDER_NAME}" <${process.env.EMAIL_USER}>`,
        replyTo: process.env.EMAIL_REPLY_TO,
        to,
        subject: `Votre code sécurité - ${process.env.COMPANY_NAME}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4A90E2;">Récupération de mot de passe</h2>
        <p>Bonjour ${name},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe pour accéder à <strong>${process.env.COMPANY_NAME}</strong>.</p>
        <p>Voici votre code de sécurité à usage unique (valable 15 minutes) :</p>
        
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otpCode}</span>
        </div>
        
        <p>Si vous n'avez pas effectué cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
        <br />
        <p>Cordialement,<br />L'équipe ${process.env.COMPANY_NAME}<br />
        <small style="color: #999;">${process.env.COMPANY_ADDRESS}</small></p>
      </div>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email OTP envoyé: %s", info.messageId);
        return true;
    } catch (error) {
        console.error("Erreur d'envoi de l'email OTP :", error);
        return false;
    }
};
