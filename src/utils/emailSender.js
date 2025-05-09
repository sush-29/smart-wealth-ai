// utils/emailSender.js
import transporter from "./emailConfig";

export default async function sendEmail({ to, subject, html, text }) {
  // Remove NEXT_PUBLIC_ prefix from the check
  if (process.env.EMAIL_ENABLED !== "true") {
    console.log("Email sending is disabled - EMAIL_ENABLED is not true");
    return false;
  }

  try {
    const mailOptions = {
      from: `"SmartWealth Finance" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html: html || text,
      text: text || (html ? html.replace(/<[^>]*>/g, "") : ""),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
