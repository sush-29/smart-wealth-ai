import "chart.js/auto";
import { useEffect, useState } from "react";
import { sendBudgetAlert } from "../utils/emailAlerts";
import { sendMonthlySummary } from "../utils/monthlyEmailUtils";
import { supabase } from "../utils/supabaseClient";
import BillUpload from "./BillUpload";
import Header from "./Header";

export default function Dashboard() {
  const [userId, setUserId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [showManualExpenseModal, setShowManualExpenseModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [editExpense, setEditExpense] = useState({
    id: null,
    table: "",
    category: "",
    amount: "",
    date: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // e.g., "2025-05"
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("User not authenticated. Please log in.");
        console.error("Auth error:", authError?.message);
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return;
      }

      setUserId(user.id);
      console.log("Authenticated user ID set:", user.id);

      await fetchUserSettings();

      const [year, month] = selectedMonth.split("-");
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      if (transactionsError) {
        setError("Failed to fetch transactions");
        return;
      }
      if (billsError) {
        setError("Failed to fetch bills");
        return;
      }

      const sortedTransactions = (transactionsData || []).sort((a, b) => {
        const dateA = new Date(a.date || a.created_at || new Date());
        const dateB = new Date(b.date || b.created_at || new Date());
        return dateB - dateA;
      });
      const sortedBills = (billsData || []).sort((a, b) => {
        const dateA = new Date(a.date || a.created_at || new Date());
        const dateB = new Date(b.date || b.created_at || new Date());
        return dateB - dateA;
      });

      setTransactions(sortedTransactions);
      setBills(sortedBills);
      updateTotalSpent([...sortedTransactions, ...sortedBills]);
    };

    fetchInitialData();

    const billsSubscription = supabase
      .channel("bills")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bills", filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log("New bill received via subscription:", payload.new);
          setBills((prev) => {
            const updatedBills = [...prev, payload.new].sort((a, b) => {
              const dateA = new Date(a.date || a.created_at || new Date());
              const dateB = new Date(b.date || b.created_at || new Date());
              return dateB - dateA;
            });
            updateTotalSpent([...transactions, ...updatedBills]);
            checkBudgetAlerts(payload.new.category);
            return updatedBills;
          });
        }
      )
      .subscribe();

    const transactionsSubscription = supabase
      .channel("transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          const newTransactionDate = new Date(payload.new.date || payload.new.created_at);
          const [year, month] = selectedMonth.split("-");
          if (
            newTransactionDate.getFullYear() === parseInt(year) &&
            newTransactionDate.getMonth() + 1 === parseInt(month)
          ) {
            setTransactions((prev) => {
              const updatedTransactions = [...prev, payload.new].sort((a, b) => {
                const dateA = new Date(a.date || a.created_at || new Date());
                const dateB = new Date(b.date || b.created_at || new Date());
                return dateB - dateA;
              });
              updateTotalSpent([...updatedTransactions, ...bills]);
              checkBudgetAlerts(payload.new.category);
              return updatedTransactions;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          setTransactions((prev) => {
            const updatedTransactions = prev.map((t) => (t.id === payload.new.id ? payload.new : t));
            updateTotalSpent([...updatedTransactions, ...bills]);
            checkBudgetAlerts(payload.new.category);
            return updatedTransactions;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "transactions", filter: `user_id=eq.${userId}` },
        (payload) => {
          setTransactions((prev) => {
            const updatedTransactions = prev.filter((t) => t.id !== payload.old.id);
            updateTotalSpent([...updatedTransactions, ...bills]);
            checkBudgetAlerts(payload.old.category);
            return updatedTransactions;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(billsSubscription);
      supabase.removeChannel(transactionsSubscription);
    };
  }, [userId, selectedMonth]);

  const normalizeCategory = (category) => {
    return category ? category.trim().toLowerCase() : "other";
  };

  async function fetchUserSettings() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("User not authenticated");
      console.error("Auth error:", authError?.message);
      return;
    }

    console.log("Fetching budget for user ID:", user.id, "for month:", selectedMonth);

    const { data, error } = await supabase
      .from("user_settings")
      .select("monthly_budget, month")
      .eq("user_id", user.id)
      .eq("month", selectedMonth);

    if (error) {
      console.error("Error fetching budget:", error.message);
      setError("Failed to fetch budget: " + error.message);
      setTotalBudget(0);
    } else if (data.length === 0) {
      console.log("No budget found for month:", selectedMonth);
      setTotalBudget(0);
    } else {
      console.log("Budget data found:", data);
      setTotalBudget(data[0].monthly_budget || 0);
    }
  }

  const handleBillUploaded = (newBill) => {
    console.log("Handling new bill in Dashboard:", newBill);
    setBills((prev) => {
      const updatedBills = [...prev, newBill].sort((a, b) => {
        const dateA = new Date(a.date || a.created_at || new Date());
        const dateB = new Date(b.date || b.created_at || new Date());
        return dateB - dateA;
      });
      updateTotalSpent([...transactions, ...updatedBills]);
      checkBudgetAlerts(newBill.category);
      return updatedBills;
    });
  };

  const updateTotalSpent = (data) => {
    const [year, month] = selectedMonth.split("-");
    const filteredData = data.filter((item) => {
      const itemDate = new Date(item.date || item.created_at || new Date());
      return (
        itemDate.getFullYear() === parseInt(year) &&
        itemDate.getMonth() + 1 === parseInt(month)
      );
    });

    let total = 0;
    filteredData.forEach((item) => {
      total += item.amount || item.total || 0;
    });
    console.log("Updating total spent:", total);
    setTotalSpent(total);
  };

  const checkBudgetAlerts = async (category) => {
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
        .single();

      if (budgetError || !budget) {
        console.log(`No budget found for category: ${category}`);
        return;
      }

      const [year, month] = selectedMonth.split("-");
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("category", category)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      const { data: bills, error: billsError } = await supabase
        .from("bills")
        .select("total")
        .eq("user_id", user.id)
        .eq("category", category)
        .gte("date", startDate.toISOString())
        .lte("date", endDate.toISOString());

      if (transactionsError || billsError) {
        console.error("Failed to fetch transactions/bills for alert:", transactionsError || billsError);
        return;
      }

      const totalSpent = [
        ...(transactions || []).map((t) => t.amount || 0),
        ...(bills || []).map((b) => b.total || 0),
      ].reduce((sum, amount) => sum + amount, 0);

      const percentage = (totalSpent / budget.amount) * 100;

      if (percentage >= 80 && percentage < 100) {
        const sent = await sendBudgetAlert(user.id, category);
        if (sent) {
          setSuccess(`Budget alert sent for ${category} (80% reached)`);
        }
      } else if (percentage >= 100) {
        const sent = await sendBudgetAlert(user.id, category);
        if (sent) {
          setSuccess(`Budget alert sent for ${category} (100% exceeded)`);
        }
      }
    } catch (error) {
      console.error("Error checking budget alerts:", error);
      setError("Failed to check budget alerts");
    }
  };

  const handleManualExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!newExpense.category || !newExpense.amount || !newExpense.date) {
        throw new Error("Please fill in all required fields");
      }

      const amount = parseFloat(newExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const transactionData = {
        category: newExpense.category,
        amount: amount,
        date: newExpense.date,
        user_id: user.id,
        manual_entry: true,
      };

      const { error } = await supabase.from("transactions").insert([transactionData]);

      if (error) throw error;

      setNewExpense({
        category: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowManualExpenseModal(false);
      setSuccess("Expense added successfully!");
      const newTransactions = [...transactions, transactionData].sort((a, b) => {
        const dateA = new Date(a.date || a.created_at || new Date());
        const dateB = new Date(b.date || b.created_at || new Date());
        return dateB - dateA;
      });
      setTransactions(newTransactions);
      updateTotalSpent([...newTransactions, ...bills]);
      checkBudgetAlerts(transactionData.category);
      setError("");
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEditTransaction = (item) => {
    console.log("Editing transaction:", item);
    setEditExpense({
      id: item.id,
      table: item.total ? "bills" : "transactions",
      category: item.category || "",
      amount: (item.amount || item.total || 0).toString(),
      date: item.date || item.created_at.split("T")[0],
    });
    setShowEditExpenseModal(true);
  };

  const handleEditExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!editExpense.category || !editExpense.amount || !editExpense.date) {
        throw new Error("Please fill in all required fields");
      }

      const amount = parseFloat(editExpense.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const updates = {
        category: editExpense.category,
        amount: amount,
        date: editExpense.date,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      if (editExpense.table === "transactions") {
        updates.manual_entry = true;
      }

      const { error } = await supabase
        .from(editExpense.table)
        .update(updates)
        .eq("id", editExpense.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setShowEditExpenseModal(false);
      setEditExpense({ id: null, table: "", category: "", amount: "", date: "" });
      setSuccess("Transaction updated successfully!");
      if (editExpense.table === "transactions") {
        const updatedTransactions = transactions.map((t) =>
          t.id === editExpense.id ? { ...t, ...updates } : t
        );
        setTransactions(updatedTransactions);
        updateTotalSpent([...updatedTransactions, ...bills]);
      } else {
        const updatedBills = bills.map((b) =>
          b.id === editExpense.id ? { ...b, ...updates, total: amount } : b
        );
        setBills(updatedBills);
        updateTotalSpent([...transactions, ...updatedBills]);
      }
      checkBudgetAlerts(editExpense.category);
      setError("");
    } catch (error) {
      setError(error.message || "Failed to update transaction");
      console.error("Edit error:", error);
    }
  };

  const handleDeleteTransaction = (item) => {
    console.log("Deleting transaction:", item);
    setSelectedTransaction({
      id: item.id,
      table: item.total ? "bills" : "transactions",
      category: item.category,
    });
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteTransaction = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { id, table, category } = selectedTransaction;
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setSuccess("Transaction deleted successfully!");
      if (table === "transactions") {
        const updatedTransactions = transactions.filter((t) => t.id !== id);
        setTransactions(updatedTransactions);
        updateTotalSpent([...updatedTransactions, ...bills]);
      } else {
        const updatedBills = bills.filter((b) => b.id !== id);
        setBills(updatedBills);
        updateTotalSpent([...transactions, ...updatedBills]);
      }
      setShowDeleteConfirmModal(false);
      setSelectedTransaction(null);
      checkBudgetAlerts(category);
      setError("");
    } catch (error) {
      setError(error.message || "Failed to delete transaction");
      console.error("Delete error:", error);
    }
  };

  const handleSendMonthlySummary = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }

      const success = await sendMonthlySummary(user.id);
      if (success) {
        setSuccess("Monthly summary sent to your email!");
        console.log("Monthly summary sent for user:", user.id);
      } else {
        throw new Error("Failed to send monthly summary");
      }
      setError("");
    } catch (error) {
      setError(error.message || "Failed to send monthly summary");
      console.error("Summary error:", error);
    }
  };

  const combinedData = [...transactions, ...bills].sort((a, b) => {
    const dateA = new Date(a.date || a.created_at || new Date());
    const dateB = new Date(b.date || b.created_at || new Date());
    return dateB - dateA;
  });

  const filteredTransactions = combinedData.filter((item) => {
    if (categoryFilter !== "all" && normalizeCategory(item.category) !== normalizeCategory(categoryFilter)) {
      return false;
    }

    const isBill = 'total' in item;
    if (transactionTypeFilter === "receipts" && (isBill || item.manual_entry === true)) {
      return false;
    }
    if (transactionTypeFilter === "manual" && (!item.manual_entry || isBill)) {
      return false;
    }

    const transactionDate = new Date(item.date || item.created_at || new Date());
    const now = new Date();
    if (dateFilter === "today") {
      return transactionDate.toDateString() === now.toDateString();
    } else if (dateFilter === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(now.getDate() - 7);
      return transactionDate >= oneWeekAgo && transactionDate <= now;
    } else if (dateFilter === "month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);
      return transactionDate >= oneMonthAgo && transactionDate <= now;
    } else if (dateFilter === "year") {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return transactionDate >= oneYearAgo && transactionDate <= now;
    }

    return true;
  });

  console.log("Rendering transactions:", filteredTransactions);

  const uniqueCategories = [...new Set(combinedData.map((t) => t.category || "Other"))].sort();

  if (!userId) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading user data...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Budget Overview</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800">Monthly Budget</h3>
              <p className="text-3xl font-bold text-blue-600">${totalBudget.toFixed(2)}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800">Current Amount</h3>
              <p className="text-3xl font-bold text-green-600">${totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800">Remaining Amount</h3>
              <p className="text-3xl font-bold text-purple-600">${(totalBudget - totalSpent).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Upload Receipt</h2>
          <BillUpload onBillUploaded={handleBillUploaded} userId={userId} />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Expense Timeline</h2>
            <div className="flex space-x-3">
              <button
                onClick={handleSendMonthlySummary}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 12h5m0 0l-7-7m7 7l-7 7M3 12h10"
                  />
                </svg>
                Send Monthly Summary
              </button>
              <button
                onClick={() => setShowManualExpenseModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Expense
              </button>
            </div>
          </div>

          {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4">{error}</div>}
          {success && <div className="p-3 bg-green-100 text-green-700 rounded-lg mb-4">{success}</div>}

          <div className="flex border-b mb-4">
            <button
              onClick={() => setTransactionTypeFilter("all")}
              className={`px-4 py-2 ${transactionTypeFilter === "all" ? "border-b-2 border-blue-500 text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600"}`}
            >
              All
            </button>
            <button
              onClick={() => setTransactionTypeFilter("receipts")}
              className={`px-4 py-2 ${transactionTypeFilter === "receipts" ? "border-b-2 border-blue-500 text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600"}`}
            >
              Receipts
            </button>
            <button
              onClick={() => setTransactionTypeFilter("manual")}
              className={`px-4 py-2 ${transactionTypeFilter === "manual" ? "border-b-2 border-blue-500 text-blue-600 font-medium" : "text-gray-600 hover:text-blue-600"}`}
            >
              Manual Entries
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500 hover:shadow-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center">
                        <p className="font-semibold text-lg">{item.category}</p>
                        <span
                          className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            item.manual_entry === true
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {item.manual_entry === true ? "Manual" : "Receipt"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {(() => {
                          const dateValue = item.date || item.created_at;
                          if (!dateValue) return "No date";
                          try {
                            const date = new Date(dateValue);
                            return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
                          } catch (e) {
                            return "Invalid Date";
                          }
                        })()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <p className="font-bold text-green-600 text-xl">${(item.amount || item.total || 0).toFixed(2)}</p>
                      <button
                        onClick={() => handleEditTransaction(item)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Edit transaction"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(item)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete transaction"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4M9 7v12m6-12v12M3 7h18"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No transactions found. Add an expense or upload a receipt to get started.</p>
              </div>
            )}
          </div>
        </div>

        {showManualExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Add Manual Expense</h3>
                <button
                  onClick={() => setShowManualExpenseModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleManualExpenseSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                {success && <div className="p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowManualExpenseModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Expense</h3>
                <button
                  onClick={() => setShowEditExpenseModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEditExpenseSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                {success && <div className="p-3 bg-green-100 text-green-700 rounded-lg">{success}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    value={editExpense.category}
                    onChange={(e) => setEditExpense({ ...editExpense, category: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editExpense.amount}
                    onChange={(e) => setEditExpense({ ...editExpense, amount: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={editExpense.date}
                    onChange={(e) => setEditExpense({ ...editExpense, date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditExpenseModal(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Are you sure you want to delete this transaction?</h3>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTransaction}
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