import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { translations } from '../translations';

const FormalVATReport = ({ selectedMonth, onBack, lang }) => {
    const [monthDetails, setMonthDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const t = translations[lang] || translations['en'];
    const isArabic = lang === 'ar';

    useEffect(() => {
        if (selectedMonth) {
            fetchMonthDetails();
        }
    }, [selectedMonth]);

    const fetchMonthDetails = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/tax/vat/month/${selectedMonth}`);
            const json = await res.json();
            setMonthDetails(json);
        } catch (error) {
            console.error('Failed to fetch month details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        const blob = new Blob([JSON.stringify(monthDetails, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedMonth}_vat_return.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }


    if (!monthDetails) return null;

    return (
        <div className="print:p-0" dir={isArabic ? 'rtl' : 'ltr'}>
            {/* Header with Back Button - Hidden in print */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl shadow-lg mb-6 print:hidden">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            title={isArabic ? 'رجوع' : 'Back'}
                        >
                            <ArrowLeft size={24} className={isArabic ? 'rotate-180' : ''} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold">{monthDetails.periodName}</h2>
                            <p className="text-blue-100">{t.vatReturnDetails}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                            <Printer size={18} />
                            <span className="hidden md:inline">{isArabic ? 'طباعة' : 'Print'}</span>
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                            <Download size={18} />
                            <span className="hidden md:inline">{t.downloadJSON}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Formal Report Content */}
            <div className="bg-white p-8 print:p-12 rounded-xl shadow-sm">
                {/* Official Header */}
                <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
                    <div className="text-sm text-gray-600 mb-2">
                        {isArabic ? 'جمهورية مصر العربية' : 'Arab Republic of Egypt'}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {isArabic ? 'مصلحة الضرائب المصرية' : 'Egyptian Tax Authority'}
                    </h1>
                    <div className="text-lg font-semibold text-gray-700">
                        {isArabic ? 'إقرار ضريبة القيمة المضافة - نموذج 10' : 'VAT Return - Form 10'}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                        {isArabic ? 'تقديم طوعي متأخر - القانون 5 لسنة 2025' : 'Late Voluntary Submission - Law 5/2025'}
                    </div>
                </div>

                {/* Company Information */}
                <div className="grid grid-cols-2 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
                    <div>
                        <div className="text-sm text-gray-600 mb-1">
                            {isArabic ? 'اسم المنشأة' : 'Company Name'}
                        </div>
                        <div className="font-bold text-gray-900">
                            {isArabic ? 'لابك لتجاره الالكترونيات' : 'Laapak Electronics Trading'}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600 mb-1">
                            {isArabic ? 'الرقم الضريبي' : 'Tax ID'}
                        </div>
                        <div className="font-bold text-gray-900 font-mono">767043545</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600 mb-1">
                            {isArabic ? 'الفترة الضريبية' : 'Tax Period'}
                        </div>
                        <div className="font-bold text-gray-900">{monthDetails.periodName}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600 mb-1">
                            {isArabic ? 'تاريخ الإعداد' : 'Preparation Date'}
                        </div>
                        <div className="font-bold text-gray-900">
                            {new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </div>
                    </div>
                </div>

                {/* Section 1: Sales (Output Tax) */}
                <div className="mb-8">
                    <div className="bg-blue-900 text-white p-3 rounded-t-lg">
                        <h3 className="font-bold text-lg">
                            {isArabic ? 'القسم الأول: المبيعات (ضريبة المخرجات)' : 'Section 1: Sales (Output Tax)'}
                        </h3>
                    </div>
                    <table className="w-full border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-gray-300 p-3 text-right font-semibold">
                                    {isArabic ? 'البيان' : 'Description'}
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold w-40">
                                    {isArabic ? 'القيمة (ج.م)' : 'Value (EGP)'}
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold w-40">
                                    {isArabic ? 'الضريبة (ج.م)' : 'Tax (EGP)'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-3">
                                    {isArabic ? 'المبيعات المحلية (14%)' : 'Local Sales (14%)'}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono">
                                    {monthDetails.sales.local.value.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono font-bold text-blue-600">
                                    {monthDetails.sales.local.tax.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                            </tr>
                            <tr className="bg-gray-50">
                                <td className="border border-gray-300 p-3">
                                    {isArabic ? 'الصادرات (0%)' : 'Exports (0%)'}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono">
                                    {monthDetails.sales.exports.value.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono">0</td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-3">
                                    {isArabic ? 'المبيعات المعفاة' : 'Exempt Sales'}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono">
                                    {monthDetails.sales.exempt.value.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono">0</td>
                            </tr>
                            <tr className="bg-blue-50 font-bold">
                                <td className="border border-gray-300 p-3">
                                    {isArabic ? 'إجمالي ضريبة المخرجات' : 'Total Output Tax'}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono">
                                    {monthDetails.summary.totalSales.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono text-blue-600 text-lg">
                                    {monthDetails.summary.totalOutputVAT.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Section 2: Purchases (Input Tax) */}
                <div className="mb-8">
                    <div className="bg-green-900 text-white p-3 rounded-t-lg">
                        <h3 className="font-bold text-lg">
                            {isArabic ? 'القسم الثاني: المشتريات (ضريبة المدخلات)' : 'Section 2: Purchases (Input Tax)'}
                        </h3>
                    </div>
                    <table className="w-full border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-gray-300 p-3 text-right font-semibold">
                                    {isArabic ? 'البيان' : 'Description'}
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold w-40">
                                    {isArabic ? 'القيمة (ج.م)' : 'Value (EGP)'}
                                </th>
                                <th className="border border-gray-300 p-3 text-center font-semibold w-40">
                                    {isArabic ? 'الضريبة (ج.م)' : 'Tax (EGP)'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-3">
                                    {isArabic ? 'المشتريات المحلية القابلة للخصم' : 'Deductible Local Purchases'}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono">
                                    {monthDetails.inputs.value.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono font-bold text-green-600">
                                    {monthDetails.inputs.tax.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                            </tr>
                            <tr className="bg-green-50 font-bold">
                                <td className="border border-gray-300 p-3">
                                    {isArabic ? 'إجمالي ضريبة المدخلات' : 'Total Input Tax'}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono">
                                    {monthDetails.inputs.value.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono text-green-600 text-lg">
                                    {monthDetails.summary.totalInputVAT.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Section 3: Net Tax Position */}
                <div className="mb-8">
                    <div className={`${monthDetails.summary.netVATDue < 0 ? 'bg-green-900' : 'bg-purple-900'} text-white p-3 rounded-t-lg`}>
                        <h3 className="font-bold text-lg">
                            {isArabic ? 'القسم الثالث: صافي المركز الضريبي' : 'Section 3: Net Tax Position'}
                        </h3>
                    </div>
                    <table className="w-full border border-gray-300">
                        <tbody>
                            <tr className="bg-gray-50">
                                <td className="border border-gray-300 p-3 font-semibold">
                                    {isArabic ? 'إجمالي ضريبة المخرجات' : 'Total Output Tax'}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono w-48">
                                    {monthDetails.summary.totalOutputVAT.toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 p-3 font-semibold">
                                    {isArabic ? 'إجمالي ضريبة المدخلات' : 'Total Input Tax'}
                                </td>
                                <td className="border border-gray-300 p-3 text-center font-mono w-48">
                                    ({monthDetails.summary.totalInputVAT.toLocaleString(isArabic ? 'ar-EG' : 'en-US')})
                                </td>
                            </tr>
                            <tr className={`${monthDetails.summary.netVATDue < 0 ? 'bg-green-100' : 'bg-purple-100'} font-bold text-lg`}>
                                <td className="border border-gray-300 p-4">
                                    {monthDetails.summary.netVATDue < 0
                                        ? (isArabic ? 'رصيد دائن (قابل للاسترداد)' : 'Credit Balance (Refundable)')
                                        : (isArabic ? 'صافي الضريبة المستحقة' : 'Net Tax Payable')
                                    }
                                </td>
                                <td className={`border border-gray-300 p-4 text-center font-mono text-xl ${monthDetails.summary.netVATDue < 0 ? 'text-green-700' : 'text-purple-700'
                                    }`}>
                                    {Math.abs(monthDetails.summary.netVATDue).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}
                                    {isArabic ? ' ج.م' : ' EGP'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Declaration */}
                <div className="mt-12 p-6 bg-gray-50 rounded-lg border-2 border-gray-300">
                    <h4 className="font-bold text-gray-900 mb-3">
                        {isArabic ? 'إقرار المكلف' : 'Taxpayer Declaration'}
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed mb-4">
                        {isArabic
                            ? 'أقر بأن البيانات الواردة في هذا الإقرار صحيحة وكاملة ودقيقة، وأنني على علم بالتزاماتي بموجب قانون الضريبة على القيمة المضافة رقم 67 لسنة 2016 ولائحته التنفيذية. وأتعهد بالالتزام بالمواعيد القانونية للتقديم مستقبلاً.'
                            : 'I declare that the information provided in this return is true, complete, and accurate to the best of my knowledge. I understand my obligations under VAT Law No. 67 of 2016 and its executive regulations. I commit to timely compliance going forward.'
                        }
                    </p>
                    <div className="grid grid-cols-2 gap-8 mt-8">
                        <div>
                            <div className="text-sm text-gray-600 mb-2">
                                {isArabic ? 'التوقيع' : 'Signature'}
                            </div>
                            <div className="border-b-2 border-gray-400 h-12"></div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 mb-2">
                                {isArabic ? 'التاريخ' : 'Date'}
                            </div>
                            <div className="border-b-2 border-gray-400 h-12"></div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-300 text-center text-xs text-gray-500">
                    <p>
                        {isArabic
                            ? 'تم إعداد هذا الإقرار بواسطة نظام المحاسب الضريبي الإلكتروني'
                            : 'This return was prepared using the Electronic Tax Accountant System'
                        }
                    </p>
                    <p className="mt-1">
                        {isArabic
                            ? `رقم الفاتورة الإلكترونية: ${selectedMonth}`
                            : `E-Invoice Reference: ${selectedMonth}`
                        }
                    </p>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print\\:p-0,
                    .print\\:p-0 * {
                        visibility: visible;
                    }
                    .print\\:p-0 {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default FormalVATReport;
