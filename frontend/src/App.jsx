import { Loader2 } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/layout/Layout";
import CrudPage from "@/components/crud/CrudPage";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Purchases from "@/pages/Purchases";
import Sales from "@/pages/Sales";
import * as C from "@/config/pages";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

const page = (path, props) => <Route key={path} path={path} element={<CrudPage key={path} {...props} />} />;
const move = (path, kind) => page(path, { config: C.movementConfig(kind), listParams: { kind }, fixedValues: { type: kind } });

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        {page("/products", { config: C.productsConfig })}
        {page("/categories", { config: C.categoriesConfig })}
        {page("/units", { config: C.unitsConfig })}
        {page("/suppliers", { config: C.suppliersConfig })}
        {page("/customers", { config: C.customersConfig })}
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/sales" element={<Sales />} />
        {move("/stock-in", "in")}
        {move("/stock-out", "out")}
        {move("/stock-adjust", "adjust")}
        {page("/reports/stock", { config: C.reportStockConfig })}
        {page("/reports/purchases", { config: C.reportPurchasesConfig })}
        {page("/reports/sales", { config: C.reportSalesConfig })}
        {page("/reports/stock-card", { config: C.stockCardConfig })}
        <Route path="/users" element={<AdminRoute><CrudPage config={C.usersConfig} /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
