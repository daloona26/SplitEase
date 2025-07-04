import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Signup";
import Group from "./pages/Group";
import Pricing from "./pages/Pricing"; // Import the Pricing component
import Account from "./pages/Account";
import { ThemeProvider } from "./contexts/ThemeContext";
// Import other components as needed

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Added a route for the Pricing page */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/account" element={<Account />} />
              <Route path="/group/:groupId" element={<Group />} />
              <Route path="/groups/:groupId" element={<Group />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              {/* Add other routes as needed */}
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
