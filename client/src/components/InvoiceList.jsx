import React, { useState } from 'react';
import { Search, Filter, AlertCircle, FileText } from 'lucide-react';
import { translations } from '../translations';

const InvoiceList = ({ invoices, onViewDetails, lang }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('ALL'); // ALL, WARNING, VALID

    const t = translations[lang] || translations['en'];

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch =
            inv.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.internalID.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === 'WARNING') return matchesSearch && (inv.vatAmount === 0 && !inv.isExport);
        return matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative w-96">
                    <Search className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={18} />
                    <input
                        type="text"
                        placeholder={t.noInvoices.replace('found matching criteria', '') + '...'}
                        className={`w-full py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        {t.noInvoices.includes('found') ? 'All Invoices' : 'كل الفواتير'}
                    </button>
                    <button
                        onClick={() => setFilter('WARNING')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'WARNING' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'}`}
                    >
                        <AlertCircle size={14} className={`inline ${lang === 'ar' ? 'ml-2' : 'mr-2'}`} />
                        {t.warning}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4 w-10"></th>
                            <th className={`px-6 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.status}</th>
                            <th className={`px-6 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.internalId}</th>
                            <th className={`px-6 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.date}</th>
                            <th className={`px-6 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{t.customerEntity}</th>
                            <th className={`px-6 py-4 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{t.total}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredInvoices.map((inv) => {
                            const isSale = inv.direction === 'Sales';
                            return (
                                <tr
                                    key={inv.uuid}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    onClick={() => onViewDetails(inv.internalID)}
                                >
                                    <td className="px-6 py-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSale ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                            }`}>
                                            {isSale ? (lang === 'ar' ? '↖' : '↗') : (lang === 'ar' ? '↘' : '↙')}
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                        {inv.vatAmount === 0 && !inv.isExport ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                {t.warning}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                {t.valid}
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 font-mono text-slate-600 font-medium group-hover:text-blue-600 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                        {inv.internalID}
                                    </td>
                                    <td className={`px-6 py-4 text-slate-600 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>{new Date(inv.dateTimeIssued).toLocaleDateString()}</td>
                                    <td className={`px-6 py-4 font-medium text-slate-900 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                        {isSale ? inv.receiverName : inv.issuerName}
                                    </td>
                                    <td className={`px-6 py-4 font-bold text-slate-900 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{inv.totalAmount.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                        {filteredInvoices.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-300">
                                    <FileText className="mx-auto h-12 w-12 mb-3 opacity-20" />
                                    {t.noInvoices}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InvoiceList;
