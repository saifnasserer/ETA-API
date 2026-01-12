const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Create output directory
const outputDir = 'output/excel_uploads';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Get all VAT return files
const files = fs.readdirSync('output').filter(f => f.match(/^\d{4}-\d{2}_vat_return\.json$/));

console.log('📊 جاري إنشاء ملفات Excel لكل الشهور...\n');

files.forEach(file => {
    const vatData = JSON.parse(fs.readFileSync(path.join('output', file), 'utf8'));
    const period = vatData.period;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Sales
    const salesData = [
        ['إقرار ضريبة القيمة المضافة - نموذج 10'],
        ['الفترة: ' + vatData.periodName],
        ['الرقم الضريبي: ' + vatData.companyId],
        ['اسم المنشأة: ' + vatData.companyName],
        [''],
        ['جدول المبيعات (فواتير البيع)'],
        ['رقم الفاتورة', 'التاريخ', 'اسم العميل', 'القيمة قبل الضريبة', 'ضريبة ق.م 14%', 'الإجمالي'],
    ];

    vatData.sales.local.items.forEach(inv => {
        const netValue = inv.total - inv.vat;
        salesData.push([
            inv.id,
            inv.date,
            inv.customer,
            netValue.toFixed(2),
            inv.vat.toFixed(2),
            inv.total.toFixed(2)
        ]);
    });

    salesData.push(['', '', 'الإجمالي', '', vatData.sales.local.tax.toFixed(2), vatData.sales.local.value.toFixed(2)]);

    const ws1 = XLSX.utils.aoa_to_sheet(salesData);
    ws1['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 45 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'المبيعات');

    // Sheet 2: Purchases
    const purchaseData = [
        ['إقرار ضريبة القيمة المضافة - نموذج 10'],
        ['الفترة: ' + vatData.periodName],
        [''],
        ['جدول المشتريات (فواتير الشراء)'],
        ['رقم الفاتورة', 'التاريخ', 'اسم المورد', 'القيمة قبل الضريبة', 'ضريبة ق.م 14%', 'الإجمالي'],
    ];

    vatData.inputs.items.forEach(inv => {
        const netValue = inv.total - inv.vat;
        purchaseData.push([
            inv.id,
            inv.date,
            inv.customer,
            netValue.toFixed(2),
            inv.vat.toFixed(2),
            inv.total.toFixed(2)
        ]);
    });

    purchaseData.push(['', '', 'الإجمالي', '', vatData.inputs.tax.toFixed(2), vatData.inputs.value.toFixed(2)]);

    const ws2 = XLSX.utils.aoa_to_sheet(purchaseData);
    ws2['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 45 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'المشتريات');

    // Sheet 3: Summary
    const summaryData = [
        ['ملخص الإقرار الضريبي - نموذج 10'],
        ['الفترة الضريبية: ' + vatData.periodName],
        ['الرقم الضريبي: ' + vatData.companyId],
        ['اسم المنشأة: ' + vatData.companyName],
        [''],
        ['أولاً: جدول المبيعات', ''],
        ['إجمالي المبيعات المحلية (14%)', vatData.sales.local.value.toFixed(2) + ' ج.م'],
        ['ضريبة المخرجات', vatData.sales.local.tax.toFixed(2) + ' ج.م'],
        ['الصادرات (0%)', vatData.sales.exports.value.toFixed(2) + ' ج.م'],
        ['المبيعات المعفاة', vatData.sales.exempt.value.toFixed(2) + ' ج.م'],
        [''],
        ['ثانياً: جدول المشتريات', ''],
        ['إجمالي المشتريات المحلية', vatData.inputs.value.toFixed(2) + ' ج.م'],
        ['ضريبة المدخلات القابلة للخصم', vatData.inputs.tax.toFixed(2) + ' ج.م'],
        [''],
        ['ثالثاً: ملخص الضريبة', ''],
        ['ضريبة القيمة المضافة (المخرجات)', vatData.summary.totalOutputVAT.toFixed(2) + ' ج.م'],
        ['ضريبة المدخلات', '(' + vatData.summary.totalInputVAT.toFixed(2) + ') ج.م'],
        ['صافي الضريبة المستحقة / الرصيد الدائن', vatData.summary.netVATDue.toFixed(2) + ' ج.م'],
        [''],
        ['الحالة', vatData.summary.status === 'Refundable' ? '✅ رصيد دائن (قابل للاسترداد)' : '⚠️ مستحق للسداد'],
        ['عدد الفواتير', vatData.invoiceCount + ' فاتورة'],
        [''],
        ['ملاحظات هامة', ''],
        ['نوع التقديم', 'تقديم طوعي متأخر - القانون 5 لسنة 2025'],
        ['الأساس القانوني', 'المادة 3 من القانون 5 لسنة 2025'],
    ];

    const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
    ws3['!cols'] = [{ wch: 35 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'الملخص');

    // Save file
    const outputFile = `${outputDir}/${period}_VAT_Upload.xlsx`;
    XLSX.writeFile(wb, outputFile);

    const statusIcon = vatData.summary.status === 'Refundable' ? '💚' : '💙';
    const statusText = vatData.summary.status === 'Refundable' ? 'رصيد دائن' : 'مستحق';
    console.log(`${statusIcon} ${vatData.periodName}: ${Math.abs(vatData.summary.netVATDue).toFixed(2)} ج.م (${statusText})`);
});

console.log('\n🎉 تم إنشاء ' + files.length + ' ملف Excel بنجاح!');
console.log('📁 الملفات موجودة في: ' + outputDir);
