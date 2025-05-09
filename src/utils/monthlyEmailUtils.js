import { supabase } from "./supabaseClient";

export async function sendMonthlySummary(userId) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError);
      return false;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
    const previousMonthStr = `${previousYear}-${String(previousMonth).padStart(2, "0")}`;

    const currentMonthStart = `${currentYear}-${currentMonth.toString().padStart(2, "0")}-01`;
    const nextMonthStart = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];
    const previousMonthStart = `${previousYear}-${previousMonth.toString().padStart(2, "0")}-01`;
    const previousNextMonthStart = new Date(previousYear, previousMonth, 1).toISOString().split("T")[0];

    const { data: currentMonthTransactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", currentMonthStart)
      .lt("date", nextMonthStart);

    const { data: currentMonthBills } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", userId)
      .gte("date", currentMonthStart)
      .lt("date", nextMonthStart);

    const { data: previousMonthTransactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", previousMonthStart)
      .lt("date", previousNextMonthStart);

    const { data: previousMonthBills } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", userId)
      .gte("date", previousMonthStart)
      .lt("date", previousNextMonthStart);

    const currentMonthTotal = [
      ...(currentMonthTransactions || []).map(t => t.amount || 0),
      ...(currentMonthBills || []).map(b => b.total || 0)
    ].reduce((sum, amount) => sum + amount, 0);

    const previousMonthTotal = [
      ...(previousMonthTransactions || []).map(t => t.amount || 0),
      ...(previousMonthBills || []).map(b => b.total || 0)
    ].reduce((sum, amount) => sum + amount, 0);

    const { data: currentBudgets } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("month", currentMonthStr);

    const totalBudget = (currentBudgets || []).reduce((sum, budget) => sum + (budget.amount || 0), 0);

    const spendingByCategory = {};
    [...(currentMonthTransactions || []), ...(currentMonthBills || [])].forEach((item) => {
      const category = item.category || "Other";
      if (!spendingByCategory[category]) {
        spendingByCategory[category] = 0;
      }
      spendingByCategory[category] += item.amount || item.total || 0;
    });

    const savings = {};
    (currentBudgets || []).forEach((budget) => {
      const spent = spendingByCategory[budget.category] || 0;
      if (spent < budget.amount) {
        savings[budget.category] = budget.amount - spent;
      }
    });

    const totalSavings = Object.values(savings).reduce((sum, amount) => sum + amount, 0);

    const emailData = {
      email: user.email,
      currentMonth: `${currentMonth}/${currentYear}`,
      previousMonth: `${previousMonth}/${previousYear}`,
      currentMonthTotal,
      previousMonthTotal,
      spendingByCategory,
      savings,
      totalSavings,
      totalBudget,
      hasSavings: totalSavings > 0,
    };

    const response = await fetch(`${window.location.origin}/api/send-monthly-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error:", response.status, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in sendMonthlySummary:", error);
    return false;
  }
}