import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, AlertCircle, CheckCircle2, Clock, TrendingDown, TrendingUp, Package } from 'lucide-react';
import { translations } from '../translations';

const TaxComplianceDashboard = ({ lang, onSelectMonth }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

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
                        <span className="text-xs text-gray-500">{t.total}</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{vat.totalReturns + 2}</div>
                    <div className="text-sm text-gray-600">{t.totalDeclarations}</div>
                    <div className="text-xs text-gray-500 mt-1">{vat.totalReturns} {t.monthlyVATReturns.split(' ')[0]} + 2 {t.corporateIncomeTax.split(' ')[0]}</div>
                </div>

                {/* Total Invoices */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <FileText className="text-green-600" size={24} />
                        <span className="text-xs text-gray-500">{lang === 'ar' ? 'معالج' : 'Processed'}</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{vat.totals.totalInvoices}</div>
                    <div className="text-sm text-gray-600">{t.totalInvoicesProcessed}</div>
                    <div className="text-xs text-gray-500 mt-1">{lang === 'ar' ? 'نوفمبر 2024 - ديسمبر 2025' : 'Nov 2024 - Dec 2025'}</div>
                </div>

                {/* Net VAT Position */}
                <div className={`bg-white p-6 rounded-xl shadow-sm border ${vat.totals.totalNetVATDue < 0 ? 'border-green-200' : 'border-blue-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        {vat.totals.totalNetVATDue < 0 ? (
                            <TrendingDown className="text-green-600" size={24} />
                        ) : (
                            <TrendingUp className="text-blue-600" size={24} />
                        )}
                        <span className="text-xs text-gray-500">{t.netVATPosition}</span>
                    </div>
                    <div className={`text-3xl font-bold ${vat.totals.totalNetVATDue < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                        {Math.abs(vat.totals.totalNetVATDue).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </div>
                    <div className="text-sm text-gray-600">{lang === 'ar' ? 'ج.م' : 'EGP'}</div>
                    <div className={`text-xs mt-1 font-medium ${vat.totals.totalNetVATDue < 0 ? 'text-green-600' : 'text-blue-600'}`}>
                        {vat.totals.totalNetVATDue < 0 ? t.refundable : t.payable}
                    </div>
                </div>

                {/* Corporate Tax */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <FileText className="text-purple-600" size={24} />
                        <span className="text-xs text-gray-500">{t.corporateIncomeTax}</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        <div className="text-[10px] text-amber-700 uppercase font-bold">{lang === 'ar' ? 'الموعد النهائي القادم' : 'Next Deadline'}</div>
                        <div className="text-sm font-bold text-amber-900">
                            {lang === 'ar' ? 'إقرار القيمة المضافة - ٣١ مارس ٢٠٢٥' : 'VAT Return - March 31, 2025'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                <MetricCard
                    title={lang === 'ar' ? 'تغطية الفواتير' : 'Invoice Coverage'}
                    value="100%"
                    status="success"
                    icon={FileText}
                    desc={lang === 'ar' ? 'كل الفواتير مربوطة بـ SAP' : 'All invoices linked to SAP'}
                />
                <MetricCard
                    title={lang === 'ar' ? 'معدل صحة البيانات' : 'Data Integrity'}
                    value="98.5%"
                    status="success"
                    icon={TrendingUp}
                    desc={lang === 'ar' ? 'بيانات التكويد والضرائب' : 'Tax & coding integrity'}
                />
                <MetricCard
                    title={lang === 'ar' ? 'المخاطر الضريبية' : 'Tax Risk'}
                    value={lang === 'ar' ? 'منخفض' : 'Low'}
                    status="success"
                    icon={AlertCircle}
                    desc={lang === 'ar' ? 'بناءً على الفروقات الضريبية' : 'Based on tax variances'}
                />
                <MetricCard
                    title={lang === 'ar' ? 'تاريخ الالتزام' : 'Filing History'}
                    value="12/12"
                    status="success"
                    icon={CheckCircle2}
                    desc={lang === 'ar' ? 'الإقرارات المقدمة في ٢٠٢٤' : 'Returns filed in 2024'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Filing Status */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 lg:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="font-bold text-gray-900 text-sm lg:text-base">{lang === 'ar' ? 'حالة الإقرارات الشهرية' : 'Monthly Filing Status'}</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/50 text-gray-500 text-[10px] uppercase font-bold">
                                <tr>
                                    <th className={`px-4 lg:px-6 py-3 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>Period</th>
                                    <th className={`px-4 lg:px-6 py-3 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>Status</th>
                                    <th className={`px-4 lg:px-6 py-3 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>Payment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filingHistory.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className={`px-4 lg:px-6 py-3 font-medium ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{item.period}</td>
                                        <td className={`px-4 lg:px-6 py-3 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                                {lang === 'ar' ? 'تم التقديم' : 'Filed'}
                                            </span>
                                        </td>
                                        <td className={`px-4 lg:px-6 py-3 font-mono ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{item.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 lg:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="font-bold text-gray-900 text-sm lg:text-base">{lang === 'ar' ? 'إجراءات سريعة' : 'Compliance Actions'}</h2>
                    </div>
                    <div className="p-4 lg:p-6 grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                        <ActionButton
                            icon={CheckCircle2}
                            title={lang === 'ar' ? 'فحص الفواتير المفقودة' : 'Missing Invoice Audit'}
                            desc={lang === 'ar' ? 'مقارنة فواتير SAP مع منظومة الضرائب' : 'Audit SAP vs ETA Portal'}
                            color="blue"
                        />
                        <ActionButton
                            icon={Shield}
                            title={lang === 'ar' ? 'تقرير المخاطر الضريبية' : 'Tax Risk Report'}
                            desc={lang === 'ar' ? 'تحليل الفروقات الضريبية للفترة الحالية' : 'Analyze current tax variances'}
                            color="amber"
                        />
                        <ActionButton
                            icon={Languages}
                            title={lang === 'ar' ? 'مراجعة الأكواد (GS1/EGS)' : 'Coding Audit'}
                            desc={lang === 'ar' ? 'فحص صحة أكواد السلع والخدمات' : 'Review GS1/EGS code integrity'}
                            color="purple"
                        />
                        <ActionButton
                            icon={FileText}
                            title={lang === 'ar' ? 'شهادة الالتزام' : 'Compliance Certificate'}
                            desc={lang === 'ar' ? 'إصدار شهادة التزام إلكترونية' : 'Generate compliance certificate'}
                            color="green"
                        />
                    </div>
                </div>
            </div>

            {/* Monthly VAT Returns */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                    <h2 className="font-bold text-blue-900">{t.monthlyVATReturns} ({vat.totalReturns})</h2>
                    <p className="text-blue-600 text-sm">{t.clickMonthDetails}</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                            <tr>
                                <th className={`px-6 py-3 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.period}</th>
                                <th className="px-6 py-3 text-center">{t.invoicesCount}</th>
                                <th className="px-6 py-3 text-center">{t.sales}</th>
                                <th className="px-6 py-3 text-center">{t.outputVAT}</th>
                                <th className="px-6 py-3 text-center">{t.inputVAT}</th>
                                <th className="px-6 py-3 text-center">{t.netDue}</th>
                                <th className="px-6 py-3 text-center">{t.statusLabel}</th>
                                <th className="px-6 py-3 text-center">{t.action}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {vat.periods.map((period) => (
                                <tr key={period.period} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelectMonth && onSelectMonth(period.period)}>
                                    <td className={`px-6 py-4 font-medium text-gray-900 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                        {period.periodName}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-600">{period.invoiceCount}</td>
                                    <td className="px-6 py-4 text-center text-gray-900 font-mono text-sm">
                                        -
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-900 font-mono text-sm">
                                        -
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-900 font-mono text-sm">
                                        -
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold">
                                        <span className={period.netVATDue < 0 ? 'text-green-600' : 'text-blue-600'}>
                                            {period.netVATDue.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${period.status === 'Refundable'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {period.status === 'Refundable' ? t.refundable : t.payable}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectMonth && onSelectMonth(period.period);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            {t.viewDetails}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold">
                            <tr>
                                <td className={`px-6 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.total}</td>
                                <td className="px-6 py-4 text-center">{vat.totals.totalInvoices}</td>
                                <td className="px-6 py-4 text-center">{vat.totals.totalSales.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                                <td className="px-6 py-4 text-center">{vat.totals.totalOutputVAT.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                                <td className="px-6 py-4 text-center">{vat.totals.totalInputVAT.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={vat.totals.totalNetVATDue < 0 ? 'text-green-600' : 'text-blue-600'}>
                                        {vat.totals.totalNetVATDue.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}
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
                            <h3 className="font-bold text-gray-900 mb-4">{t.incomeTax2024}</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t.revenue}</span>
                                    <span className="font-mono">{incomeTax['2024'].revenue.totalRevenue.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t.cogs}</span>
                                    <span className="font-mono">{incomeTax['2024'].cogs.totalCOGS.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t.grossProfit}</span>
                                    <span className={`font-mono ${incomeTax['2024'].grossProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {incomeTax['2024'].grossProfit.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t.operatingExpenses}</span>
                                    <span className="font-mono">{incomeTax['2024'].operatingExpenses.total.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                                </div>
                                <div className="border-t pt-3 flex justify-between font-bold">
                                    <span>{t.corporateTaxRate}</span>
                                    <span className="text-blue-600">{incomeTax['2024'].corporateTax.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
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
                            <h3 className="font-bold text-gray-900 mb-4">{t.incomeTax2025}</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t.revenue}</span>
                                    <span className="font-mono">{incomeTax['2025'].revenue.totalRevenue.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t.cogs}</span>
                                    <span className="font-mono">{incomeTax['2025'].cogs.totalCOGS.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t.grossProfit}</span>
                                    <span className={`font-mono ${incomeTax['2025'].grossProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {incomeTax['2025'].grossProfit.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t.operatingExpenses}</span>
                                    <span className="font-mono">{incomeTax['2025'].operatingExpenses.total.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                                </div>
                                <div className="border-t pt-3 flex justify-between font-bold">
                                    <span>{t.corporateTaxRate}</span>
                                    <span className="text-blue-600">{incomeTax['2025'].corporateTax.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
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

        </div>
    );
};

export default TaxComplianceDashboard;
