import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, FileSpreadsheet, Download, Languages, Shield, TrendingUp } from 'lucide-react';
import { translations } from '../translations';

const Layout = ({ children, lang, setLang }) => {
    const t = translations[lang] || translations['en'];
    const location = useLocation();

    const navItems = [
        { id: '/invoices', label: t.invoices, icon: FileText },
        { id: '/tax-return', label: t.taxReturn, icon: FileSpreadsheet },
        { id: '/tax-compliance', label: lang === 'ar' ? 'الامتثال الضريبي' : 'Tax Compliance', icon: Shield },
    ];

    const toggleLang = () => {
        setLang(prev => prev === 'en' ? 'ar' : 'en');
    };

    // Determine the active item based on the current pathname
    const activePath = location.pathname;

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-gray-50" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {/* Mobile Header */}
            <header className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
                <div className="flex flex-col">
                    <h1 className="text-lg font-bold tracking-tight">
                        {lang === 'ar' ? 'المحاسب الضريبي' : 'Tax Accountant'}
                    </h1>
                </div>
                <button
                    onClick={toggleLang}
                    className="p-2 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                >
                    <Languages size={20} />
                </button>
            </header>

            {/* Sidebar (Desktop) */}
            <div className="hidden lg:flex w-64 bg-slate-900 text-white shadow-xl flex-col">
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
                        const isActive = activePath.startsWith(item.id);
                        return (
                            <Link
                                key={item.id}
                                to={item.id}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all border border-transparent ${isActive
                                    ? 'bg-blue-600 text-white shadow-md border-blue-500'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className={`font-medium ${lang === 'ar' ? 'font-sans' : ''}`}>{item.label}</span>
                            </Link>
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

            {/* Bottom Nav (Mobile) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activePath.startsWith(item.id);
                    return (
                        <Link
                            key={item.id}
                            to={item.id}
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${isActive
                                ? 'text-blue-600'
                                : 'text-gray-400'
                                }`}
                        >
                            <Icon size={20} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Main Content */}
            <div className="flex-1 overflow-auto pb-20 lg:pb-0">
                <header className="hidden lg:block bg-white border-b border-gray-200 px-8 py-5 shadow-sm sticky top-0 z-10 transition-all">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
                            {navItems.find(i => activePath.startsWith(i.id))?.label || ''}
                        </h2>
                    </div>
                </header>
                <main className="p-4 lg:p-8 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
