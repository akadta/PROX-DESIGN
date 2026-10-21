import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/auth/Login";
import ProtectedRoutes from "./routes/ProtectedRoutes";
import Dashboard from "./pages/dashboard/Dashboard";
import MainLayout from "./layouts/MainLayout";
import CreateUser from "./pages/user/CreateUser";
import UsersList from "./pages/user/UsersList";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route index element={<Login />} />

          <Route element={<ProtectedRoutes />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/create/user" element={<CreateUser />} />
              <Route path="/users/list" element={<UsersList />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;