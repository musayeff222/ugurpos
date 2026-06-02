import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import CustomersList from "./pages/CustomersList";
import CustomerDetail from "./pages/CustomerDetail";
import ProductGroups from "./pages/ProductGroups";
import Staffs from "./pages/Staffs";
import Firms from "./pages/Firms";
import PaymentMethods from "./pages/PaymentMethods";
import { IncomePage, ExpensePage, IneTypesPage } from "./pages/Finance";
import Tasks from "./pages/Tasks";
import Refund from "./pages/Refund";
import RefundRequests from "./pages/RefundRequests";
import StockCount from "./pages/StockCount";
import { PurchaseInvoices, CreateInvoice } from "./pages/PurchaseInvoices";
import Integration from "./pages/Integration";
import Notices from "./pages/Notices";
import Profile from "./pages/Profile";
import MobileMenuPage from "./pages/MobileMenuPage";
import DailyReport from "./pages/reports/DailyReport";
import HistoricalReport from "./pages/reports/HistoricalReport";
import ProductReport from "./pages/reports/ProductReport";
import GroupReport from "./pages/reports/GroupReport";
import StaffMotionsReport from "./pages/reports/StaffMotionsReport";
import StockReport from "./pages/reports/StockReport";
import {
  EInvoicePage,
  LabelPrint,
  LicensePage,
  ProductCorrelationReport,
  ScalePrintPage,
  SubProductsPage,
  VariantsPage,
} from "./pages/MiscPages";

function HomeRedirect() {
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 991px)").matches;
  return <Navigate to={isMobile ? "/menu" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomeRedirect />} />
        <Route path="menu" element={<MobileMenuPage />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sales" element={<Sales />} />
        <Route path="dreport" element={<DailyReport />} />
        <Route path="breport" element={<HistoricalReport />} />
        <Route path="preport" element={<ProductReport />} />
        <Route path="pgreport" element={<GroupReport />} />
        <Route path="pcreport" element={<ProductCorrelationReport />} />
        <Route path="sreport" element={<StockReport />} />
        <Route path="staffmotions" element={<StaffMotionsReport />} />
        <Route path="customersList" element={<CustomersList />} />
        <Route path="customers" element={<CustomerDetail />} />
        <Route path="products" element={<Products />} />
        <Route path="update" element={<ProductForm />} />
        <Route path="updatevariants" element={<ProductForm />} />
        <Route path="pgroups" element={<ProductGroups />} />
        <Route path="ptree" element={<SubProductsPage />} />
        <Route path="variants" element={<VariantsPage />} />
        <Route path="refund" element={<Refund />} />
        <Route path="refundreq" element={<RefundRequests />} />
        <Route path="ptag" element={<LabelPrint />} />
        <Route path="ptags" element={<LabelPrint />} />
        <Route path="pweightxt" element={<ScalePrintPage />} />
        <Route path="pinvoice" element={<PurchaseInvoices />} />
        <Route path="createinvoice" element={<CreateInvoice />} />
        <Route path="firms" element={<Firms />} />
        <Route path="einvoicecreate" element={<EInvoicePage mode="create" />} />
        <Route path="einvoiceg" element={<EInvoicePage mode="outgoing" />} />
        <Route path="einvoicec" element={<EInvoicePage mode="incoming" />} />
        <Route path="eoptions" element={<EInvoicePage mode="settings" />} />
        <Route path="stockl" element={<StockCount />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="expense" element={<ExpensePage />} />
        <Route path="inextypes" element={<IneTypesPage />} />
        <Route path="staffs" element={<Staffs />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="paymentMethods" element={<PaymentMethods />} />
        <Route path="integration" element={<Integration />} />
        <Route path="buyingInformation" element={<LicensePage />} />
        <Route path="notices" element={<Notices />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
