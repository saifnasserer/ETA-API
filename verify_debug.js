const fs = require('fs');
const path = require('path');
const { generateSapExcel } = require('./server/sap_excel_generator');

const COMPANY_TAX_ID = '767043545';

function debug() {
    const dir = path.join(__dirname, 'invoices_full');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).slice(0, 3);

    console.log(`Checking ${files.length} files...`);

    const invoices = [];
    files.forEach(f => {
        const content = fs.readFileSync(path.join(dir, f), 'utf8');
        const json = JSON.parse(content);
        invoices.push(json);

        // Manual check logic
        // The structure in 0001.json is: root -> document (string) -> issuer -> id.
        // Wait! 0001.json had "document": "{...}" as a string!
        // The file in step 50 showed:
        // { "document": "{\n ... }", ... }
        // My generator code does: const issuerId = fullInv.issuer?.id || fullInv.issuerId;
        // BUT fullInv has "document" string, and "issuerId" at root.
        // Let's check if "issuerId" is at the root of 0001.json.
        // YES. line 76: "issuerId": "767043545".

        console.log(`File: ${f}`);
        console.log(`  Root issuerId: ${json.issuerId} (Type: ${typeof json.issuerId})`);
        console.log(`  Expected: ${COMPANY_TAX_ID}`);
        console.log(`  Match? ${json.issuerId == COMPANY_TAX_ID}`);
    });

    const result = generateSapExcel(invoices);
    console.log('Generator Counts:', result.counts);
}

debug();
