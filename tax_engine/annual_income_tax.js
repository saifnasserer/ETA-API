const fs = require('fs');
const path = require('path');
const taxCalculator = require('./tax_calculator');

const COMPANY_ID = '767043545';
const CORPORATE_TAX_RATE = 0.225; // 22.5% for Egyptian corporations

/**
 * Annual Income Tax Calculator
 * Calculates corporate income tax for fiscal years under Egyptian tax law
 */
class AnnualIncomeTax {
    constructor() {
        this.invoicesDir = path.join(__dirname, '../invoices_full');
        this.outputDir = path.join(__dirname, '../output');

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Load all invoices
     */
    loadAllInvoices() {
        const files = fs.readdirSync(this.invoicesDir)
            .filter(f => f.endsWith('.json'));

        const invoices = [];
        for (const file of files) {
            try {
                const filePath = path.join(this.invoicesDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const processed = taxCalculator.processInvoice(data);
                if (processed) {
                    invoices.push(processed);
                }
            } catch (error) {
                console.warn(`Failed to process ${file}:`, error.message);
            }
        }

        return invoices;
    }

    /**
     * Filter invoices by year
     */
    filterByYear(invoices, year) {
        return invoices.filter(inv => {
            if (!inv.dateTimeIssued) return false;
            const invYear = parseInt(inv.dateTimeIssued.substring(0, 4));
            return invYear === year;
        });
    }

    /**
     * Calculate total revenue from sales invoices
     */
    calculateRevenue(invoices) {
        const salesInvoices = invoices.filter(inv => inv.direction === 'Sales');

        const revenue = salesInvoices.reduce((sum, inv) => {
            return sum + inv.totalSales;
        }, 0);

        return {
            amount: parseFloat(revenue.toFixed(2)),
            invoiceCount: salesInvoices.length,
            invoices: salesInvoices.map(inv => ({
                id: inv.internalID,
                date: inv.dateTimeIssued,
                customer: inv.receiverName,
                amount: inv.totalSales
            }))
        };
    }

    /**
     * Calculate cost of goods sold from purchase invoices
     */
    calculateCOGS(invoices) {
        const purchaseInvoices = invoices.filter(inv => inv.direction === 'Inputs');

        const cogs = purchaseInvoices.reduce((sum, inv) => {
            return sum + inv.totalSales;
        }, 0);

        return {
            amount: parseFloat(cogs.toFixed(2)),
            invoiceCount: purchaseInvoices.length,
            invoices: purchaseInvoices.map(inv => ({
                id: inv.internalID,
                date: inv.dateTimeIssued,
                supplier: inv.issuerName,
                amount: inv.totalSales
            }))
        };
    }

    /**
     * Calculate corporate income tax
     */
    calculateTax(taxableIncome) {
        if (taxableIncome <= 0) return 0;
        return parseFloat((taxableIncome * CORPORATE_TAX_RATE).toFixed(2));
    }

    /**
     * Generate annual income tax return for a specific year
     * @param {number} year - Fiscal year (2024 or 2025)
     * @param {object} operatingExpenses - Manual expense inputs
     */
    generateAnnualReturn(year, operatingExpenses = {}) {
        console.log(`\n=== Annual Income Tax Return - ${year} ===\n`);

        // Load and filter invoices
        const allInvoices = this.loadAllInvoices();
        const yearInvoices = this.filterByYear(allInvoices, year);

        console.log(`Invoices for ${year}: ${yearInvoices.length}`);

        // Calculate revenue and COGS
        const revenue = this.calculateRevenue(yearInvoices);
        const cogs = this.calculateCOGS(yearInvoices);

        console.log(`Revenue: ${revenue.amount.toLocaleString()} EGP (${revenue.invoiceCount} sales invoices)`);
        console.log(`COGS: ${cogs.amount.toLocaleString()} EGP (${cogs.invoiceCount} purchase invoices)`);

        // Calculate gross profit
        const grossProfit = revenue.amount - cogs.amount;
        console.log(`Gross Profit: ${grossProfit.toLocaleString()} EGP`);

        // Operating expenses (manual input)
        const expenses = {
            salaries: operatingExpenses.salaries || 0,
            rent: operatingExpenses.rent || 0,
            utilities: operatingExpenses.utilities || 0,
            marketing: operatingExpenses.marketing || 0,
            depreciation: operatingExpenses.depreciation || 0,
            other: operatingExpenses.other || 0
        };

        const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
        console.log(`Operating Expenses: ${totalExpenses.toLocaleString()} EGP`);

        // Calculate net profit
        const netProfit = grossProfit - totalExpenses;
        console.log(`Net Profit: ${netProfit.toLocaleString()} EGP`);

        // Calculate taxable income and tax
        const taxableIncome = Math.max(netProfit, 0);
        const corporateTax = this.calculateTax(taxableIncome);

        console.log(`Taxable Income: ${taxableIncome.toLocaleString()} EGP`);
        console.log(`Corporate Tax (22.5%): ${corporateTax.toLocaleString()} EGP`);

        // Build return object
        const annualReturn = {
            year: year,
            fiscalPeriod: `${year}-01-01 to ${year}-12-31`,
            companyId: COMPANY_ID,
            companyName: 'لابك لتجاره الالكترونيات',
            submissionType: year === 2024 ? 'Late Voluntary - Law 5/2025' : 'Regular',
            legalBasis: year === 2024 ? 'Law 5/2025 Article 3' : 'Law 91/2005',
            generatedDate: new Date().toISOString(),

            revenue: {
                totalRevenue: revenue.amount,
                salesInvoiceCount: revenue.invoiceCount,
                breakdown: revenue.invoices
            },

            cogs: {
                totalCOGS: cogs.amount,
                purchaseInvoiceCount: cogs.invoiceCount,
                breakdown: cogs.invoices
            },

            grossProfit: parseFloat(grossProfit.toFixed(2)),

            operatingExpenses: {
                salaries: expenses.salaries,
                rent: expenses.rent,
                utilities: expenses.utilities,
                marketing: expenses.marketing,
                depreciation: expenses.depreciation,
                other: expenses.other,
                total: parseFloat(totalExpenses.toFixed(2))
            },

            netProfit: parseFloat(netProfit.toFixed(2)),
            taxableIncome: parseFloat(taxableIncome.toFixed(2)),
            corporateTax: corporateTax,
            taxRate: CORPORATE_TAX_RATE,

            notes: []
        };

        // Add notes
        if (year === 2024) {
            annualReturn.notes.push('Partial year: Company started operations Nov 10, 2024');
            annualReturn.notes.push('Only 2 months of operations (Nov-Dec 2024)');
        }

        if (netProfit < 0) {
            annualReturn.notes.push(`Loss of ${Math.abs(netProfit).toLocaleString()} EGP - No tax due`);
            annualReturn.notes.push('Loss can be carried forward to offset future profits');
        }

        if (totalExpenses === 0) {
            annualReturn.notes.push('WARNING: No operating expenses entered - tax calculation incomplete');
            annualReturn.notes.push('Please add salaries, rent, utilities, and other expenses');
        }

        return annualReturn;
    }

    /**
     * Save annual return to file
     */
    saveAnnualReturn(year, annualReturn) {
        const filename = `${year}_income_tax_return.json`;
        const filepath = path.join(this.outputDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(annualReturn, null, 2), 'utf8');
        console.log(`\nSaved: ${filename}`);

        return filepath;
    }

    /**
     * Generate returns for both years
     */
    generateBothYears(expenses2024 = {}, expenses2025 = {}) {
        console.log('=== Annual Income Tax Generator ===');

        const return2024 = this.generateAnnualReturn(2024, expenses2024);
        this.saveAnnualReturn(2024, return2024);

        const return2025 = this.generateAnnualReturn(2025, expenses2025);
        this.saveAnnualReturn(2025, return2025);

        // Summary
        console.log('\n=== Summary ===');
        console.log(`2024 Tax: ${return2024.corporateTax.toLocaleString()} EGP`);
        console.log(`2025 Tax: ${return2025.corporateTax.toLocaleString()} EGP`);
        console.log(`Total Tax Due: ${(return2024.corporateTax + return2025.corporateTax).toLocaleString()} EGP`);

        return { return2024, return2025 };
    }
}

// CLI execution
if (require.main === module) {
    const generator = new AnnualIncomeTax();

    // Example with placeholder expenses
    // USER MUST REPLACE WITH ACTUAL EXPENSE DATA
    const expenses2024 = {
        salaries: 0,
        rent: 0,
        utilities: 0,
        marketing: 0,
        depreciation: 0,
        other: 0
    };

    const expenses2025 = {
        salaries: 0,
        rent: 0,
        utilities: 0,
        marketing: 0,
        depreciation: 0,
        other: 0
    };

    console.log('\n⚠️  WARNING: Using placeholder expenses (all zeros)');
    console.log('Please edit this file and add actual expense amounts\n');

    generator.generateBothYears(expenses2024, expenses2025);
}

module.exports = new AnnualIncomeTax();
