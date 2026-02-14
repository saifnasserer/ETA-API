import React, { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { translations } from '../translations';

const AnnualIncome = ({ lang }) => {
    const [year, setYear] = useState(2024);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const t = translations[lang] || translations['en'];

    useEffect(() => {
        fetchAnnualReport(year);
    }, [year]);

    const fetchAnnualReport = async (selectedYear) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/annual-income?year=${selectedYear}`);
            if (res.ok) {
                const json = await res.json();
                setReportData(json);
            } else {
                console.error("Failed to fetch annual report");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="text-green-600" />
                        Annual Income Report
                    </h1>
                    <p className="text-gray-500">Generate your General Income Tax figures</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {[2024, 2025, 2026].map((y) => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${year === y ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-gray-500 animate-pulse">Calculating Annual Income...</div>
            ) : reportData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Main Stats Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-xl shadow-lg relative overflow-hidden md:col-span-2">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center">
                            <div>
                                <h2 className="text-gray-400 font-medium mb-1 uppercase tracking-wider text-sm">Total Revenue ({year})</h2>
                                <div className="text-5xl font-bold mb-2">
                                    {reportData.totalRevenue.toLocaleString()} <span className="text-2xl text-gray-400">EGP</span>
                                </div>
                                <p className="text-gray-400 text-sm">
                                    Total Invoices Issued: <span className="text-white font-bold">{reportData.invoiceCount}</span>
                                </p>
                            </div>
                            <div className="mt-6 md:mt-0 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 max-w-sm">
                                <FileText className="text-green-400 mb-2" size={24} />
                                <h3 className="font-bold text-lg mb-1">Tax Filing Figure</h3>
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    Use the figure <strong>{reportData.totalRevenue.toLocaleString()} EGP</strong> as your "Total Annual Sales/Revenue" in the General Income Tax Return on the ETA portal.
                                </p>
                            </div>
                        </div>

                        {/* Background Decor */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500 rounded-full blur-3xl opacity-10"></div>
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-10"></div>
                    </div>

                    {/* Breakdown / Actions */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Download size={18} className="text-gray-500" />
                            Export Options
                        </h3>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                                <span className="flex items-center gap-2">
                                    <FileText size={16} />
                                    Download Summary PDF
                                </span>
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded">Coming Soon</span>
                            </button>
                            <button className="w-full flex items-center justify-between p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                                <span className="flex items-center gap-2">
                                    <FileText size={16} />
                                    Export to Excel
                                </span>
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded">Coming Soon</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-blue-800">
                        <h3 className="font-bold mb-2">Note on Expenses</h3>
                        <p className="text-sm opacity-80 mb-4">
                            Income tax is calculated on Net Profit (Revenue - Expenses). You must manually deduct your valid business expenses (rent, salaries, utilities, purchases) in the portal.
                        </p>
                        <p className="text-sm font-bold">
                            Current App Calculation: Revenue Only
                        </p>
                    </div>
                </div>
            ) : (
                <div className="text-center p-12 text-gray-400">Select a year to view report</div>
            )}
        </div>
    );
};

export default AnnualIncome;
