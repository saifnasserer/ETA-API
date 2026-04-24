import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import InvoiceDetails from './components/InvoiceDetails';
import TaxReturn from './components/TaxReturn';
import TaxComplianceDashboard from './components/TaxComplianceDashboard';
import FormalVATReport from './components/FormalVATReport';
import AnnualIncome from './components/AnnualIncome';

function App() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ar');

  useEffect(() => {
    const API_URL = '/api';

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch Invoices
        const invRes = await fetch(`${API_URL}/invoices`);
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);

        // Fetch Summary
        const sumRes = await fetch(`${API_URL}/reports/vat-return`);
        const sumData = await sumRes.json();
        setSummary(sumData || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Router>
      <Layout lang={lang} setLang={setLang}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <Routes>
              {/* Redirect root to invoices for now, or dashboard */}
              <Route path="/" element={<Navigate to="/invoices" replace />} />
              
              <Route path="/dashboard" element={<Dashboard invoices={invoices} summary={summary} lang={lang} />} />
              
              <Route path="/invoices" element={<InvoiceList invoices={invoices} lang={lang} />} />
              <Route path="/invoices/:id" element={<InvoiceDetails invoices={invoices} lang={lang} />} />
              
              <Route path="/tax-return" element={<TaxReturn lang={lang} />} />
              <Route path="/annual-income" element={<AnnualIncome lang={lang} />} />
              
              <Route path="/tax-compliance" element={<TaxComplianceDashboard lang={lang} />} />
              <Route path="/tax-compliance/:month" element={<FormalVATReport lang={lang} />} />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/invoices" replace />} />
            </Routes>
          </div>
        )}
      </Layout>
    </Router>
  );
}

export default App;
