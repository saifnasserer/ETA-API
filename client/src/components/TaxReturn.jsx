import React, { useState, useEffect } from 'react';
import { FileText, Printer, Download, Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { translations } from '../translations';

const TaxReturn = ({ lang }) => {
    // Get current month in YYYY-MM format
    const getCurrentMonth = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const [month, setMonth] = useState(getCurrentMonth());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [expandedLine, setExpandedLine] = useState(null);
    const [minMonth, setMinMonth] = useState(null);
    const [maxMonth] = useState(getCurrentMonth());

    const t = translations[lang] || translations['en'];

    useEffect(() => {
        fetchReport();
        fetchMonthBoundaries();
    }, [month]);

    const fetchMonthBoundaries = async () => {
        try {
            const res = await fetch('/api/invoices');
            if (res.ok) {
                const json = await res.json();
                const invoices = json.invoices || [];
                if (invoices.length > 0) {
                    // Find earliest invoice date
                    const dates = invoices.map(inv => new Date(inv.dateTimeIssued));
                    const earliest = new Date(Math.min(...dates));
                    const earliestMonth = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}`;
                    setMinMonth(earliestMonth);
                }
            }
        } catch (error) {
            console.error('Failed to fetch month boundaries', error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/form10?month=${month}`);
            if (res.ok) {
                const json = await res.json();
                console.log("Report Data:", json);
                setData(json);
            }
        } catch (error) {
            console.error("Failed to fetch report", error);
        } finally {
            setLoading(false);
        }
    };

    const changeMonth = (direction) => {
        const [year, monthNum] = month.split('-').map(Number);
        const date = new Date(year, monthNum - 1, 1);
        date.setMonth(date.getMonth() + direction);
        const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Check boundaries
        if (minMonth && newMonth < minMonth) return; // Can't go before first invoice
        if (newMonth > maxMonth) return; // Can't go into future

        setMonth(newMonth);
        setExpandedLine(null);
    };

    if (loading) return <div className="p-12 text-center text-gray-500 animate-pulse">{t.processing}</div>;
    if (!data) return <div className="p-12 text-center text-red-500">No Data Available</div>;

    const { sales, inputs, totals } = data.data;

    // Helper to render an accordion row
    const ReturnLine = ({ lineCode, title, description, categoryData, isDeductible = false }) => {
        const isExpanded = expandedLine === lineCode;
        const value = categoryData.value || 0;
        const tax = categoryData.tax || 0;
        const items = categoryData.items || [];

        return (
            <div className="border-b border-gray-100 last:border-0">
                <div
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setExpandedLine(isExpanded ? null : lineCode)}
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Line {lineCode}</span>
                            <span className="font-medium text-gray-900">{title}</span>
                        </div>
                        <p className={`text-xs text-gray-500 mt-1 ${lang === 'ar' ? 'mr-11' : 'ml-11'}`}>{description}</p>
                    </div>
                    <div className={`text-right w-32 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                        <div className="font-medium text-gray-900">{value.toLocaleString()} EGP</div>
                        <div className="text-xs text-gray-400">Net Sales</div>
                    </div>
                    <div className={`w-32 ${lang === 'ar' ? 'text-left mr-4' : 'text-right ml-4'}`}>
                        <div className={`font-bold ${isDeductible ? 'text-green-600' : 'text-blue-600'}`}>
                            {tax.toLocaleString()} EGP
                        </div>
                        <div className="text-xs text-gray-400">VAT Amount</div>
                    </div>
                    <div className="ml-4 text-gray-400">
                        {isExpanded ? <ChevronDown size={16} /> : (lang === 'ar' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)}
                    </div>
                </div>

                {isExpanded && items.length > 0 && (
                    <div className={`bg-gray-50 p-4 animate-fade-in text-sm ${lang === 'ar' ? 'pr-14' : 'pl-14'}`}>
                        <h4 className="font-bold text-gray-600 mb-2 flex items-center gap-2">
                            <FileText size={14} /> {t.lineItems} ({items.length})
                        </h4>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 text-xs text-gray-500 font-medium">
                                    <tr>
                                        <th className={`px-4 py-2 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.date}</th>
                                        <th className={`px-4 py-2 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.invoiceStatus} #</th>
                                        <th className={`px-4 py-2 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.customerEntity}</th>
                                        <th className={`px-4 py-2 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{t.salesTotal}</th>
                                        <th className={`px-4 py-2 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{t.taxes}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50 group">
                                            <td className={`px-4 py-2 text-gray-600 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{item.date}</td>
                                            <td className="px-4 py-2 font-mono">
                                                <a
                                                    href={`/?invoiceId=${item.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 ${lang === 'ar' ? 'flex-row-reverse justify-end' : ''}`}
                                                >
                                                    {item.id}
                                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                                                </a>
                                            </td>
                                            <td className={`px-4 py-2 text-gray-900 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{item.customer}</td>
                                            <td className={`px-4 py-2 text-gray-600 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{item.total.toLocaleString()}</td>
                                            <td className={`px-4 py-2 font-medium text-gray-900 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{item.vat.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {isExpanded && items.length === 0 && (
                    <div className={`bg-gray-50 p-4 text-sm text-gray-500 italic ${lang === 'ar' ? 'pr-14' : 'pl-14'}`}>
                        {t.noInvoices}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        {t.taxReturnTitle}
                    </h1>
                    <p className="text-gray-500">{t.taxReturnSubtitle}</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-2 py-2 rounded-lg border border-gray-200">
                        <button
                            onClick={() => changeMonth(-1)}
                            disabled={minMonth && month <= minMonth}
                            className={`p-1 rounded ${minMonth && month <= minMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                        >
                            {lang === 'ar' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        </button>
                        <span className="text-gray-900 font-bold min-w-[120px] text-center">
                            {new Date(month + '-01').toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                            onClick={() => changeMonth(1)}
                            disabled={month >= maxMonth}
                            className={`p-1 rounded ${month >= maxMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                        >
                            {lang === 'ar' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Form Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Sales Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                            <div>
                                <h2 className="font-bold text-blue-900">{t.salesOutputTax}</h2>
                                <p className="text-blue-600 text-xs">{t.salesDesc}</p>
                            </div>
                            <div className={`${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                                <div className="text-xs text-blue-600 uppercase font-bold">Total Sales Tax</div>
                                <div className="text-xl font-bold text-blue-900">{totals.salesTax.toLocaleString()} EGP</div>
                            </div>
                        </div>
                        <div>
                            <ReturnLine
                                lineCode="101"
                                title={t.localSales}
                                description={t.localSalesDesc}
                                categoryData={sales.local}
                            />
                            <ReturnLine
                                lineCode="103"
                                title={t.exports}
                                description={t.exportsDesc}
                                categoryData={sales.exports}
                            />
                            <ReturnLine
                                lineCode="106"
                                title={t.exemptSales}
                                description={t.exemptSalesDesc}
                                categoryData={sales.exempt}
                            />
                        </div>
                    </div>

                    {/* Inputs Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center">
                            <div>
                                <h2 className="font-bold text-green-900">{t.inputsDeductibleTax}</h2>
                                <p className="text-green-600 text-xs">{t.inputsDesc}</p>
                            </div>
                            <div className={`${lang === 'ar' ? 'text-left' : 'text-right'}`}>
                                <div className="text-xs text-green-600 uppercase font-bold">Total Input Tax</div>
                                <div className="text-xl font-bold text-green-900">{totals.inputTax.toLocaleString()} EGP</div>
                            </div>
                        </div>
                        <div>
                            <ReturnLine
                                lineCode="201-205"
                                title={t.localPurchases}
                                description={t.localPurchasesDesc}
                                categoryData={inputs}
                                isDeductible={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Summary Card */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg ring-1 ring-white/10 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-slate-400 font-medium mb-1 uppercase text-xs tracking-wider">{t.netTaxPosition}</h3>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-4xl font-bold">
                                    {totals.netDue.toLocaleString()}
                                </span>
                                <span className="text-xl text-slate-400">EGP</span>
                            </div>

                            <div className={`inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full text-xs font-bold ${totals.netDue >= 0 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                                }`}>
                                {totals.netDue >= 0 ? t.payableToEta : t.refundable}
                            </div>

                            <p className="text-slate-400 text-sm mt-4 leading-relaxed">
                                {totals.netDue >= 0
                                    ? t.payableMsg
                                    : t.refundableMsg}
                            </p>
                        </div>
                        {/* Background Decor */}
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
                        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-gray-900 font-bold mb-4">{t.submissionChecklist}</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center ${totals.netDue > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                                    {totals.netDue > 0 && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                                </div>
                                <p className="text-sm text-gray-600">{t.checkBalance} <strong className="text-gray-900">{totals.netDue.toLocaleString()} EGP</strong> if payable.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 w-4 h-4 rounded border border-gray-300"></div>
                                <p className="text-sm text-gray-600">{t.exportExcel}</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 w-4 h-4 rounded border border-gray-300"></div>
                                <p className="text-sm text-gray-600">{t.openEta}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaxReturn;
