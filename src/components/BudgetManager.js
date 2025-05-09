import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";

export default function BudgetManager() {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [email, setEmail] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [budgets, setBudgets] = useState([]);

  useEffect(() => {
    fetchBudgets();
    fetchUserEmail();
  }, []);

  const fetchUserEmail = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) setEmail(user.email);
  };

  const fetchBudgets = async () => {
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

    if (error) console.error("Error fetching budgets:", error);
    else setBudgets(data || []);
  };

  // const addBudget = async () => {
  //   const { data: { user } } = await supabase.auth.getUser();
  //   const { data, error } = await supabase
  //     .from('budgets')
  //     .insert([{
  //       user_id: user.id,
  //       category,
  //       amount,
  //       alert_threshold: alertThreshold,
  //       notification_email: email,
  //       spent: 0
  //     }]);

  //   if (error) {
  //     console.error('Error adding budget:', error);
  //   } else {
  //     console.log('Budget added:', data);
  //     fetchBudgets();
  //     setCategory('');
  //     setAmount(0);
  //   }
  // };

  // In BudgetManager.js
  const addBudget = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Always use user's email as fallback
    const notificationEmail = email || user.email;

    const { error } = await supabase.from("budgets").insert([
      {
        user_id: user.id,
        category,
        amount,
        alert_threshold: alertThreshold,
        notification_email: notificationEmail, // Ensures email is always set
        spent: 0,
      },
    ]);

    if (error) {
      console.error("Error adding budget:", error);
    } else {
      fetchBudgets();
      setCategory("");
      setAmount(0);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Budget Manager</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Groceries"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Monthly Budget Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Alert Threshold (%)
          </label>
          <input
            type="number"
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            min="1"
            max="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notification Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={addBudget}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add Budget
        </button>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Current Budgets</h3>
        <div className="space-y-3">
          {budgets.map((budget) => (
            <div key={budget.id} className="p-3 border rounded-md">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{budget.category}</p>
                  <p className="text-sm text-gray-600">
                    Budget: ${budget.amount} | Spent: ${budget.spent || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Alert at: {budget.alert_threshold}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
