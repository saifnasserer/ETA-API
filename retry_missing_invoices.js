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
    try {
        const doc = JSON.parse(fullDoc.document);
        return (doc.documentType || fullDoc.typeName || 'i').toLowerCase();
    } catch {
        return (fullDoc.typeName || 'i').toLowerCase();
    }
}

function generateFilename(internalId, documentType) {
    const type = documentType.toLowerCase();

    if (type === 'c') {
        return `credit_${internalId}.json`;
    } else if (type === 'd') {
        return `debit_${internalId}.json`;
    } else {
        return `${internalId}.json`;
    }
}

async function retryMissingInvoices() {
    console.log('🔄 Retrying Rate-Limited Invoices\n');
    console.log('='.repeat(60));

    // Get all metadata invoices
    const metadataFiles = fs.readdirSync(INVOICES_DIR).filter(f => f.endsWith('.json'));
    const fullFiles = fs.readdirSync(INVOICES_FULL_DIR).filter(f => f.endsWith('.json'));

    // Extract internal IDs from full invoices
    const fetchedIds = new Set();
    fullFiles.forEach(file => {
        const basename = file.replace('.json', '').split('_')[0]; // Handle duplicates
        fetchedIds.add(basename);
    });

    console.log(`📊 Total metadata invoices: ${metadataFiles.length}`);
    console.log(`✅ Already fetched: ${fullFiles.length}`);

    // Find missing invoices
    const missing = [];
    metadataFiles.forEach(file => {
        const metadata = JSON.parse(fs.readFileSync(path.join(INVOICES_DIR, file), 'utf8'));
        if (metadata.status === 'Valid' && !fetchedIds.has(metadata.internalId)) {
            missing.push(metadata);
        }
    });

    console.log(`⚠️  Missing (to retry): ${missing.length}\n`);

    if (missing.length === 0) {
        console.log('✅ All valid invoices already fetched!');
        return;
    }

    const token = await getAccessToken();
    let successCount = 0;
    let rateLimitedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < missing.length; i++) {
        const inv = missing[i];
        console.log(`[${i + 1}/${missing.length}] Fetching ${inv.internalId} (${inv.uuid.substring(0, 8)}...)`);

        const fullDoc = await getFullDocument(token, inv.uuid);

        if (fullDoc && fullDoc.error === 'rate_limited') {
            console.log('  ⏸️  Rate limited - waiting 2 seconds...');
            rateLimitedCount++;
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Retry once
            const retry = await getFullDocument(token, inv.uuid);
            if (retry && !retry.error) {
                const docType = getDocumentType(retry);
                const filename = generateFilename(inv.internalId, docType);
                const filepath = path.join(INVOICES_FULL_DIR, filename);
                fs.writeFileSync(filepath, JSON.stringify(retry, null, 2));
                console.log(`  ✅ Saved: ${filename}`);
                successCount++;
            } else {
                console.log('  ❌ Still rate limited, skipping for now');
                failedCount++;
            }
        } else if (fullDoc) {
            const docType = getDocumentType(fullDoc);
            const filename = generateFilename(inv.internalId, docType);
            const filepath = path.join(INVOICES_FULL_DIR, filename);
            fs.writeFileSync(filepath, JSON.stringify(fullDoc, null, 2));
            console.log(`  ✅ Saved: ${filename}`);
            successCount++;
        } else {
            console.log('  ❌ Failed');
            failedCount++;
        }

        // Delay between requests
        if (i < missing.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RETRY SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully fetched: ${successCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log(`⏸️  Still rate limited: ${rateLimitedCount - successCount}`);
    console.log('='.repeat(60));
}

retryMissingInvoices();
