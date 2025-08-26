import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import FormPage from "./components/FormPage";
import AdminDashboard from "./components/AdminDashboard";
import FormResults from "./components/FormResults";
import FormEditor from "./components/FormEditor";
import SuccessPage from "./components/SuccessPage";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/form/:formId" element={<FormPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/forms/:formId" element={<FormResults />} />
        <Route path="/admin/forms/:formId/edit" element={<FormEditor />} />
        <Route path="/admin/forms/new" element={<FormEditor />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
