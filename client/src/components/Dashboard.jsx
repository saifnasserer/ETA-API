import React from 'react';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { translations } from '../translations';

const StatCard = ({ title, value, subtext, type, icon: Icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 w-full hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            </div>
            <div className={`p-2 rounded-lg ${type === 'success' ? 'bg-green-50 text-green-600' :
                type === 'warning' ? 'bg-amber-50 text-amber-600' :
                    type === 'danger' ? 'bg-red-50 text-red-600' :
                        'bg-blue-50 text-blue-600'
                }`}>
                <Icon size={20} />
            </div>
        </div>
        <p className={`text-xs font-medium flex items-center ${type === 'success' ? 'text-green-600' : 'text-gray-400'
            }`}>
            {subtext}
        </p>
    </div>
);

const Dashboard = ({ summary, lang }) => {
    const t = translations[lang] || translations['en'];

    if (!summary) return <div className="p-12 text-center text-gray-400">{t.processing}</div>;

    // Find latest period or aggregate
    const currentPeriod = summary[0] || {};

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title={t.vatPayable}
                    value={`EGP ${currentPeriod.totalVAT?.toLocaleString() || '0'}`}
                    subtext={`+12.5% ${t.vsLastMonth}`}
                    type="primary"
                    icon={ArrowUpRight}
                />
                <StatCard
                    title={t.totalRevenue}
                    value={`EGP ${currentPeriod.totalSales?.toLocaleString() || '0'}`}
                    subtext={`${currentPeriod.invoiceCount || 0} ${t.invoicesCount}`}
                    type="success"
                    icon={CheckCircle}
                />
                <StatCard
                    title={t.whtDeducted}
                    value={`EGP ${currentPeriod.totalWHT?.toLocaleString() || '0'}`}
                    subtext={t.underOnePercent}
                    type="warning"
                    icon={ArrowDownRight}
                />
                <StatCard
                    title={t.complianceFlags}
                    value={currentPeriod.flags?.length || 0}
                    subtext={t.warning}
                    type="danger"
                    icon={AlertTriangle}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t.taxOverview}</h3>
                    <div className="h-80 w-full" style={{ minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={summary}
                                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="period"
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    width={80}
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => {
                                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                                        return value;
                                    }}
                                />
                                <Tooltip
                                    formatter={(value) => `EGP ${value.toLocaleString()}`}
                                    contentStyle={{ fontSize: '12px' }}
                                />
                                <Bar dataKey="totalVAT" fill="#2563eb" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{t.recentActivity}</h3>
                    <div className="space-y-4">
                        {currentPeriod.flags?.slice(0, 5).map((flag, idx) => {
                            // Translate flag type using error_ prefix
                            const translatedType = t[`error_${flag.type}`] || flag.type;
                            return (
                                <div key={idx} className="flex items-start bg-red-50 p-3 rounded-lg border border-red-100">
                                    <AlertTriangle className={`text-red-500 mt-0.5 shrink-0 ${lang === 'ar' ? 'ml-3' : 'mr-3'}`} size={16} />
                                    <div className={lang === 'ar' ? 'text-right' : ''}>
                                        <p className="text-sm font-semibold text-red-700">{translatedType}</p>
                                        <p className="text-xs text-red-600 mt-1">{flag.message}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {!currentPeriod.flags?.length && (
                            <div className="text-center py-8 text-gray-400">
                                <CheckCircle className="mx-auto mb-2 text-green-400 h-8 w-8" />
                                <p>{t.noIssues}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
