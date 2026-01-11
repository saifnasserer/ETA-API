const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Configuration
const AUTH_URL = process.env.ETA_AUTH_URL;
const API_URL = process.env.ETA_API_URL;
const CLIENT_ID = process.env.ETA_CLIENT_ID;
const CLIENT_SECRET = process.env.ETA_CLIENT_SECRET;

// Ensure invoices_full directory exists
const INVOICES_FULL_DIR = path.join(__dirname, 'invoices_full');
if (!fs.existsSync(INVOICES_FULL_DIR)) {
    fs.mkdirSync(INVOICES_FULL_DIR);
}

async function getAccessToken() {
    console.log('🔐 Authenticating...');
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('scope', 'InvoicingAPI');

    try {
        const response = await axios.post(AUTH_URL, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log('✅ Authentication successful.\n');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Authentication failed:', error.response ? error.response.data : error.message);
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

async function fetchAllFullInvoices(accessToken, startDate, endDate = new Date()) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(`📥 Fetching all VALID invoices from ${start.toISOString()} to ${end.toISOString()}\n`);

    let currentStart = new Date(start);
    let totalFetched = 0;
    let totalValid = 0;
    let totalSkipped = 0;
    const usedFilenames = new Map(); // Track duplicates

    while (currentStart < end) {
        // Calculate end of this 30-day chunk
        let currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + 30);

        if (currentEnd > end) {
            currentEnd = end;
        }

        const dateFrom = currentStart.toISOString();
        const dateTo = currentEnd.toISOString();

        console.log(`📅 Period: ${dateFrom.split('T')[0]} to ${dateTo.split('T')[0]}`);

        // First, search for documents in this period
        let continuationToken = null;
        let hasMore = true;
        let pageNum = 1;

        while (hasMore) {
            try {
                const params = {
                    submissionDateFrom: dateFrom,
                    submissionDateTo: dateTo,
                    pageSize: 50
                };

                if (continuationToken) {
                    params.continuationToken = continuationToken;
                }

                const searchResponse = await axios.get(`${API_URL}/documents/search`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    params: params
                });

                const result = searchResponse.data;
                const documents = result.result || [];
                const metadata = result.metadata;

                console.log(`  📄 Page ${pageNum}: Found ${documents.length} documents`);

                // Filter for VALID documents only
                const validDocs = documents.filter(doc => doc.status === 'Valid');
                console.log(`  ✅ Valid: ${validDocs.length} | ❌ Skipped: ${documents.length - validDocs.length}`);

                totalSkipped += (documents.length - validDocs.length);

                // Fetch full document for each valid one
                for (const doc of validDocs) {
                    const fullDoc = await getFullDocument(accessToken, doc.uuid);

                    if (fullDoc) {
                        // Get document type
                        const docType = getDocumentType(fullDoc);
                        let filename = generateFilename(doc.internalId, docType, doc.uuid);

                        // Handle duplicates
                        if (usedFilenames.has(filename)) {
                            const count = usedFilenames.get(filename);
                            usedFilenames.set(filename, count + 1);
                            const prefix = docType === 'c' ? 'credit_' : docType === 'd' ? 'debit_' : '';
                            filename = `${prefix}${doc.internalId || doc.uuid}_${doc.uuid.substring(0, 8)}.json`;
                            console.log(`  ⚠️  Duplicate ID "${doc.internalId}" - saving as ${filename}`);
                        } else {
                            usedFilenames.set(filename, 1);
                        }

                        const filepath = path.join(INVOICES_FULL_DIR, filename);
                        fs.writeFileSync(filepath, JSON.stringify(fullDoc, null, 2));
                        totalValid++;
                        console.log(`  💾 Saved: ${filename}`);
                    }

                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                totalFetched += documents.length;

                if (metadata && metadata.continuationToken && metadata.continuationToken !== 'EndofResultSet') {
                    continuationToken = metadata.continuationToken;
                    pageNum++;
                } else {
                    hasMore = false;
                }

            } catch (error) {
                console.error('  ❌ Error searching documents:', error.response ? error.response.data : error.message);
                hasMore = false;
            }
        }

        // Move to next chunk
        currentStart = new Date(currentEnd);
        currentStart.setMilliseconds(currentStart.getMilliseconds() + 1);

        // Small delay between date ranges
        if (currentStart < end) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ FETCH COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 Total documents found: ${totalFetched}`);
    console.log(`✅ Valid invoices saved: ${totalValid}`);
    console.log(`❌ Invalid/skipped: ${totalSkipped}`);
    console.log(`📁 Saved to: ${INVOICES_FULL_DIR}`);
    console.log('='.repeat(60));
}

async function main() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('❌ Error: ETA_CLIENT_ID and ETA_CLIENT_SECRET are missing in .env file.');
        process.exit(1);
    }

    // Parse command-line arguments
    const args = process.argv.slice(2);
    let startDate, endDate;

    if (args.length >= 1) {
        startDate = new Date(args[0]);
        if (isNaN(startDate.getTime())) {
            console.error('❌ Error: Invalid start date format. Use YYYY-MM-DD');
            console.log('Usage: node fetch_full_invoices.js [START_DATE] [END_DATE]');
            console.log('Example: node fetch_full_invoices.js 2024-01-01 2024-12-31');
            process.exit(1);
        }
    } else {
        // Default to last 30 days
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }

    if (args.length >= 2) {
        endDate = new Date(args[1]);
        if (isNaN(endDate.getTime())) {
            console.error('❌ Error: Invalid end date format. Use YYYY-MM-DD');
            process.exit(1);
        }
    } else {
        endDate = new Date();
    }

    const token = await getAccessToken();
    await fetchAllFullInvoices(token, startDate, endDate);
}

main();
