import "@/App.css";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import MigrationBanner from "@/components/MigrationBanner";
import QuickAddButton from "@/components/QuickAddButton";
import { CategoriesProvider } from "@/lib/categoriesContext";
import { ProjectsProvider } from "@/lib/projectsContext";
import { AuthProvider } from "@/lib/authContext";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Scan = lazy(() => import("@/pages/Scan"));
const Settings = lazy(() => import("@/pages/Settings"));
const Login = lazy(() => import("@/pages/Login"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const MonthlyReport = lazy(() => import("@/pages/MonthlyReport"));
const Calendar = lazy(() => import("@/pages/Calendar"));

function PageLoader() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[#E2DDD3] border-t-[#D95D39] animate-spin" />
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ProjectsProvider>
            <CategoriesProvider>
              <Header />
              <MigrationBanner />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/gastos" element={<Expenses />} />
                  <Route path="/escanear" element={<Scan />} />
                  <Route path="/ajustes" element={<Settings />} />
                  <Route path="/presupuesto" element={<Navigate to="/ajustes?tab=presupuesto" replace />} />
                  <Route path="/galeria" element={<Gallery />} />
                  <Route path="/informe" element={<MonthlyReport />} />
                  <Route path="/calendario" element={<Calendar />} />
                  <Route path="/login" element={<Login />} />
                </Routes>
              </Suspense>
              <QuickAddButton />
              <Toaster position="top-right" richColors closeButton />
            </CategoriesProvider>
          </ProjectsProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;