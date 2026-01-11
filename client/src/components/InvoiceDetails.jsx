import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Download, MapPin, Calendar, Hash, Building2, Phone, Mail } from 'lucide-react';

const InvoiceDetails = ({ internalId, onBack }) => {
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [parsedDoc, setParsedDoc] = useState(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const res = await fetch(`/api/invoices/${internalId}`);
                if (res.ok) {
                    const data = await res.json();
                    setInvoice(data);
                    // Parse the inner document string
                    if (data.document) {
                        try {
                            setParsedDoc(JSON.parse(data.document));
                        } catch (e) {
                            console.error("Failed to parse document string", e);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching invoice details", error);
            } finally {
                setLoading(false);
            }
        };

        if (internalId) {
            fetchInvoice();
        }
    }, [internalId]);

    if (loading) return (
        <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!invoice || !parsedDoc) return (
        <div className="text-center p-12 text-gray-500">
            <p>Invoice not found or invalid format.</p>
            <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Go Back</button>
        </div>
    );

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(amount);
    };

    const isCreditNote = invoice.typeName === 'c' || parsedDoc.documentType === 'c';
    const isDebitNote = invoice.typeName === 'd' || parsedDoc.documentType === 'd';
    const typeLabel = isCreditNote ? 'Credit Note' : isDebitNote ? 'Debit Note' : 'Tax Invoice';
    const typeColor = isCreditNote ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50';

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Back to List
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                        <Printer size={18} />
                        Print
                    </button>
                    {/* Placeholder for download */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
                        <Download size={18} />
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Invoice Paper */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-5xl mx-auto print:shadow-none print:border-none">

                {/* Header / Brand */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${isCreditNote ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>
                                    {typeLabel}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold mb-1">
                                {parsedDoc.issuer.name}
                            </h1>
                            <div className="text-slate-400 text-sm flex items-center gap-4">
                                <span className="flex items-center gap-1"><Building2 size={14} /> ID: {parsedDoc.issuer.id}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-mono font-bold tracking-tight opacity-90">#{invoice.internalId}</h2>
                            <p className="text-slate-400 mt-1 flex items-center justify-end gap-2">
                                <Calendar size={14} />
                                {new Date(invoice.dateTimeIssued).toLocaleDateString(undefined, {
                                    year: 'numeric', month: 'long', day: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                            <p className="text-slate-500 text-xs font-mono mt-2">UUID: {invoice.uuid.substring(0, 8)}...</p>
                        </div>
                    </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 p-8 border-b border-gray-100">
                    {/* Issuer */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Issued By</h3>
                        <div className="text-gray-800 font-medium text-lg mb-2">{parsedDoc.issuer.name}</div>
                        <div className="text-gray-500 text-sm leading-relaxed">
                            {parsedDoc.issuer.address.street}<br />
                            {parsedDoc.issuer.address.regionCity}, {parsedDoc.issuer.address.governate}<br />
                            {parsedDoc.issuer.address.country}
                        </div>
                    </div>
                    {/* Receiver */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Billed To</h3>
                        <div className="text-gray-800 font-medium text-lg mb-2">{parsedDoc.receiver.name}</div>
                        <div className="text-gray-500 text-sm leading-relaxed">
                            {parsedDoc.receiver.address.street}<br />
                            {parsedDoc.receiver.address.regionCity}, {parsedDoc.receiver.address.governate}<br />
                            {parsedDoc.receiver.address.country}<br />
                            <span className="text-gray-400 mt-1 block flex items-center gap-1"><Hash size={12} /> Tax ID: {parsedDoc.receiver.id}</span>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="p-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Line Items</h3>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Item & Description</th>
                                    <th className="px-6 py-4 text-right">Qty</th>
                                    <th className="px-6 py-4 text-right">Unit Price</th>
                                    <th className="px-6 py-4 text-right">Sales Total</th>
                                    <th className="px-6 py-4 text-right">Taxes</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {parsedDoc.invoiceLines.map((line, idx) => {
                                    const taxAmount = line.taxableItems ? line.taxableItems.reduce((acc, t) => acc + t.amount, 0) : 0;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{line.description}</div>
                                                <div className="text-gray-400 text-xs font-mono mt-1">{line.itemCode}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600">{line.quantity}</td>
                                            <td className="px-6 py-4 text-right text-gray-600">
                                                {formatCurrency(line.unitValue.amountEGP)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600 font-medium">
                                                {formatCurrency(line.salesTotal)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-500 text-xs">
                                                {line.taxableItems && line.taxableItems.map((t, i) => (
                                                    <div key={i} className="whitespace-nowrap">
                                                        {t.taxType} ({t.rate}%): {t.amount.toLocaleString()}
                                                    </div>
                                                ))}
                                                {(!line.taxableItems || line.taxableItems.length === 0) && '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                {formatCurrency(line.total)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Totals */}
                <div className="bg-gray-50 p-8 border-t border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12">

                        {/* Status / Notes */}
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Invoice Status</h4>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${invoice.status === 'Valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {invoice.status}
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="w-full md:w-80 space-y-3 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal (Sales)</span>
                                <span>{formatCurrency(invoice.totalSales)}</span>
                            </div>

                            {parsedDoc.taxTotals && parsedDoc.taxTotals.length > 0 && (
                                <div className="border-t border-gray-200 pt-3 space-y-2">
                                    {parsedDoc.taxTotals.map((tax, idx) => (
                                        <div key={idx} className="flex justify-between text-gray-600">
                                            <span>
                                                {tax.taxType === 'T1' ? 'VAT (T1)' :
                                                    tax.taxType === 'T4' ? 'WHT (T4)' :
                                                        tax.taxType}
                                            </span>
                                            <span className="font-medium">{formatCurrency(tax.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t-2 border-gray-200 pt-3 mt-3 flex justify-between items-center">
                                <span className="font-bold text-gray-900 text-lg">Total</span>
                                <span className="font-bold text-blue-600 text-xl">{formatCurrency(invoice.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetails;
