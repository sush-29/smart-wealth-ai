import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  console.log("Incoming alert request:", req.body); // Debug log

  const { email, category, spent, budget, percentage } = req.body;

  // 1. Validate input
  if (!email || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // 2. Configure transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // App password
    },
  });

  // 3. Send email
  try {
    const info = await transporter.sendMail({
      from: `Budget Alerts <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `[ACTION] Budget Alert: ${category}`,
      text: `You've spent ${percentage}% ($${spent}) of your $${budget} ${category} budget.`,
      html: `
        <h2>Budget Limit Reached</h2>
        <p>Category: <strong>${category}</strong></p>
        <p>Spent: <strong>$${spent} (${percentage}%)</strong></p>
        <p>Budget: <strong>$${budget}</strong></p>
        <p>Please review your expenses.</p>
      `,
    });

    console.log("Email sent:", info.messageId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email failed:", error);
    return res.status(500).json({
      error: "Failed to send email",
      details: error.message,
    });
  }
}
