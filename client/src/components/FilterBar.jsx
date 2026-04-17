import React from 'react';
import { Search, Plus, Calendar, Filter, Download, Loader2 } from 'lucide-react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export function FilterBar({
    search,
    onSearchChange,
    placeholder = "بحث...",
    status,
    onStatusChange,
    statusOptions,
    month,
    onMonthChange,
    onClear,
    onFetch,
    fetchLoading,
    className
}) {
    return (
        <div className={cn(
            "laapak-glass p-2 sm:p-3 rounded-[2rem] flex flex-wrap items-center gap-3 sm:gap-4",
            className
        )}>
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/40" />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pr-11 pl-4 h-11 rounded-full border border-black/5 bg-white/40 focus:bg-white transition-all font-bold text-sm outline-none text-gray-800"
                />
            </div>
            
            {/* Status Tabs */}
            {statusOptions && statusOptions.length > 0 && (
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto custom-scrollbar no-scrollbar pb-1 sm:pb-0">
                    <span className="text-[10px] font-black text-gray-500 uppercase mr-1 flex items-center gap-1 shrink-0">
                        <Filter size={10} /> الحالة:
                    </span>
                    <div className="flex bg-black/5 p-1 rounded-full gap-1 shrink-0 max-w-full overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth">
                        {statusOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => onStatusChange(option.value)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black transition-all whitespace-nowrap",
                                    status === option.value 
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-gray-500 hover:text-gray-800"
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Month Selection */}
            <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-1">
                    <Calendar size={10} /> الفترة:
                </span>
                <div className="flex items-center bg-black/5 p-1 rounded-full gap-1">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="h-9 px-3 rounded-full border-none bg-transparent text-[10px] font-bold outline-none focus:bg-white transition-all w-28 sm:w-32 text-gray-700"
                    />
                </div>
            </div>
            
            {/* Clear Filters Button */}
            <button 
                onClick={onClear}
                className="h-11 w-11 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-gray-500 transition-colors group shrink-0"
                title="مسح الفلاتر"
            >
                <Plus className="rotate-45 group-hover:scale-110 transition-transform" size={18} />
            </button>

            {/* Fetch Button */}
            {onFetch && (
                <button
                    onClick={onFetch}
                    disabled={fetchLoading}
                    className="h-11 px-4 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors group shrink-0 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="جلب الفواتير (نفس فترة الفلتر)"
                >
                    {fetchLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Download className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />}
                </button>
            )}
        </div>
    );
}
