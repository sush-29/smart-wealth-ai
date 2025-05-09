import "chart.js/auto";
import { useEffect, useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import { supabase } from "../utils/supabaseClient";
import Header from "./Header";

export default function Visualizations() {
  const [transactions, setTransactions] = useState([]);
  const [bills, setBills] = useState([]);
  const [prevTransactions, setPrevTransactions] = useState([]);
  const [prevBills, setPrevBills] = useState([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [prevTotalSpent, setPrevTotalSpent] = useState(0);
  const [chartData, setChartData] = useState({
    budgetVsSpending: null,
    spendingByCategory: null,
    transactionHistory: null,
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // "2025-05"
  });
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    fetchUserSettings();
    fetchTransactions();
    fetchBills();
  }, [selectedMonth]);

  useEffect(() => {
    if (showComparison) {
      const [year, month] = selectedMonth.split("-");
      const prevMonth = month === "01" ? `${parseInt(year) - 1}-12` : `${year}-${String(parseInt(month) - 1).padStart(2, "0")}`;
      fetchPrevTransactions(prevMonth);
      fetchPrevBills(prevMonth);
    } else {
      setPrevTransactions([]);
      setPrevBills([]);
      setPrevTotalSpent(0);
    }
  }, [showComparison, selectedMonth]);

  useEffect(() => {
    const combinedData = [...transactions, ...bills];
    const prevCombinedData = [...prevTransactions, ...prevBills];
    updateCombinedData(combinedData, prevCombinedData);
  }, [transactions, bills, prevTransactions, prevBills]);

  const normalizeCategory = (category) => {
    return category ? category.trim().toLowerCase() : "other";
  };

  const updateCombinedData = (combinedData, prevCombinedData) => {
    const sortedData = combinedData.sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || new Date());
      const dateB = new Date(b.date || b.created_at || new Date());
      return dateB - dateA;
    });
    const prevSortedData = prevCombinedData.sort((a, b) => {
      const dateA = new Date(a.date || a.created_at || new Date());
      const dateB = new Date(b.date || b.created_at || new Date());
      return dateB - dateA;
    });
    updateTotalSpent(sortedData, prevSortedData);
    prepareChartData(sortedData, prevSortedData);
  };

  const prepareChartData = (data, prevData) => {
    prepareBudgetVsSpendingData(prevData);
    prepareSpendingByCategoryData(data, prevData);
    prepareTransactionHistoryData(data);
  };

  const prepareBudgetVsSpendingData = (prevData) => {
    const labels = showComparison ? ["Current Month", "Previous Month"] : ["Monthly Budget", "Current Amount"];
    const budgetData = showComparison ? [totalBudget, totalBudget] : [totalBudget, 0];
    const spentData = showComparison ? [totalSpent, prevTotalSpent] : [0, totalSpent];

    setChartData((prev) => ({
      ...prev,
      budgetVsSpending: {
        labels,
        datasets: [
          {
            label: "Monthly Budget",
            data: budgetData,
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
          {
            label: "Current Amount",
            data: spentData,
            backgroundColor: "rgba(255, 99, 132, 0.5)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      },
    }));
  };

  const prepareSpendingByCategoryData = (data, prevData) => {
    const categorySpending = {};
    const prevCategorySpending = {};

    data.forEach((item) => {
      const normalizedCategory = normalizeCategory(item.category);
      const displayCategory = item.category || "Other";
      if (!categorySpending[normalizedCategory]) {
        categorySpending[normalizedCategory] = { amount: 0, display: displayCategory };
      }
      categorySpending[normalizedCategory].amount += item.amount || item.total || 0;
    });

    prevData.forEach((item) => {
      const normalizedCategory = normalizeCategory(item.category);
      const displayCategory = item.category || "Other";
      if (!prevCategorySpending[normalizedCategory]) {
        prevCategorySpending[normalizedCategory] = { amount: 0, display: displayCategory };
      }
      prevCategorySpending[normalizedCategory].amount += item.amount || item.total || 0;
    });

    const allCategories = [...new Set([
      ...Object.keys(categorySpending),
      ...Object.keys(prevCategorySpending),
    ])].sort();

    const labels = allCategories.map((cat) => categorySpending[cat]?.display || prevCategorySpending[cat]?.display);

    const currentSpentAmounts = allCategories.map((cat) => categorySpending[cat]?.amount || 0);
    const prevSpentAmounts = allCategories.map((cat) => prevCategorySpending[cat]?.amount || 0);

    const getRandomColor = () => {
      const r = Math.floor(Math.random() * 256);
      const g = Math.floor(Math.random() * 256);
      const b = Math.floor(Math.random() * 256);
      return `rgba(${r}, ${g}, ${b}, 0.5)`;
    };
    const backgroundColors = allCategories.map(() => getRandomColor());
    const borderColors = backgroundColors.map(color => color.replace("0.5", "1"));

    const datasets = showComparison
      ? [
          {
            label: "Current Month",
            data: currentSpentAmounts,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
          },
          {
            label: "Previous Month",
            data: prevSpentAmounts,
            backgroundColor: backgroundColors.map(color => color.replace("0.5", "0.3")),
            borderColor: borderColors.map(color => color.replace("0.5", "0.8")),
            borderWidth: 1,
          },
        ]
      : [
          {
            data: currentSpentAmounts,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
          },
        ];

    setChartData((prev) => ({
      ...prev,
      spendingByCategory: {
        labels,
        datasets,
      },
    }));
  };

  const prepareTransactionHistoryData = (data) => {
    const transactionsByDate = {};
    data.forEach((item) => {
      const date = item.date || (item.created_at ? item.created_at.split("T")[0] : new Date().toISOString().split("T")[0]);
      if (!transactionsByDate[date]) {
        transactionsByDate[date] = 0;
      }
      transactionsByDate[date] += item.amount || item.total || 0;
    });

    const sortedDates = Object.keys(transactionsByDate).sort();
    const amounts = sortedDates.map((date) => transactionsByDate[date]);

    setChartData((prev) => ({
      ...prev,
      transactionHistory: {
        labels: sortedDates,
        datasets: [
          {
            label: "Daily Spending",
            data: amounts,
            fill: false,
            borderColor: "rgba(75, 192, 192, 1)",
            tension: 0.1,
          },
        ],
      },
    }));
  };

  async function fetchUserSettings() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Error fetching user:", authError);
      return;
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("monthly_budget")
      .eq("user_id", user.id)
      .eq("month", selectedMonth) // Fetch for the specific month
      .single();

    if (error) {
      console.error("Error fetching user settings:", error.message);
      setTotalBudget(0); // Default to 0 if no budget is found
    } else {
      setTotalBudget(data?.monthly_budget || 0);
      console.log(`Fetched budget for ${selectedMonth}: ${data?.monthly_budget || 0}`);
    }
  }

  async function fetchTransactions() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Error fetching user:", authError);
      return;
    }

    const [year, month] = selectedMonth.split("-");
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString());

    if (error) {
      console.error("Error fetching transactions:", error.message);
    } else {
      setTransactions(data || []);
      console.log(`Fetched transactions for ${selectedMonth}:`, data);
    }
  }

  async function fetchBills() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Error fetching user:", authError);
      return;
    }

    const [year, month] = selectedMonth.split("-");
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString());

    if (error) {
      console.error("Error fetching bills:", error.message);
    } else {
      setBills(data || []);
      console.log(`Fetched bills for ${selectedMonth}:`, data);
    }
  }

  async function fetchPrevTransactions(prevMonth) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Error fetching user:", authError);
      return;
    }

    const [year, month] = prevMonth.split("-");
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString());

    if (error) {
      console.error("Error fetching previous transactions:", error.message);
    } else {
      setPrevTransactions(data || []);
    }
  }

  async function fetchPrevBills(prevMonth) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Error fetching user:", authError);
      return;
    }

    const [year, month] = prevMonth.split("-");
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString());

    if (error) {
      console.error("Error fetching previous bills:", error.message);
    } else {
      setPrevBills(data || []);
    }
  }

  const updateTotalSpent = (data, prevData) => {
    let total = 0;
    data.forEach((item) => {
      total += item.amount || item.total || 0;
    });
    setTotalSpent(total);
    console.log(`Total spent for ${selectedMonth}: ${total}`);

    let prevTotal = 0;
    prevData.forEach((item) => {
      prevTotal += item.amount || item.total || 0;
    });
    setPrevTotalSpent(prevTotal);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Financial Insights</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="ml-2 bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                {showComparison ? "Hide" : "Show"} Comparison
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Budget vs Spending</h3>
              {chartData.budgetVsSpending ? (
                <div className="h-64">
                  <Bar
                    data={chartData.budgetVsSpending}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: { display: true, text: "Amount ($)" },
                        },
                        x: {
                          title: { display: true, text: "Category" },
                        },
                      },
                      plugins: {
                        legend: { position: "top" },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const label = context.dataset.label || '';
                              const value = context.raw || 0;
                              return `${label}: $${value.toFixed(2)}`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-center py-10">No budget data available</p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Spending by Category</h3>
              {chartData.spendingByCategory && chartData.spendingByCategory.labels.length > 0 ? (
                <div className="h-64">
                  {showComparison ? (
                    <Bar
                      data={chartData.spendingByCategory}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { beginAtZero: true, title: { display: true, text: "Amount ($)" } },
                          x: { title: { display: true, text: "Category" } },
                        },
                        plugins: {
                          legend: { position: "bottom" },
                        },
                      }}
                    />
                  ) : (
                    <Pie
                      data={chartData.spendingByCategory}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: "bottom", labels: { boxWidth: 12 } },
                        },
                      }}
                    />
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-10">No transaction data available</p>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Transaction History</h3>
              {chartData.transactionHistory && chartData.transactionHistory.labels.length > 0 ? (
                <div className="h-64">
                  <Line
                    data={chartData.transactionHistory}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: { beginAtZero: true, title: { display: true, text: "Amount ($)" } },
                        x: { title: { display: true, text: "Date" } },
                      },
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-500 text-center py-10">No transaction history available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}