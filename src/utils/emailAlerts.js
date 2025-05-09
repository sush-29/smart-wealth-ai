import { supabase } from "./supabaseClient";

export async function sendBudgetAlert(userId, category, selectedMonth = null) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return false;
    }

    const targetMonth = selectedMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const [year, month] = targetMonth.split("-");
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data: budget, error: budgetError } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("month", targetMonth)
      .single();

    if (budgetError || !budget) {
      console.error(`No budget found for category: ${category} in month: ${targetMonth}`, budgetError);
      return false;
    }

    const { data: transactions, error: transactionsError } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("category", category)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString());

    const { data: bills, error: billsError } = await supabase
      .from("bills")
      .select("total")
      .eq("category", category)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString());

    if (transactionsError || billsError) {
      console.error("Failed to fetch transactions/bills:", transactionsError || billsError);
      return false;
    }

    const totalSpent = [
      ...(transactions || []).map(t => t.amount || 0),
      ...(bills || []).map(b => b.total || 0)
    ].reduce((sum, amount) => sum + amount, 0);

    const percentage = (totalSpent / budget.amount) * 100;

    const recipientEmail = user.email;
    if (!recipientEmail) {
      console.error("No email address available for alert");
      return false;
    }

    const apiUrl = `${window.location.origin}/api/send-alert`;
    console.log("Sending alert to:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: recipientEmail,
        category,
        spent: totalSpent,
        budget: budget.amount,
        percentage: percentage.toFixed(1),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error:", response.status, errorData);
      return false;
    }

    console.log(`Budget alert sent for ${category}: ${percentage.toFixed(1)}%`);
    return true;
  } catch (error) {
    console.error("Unexpected error in sendBudgetAlert:", error);
    return false;
  }
}