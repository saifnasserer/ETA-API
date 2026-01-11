const fs = require('fs');
const path = require('path');
const taxCalculator = require('./tax_calculator');

const COMPANY_ID = '767043545'; // Laapak Tax ID

/**
 * Multi-Period VAT Return Generator
 * Generates VAT returns for all missing months under Law 5/2025 amnesty
 */
class MultiPeriodVAT {
    constructor() {
        this.invoicesDir = path.join(__dirname, '../invoices_full');
        this.outputDir = path.join(__dirname, '../output');

        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Load all invoices from invoices_full directory
     */
    loadAllInvoices() {
        const files = fs.readdirSync(this.invoicesDir)
            .filter(f => f.endsWith('.json'));

        const invoices = [];
        for (const file of files) {
            try {
                const filePath = path.join(this.invoicesDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                // Process invoice through tax calculator
                const processed = taxCalculator.processInvoice(data);
                if (processed) {
                    invoices.push(processed);
                }
            } catch (error) {
                console.warn(`Failed to process ${file}:`, error.message);
            }
        }

        console.log(`Loaded ${invoices.length} invoices`);
        return invoices;
    }

    /**
     * Group invoices by month (YYYY-MM format)
     */
    groupInvoicesByMonth(invoices) {
        const grouped = {};

        for (const invoice of invoices) {
            if (!invoice.dateTimeIssued) continue;

            // Extract YYYY-MM from ISO date
            const month = invoice.dateTimeIssued.substring(0, 7);

            if (!grouped[month]) {
                grouped[month] = [];
            }
            grouped[month].push(invoice);
        }

        return grouped;
    }

    /**
     * Determine which months need VAT returns
     * Excludes: Jan 2026 (incomplete)
     */
    getRequiredMonths(groupedInvoices) {
        const allMonths = Object.keys(groupedInvoices).sort();

        // Filter out excluded months
        const requiredMonths = allMonths.filter(month => {
            // Exclude Jan 2026 (incomplete month, current month)
            if (month === '2026-01') return false;

            // Include all other months, including Nov 2024
            // Even though Nov 2024 is partial (started Nov 10), we should declare
            // all invoices with VAT charges to avoid questions from ETA
            return true;
        });

        console.log(`Required VAT returns: ${requiredMonths.length} months`);
        console.log(`Months: ${requiredMonths.join(', ')}`);

        return requiredMonths;
    }

    /**
     * Generate VAT return for a single month
     */
    generateMonthlyReturn(month, invoices) {
        console.log(`\nGenerating VAT return for ${month}...`);
        console.log(`  Invoices: ${invoices.length}`);

        // Use existing tax calculator to generate Form 10
        const form10 = taxCalculator.getPeriodForm10(invoices);

        // Add metadata for late submission
        const monthDate = new Date(month + '-01');
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const vatReturn = {
            period: month,
            periodName: monthName,
            submissionType: 'Late Voluntary - Law 5/2025',
            legalBasis: 'Law 5/2025 Article 3',
            companyId: COMPANY_ID,
            companyName: 'لابك لتجاره الالكترونيات',
            invoiceCount: invoices.length,
            generatedDate: new Date().toISOString(),

            // Form 10 data
            sales: form10.sales,
            inputs: form10.inputs,
            totals: form10.totals,

            // Summary
            summary: {
                totalSales: form10.sales.local.value + form10.sales.exports.value + form10.sales.exempt.value,
                totalOutputVAT: form10.totals.salesTax,
                totalInputVAT: form10.totals.inputTax,
                netVATDue: form10.totals.netDue,
                status: form10.totals.netDue >= 0 ? 'Payable to ETA' : 'Refundable'
            }
        };

        console.log(`  Total Sales: ${vatReturn.summary.totalSales.toLocaleString()} EGP`);
        console.log(`  Output VAT: ${vatReturn.summary.totalOutputVAT.toLocaleString()} EGP`);
        console.log(`  Input VAT: ${vatReturn.summary.totalInputVAT.toLocaleString()} EGP`);
        console.log(`  Net Due: ${vatReturn.summary.netVATDue.toLocaleString()} EGP (${vatReturn.summary.status})`);

        return vatReturn;
    }

    /**
     * Generate all monthly VAT returns
     */
    generateAllMonthlyReturns() {
        console.log('=== Multi-Period VAT Return Generator ===\n');

        // Load invoices
        const allInvoices = this.loadAllInvoices();

        // Group by month
        const groupedInvoices = this.groupInvoicesByMonth(allInvoices);

        // Get required months
        const requiredMonths = this.getRequiredMonths(groupedInvoices);

        // Generate returns for each month
        const returns = [];
        for (const month of requiredMonths) {
            const monthInvoices = groupedInvoices[month];
            const vatReturn = this.generateMonthlyReturn(month, monthInvoices);
            returns.push(vatReturn);

            // Save individual month return
            this.saveMonthReturn(month, vatReturn);
        }

        // Save summary of all returns
        this.saveSummary(returns);

        console.log(`\n=== Generation Complete ===`);
        console.log(`Total returns generated: ${returns.length}`);
        console.log(`Output directory: ${this.outputDir}`);

        return returns;
    }

    /**
     * Save individual month return to JSON
     */
    saveMonthReturn(month, vatReturn) {
        const filename = `${month}_vat_return.json`;
        const filepath = path.join(this.outputDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(vatReturn, null, 2), 'utf8');
        console.log(`  Saved: ${filename}`);
    }

    /**
     * Save summary of all returns
     */
    saveSummary(returns) {
        const summary = {
            generatedDate: new Date().toISOString(),
            totalReturns: returns.length,
            legalBasis: 'Law 5/2025 Article 3 - Voluntary Late Submission',
            deadline: '2026-08-12',

            periods: returns.map(r => ({
                period: r.period,
                periodName: r.periodName,
                invoiceCount: r.invoiceCount,
                netVATDue: r.summary.netVATDue,
                status: r.summary.status
            })),

            totals: {
                totalInvoices: returns.reduce((sum, r) => sum + r.invoiceCount, 0),
                totalSales: returns.reduce((sum, r) => sum + r.summary.totalSales, 0),
                totalOutputVAT: returns.reduce((sum, r) => sum + r.summary.totalOutputVAT, 0),
                totalInputVAT: returns.reduce((sum, r) => sum + r.summary.totalInputVAT, 0),
                totalNetVATDue: returns.reduce((sum, r) => sum + r.summary.netVATDue, 0)
            }
        };

        // Round totals
        Object.keys(summary.totals).forEach(key => {
            if (typeof summary.totals[key] === 'number') {
                summary.totals[key] = parseFloat(summary.totals[key].toFixed(2));
            }
        });

        const filepath = path.join(this.outputDir, 'all_vat_returns_summary.json');
        fs.writeFileSync(filepath, JSON.stringify(summary, null, 2), 'utf8');

        console.log(`\n=== Overall Summary ===`);
        console.log(`Total Invoices: ${summary.totals.totalInvoices}`);
        console.log(`Total Sales: ${summary.totals.totalSales.toLocaleString()} EGP`);
        console.log(`Total Output VAT: ${summary.totals.totalOutputVAT.toLocaleString()} EGP`);
        console.log(`Total Input VAT: ${summary.totals.totalInputVAT.toLocaleString()} EGP`);
        console.log(`Net VAT Position: ${summary.totals.totalNetVATDue.toLocaleString()} EGP`);
        console.log(`\nSaved: all_vat_returns_summary.json`);
    }
}

// CLI execution
if (require.main === module) {
    const generator = new MultiPeriodVAT();
    generator.generateAllMonthlyReturns();
}

module.exports = new MultiPeriodVAT();
