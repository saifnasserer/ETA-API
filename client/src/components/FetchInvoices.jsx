import React, { useState } from 'react';
import { Download, Calendar, Hash, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { translations } from '../translations';

const FetchInvoices = ({ lang }) => {
    const [fetchMode, setFetchMode] = useState('month'); // 'month' or 'id'
    const [month, setMonth] = useState('2024-11');
    const [internalId, setInternalId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const t = translations[lang] || translations['en'];

    const handleFetch = async () => {
        setLoading(true);
        setResult(null);

        try {
            const payload = fetchMode === 'month'
                ? { month }
                : { internalId };

            const response = await fetch('/api/fetch-invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                setResult({ success: true, data });
            } else {
                setResult({ success: false, error: data.error || 'Failed to fetch' });
            }
        } catch (error) {
            setResult({ success: false, error: error.message });
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6 pb-20">
            <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2 mb-2">
                    <Download className="text-blue-600" />
                    {t.fetchData}
                </h1>
            </div>

            {/* Result Display */}
            {result && (
                <div className={`p-6 rounded-xl shadow-sm border ${result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-start gap-3">
                        {result.success ? (
                            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
                        ) : (
                            <XCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
                        )}
                        <div className="flex-1">
                            <h3 className={`font-bold text-lg ${result.success ? 'text-green-800' : 'text-red-800'
                                }`}>
                                {result.success ? (lang === 'ar' ? 'نجاح!' : 'Success!') : (lang === 'ar' ? 'خطأ' : 'Error')}
                            </h3>
                            {result.success ? (
                                <div className="mt-2 space-y-2">
                                    <p className="text-green-700">{result.data.message}</p>
                                    {result.data.total && (
                                        <div className="bg-white p-4 rounded-lg border border-green-200 mt-3">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div>
                                                    <div className="text-2xl font-bold text-gray-900">
                                                        {result.data.total}
                                                    </div>
                                                    <div className="text-sm text-gray-500">Total Found</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {result.data.fetched}
                                                    </div>
                                                    <div className="text-sm text-gray-500">Fetched</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-red-600">
                                                        {result.data.failed}
                                                    </div>
                                                    <div className="text-sm text-gray-500">Failed</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-red-700 mt-2">{result.error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex gap-3">
                    <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div className="text-sm text-blue-800">
                        <p className="font-medium mb-2">{lang === 'ar' ? 'ملاحظات هامة:' : 'Important Notes:'}</p>
                        <ul className={`list-disc list-inside space-y-1 text-blue-700 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                            <li>{lang === 'ar' ? 'يتم حفظ الفواتير في مجلد' : 'Invoices are saved to'} <code className="bg-blue-100 px-1 rounded">invoices_full/</code></li>
                            <li>{lang === 'ar' ? 'يتم جلب الفواتير الصحيحة فقط' : 'Only valid invoices are fetched'}</li>
                            <li>{lang === 'ar' ? 'قد يحدث تقييد للمعدل - يمكن إعادة المحاولة لاحقاً' : 'Rate limiting may occur - failed invoices can be retried later'}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FetchInvoices;
