// Quick reference guide for remaining translations needed in TaxComplianceDashboard.jsx

/*
SECTIONS TO UPDATE:

1. Key Metrics Cards (lines ~125-170):
   - "Tax Declarations" → t.totalDeclarations
   - "Total Invoices" → t.totalInvoicesProcessed  
   - "Net VAT" → t.netVATPosition
   - "Income Tax" → t.corporateIncomeTax
   - "REFUNDABLE" → t.refundable
   - "PAYABLE" → t.payable

2. Quick Actions (lines ~173-210):
   - "Quick Actions" → t.quickActions
   - "Download Accountant Package" → t.downloadAccountantPackage
   - "Generating..." → t.generating
   - "Download Delay Note" → t.downloadDelayNote
   - "Regenerate All Returns" → t.regenerateAllReturns

3. Monthly VAT Table (lines ~213-290):
   - "Monthly VAT Returns" → t.monthlyVATReturns
   - "Click on any month..." → t.clickMonthDetails
   - "Period" → t.period
   - "Invoices" → t.invoicesCount
   - "Sales" → t.sales
   - "Output VAT" → t.outputVAT
   - "Input VAT" → t.inputVAT
   - "Net Due" → t.netDue
   - "Status" → t.statusLabel
   - "Action" → t.action
   - "View Details" → t.viewDetails
   - "TOTAL" → t.total
   - "Refundable" / "Payable to ETA" → t.refundable / t.payable

4. Income Tax Cards (lines ~293-380):
   - "Income Tax 2024" → t.incomeTax2024
   - "Income Tax 2025" → t.incomeTax2025
   - "Revenue" → t.revenue
   - "COGS" → t.cogs
   - "Gross Profit" → t.grossProfit
   - "Operating Expenses" → t.operatingExpenses
   - "Corporate Tax (22.5%)" → t.corporateTaxRate

5. Month Details Modal (lines ~383-490):
   - "VAT Return Details" → t.vatReturnDetails
   - "Total Sales" → t.totalSalesLabel
   - "Output VAT" → t.outputVAT
   - "Input VAT" → t.inputVAT
   - "Net Due" → t.netDue
   - "Sales (Output VAT)" → t.salesBreakdown
   - "Local Sales (14% VAT)" → t.localSales14
   - "Exports (0% VAT)" → t.exports0
   - "Exempt Sales" → t.exemptSalesLabel
   - "Purchases (Input VAT)" → t.purchasesInputVAT
   - "Deductible Input VAT" → t.deductibleInputVAT
   - "Close" → t.closeButton
   - "Download JSON" → t.downloadJSON

All translations are already added to translations.js!
Just need to replace hardcoded strings with {t.keyName}
*/

console.log('Translation reference guide created');
console.log('All translation keys are available in translations.js');
console.log('Replace hardcoded English text with {t.keyName} in TaxComplianceDashboard.jsx');
