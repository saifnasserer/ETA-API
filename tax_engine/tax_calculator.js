const fs = require('fs');
const path = require('path');

const COMPANY_ID = '767043545'; // Laapak Tax ID

class TaxCalculator {
    constructor() {
        // ETA Tax Type Codes
        this.TAX_TYPES = {
            VAT: 'T1',
            TABLE_TAX: 'T2',
            WHT: 'T4',
            STAMP: 'T6',
            ENTERTAINMENT: 'T7'
        };
    }

    /**
     * Parse a single invoice JSON and extract tax relevant figures
     * @param {Object} invoice - The ETA invoice object
     */
    processInvoice(invoice) {
        // Basic Validation
        if (!invoice || !invoice.uuid) {
            // console.warn('Invalid Invoice Object', invoice);
            return null;
        }

        const isCreditNote = (invoice.documentType === 'C' || invoice.documentType === 'c');

        // Multiplier for Credit Notes (reverses the sign for aggregation)
        // In the metadata, amounts are usually positive, but for accounting, Credit Notes decrease liability.
        const sign = isCreditNote ? -1 : 1;

        // Determine Direction
        let direction = 'Sales'; // Default
        if (invoice.issuerId === COMPANY_ID) {
            direction = 'Sales';
        } else if (invoice.receiverId === COMPANY_ID) {
            direction = 'Inputs';
        }

        // Extract Totals from Metadata keys
        // format: totalSales, totalDiscount, netAmount, total
        // Note: metadata keys are sometimes camelCase like 'totalSales' or 'totalSalesAmount'. 
        // We check both based on observed data.

        const totalSales = (invoice.totalSales || invoice.totalSalesAmount || 0) * sign;
        const totalAmount = (invoice.total || invoice.totalAmount || 0) * sign;
        const netAmount = (invoice.netAmount || invoice.netAmount || 0) * sign;

        // Approximate Tax (Total - Net)
        // Since search results don't give tax breakdown, we assume the difference is Tax.
        // We will assign it to VAT for simplicity unless we have better data.
        let estimatedTax = totalAmount - netAmount;

        // Handle floating point errors
        estimatedTax = parseFloat(estimatedTax.toFixed(2));

        return {
            uuid: invoice.uuid,
            internalID: invoice.internalId || invoice.internalID || 'N/A',
            dateTimeIssued: invoice.dateTimeIssued,
            receiverName: invoice.receiverName || (invoice.receiver ? invoice.receiver.name : 'Unknown'),
            receiverId: invoice.receiverId || (invoice.receiver ? invoice.receiver.id : 'Unknown'),
            issuerName: invoice.issuerName || 'Unknown',
            issuerId: invoice.issuerId || 'Unknown',
            documentType: invoice.documentType,
            direction: direction, // NEW FIELD

            // Financials
            totalSales: parseFloat(totalSales.toFixed(2)),
            totalAmount: parseFloat(totalAmount.toFixed(2)),

            // Taxes (Estimated)
            vatAmount: estimatedTax,
            tableTaxAmount: 0, // Not available in metadata
            whtAmount: 0,      // Not available in metadata
            otherTaxAmount: 0,

            // Flags
            isExport: invoice.receiverType === 'F' || (invoice.receiver && invoice.receiver.type === 'F'),
            currency: invoice.documentCurrency || 'EGP'
        };
    }

    /**
     * Calculate aggregate tax for a list of processed invoices
     * @param {Array} processedInvoices 
     */
    calculatePeriodSummary(processedInvoices) {
        const summary = {
            totalSales: 0,
            totalVAT: 0,
            totalTableTax: 0,
            totalWHT: 0,
            invoiceCount: 0,
            creditNoteCount: 0
        };

        processedInvoices.forEach(inv => {
            if (!inv) return;

            summary.totalSales += inv.totalSales;
            summary.totalVAT += inv.vatAmount;
            summary.totalTableTax += inv.tableTaxAmount;
            summary.totalWHT += inv.whtAmount;

            if (inv.documentType === 'C' || inv.documentType === 'c') summary.creditNoteCount++;
            else summary.invoiceCount++;
        });

        // Precision adjustment
        Object.keys(summary).forEach(key => {
            if (typeof summary[key] === 'number') {
                summary[key] = parseFloat(summary[key].toFixed(2));
            }
        });

        return summary;
    }

    // Generate Form 10 VAT Return Data
    getPeriodForm10(invoices) {
        const report = {
            sales: {
                local: { value: 0, tax: 0, items: [] },
                exports: { value: 0, tax: 0, items: [] },
                exempt: { value: 0, tax: 0, items: [] }
            },
            inputs: {
                value: 0,
                tax: 0,
                items: []
            },
            schedule: {
                value: 0,
                tax: 0,
                items: []
            },
            totals: {
                salesTax: 0,
                inputTax: 0,
                netDue: 0
            }
        };

        invoices.forEach(inv => {
            const isReturn = inv.documentType === 'C' || inv.documentType === 'CreditNote' || inv.documentType === 'c';
            const sign = isReturn ? -1 : 1;

            // We'll rely on tax amounts to classify
            // Using abs() for display in items if needed, but total/tax accumulators use sign
            const total = (Number(inv.totalSales) || 0) * sign;
            const vat = (Number(inv.vatAmount) || 0) * sign;

            const itemSummary = {
                id: inv.internalID,
                date: new Date(inv.dateTimeIssued).toLocaleDateString(),
                customer: inv.direction === 'Sales' ? inv.receiverName : inv.issuerName,
                total: total,
                vat: vat,
                type: isReturn ? 'Credit Note' : 'Invoice'
            };

            if (inv.direction === 'Sales') {
                // SALES LOGIC
                if (vat !== 0) { // Handles both positive tax and negative tax (credits)
                    // Standard Local Sale
                    report.sales.local.value += total;
                    report.sales.local.tax += vat;
                    report.sales.local.items.push(itemSummary);
                } else if (vat === 0 && total !== 0) {
                    // Could be Export or Exempt
                    if (inv.currency && inv.currency !== 'EGP') {
                        report.sales.exports.value += total;
                        report.sales.exports.items.push(itemSummary);
                    } else {
                        report.sales.exempt.value += total;
                        report.sales.exempt.items.push(itemSummary);
                    }
                }
            } else if (inv.direction === 'Inputs') {
                // INPUTS LOGIC (Purchases where Laapak is the receiver)
                report.inputs.value += total;
                report.inputs.tax += vat;
                report.inputs.items.push(itemSummary);
            }
        });

        report.totals.salesTax = report.sales.local.tax;
        report.totals.inputTax = report.inputs.tax;
        report.totals.netDue = report.totals.salesTax - report.totals.inputTax;

        return report;
    }
}

module.exports = new TaxCalculator();
