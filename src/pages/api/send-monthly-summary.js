import sendEmail from "../../utils/emailSender";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      email,
      currentMonth,
      previousMonth,
      currentMonthTotal,
      previousMonthTotal,
      spendingByCategory,
      savings,
      totalSavings,
      totalBudget,
      hasSavings,
    } = req.body;

    const percentageChange =
      previousMonthTotal > 0
        ? (((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100).toFixed(1)
        : 0;

    let htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h1 style="color: #4f46e5; text-align: center;">Monthly Financial Summary</h1>
        <p style="text-align: center;">Here's your spending overview for ${currentMonth}</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Total Spending</h2>
          <p><strong>Total Budget:</strong> $${totalBudget.toFixed(2)}</p>
          <p><strong>This month:</strong> $${currentMonthTotal.toFixed(2)}</p>
          <p><strong>Last month (${previousMonth}):</strong> $${previousMonthTotal.toFixed(2)}</p>
          <p><strong>Change:</strong> <span style="color: ${percentageChange >= 0 ? "#ef4444" : "#10b981"}">${percentageChange >= 0 ? "+" : ""}${percentageChange}%</span></p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Spending by Category</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <th style="text-align: left; padding: 8px 0;">Category</th>
                <th style="text-align: right; padding: 8px 0;">Amount</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (const [category, amount] of Object.entries(spendingByCategory)) {
      htmlContent += `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0;">${category}</td>
                <td style="text-align: right; padding: 8px 0;">$${amount.toFixed(2)}</td>
              </tr>
      `;
    }

    htmlContent += `
            </tbody>
          </table>
        </div>
    `;

    if (hasSavings) {
      htmlContent += `
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin-top: 0;">Savings Achieved!</h2>
          <p style="color: #10b981; font-weight: bold;">You saved $${totalSavings.toFixed(2)} this month!</p>
          <p>Categories where you stayed under budget:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <th style="text-align: left; padding: 8px 0;">Category</th>
                <th style="text-align: right; padding: 8px 0;">Savings</th>
              </tr>
            </thead>
            <tbody>
      `;

      for (const [category, amount] of Object.entries(savings)) {
        htmlContent += `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px 0;">${category}</td>
                <td style="text-align: right; padding: 8px 0; color: #10b981;">$${amount.toFixed(2)} under budget</td>
              </tr>
        `;
      }

      htmlContent += `
            </tbody>
          </table>
        </div>
      `;
    }

    htmlContent += `
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
          <p>Thank you for using SmartWealth Finance!</p>
          <p>You can view your full dashboard at <a href="${process.env.NEXT_PUBLIC_SITE_URL}" style="color: #4f46e5;">${process.env.NEXT_PUBLIC_SITE_URL}</a></p>
        </div>
      </div>
    `;

    const success = await sendEmail({
      to: email,
      subject: `Your Monthly Financial Summary - ${currentMonth}`,
      html: htmlContent,
    });

    if (success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: "Failed to send email" });
    }
  } catch (error) {
    console.error("Error sending monthly summary:", error);
    return res.status(500).json({ error: error.message });
  }
}