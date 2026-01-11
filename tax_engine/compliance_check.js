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

        // 1. Sort by DateTime
        const sorted = [...invoices].sort((a, b) => new Date(a.dateTimeIssued) - new Date(b.dateTimeIssued));

        // 2. Check Sequence Gaps (Best Effort)
        // Note: internalID might be alphanumeric, so we try to parse integer if possible, 
        // or just warn if we see big jumps in numbers. 
        // For strict ERPs, internalID should be sequential.

        let previousId = null;
        invoices.forEach(inv => {
            const currentId = parseInt(inv.internalID);

            // Check for duplicate UUIDs (sanity check)

            // MATH Check: Rough check if VAT is 14% for standard local invoices
            // This is a heuristic. Not all items are 14%.
            // But if VAT is 0 and it's not export, it might be an error or exemption.
            if (inv.vatAmount === 0 && !inv.isExport && inv.documentType === 'I') {
                flags.push({
                    type: 'WARNING',
                    uuid: inv.uuid,
                    message: `Invoice ${inv.internalID} has 0 VAT but is not marked as Export. Verify Exemption.`
                });
            }

            if (!isNaN(currentId) && previousId !== null) {
                if (currentId > previousId + 1) {
                    flags.push({
                        type: 'MISSING_SEQUENCE',
                        fromId: previousId,
                        toId: currentId,
                        message: `Gap in invoice sequence detected between ${previousId} and ${currentId}`
                    });
                }
            }
            if (!isNaN(currentId)) {
                previousId = currentId;
            }
        });

        return flags;
    }
}

module.exports = new ComplianceCheck();
