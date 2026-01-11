import React from 'react';
import { LayoutDashboard, FileText, FileSpreadsheet, Download, Languages } from 'lucide-react';
import { translations } from '../translations';

const Layout = ({ children, activeTab, setActiveTab, lang, setLang }) => {
    const t = translations[lang] || translations['en'];

    const navItems = [
        { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
        { id: 'invoices', label: t.invoices, icon: FileText },
        { id: 'tax-return', label: t.taxReturn, icon: FileSpreadsheet },
        { id: 'fetch', label: t.fetchData, icon: Download },
    ];

    const toggleLang = () => {
        setLang(prev => prev === 'en' ? 'ar' : 'en');
    };

    return (
        <div className="flex h-screen bg-gray-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white shadow-xl flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold tracking-tight text-white">
                        {lang === 'ar' ? 'المحاسب الضريبي' : 'Tax Accountant'}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        {lang === 'ar' ? 'النظام الضريبي المصري' : 'Egyptian Tax System'}
                    </p>
                </div>
                <nav className="p-4 space-y-2 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all border border-transparent ${activeTab === item.id
                                    ? 'bg-blue-600 text-white shadow-md border-blue-500'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className={`font-medium ${lang === 'ar' ? 'font-sans' : ''}`}>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Language Toggle */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={toggleLang}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                        <Languages size={18} />
                        <span className="font-medium">
                            {lang === 'en' ? 'العربية' : 'English'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <header className="bg-white border-b border-gray-200 px-8 py-5 shadow-sm sticky top-0 z-10 transition-all">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
                            {navItems.find(i => i.id === activeTab)?.label}
                        </h2>
                    </div>
                </header>
                <main className="p-8 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
