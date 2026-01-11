const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Configuration
const AUTH_URL = process.env.ETA_AUTH_URL;
const API_URL = process.env.ETA_API_URL;
const CLIENT_ID = process.env.ETA_CLIENT_ID;
const CLIENT_SECRET = process.env.ETA_CLIENT_SECRET;

const INVOICES_DIR = path.join(__dirname, 'invoices');
const INVOICES_FULL_DIR = path.join(__dirname, 'invoices_full');

async function getAccessToken() {
    console.log('🔐 Authenticating...');
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('scope', 'InvoicingAPI');

    try {
        const response = await axios.post(AUTH_URL, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log('✅ Authenticated\n');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Auth failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

async function getFullDocument(accessToken, uuid) {
    try {
        const response = await axios.get(`${API_URL}/documents/${uuid}/raw`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        if (error.response?.status === 429) {
            return { error: 'rate_limited' };
        }
        console.error(`  ❌ Error fetching ${uuid}:`, error.response?.status || error.message);
        return null;
    }
}

function getDocumentType(fullDoc) {
    // Parse the document string to get the type
    try {
        const doc = JSON.parse(fullDoc.document);
        const type = doc.documentType || fullDoc.typeName;
        return type;
    } catch {
        return fullDoc.typeName || 'i';
    }
}

function generateFilename(internalId, documentType, uuid) {
    const type = (documentType || 'i').toLowerCase();

    if (type === 'c') {
        return `credit_${internalId}.json`;
    } else if (type === 'd') {
        return `debit_${internalId}.json`;
    } else {
        return `${internalId}.json`;
    }
}

async function fetchCreditDebitNotes() {
    console.log('💳 Fetching Credit & Debit Notes\n');
    console.log('='.repeat(60));

    // Find all credit and debit notes in metadata
    const metadataFiles = fs.readdirSync(INVOICES_DIR).filter(f => f.endsWith('.json'));
    const creditDebitNotes = [];

    metadataFiles.forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(INVOICES_DIR, file), 'utf8'));
        const type = (data.documentType || data.typeName || 'i').toLowerCase();

        if ((type === 'c' || type === 'd') && data.status === 'Valid') {
            creditDebitNotes.push(data);
        }
    });

    console.log(`Found ${creditDebitNotes.length} credit/debit notes\n`);

    if (creditDebitNotes.length === 0) {
        console.log('✅ No credit/debit notes to fetch');
        return;
    }

    const token = await getAccessToken();
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < creditDebitNotes.length; i++) {
        const note = creditDebitNotes[i];
        const typeName = note.documentType === 'c' ? 'Credit Note' : 'Debit Note';

        console.log(`[${i + 1}/${creditDebitNotes.length}] Fetching ${typeName}: ${note.internalId}`);

        const fullDoc = await getFullDocument(token, note.uuid);

        if (fullDoc && !fullDoc.error) {
            const docType = getDocumentType(fullDoc);
            const filename = generateFilename(note.internalId, docType, note.uuid);
            const filepath = path.join(INVOICES_FULL_DIR, filename);

            fs.writeFileSync(filepath, JSON.stringify(fullDoc, null, 2));
            console.log(`  ✅ Saved: ${filename}`);
            successCount++;
        } else if (fullDoc && fullDoc.error === 'rate_limited') {
            console.log('  ⏸️  Rate limited - waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            const retry = await getFullDocument(token, note.uuid);
            if (retry && !retry.error) {
                const docType = getDocumentType(retry);
                const filename = generateFilename(note.internalId, docType, note.uuid);
                const filepath = path.join(INVOICES_FULL_DIR, filename);

                fs.writeFileSync(filepath, JSON.stringify(retry, null, 2));
                console.log(`  ✅ Saved: ${filename}`);
                successCount++;
            } else {
                console.log('  ❌ Still rate limited');
                failedCount++;
            }
        } else {
            console.log('  ❌ Failed');
            failedCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully fetched: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log('='.repeat(60));
}

fetchCreditDebitNotes();
