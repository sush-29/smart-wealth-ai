import { useEffect, useState } from "react";
import { sendBudgetAlert } from "../utils/emailAlerts";
import { supabase } from "../utils/supabaseClient";
import Header from "./Header";

export default function BudgetManagement() {
  const [budgets, setBudgets] = useState([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [showMonthlyBudgetModal, setShowMonthlyBudgetModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showDeleteBudgetModal, setShowDeleteBudgetModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [newBudget, setNewBudget] = useState({ category: "", amount: "" });
  const [editBudget, setEditBudget] = useState({ id: null, category: "", amount: "" });
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetchBudgets();
    fetchTransactionsAndBills();

    const transactionsSubscription = supabase
      .channel('transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchBudgets();
        fetchTransactionsAndBills();
      })
      .subscribe();

    const billsSubscription = supabase
      .channel('bills')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => {
        fetchBudgets();
        fetchTransactionsAndBills();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsSubscription);
      supabase.removeChannel(billsSubscription);
    };
  }, [selectedMonth]);

  const normalizeCategory = (category) => {
    return category ? category.trim().toLowerCase() : "other";
  };

  async function fetchBudgets() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }

      const [year, month] = selectedMonth.split("-");
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data: budgets, error: budgetError } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", selectedMonth);

      const { data: transactions, error: tError } = await supabase
        .from("transactions")
        .select("category, amount")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      const { data: bills, error: bError } = await supabase
        .from("bills")
        .select("category, total")
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      if (budgetError || tError || bError) {
        throw new Error("Failed to fetch budgets, transactions, or bills");
      }

      const normalizedBudgets = (budgets || []).map((budget) => {
        const spent = [
          ...(transactions || []).filter(t => normalizeCategory(t.category) === normalizeCategory(budget.category)).map(t => t.amount || 0),
          ...(bills || []).filter(b => normalizeCategory(b.category) === normalizeCategory(budget.category)).map(b => b.total || 0)
        ].reduce((sum, amount) => sum + amount, 0);

        return {
          ...budget,
          category: normalizeCategory(budget.category || "Other"),
          displayCategory: budget.category || "Other",
          spent,
        };
      }).sort((a, b) => a.displayCategory.localeCompare(b.displayCategory));

      setBudgets(normalizedBudgets);

      const { data: monthlyBudgetData, error: monthlyBudgetError } = await supabase
        .from("user_settings")
        .select("monthly_budget")
        .eq("user_id", user.id)
        .eq("month", selectedMonth);

      if (monthlyBudgetError) {
        console.error("Error fetching monthly budget:", monthlyBudgetError.message);
        setTotalBudget(0);
        setMonthlyBudgetInput("0");
      } else if (monthlyBudgetData.length === 0) {
        console.log("No monthly budget found for:", selectedMonth);
        setTotalBudget(0);
        setMonthlyBudgetInput("0");
      } else {
        console.log("Monthly budget data:", monthlyBudgetData);
        setTotalBudget(monthlyBudgetData[0].monthly_budget || 0);
        setMonthlyBudgetInput(monthlyBudgetData[0].monthly_budget.toString() || "0");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function fetchTransactionsAndBills() {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }

      const [year, month] = selectedMonth.split("-");
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data: transactions, error: tError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      const { data: bills, error: bError } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      if (tError || bError) {
        throw new Error("Failed to fetch transactions or bills");
      }

      const combinedData = [...(transactions || []), ...(bills || [])];
      updateTotalSpent(combinedData);
    } catch (err) {
      setError(err.message);
    }
  }

  const updateTotalSpent = (data) => {
    let total = 0;
    data.forEach((item) => {
      total += item.amount || item.total || 0;
    });
    setTotalSpent(total);
  };

  async function checkBudgetAlerts(category) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("User not authenticated for budget alert");
        return;
      }

      const { data: budget, error: budgetError } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("category", category)
        .eq("month", selectedMonth)
        .single();

      if (budgetError || !budget) {
        console.log(`No budget found for category: ${category} in month: ${selectedMonth}`);
        return;
      }

      const [year, month] = selectedMonth.split("-");
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data: transactions, error: tError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("category", category)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      const { data: bills, error: bError } = await supabase
        .from("bills")
        .select("total")
        .eq("category", category)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      if (tError || bError) {
        console.error("Failed to fetch transactions/bills for alert:", tError || bError);
        return;
      }

      const totalSpent = [
        ...(transactions || []).map(t => t.amount || 0),
        ...(bills || []).map(b => b.total || 0)
      ].reduce((sum, amount) => sum + amount, 0);

      const percentage = (totalSpent / budget.amount) * 100;
      console.log(`Checking alert for ${category}: Spent $${totalSpent.toFixed(2)} of $${budget.amount.toFixed(2)} (${percentage.toFixed(1)}%)`);

      if (percentage >= 80 && percentage < 100) {
        console.log(`Triggering 80% alert for ${category}`);
        const sent = await sendBudgetAlert(user.id, category);
        if (sent) {
          setSuccess(`Budget alert sent for ${category} (80% reached)`);
        } else {
          console.error(`Failed to send 80% alert for ${category}`);
        }
      } else if (percentage >= 100) {
        console.log(`Triggering 100% alert for ${category}`);
        const sent = await sendBudgetAlert(user.id, category);
        if (sent) {
          setSuccess(`Budget alert sent for ${category} (100% exceeded)`);
        } else {
          console.error(`Failed to send 100% alert for ${category}`);
        }
      }
    } catch (error) {
      console.error("Error checking budget alerts:", error);
      setError("Failed to check budget alerts");
    }
  }

  async function updateMonthlyBudget() {
  try {
    const amount = parseFloat(monthlyBudgetInput);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Please enter a valid amount");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    console.log("Saving monthly budget for user ID:", user.id, "Month:", selectedMonth, "Amount:", amount);

    // Check if a record already exists for this user and month
    const { data: existingRecord, error: fetchError } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", selectedMonth)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Error checking existing record:", fetchError.message);
      throw new Error("Failed to check existing budget: " + fetchError.message);
    }

    let operationResult;
    if (!existingRecord) {
      // Insert new record if none exists
      console.log("Inserting new monthly budget for month:", selectedMonth);
      operationResult = await supabase
        .from("user_settings")
        .insert({
          user_id: user.id,
          month: selectedMonth,
          monthly_budget: amount,
        });
    } else {
      // Update existing record if it exists
      console.log("Updating existing monthly budget for month:", selectedMonth);
      operationResult = await supabase
        .from("user_settings")
        .update({
          monthly_budget: amount,
        })
        .eq("user_id", user.id)
        .eq("month", selectedMonth);
    }

    if (operationResult.error) {
      console.error("Error saving monthly budget:", operationResult.error.message);
      throw new Error("Failed to update monthly budget: " + operationResult.error.message);
    }

    setShowMonthlyBudgetModal(false);
    setSuccess("Monthly budget updated successfully!");
    setError("");
    await fetchBudgets();
  } catch (err) {
    console.error("Error in updateMonthlyBudget:", err.message);
    setError(err.message || "Failed to update monthly budget");
    setSuccess("");
  }
}
  async function handleBudgetSubmit(e) {
    e.preventDefault();
    try {
      if (!newBudget.category || !newBudget.amount) {
        throw new Error("Please fill in all required fields");
      }

      const amount = parseFloat(newBudget.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.from("budgets").insert([
        {
          category: newBudget.category,
          amount: amount,
          user_id: user.id,
          spent: 0,
          month: selectedMonth,
        },
      ]);

      if (error) {
        throw error;
      }

      setNewBudget({ category: "", amount: "" });
      await fetchBudgets();
      setSuccess("Budget added successfully!");
      checkBudgetAlerts(newBudget.category);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to add budget");
    }
  }

  async function handleEditBudgetSubmit(e) {
    e.preventDefault();
    try {
      if (!editBudget.category || !editBudget.amount) {
        throw new Error("Please fill in all required fields");
      }

      const amount = parseFloat(editBudget.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("budgets")
        .update({
          category: editBudget.category,
          amount: amount,
          month: selectedMonth,
        })
        .eq("id", editBudget.id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setShowEditBudgetModal(false);
      setEditBudget({ id: null, category: "", amount: "" });
      await fetchBudgets();
      setSuccess("Budget updated successfully!");
      checkBudgetAlerts(editBudget.category);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to update budget");
    }
  }

  async function deleteBudget() {
    try {
      if (!selectedBudget) {
        throw new Error("No budget selected for deletion");
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", selectedBudget.id)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setBudgets((prev) => prev.filter((b) => b.id !== selectedBudget.id));
      setShowDeleteBudgetModal(false);
      setSelectedBudget(null);
      setSuccess("Budget deleted successfully!");
      setError("");
      await fetchBudgets();
    } catch (err) {
      setError(err.message || "Failed to delete budget");
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Budget Management</h2>
            <div className="flex space-x-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setShowMonthlyBudgetModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Set Monthly Budget
              </button>
            </div>
          </div>
          <div className="flex justify-between mb-6">
            <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm font-medium">
              <span className="mr-1">Total Budget:</span>
              <span className="font-bold">${totalBudget.toFixed(2)}</span>
            </div>
            <div className="bg-green-100 text-green-600 px-3 py-1 rounded-lg text-sm font-medium">
              <span className="mr-1">Remaining:</span>
              <span className="font-bold">${(totalBudget - totalSpent).toFixed(2)}</span>
            </div>
          </div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Current Budgets</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {budgets.length > 0 ? (
                budgets.map((budget) => (
                  <div
                    key={budget.id}
                    className="p-4 bg-gray-50 rounded-lg hover:shadow-md"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="font-semibold text-lg">{budget.displayCategory}</p>
                        <p className="text-sm text-gray-600">
                          Spent: ${(budget.spent || 0).toFixed(2)} of ${budget.amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditBudget({
                              id: budget.id,
                              category: budget.displayCategory,
                              amount: budget.amount.toString(),
                            });
                            setShowEditBudgetModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit budget"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBudget(budget);
                            setShowDeleteBudgetModal(true);
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Delete budget"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4M9 7v12m6-12v12M3 7h18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          ((budget.spent || 0) / budget.amount) * 100 >= 80
                            ? "bg-red-500"
                            : ((budget.spent || 0) / budget.amount) * 100 >= 60
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(((budget.spent || 0) / budget.amount) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span>{(((budget.spent || 0) / budget.amount) * 100).toFixed(1)}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No budgets found for this month. Add a budget to get started.</p>
                </div>
              )}
            </div>
          </div>
          <div id="budget-form">
            <h3 className="text-lg font-semibold mb-3">Add New Budget for {selectedMonth}</h3>
            <form onSubmit={handleBudgetSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
              )}
              {success && (
                <div className="p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Add Budget
              </button>
            </form>
          </div>
        </div>

        {showMonthlyBudgetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Set Monthly Budget for {selectedMonth}</h3>
                <button
                  onClick={() => setShowMonthlyBudgetModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
                )}
                {success && (
                  <div className="p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Monthly Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyBudgetInput}
                    onChange={(e) => setMonthlyBudgetInput(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowMonthlyBudgetModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateMonthlyBudget}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEditBudgetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Budget</h3>
                <button
                  onClick={() => setShowEditBudgetModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEditBudgetSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
                )}
                {success && (
                  <div className="p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    value={editBudget.category}
                    onChange={(e) => setEditBudget({ ...editBudget, category: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editBudget.amount}
                    onChange={(e) => setEditBudget({ ...editBudget, amount: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditBudgetModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteBudgetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Are you sure you want to delete this budget?</h3>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteBudgetModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteBudget}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}