import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import MigrationBanner from "@/components/MigrationBanner";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import Scan from "@/pages/Scan";
import Budget from "@/pages/Budget";
import Login from "@/pages/Login";
import Gallery from "@/pages/Gallery";
import { CategoriesProvider } from "@/lib/categoriesContext";
import { AuthProvider } from "@/lib/authContext";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <CategoriesProvider>
            <Header />
            <MigrationBanner />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/gastos" element={<Expenses />} />
              <Route path="/escanear" element={<Scan />} />
              <Route path="/presupuesto" element={<Budget />} />
              <Route path="/galeria" element={<Gallery />} />
              <Route path="/login" element={<Login />} />
            </Routes>
            <Toaster position="top-right" richColors closeButton />
          </CategoriesProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;