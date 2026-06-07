import { Navigate, Route, Routes, useParams } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
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
import WebOrders from "./pages/WebOrders";
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
  LicensePage,
  ProductCorrelationReport,
  SubProductsPage,
  VariantsPage,
} from "./pages/MiscPages";
import LabelPrintPage from "./pages/LabelPrintPage";
import ScalePrintPage from "./pages/ScalePrintPage";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBranches from "./pages/admin/AdminBranches";
import AdminBranchCreate from "./pages/admin/AdminBranchCreate";
import AdminBranchDetail from "./pages/admin/AdminBranchDetail";
import AdminQrMenu from "./pages/admin/AdminQrMenu";
import PublicMenuLanding from "./pages/public/PublicMenuLanding";
import PublicBranchMenu from "./pages/public/PublicBranchMenu";
import PublicOrderStatus from "./pages/public/PublicOrderStatus";

function LegacyMenuRedirect() {
  return <Navigate to="/m" replace />;
}

function LegacyBranchRedirect() {
  const { branchId } = useParams();
  return <Navigate to={`/m/branch/${branchId}`} replace />;
}

function HomeRedirect() {
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 991px)").matches;
  return <Navigate to={isMobile ? "/menu" : "/dashboard"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/m/order/:orderId" element={<PublicOrderStatus />} />
      <Route path="/m/branch/:branchId" element={<PublicBranchMenu />} />
      <Route path="/m" element={<PublicMenuLanding />} />
      <Route path="/m/:slug/:branchId" element={<LegacyBranchRedirect />} />
      <Route path="/m/:slug" element={<LegacyMenuRedirect />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="branches" element={<AdminBranches />} />
        <Route path="branches/new" element={<AdminBranchCreate />} />
        <Route path="branches/:id" element={<AdminBranchDetail />} />
        <Route path="qr-menu" element={<AdminQrMenu />} />
      </Route>
      <Route path="/branchs" element={<Navigate to="/admin/branches" replace />} />
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomeRedirect />} />
        <Route path="menu" element={<MobileMenuPage />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sales" element={<Sales />} />
        <Route path="web-orders" element={<WebOrders />} />
        <Route path="qorders" element={<Navigate to="/web-orders" replace />} />
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
        <Route path="ptag" element={<LabelPrintPage />} />
        <Route path="ptags" element={<LabelPrintPage designer />} />
        <Route path="pweightxt" element={<ScalePrintPage />} />
        <Route path="pinvoice" element={<PurchaseInvoices />} />
        <Route path="createinvoice" element={<CreateInvoice />} />
        <Route path="firms" element={<Firms />} />
        <Route path="einvoicecreate" element={<EInvoicePage mode="create" />} />
        <Route path="einvoiceg" element={<EInvoicePage mode="outgoing" />} />
        <Route path="einvoicec" element={<EInvoicePage mode="incoming" />} />
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
