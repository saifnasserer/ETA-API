const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Configuration
const AUTH_URL = process.env.ETA_AUTH_URL;
const API_URL = process.env.ETA_API_URL;
const CLIENT_ID = process.env.ETA_CLIENT_ID;
const CLIENT_SECRET = process.env.ETA_CLIENT_SECRET;

// Ensure invoices directory exists
const INVOICES_DIR = path.join(__dirname, 'invoices');
if (!fs.existsSync(INVOICES_DIR)) {
    fs.mkdirSync(INVOICES_DIR);
}

async function getAccessToken() {
    console.log('Authenticating...');
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
        console.log('Authentication successful.');
        return response.data.access_token;
    } catch (error) {
        console.error('Authentication failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function fetchDocumentsInRange(accessToken, dateFrom, dateTo, pageSize = 50) {
    console.log(`Fetching documents from ${dateFrom} to ${dateTo}...`);

    let continuationToken = null;
    let hasMore = true;
    let totalFetched = 0;

    while (hasMore) {
        const params = {
            submissionDateFrom: dateFrom,
            submissionDateTo: dateTo,
            pageSize: pageSize
        };

        if (continuationToken) {
            params.continuationToken = continuationToken;
        }

        try {
            const response = await axios.get(`${API_URL}/documents/search`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: params
            });

            const result = response.data;
            const documents = result.result || [];
            const metadata = result.metadata;

            console.log(`  Fetched ${documents.length} documents.`);

            for (const doc of documents) {
                const filename = path.join(INVOICES_DIR, `${doc.uuid}.json`);
                fs.writeFileSync(filename, JSON.stringify(doc, null, 2));
            }

            totalFetched += documents.length;

            if (metadata && metadata.continuationToken && metadata.continuationToken !== 'EndofResultSet') {
                continuationToken = metadata.continuationToken;
            } else {
                hasMore = false;
            }
        } catch (error) {
            console.error('Error fetching documents:', error.response ? error.response.data : error.message);
            hasMore = false;
        }
    }

    return totalFetched;
}

async function fetchAllDocuments(accessToken, startDate, endDate = new Date()) {
    // The API limits date range to 30 days per request
    // So we need to split the request into 30-day chunks

    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(`\nFetching all documents from ${start.toISOString()} to ${end.toISOString()}`);
    console.log('This may take a while for large date ranges...\n');

    let currentStart = new Date(start);
    let grandTotal = 0;

    while (currentStart < end) {
        // Calculate end of this 30-day chunk
        let currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + 30);

        // Don't go past the final end date
        if (currentEnd > end) {
            currentEnd = end;
        }

        const dateFrom = currentStart.toISOString();
        const dateTo = currentEnd.toISOString();

        const count = await fetchDocumentsInRange(accessToken, dateFrom, dateTo);
        grandTotal += count;

        // Move to next chunk
        currentStart = new Date(currentEnd);
        currentStart.setMilliseconds(currentStart.getMilliseconds() + 1); // Avoid overlap

        // Small delay to avoid rate limiting
        if (currentStart < end) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log(`\n✅ Finished. Total documents fetched: ${grandTotal}`);
    return grandTotal;
}

async function main() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('Error: ETA_CLIENT_ID and ETA_CLIENT_SECRET are missing in .env file.');
        console.log('Please obtain them from the ETA Portal (ERP System Registration).');
        process.exit(1);
    }

    // Parse command-line arguments
    const args = process.argv.slice(2);
    let startDate, endDate;

    if (args.length >= 1) {
        // User provided start date
        startDate = new Date(args[0]);
        if (isNaN(startDate.getTime())) {
            console.error('Error: Invalid start date format. Use YYYY-MM-DD');
            console.log('Usage: node fetch_invoices.js [START_DATE] [END_DATE]');
            console.log('Example: node fetch_invoices.js 2024-01-01 2024-12-31');
            process.exit(1);
        }
    } else {
        // Default to last 30 days
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }

    if (args.length >= 2) {
        // User provided end date
        endDate = new Date(args[1]);
        if (isNaN(endDate.getTime())) {
            console.error('Error: Invalid end date format. Use YYYY-MM-DD');
            process.exit(1);
        }
    } else {
        // Default to today
        endDate = new Date();
    }

    const token = await getAccessToken();
    await fetchAllDocuments(token, startDate, endDate);
}

main();

