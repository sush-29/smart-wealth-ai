import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import BudgetManagement from './components/BudgetManagement';
import Dashboard from './components/Dashboard';
import ProfileSettings from './components/ProfileSettings';
import Visualizations from './components/Visualizations';
import { supabase } from './utils/supabaseClient';

function App() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = '/login';
      }
    });
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/visualizations" element={<Visualizations />} />
        <Route path="/budget-management" element={<BudgetManagement />} />
        <Route path="/profile-settings" element={<ProfileSettings />} />
      </Routes>
    </Router>
  );
}

export default App;