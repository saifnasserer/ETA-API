import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import InvoiceDetails from './components/InvoiceDetails';
import TaxReturn from './components/TaxReturn';
import FetchInvoices from './components/FetchInvoices';
import TaxComplianceDashboard from './components/TaxComplianceDashboard';
import FormalVATReport from './components/FormalVATReport';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedVATMonth, setSelectedVATMonth] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ar');

  useEffect(() => {
    // Check for query params (e.g. ?invoiceId=123) for direct linking
    // ... same log ...
    const params = new URLSearchParams(window.location.search);
    const linkedInvoiceId = params.get('invoiceId');
    if (linkedInvoiceId) {
      setActiveTab('invoices');
      setSelectedInvoiceId(linkedInvoiceId);
    }

    // Determine API URL (Relative for Proxy)
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
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} setLang={setLang}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {selectedInvoice ? (
            <InvoiceDetails
              invoice={selectedInvoice}
              onBack={() => setSelectedInvoice(null)}
              lang={lang}
            />
          ) : selectedVATMonth ? (
            <FormalVATReport
              selectedMonth={selectedVATMonth}
              onBack={() => setSelectedVATMonth(null)}
              lang={lang}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && <Dashboard invoices={invoices} summary={summary} lang={lang} />}
              {activeTab === 'invoices' && (
                <InvoiceList
                  invoices={invoices}
                  onSelectInvoice={setSelectedInvoice}
                  lang={lang}
                />
              )}
              {activeTab === 'tax-return' && <TaxReturn lang={lang} />}
              {activeTab === 'tax-compliance' && <TaxComplianceDashboard lang={lang} onSelectMonth={setSelectedVATMonth} />}
              {activeTab === 'fetch' && <FetchInvoices lang={lang} />}
            </>
          )}
        </div>
      )}
    </Layout>
  );
}

export default App;
