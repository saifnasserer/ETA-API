import React, { useEffect, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import InvoiceDetails from './components/InvoiceDetails';
import TaxReturn from './components/TaxReturn';
import FetchInvoices from './components/FetchInvoices';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for query params (e.g. ?invoiceId=123) for direct linking
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
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && <Dashboard summary={summary} />}
          {activeTab === 'invoices' && !selectedInvoiceId && (
            <InvoiceList
              invoices={invoices}
              onViewDetails={(id) => setSelectedInvoiceId(id)}
            />
          )}
          {activeTab === 'invoices' && selectedInvoiceId && (
            <InvoiceDetails
              internalId={selectedInvoiceId}
              onBack={() => setSelectedInvoiceId(null)}
            />
          )}
          {activeTab === 'tax-return' && <TaxReturn />}
          {activeTab === 'fetch' && <FetchInvoices />}
        </>
      )}
    </Layout>
  );
}

export default App;
