const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Configuration
const AUTH_URL = process.env.ETA_AUTH_URL;
const API_URL = process.env.ETA_API_URL;
const CLIENT_ID = process.env.ETA_CLIENT_ID;
const CLIENT_SECRET = process.env.ETA_CLIENT_SECRET;

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

async function getFullDocument(accessToken, uuid) {
    console.log(`\nFetching full document for UUID: ${uuid}...`);

    try {
        const response = await axios.get(`${API_URL}/documents/${uuid}/raw`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        console.log('✅ Full document retrieved successfully!');
        return response.data;
    } catch (error) {
        console.error('❌ Error fetching full document:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function main() {
    // Get a sample UUID from existing invoices
    const invoicesDir = path.join(__dirname, 'invoices');
    const files = fs.readdirSync(invoicesDir).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
        console.error('No invoice files found. Please run fetch_invoices.js first.');
        process.exit(1);
    }

    // Read first invoice to get its UUID
    const sampleFile = path.join(invoicesDir, files[0]);
    const sampleInvoice = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
    const uuid = sampleInvoice.uuid;

    console.log(`Sample Invoice: ${sampleInvoice.internalId} (${uuid})`);

    // Authenticate
    const token = await getAccessToken();

    // Fetch full document
    const fullDocument = await getFullDocument(token, uuid);

    if (fullDocument) {
        // Save to file
        const outputPath = path.join(__dirname, 'sample_full_invoice.json');
        fs.writeFileSync(outputPath, JSON.stringify(fullDocument, null, 2));
        console.log(`\n📄 Full invoice saved to: ${outputPath}`);

        // Show structure
        console.log('\n📊 Document Structure:');
        console.log(JSON.stringify(fullDocument, null, 2).substring(0, 1000) + '\n...(truncated)');
    }
}

main();
