import React, { useState } from 'react';
import { Search, Filter, AlertCircle, FileText, CheckCircle, XCircle } from 'lucide-react';
import { translations } from '../translations';
import { FilterBar } from './FilterBar';

const InvoiceList = ({ invoices, onSelectInvoice, lang }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('SALES'); 
    
    // Initialize to current month in YYYY-MM format
    const currentMonth = new Date().toISOString().substring(0, 7);
    const [month, setMonth] = useState(currentMonth);
    
    // Fetch state
    const [fetchLoading, setFetchLoading] = useState(false);
    const [fetchResult, setFetchResult] = useState(null);

    const t = translations[lang] || translations['en'];

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch =
            inv.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.internalID.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesDate = true;
        if (month) {
            const invMonth = new Date(inv.dateTimeIssued).toISOString().substring(0, 7);
            matchesDate = invMonth === month;
        }

        if (!matchesSearch || !matchesDate) return false;

        if (filter === 'SALES') return inv.direction === 'Sales';
        if (filter === 'PURCHASES') return inv.direction !== 'Sales';
        
        return true;
    });

    const handleFetch = async () => {
        setFetchLoading(true);
        setFetchResult(null);
        
        try {
            let payload = {};
            // If user inputted month, use it
            if (month) {
                payload = { month }; 
            } 
            // If no month but search query, treat that as internalId
            else if (searchTerm) {
                payload = { internalId: searchTerm.trim() };
            } 
            else {
                setFetchResult({ 
                    success: false, 
                    error: lang === 'ar' 
                        ? 'الرجاء تحديد تاريخ للفترة أو إدخال رقم الفاتورة في مربع البحث أولاً.' 
                        : 'Please define a Date Range or enter an Internal ID in the search box first.' 
                });
                setFetchLoading(false);
                return;
            }

            const response = await fetch('/api/fetch-invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setFetchResult({ success: true, data });
            } else {
                setFetchResult({ success: false, error: data.error || 'Failed to fetch' });
            }
        } catch (error) {
            setFetchResult({ success: false, error: error.message });
        } finally {
            setFetchLoading(false);
        }
    };

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Filter Bar */}
            <FilterBar
                search={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder={t.noInvoices.replace('found matching criteria', '').replace('لم يتم العثور على أي فواتير', 'بحث...') + '...'}
                status={filter}
                onStatusChange={setFilter}
                statusOptions={[
                    { label: lang === 'ar' ? 'المبيعات' : 'Sales', value: 'SALES' },
                    { label: lang === 'ar' ? 'المشتريات' : 'Purchases', value: 'PURCHASES' }
                ]}
                month={month}
                onMonthChange={setMonth}
                onFetch={handleFetch}
                fetchLoading={fetchLoading}
                onClear={() => {
                    setSearchTerm('');
                    setFilter('SALES');
                    setMonth('');
                    setFetchResult(null);
                }}
            />

            {/* Fetch Results Banner */}
            {fetchResult && (
                <div className={`p-4 rounded-xl shadow-sm text-sm ${fetchResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                   {fetchResult.success ? (
                       <div>
                           <div className="font-bold flex items-center gap-2">
                               <CheckCircle size={18} className="text-green-600" /> {fetchResult.data.message}
                           </div>
                           {fetchResult.data.total && (
                              <div className="mt-2 pl-6 flex gap-4 text-xs font-semibold">
                                  <span>Total: {fetchResult.data.total}</span>
                                  <span className="text-green-600">Fetched: {fetchResult.data.fetched}</span>
                                  <span className="text-red-500">Failed: {fetchResult.data.failed}</span>
                              </div>
                           )}
                           <p className="pl-6 mt-1 text-xs opacity-70">
                               {lang === 'ar' ? 'قم بتحديث الصفحة لرؤية الفواتير الجديدة' : 'Refresh the page to see the new invoices'}
                           </p>
                       </div>
                   ) : (
                       <div className="flex items-center gap-2 font-bold">
                           <XCircle size={18} className="text-red-600" /> {fetchResult.error}
                       </div>
                   )}
                </div>
            )}

            {/* Table (Desktop) */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium uppercase tracking-wider text-xs">
                        <tr>
                            <th className="px-4 py-4 w-10"></th>
                            <th className={`px-4 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'الرقم الضريبي' : 'Tax ID'}</th>
                            <th className={`px-4 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'الاسم او الجهه' : 'Entity Name'}</th>
                            <th className={`px-4 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice No'}</th>
                            <th className={`px-4 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{lang === 'ar' ? 'تاريخ الفاتورة' : 'Date'}</th>
                            <th className={`px-4 py-4 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{lang === 'ar' ? 'الاجمالي قبل الضريبة' : 'Total Before Tax'}</th>
                            <th className={`px-4 py-4 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{lang === 'ar' ? 'الضريبة' : 'VAT'}</th>
                            <th className={`px-4 py-4 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{lang === 'ar' ? 'الاجمالي بعد الضريبة' : 'Total After Tax'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredInvoices.map((inv, index) => {
                            const isSale = inv.direction === 'Sales';
                            const taxId = isSale ? inv.receiverId : inv.issuerId;
                            const entityName = isSale ? inv.receiverName : inv.issuerName;
                            const invoiceNo = inv.internalID;
                            const date = new Date(inv.dateTimeIssued).toLocaleDateString();
                            const gross = inv.totalAmount || 0;
                            const tax = inv.vatAmount || 0;
                            const net = inv.totalSalesAmount || (gross - tax);
                            
                            return (
                                <tr
                                    key={`${inv.internalID}-${index}`}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    onClick={() => onSelectInvoice(inv)}
                                >
                                    <td className="px-4 py-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSale ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {isSale ? (lang === 'ar' ? '↖' : '↗') : (lang === 'ar' ? '↘' : '↙')}
                                        </div>
                                    </td>
                                    <td className={`px-4 py-4 font-mono text-slate-600 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                        {taxId || 'N/A'}
                                    </td>
                                    <td className={`px-4 py-4 font-medium text-slate-900 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                        {entityName || 'N/A'}
                                    </td>
                                    <td className={`px-4 py-4 font-mono text-blue-600 font-medium ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                        {invoiceNo}
                                        {inv.vatAmount === 0 && !inv.isExport && (
                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800" title={t.warning}>!</span>
                                        )}
                                    </td>
                                    <td className={`px-4 py-4 text-slate-600 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{date}</td>
                                    <td className={`px-4 py-4 text-slate-600 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{net.toLocaleString()}</td>
                                    <td className={`px-4 py-4 text-slate-600 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{tax.toLocaleString()}</td>
                                    <td className={`px-4 py-4 font-bold text-slate-900 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{gross.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Cards (Mobile) */}
            <div className="lg:hidden space-y-3">
                {filteredInvoices.map((inv, index) => {
                    const isSale = inv.direction === 'Sales';
                    const taxId = isSale ? inv.receiverId : inv.issuerId;
                    const entityName = isSale ? inv.receiverName : inv.issuerName;
                    const invoiceNo = inv.internalID;
                    const date = new Date(inv.dateTimeIssued).toLocaleDateString();
                    const gross = inv.totalAmount || 0;
                    const tax = inv.vatAmount || 0;
                    const net = inv.totalSalesAmount || (gross - tax);

                    return (
                        <div
                            key={`mobile-inv-${inv.internalID}-${index}`}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 active:bg-gray-50 transition-colors"
                            onClick={() => onSelectInvoice(inv)}
                        >
                            <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                                <div className="flex flex-col gap-1">
                                    <div className="text-xs font-mono text-slate-500 uppercase">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice No'}</div>
                                    <div className="font-bold text-blue-600">{invoiceNo}</div>
                                </div>
                                <div className="text-right flex flex-col gap-1">
                                    <div className="text-xs font-mono text-slate-500 uppercase">{lang === 'ar' ? 'الرقم الضريبي' : 'Tax ID'}</div>
                                    <div className="font-mono font-medium text-slate-800">{taxId || 'N/A'}</div>
                                </div>
                            </div>
                            <div className="text-sm font-bold text-slate-900 bg-gray-50/50 p-2 rounded">
                                {entityName || 'N/A'}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center bg-gray-50 p-2 rounded">
                                    <div className="text-[10px] text-gray-500 mb-1">{lang === 'ar' ? 'قبل الضريبة' : 'Net'}</div>
                                    <div className="text-xs font-medium text-slate-700">{net.toLocaleString()}</div>
                                </div>
                                <div className="text-center bg-gray-50 p-2 rounded">
                                    <div className="text-[10px] text-gray-500 mb-1">{lang === 'ar' ? 'الضريبة' : 'Tax'}</div>
                                    <div className="text-xs font-medium text-slate-700">{tax.toLocaleString()}</div>
                                </div>
                                <div className="text-center bg-blue-50 p-2 rounded">
                                    <div className="text-[10px] text-blue-600 mb-1 font-bold">{lang === 'ar' ? 'الإجمالي' : 'Gross'}</div>
                                    <div className="text-xs font-bold text-blue-900">{gross.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-50 text-xs text-gray-400">
                                <div>{date}</div>
                                <div className="flex gap-2">
                                    {inv.vatAmount === 0 && !inv.isExport && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                            {t.warning}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredInvoices.length === 0 && (
                <div className="bg-white px-6 py-12 rounded-xl border border-gray-100 text-center text-gray-300">
                    <FileText className="mx-auto h-12 w-12 mb-3 opacity-20" />
                    {t.noInvoices}
                </div>
            )}
        </div>
    );
};

export default InvoiceList;
