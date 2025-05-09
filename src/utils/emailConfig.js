// utils/emailConfig.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// More detailed verification
transporter.verify((error) => {
  if (error) {
    console.error("Error with email configuration:", {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw new Error("Email configuration failed");
  } else {
    console.log("Email server is ready to send messages");
    console.log("Using email:", process.env.EMAIL_USER);
  }
});

export default transporter;
