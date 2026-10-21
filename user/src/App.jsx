import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./pages/Auth/Login";
import ProtectedRoutes from "./routes/ProtectedRoutes";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/dashboard/Dashboard";
import BookMain from "./pages/design/book/BookMain";
import BookNew from "./pages/design/book/BookNew";
import BookDesign from "./pages/design/book/BookDesign";
import PublicBookView from "./pages/design/book/PublicBookView";
import EmployeeRegistration from "./pages/registrations/employees/EmployeeRegistration";
import EmployeeList from "./pages/registrations/employees/EmployeeList";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Login />} />
        <Route path="/p/:slug" element={<PublicBookView />} />{" "}
        {/* public, no auth */}
        <Route element={<ProtectedRoutes />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/book" element={<BookMain />} />
            <Route path="/book/new" element={<BookNew />} />
            <Route path="/book/:bookId/design" element={<BookDesign />} />
            {/**Employee registration */}
            <Route path="/employee/registration" element={<EmployeeRegistration/>}/>
            <Route path="/employees/list" element={<EmployeeList />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
