import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, AlertCircle, CheckCircle2, Clock, TrendingDown, TrendingUp, Package } from 'lucide-react';
import { translations } from '../translations';

const TaxComplianceDashboard = ({ lang }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [monthDetails, setMonthDetails] = useState(null);

    const t = translations[lang] || translations['en'];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/tax/dashboard');
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPackage = async () => {
        try {
            setGenerating(true);
            const res = await fetch('/api/tax/download-package');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tax_submission_package_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download package:', error);
            alert('Failed to download package');
        } finally {
            setGenerating(false);
        }
    };

    const handleViewMonth = async (month) => {
        try {
            const res = await fetch(`/api/tax/vat/month/${month}`);
            const json = await res.json();
            setMonthDetails(json);
            setSelectedMonth(month);
        } catch (error) {
            console.error('Failed to fetch month details:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!data || !data.vat) {
        return (
            <div className="p-12 text-center">
                <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
                <h2 className="text-xl font-bold mb-2">{t.noTaxDataAvailable}</h2>
                <p className="text-gray-600 mb-4">{t.generateTaxReturnsMsg}</p>
                <button
                    onClick={async () => {
                        await fetch('/api/tax/vat/generate-all', { method: 'POST' });
                        fetchDashboardData();
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                    {t.generateTaxReturnsBtn}
                </button>
            </div>
        );
    }

    const { vat, incomeTax, deadline, daysRemaining } = data;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-xl shadow-lg">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{t.taxComplianceTitle}</h1>
                        <p className="text-blue-100">{t.taxComplianceSubtitle}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-blue-100 mb-1">{t.deadline}</div>
                        <div className="text-2xl font-bold">{deadline}</div>
                        <div className="text-sm text-blue-100 mt-1">
                            <Clock className="inline mr-1" size={14} />
                            {daysRemaining} {t.daysRemaining}
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Total Declarations */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <FileText className="text-blue-600" size={24} />
                        <span className="text-xs text-gray-500">Total</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{vat.totalReturns + 2}</div>
                    <div className="text-sm text-gray-600">Tax Declarations</div>
                    <div className="text-xs text-gray-500 mt-1">{vat.totalReturns} VAT + 2 Income</div>
                </div>

                {/* Total Invoices */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <FileText className="text-green-600" size={24} />
                        <span className="text-xs text-gray-500">Processed</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{vat.totals.totalInvoices}</div>
                    <div className="text-sm text-gray-600">Total Invoices</div>
                    <div className="text-xs text-gray-500 mt-1">Nov 2024 - Dec 2025</div>
                </div>

                {/* Net VAT Position */}
                <div className={`bg-white p-6 rounded-xl shadow-sm border ${vat.totals.totalNetVATDue < 0 ? 'border-green-200' : 'border-blue-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        {vat.totals.totalNetVATDue < 0 ? (
                            <TrendingDown className="text-green-600" size={24} />
                        ) : (
                            <TrendingUp className="text-blue-600" size={24} />
                        )}
                        <span className="text-xs text-gray-500">Net VAT</span>
                    </div>
                    <div className={`text-3xl font-bold ${vat.totals.totalNetVATDue < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                        {Math.abs(vat.totals.totalNetVATDue).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">EGP</div>
                    <div className={`text-xs mt-1 font-medium ${vat.totals.totalNetVATDue < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                        {vat.totals.totalNetVATDue < 0 ? 'REFUNDABLE' : 'PAYABLE'}
                    </div>
                </div>

                {/* Corporate Tax */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <FileText className="text-purple-600" size={24} />
                        <span className="text-xs text-gray-500">Income Tax</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {incomeTax['2024'] && incomeTax['2025']
                            ? (incomeTax['2024'].corporateTax + incomeTax['2025'].corporateTax).toLocaleString()
                            : '0'}
                    </div>
                    <div className="text-sm text-gray-600">EGP</div>
                    <div className="text-xs text-gray-500 mt-1">2024 + 2025</div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={handleDownloadPackage}
                        disabled={generating}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Package size={20} />
                        {generating ? 'Generating...' : 'Download Accountant Package'}
                    </button>

                    <button
                        onClick={async () => {
                            const res = await fetch('/api/tax/delay-note');
                            const note = await res.json();
                            const blob = new Blob([JSON.stringify(note, null, 2)], { type: 'application/json' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'delay_explanation_note.json';
                            a.click();
                        }}
                        className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
                    >
                        <Download size={20} />
                        Download Delay Note
                    </button>

                    <button
                        onClick={async () => {
                            await fetch('/api/tax/vat/generate-all', { method: 'POST' });
                            fetchDashboardData();
                        }}
                        className="flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
                    >
                        <FileText size={20} />
                        Regenerate All Returns
                    </button>
                </div>
            </div>

            {/* Monthly VAT Returns */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                    <h2 className="font-bold text-blue-900">Monthly VAT Returns ({vat.totalReturns})</h2>
                    <p className="text-blue-600 text-sm">Click on any month to view details</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-3 text-left">Period</th>
                                <th className="px-6 py-3 text-right">Invoices</th>
                                <th className="px-6 py-3 text-right">Sales</th>
                                <th className="px-6 py-3 text-right">Output VAT</th>
                                <th className="px-6 py-3 text-right">Input VAT</th>
                                <th className="px-6 py-3 text-right">Net Due</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {vat.periods.map((period) => (
                                <tr key={period.period} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{period.periodName}</td>
                                    <td className="px-6 py-4 text-right text-gray-600">{period.invoiceCount}</td>
                                    <td className="px-6 py-4 text-right text-gray-900 font-mono text-sm">
                                        {/* We'll need to add this to the summary */}
                                        -
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900 font-mono text-sm">
                                        -
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-900 font-mono text-sm">
                                        -
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold">
                                        <span className={period.netVATDue < 0 ? 'text-green-600' : 'text-blue-600'}>
                                            {period.netVATDue.toLocaleString()} EGP
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${period.status === 'Refundable'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {period.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleViewMonth(period.period)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold">
                            <tr>
                                <td className="px-6 py-4">TOTAL</td>
                                <td className="px-6 py-4 text-right">{vat.totals.totalInvoices}</td>
                                <td className="px-6 py-4 text-right">{vat.totals.totalSales.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">{vat.totals.totalOutputVAT.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">{vat.totals.totalInputVAT.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={vat.totals.totalNetVATDue < 0 ? 'text-green-600' : 'text-blue-600'}>
                                        {vat.totals.totalNetVATDue.toLocaleString()} EGP
                                    </span>
                                </td>
                                <td colSpan="2"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Income Tax Summary */}
            {(incomeTax['2024'] || incomeTax['2025']) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {incomeTax['2024'] && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Income Tax 2024</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Revenue</span>
                                    <span className="font-mono">{incomeTax['2024'].revenue.totalRevenue.toLocaleString()} EGP</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">COGS</span>
                                    <span className="font-mono">{incomeTax['2024'].cogs.totalCOGS.toLocaleString()} EGP</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Gross Profit</span>
                                    <span className={`font-mono ${incomeTax['2024'].grossProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {incomeTax['2024'].grossProfit.toLocaleString()} EGP
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Operating Expenses</span>
                                    <span className="font-mono">{incomeTax['2024'].operatingExpenses.total.toLocaleString()} EGP</span>
                                </div>
                                <div className="border-t pt-3 flex justify-between font-bold">
                                    <span>Corporate Tax (22.5%)</span>
                                    <span className="text-blue-600">{incomeTax['2024'].corporateTax.toLocaleString()} EGP</span>
                                </div>
                                {incomeTax['2024'].notes && incomeTax['2024'].notes.length > 0 && (
                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                        {incomeTax['2024'].notes.map((note, idx) => (
                                            <div key={idx} className="text-yellow-800">{note}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {incomeTax['2025'] && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-bold text-gray-900 mb-4">Income Tax 2025</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Revenue</span>
                                    <span className="font-mono">{incomeTax['2025'].revenue.totalRevenue.toLocaleString()} EGP</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">COGS</span>
                                    <span className="font-mono">{incomeTax['2025'].cogs.totalCOGS.toLocaleString()} EGP</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Gross Profit</span>
                                    <span className={`font-mono ${incomeTax['2025'].grossProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {incomeTax['2025'].grossProfit.toLocaleString()} EGP
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Operating Expenses</span>
                                    <span className="font-mono">{incomeTax['2025'].operatingExpenses.total.toLocaleString()} EGP</span>
                                </div>
                                <div className="border-t pt-3 flex justify-between font-bold">
                                    <span>Corporate Tax (22.5%)</span>
                                    <span className="text-blue-600">{incomeTax['2025'].corporateTax.toLocaleString()} EGP</span>
                                </div>
                                {incomeTax['2025'].notes && incomeTax['2025'].notes.length > 0 && (
                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                        {incomeTax['2025'].notes.map((note, idx) => (
                                            <div key={idx} className="text-yellow-800">{note}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Month Details Modal */}
            {selectedMonth && monthDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMonth(null)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-blue-600 text-white p-6 rounded-t-xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold">{monthDetails.periodName}</h2>
                                    <p className="text-blue-100">VAT Return Details</p>
                                </div>
                                <button
                                    onClick={() => setSelectedMonth(null)}
                                    className="text-white hover:text-gray-200 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Total Sales</div>
                                    <div className="text-xl font-bold">{monthDetails.summary.totalSales.toLocaleString()}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Output VAT</div>
                                    <div className="text-xl font-bold text-blue-600">{monthDetails.summary.totalOutputVAT.toLocaleString()}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Input VAT</div>
                                    <div className="text-xl font-bold text-green-600">{monthDetails.summary.totalInputVAT.toLocaleString()}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-sm text-gray-600 mb-1">Net Due</div>
                                    <div className={`text-xl font-bold ${monthDetails.summary.netVATDue < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                                        {monthDetails.summary.netVATDue.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Sales Breakdown */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-3">Sales (Output VAT)</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between p-3 bg-blue-50 rounded">
                                        <span>Local Sales (14% VAT)</span>
                                        <span className="font-mono">{monthDetails.sales.local.value.toLocaleString()} EGP</span>
                                    </div>
                                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                                        <span>Exports (0% VAT)</span>
                                        <span className="font-mono">{monthDetails.sales.exports.value.toLocaleString()} EGP</span>
                                    </div>
                                    <div className="flex justify-between p-3 bg-gray-50 rounded">
                                        <span>Exempt Sales</span>
                                        <span className="font-mono">{monthDetails.sales.exempt.value.toLocaleString()} EGP</span>
                                    </div>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-3">Purchases (Input VAT)</h3>
                                <div className="flex justify-between p-3 bg-green-50 rounded">
                                    <span>Deductible Input VAT</span>
                                    <span className="font-mono">{monthDetails.inputs.value.toLocaleString()} EGP</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    onClick={() => setSelectedMonth(null)}
                                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={async () => {
                                        const blob = new Blob([JSON.stringify(monthDetails, null, 2)], { type: 'application/json' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${selectedMonth}_vat_return.json`;
                                        a.click();
                                    }}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Download JSON
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxComplianceDashboard;
