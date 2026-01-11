class ComplianceCheck {

    /**
     * Check a single invoice for compliance issues
     * @param {Object} invoice - Processed invoice object
     */
    checkInvoice(invoice) {
        if (!invoice) return null;

        const flags = [];

        // Check for suspicious 0% VAT
        if (invoice.vatAmount === 0 && !invoice.isExport && invoice.documentType === 'I') {
            flags.push({
                type: 'WARNING',
                code: 'SUSPICIOUS_ZERO_VAT',
                message: 'VAT is 0 but not marked as Export'
            });
        }

        // Attach flags to invoice
        invoice.complianceFlags = flags;
        invoice.isValid = flags.length === 0; // Simple valid flag for UI

        return invoice;
    }

    /**
     * Run compliance checks on a set of processed invoices
     * @param {Array} invoices - List of normalized invoices from TaxCalculator
     */
    runChecks(invoices) {
        const flags = [];

        // Separate invoices by direction (Sales vs Purchases)
        const salesInvoices = invoices.filter(inv => inv.direction === 'Sales');
        const purchaseInvoices = invoices.filter(inv => inv.direction === 'Purchases');

        // Check sequence gaps separately for each direction
        this._checkSequenceGaps(salesInvoices, 'Sales', flags);
        this._checkSequenceGaps(purchaseInvoices, 'Purchases', flags);

        return flags;
    }

    /**
     * Check for sequence gaps in a specific direction
     * @param {Array} invoices - Invoices of a specific direction
     * @param {String} direction - 'Sales' or 'Purchases'
     * @param {Array} flags - Array to push flags into
     */
    _checkSequenceGaps(invoices, direction, flags) {
        // Sort by internalID (numeric)
        const sorted = [...invoices]
            .filter(inv => !isNaN(parseInt(inv.internalID)))
            .sort((a, b) => parseInt(a.internalID) - parseInt(b.internalID));

        let previousId = null;
        sorted.forEach(inv => {
            const currentId = parseInt(inv.internalID);

            if (previousId !== null && currentId > previousId + 1) {
                flags.push({
                    type: 'MISSING_SEQUENCE',
                    direction: direction,
                    fromId: previousId,
                    toId: currentId,
                    message: `Gap in ${direction.toLowerCase()} sequence: ${previousId} → ${currentId}`
                });
            }
            previousId = currentId;
        });
    }
}

module.exports = new ComplianceCheck();
