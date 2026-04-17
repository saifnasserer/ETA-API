const fs = require('fs');
const path = require('path');
const COMPANY_ID = '767043545';
const invoicesDir = path.join(__dirname, 'invoices_full');

function analyzeIncomeTax() {
    const files = fs.readdirSync(invoicesDir).filter(f => f.endsWith('.json'));

    const summary = {
        '2024': { sales: 0, salesVAT: 0, salesT4: 0, purchases: 0, purchVAT: 0, purchT4: 0 },
        '2025': { sales: 0, salesVAT: 0, salesT4: 0, purchases: 0, purchVAT: 0, purchT4: 0 },
        '2026': { sales: 0, salesVAT: 0, salesT4: 0, purchases: 0, purchVAT: 0, purchT4: 0 }
    };

    files.forEach(file => {
        try {
            const raw = JSON.parse(fs.readFileSync(path.join(invoicesDir, file), 'utf8'));
            const dateStr = raw.dateTimeIssued || '';
            const year = dateStr.substring(0, 4);

            if (!summary[year]) return;

            let doc = {};
            if (typeof raw.document === 'string') {
                try { doc = JSON.parse(raw.document); } catch (e) {}
            } else {
                doc = raw.document || {};
            }

            const docType = (doc.documentType || '').toLowerCase();
            const sign = docType === 'c' ? -1 : 1; // Credit note reduces amounts

            const isSale = raw.issuerId === COMPANY_ID || doc.issuer?.id === COMPANY_ID;
            const isPurch = raw.receiverId === COMPANY_ID || doc.receiver?.id === COMPANY_ID;

            const salesTotal = (doc.totalSalesAmount || 0) * sign;
            
            let vatTotal = 0;
            let t4Total = 0;

            (doc.taxTotals || []).forEach(t => {
                if (t.taxType === 'T1') vatTotal += t.amount * sign;
                if (t.taxType === 'T4') t4Total += t.amount * sign;
            });

            if (isSale) {
                summary[year].sales += salesTotal;
                summary[year].salesVAT += vatTotal;
                summary[year].salesT4 += t4Total;
            } else if (isPurch) {
                summary[year].purchases += salesTotal;
                summary[year].purchVAT += vatTotal;
                summary[year].purchT4 += t4Total;
            }

        } catch (e) {
            console.error(`Error processing ${file}: ${e.message}`);
        }
    });

    console.log('=== Income Tax Summary by Year ===');
    console.log(JSON.stringify(summary, null, 2));
}

analyzeIncomeTax();
