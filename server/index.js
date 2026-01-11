const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const taxCalculator = require('../tax_engine/tax_calculator');
const complianceCheck = require('../tax_engine/compliance_check');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Load invoices from invoices_full directory
function loadInvoices() {
    const invoicesFullDir = path.join(__dirname, '../invoices_full');

    if (!fs.existsSync(invoicesFullDir)) {
        console.warn('⚠️  invoices_full directory not found');
        return [];
    }

    const files = fs.readdirSync(invoicesFullDir).filter(f => f.endsWith('.json'));
    const invoices = [];

    files.forEach(file => {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(invoicesFullDir, file), 'utf8'));
            invoices.push(data);
        } catch (error) {
            console.error(`Error loading ${file}:`, error.message);
        }
    });

    console.log(`✅ Loaded ${invoices.length} full invoices`);
    return invoices;
}

// API: Get processed invoices with compliance flags
app.get('/api/invoices', (req, res) => {
    try {
        const rawInvoices = loadInvoices();
        const processed = rawInvoices
            .map(inv => taxCalculator.processInvoice(inv))
            .filter(inv => inv !== null);

        // Sort by date desc
        processed.sort((a, b) => new Date(b.dateTimeIssued) - new Date(a.dateTimeIssued));

        res.json({ count: processed.length, invoices: processed });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: Get Tax Summary (grouped by Month)
app.get('/api/reports/vat-return', (req, res) => {
    try {
        const rawInvoices = loadInvoices();
        const processed = rawInvoices
            .map(inv => taxCalculator.processInvoice(inv))
            .filter(inv => inv !== null);

        const periods = {};

        processed.forEach(inv => {
            const date = new Date(inv.dateTimeIssued);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!periods[key]) periods[key] = [];
            periods[key].push(inv);
        });

        // Calculate summaries for each period
        const report = Object.keys(periods).map(key => {
            const periodInvoices = periods[key];
            const summary = taxCalculator.calculatePeriodSummary(periodInvoices);
            const flags = complianceCheck.runChecks(periodInvoices);

            return {
                period: key,
                ...summary,
                flags: flags
            };
        });

        // Sort by Period Desc
        report.sort((a, b) => b.period.localeCompare(a.period));

        res.json(report);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: Get Specific Form 10 Data for a Month (YYYY-MM)
app.get('/api/reports/form10', (req, res) => {
    try {
        const { month } = req.query; // Format: 2024-11
        if (!month) return res.status(400).json({ error: "Month parameter (YYYY-MM) is required" });

        const rawInvoices = loadInvoices();
        const processed = rawInvoices
            .map(inv => taxCalculator.processInvoice(inv))
            .filter(inv => inv !== null);

        // Filter for specific month
        const monthlyInvoices = processed.filter(inv => {
            const date = new Date(inv.dateTimeIssued);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            return key === month;
        });

        const form10 = taxCalculator.getPeriodForm10(monthlyInvoices);

        // Add header info
        const response = {
            period: month,
            generatedAt: new Date().toISOString(),
            data: form10,
            invoiceCount: monthlyInvoices.length
        };

        res.json(response);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Helper functions for document type and naming
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

// API: Fetch invoices from ETA by month or internal ID
app.post('/api/fetch-invoices', async (req, res) => {
    try {
        const { month, internalId } = req.body;

        // Authenticate with ETA
        const authParams = new URLSearchParams();
        authParams.append('grant_type', 'client_credentials');
        authParams.append('client_id', process.env.ETA_CLIENT_ID);
        authParams.append('client_secret', process.env.ETA_CLIENT_SECRET);
        authParams.append('scope', 'InvoicingAPI');

        const authResponse = await axios.post(process.env.ETA_AUTH_URL, authParams, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const token = authResponse.data.access_token;

        if (internalId) {
            // Fetch specific invoice by internal ID
            // First search for it
            const searchResponse = await axios.get(`${process.env.ETA_API_URL}/documents/search`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    internalId: internalId,
                    pageSize: 1
                }
            });

            const documents = searchResponse.data.result || [];
            if (documents.length === 0) {
                return res.status(404).json({ error: 'Invoice not found' });
            }

            const doc = documents[0];

            // Fetch full document
            const fullDocResponse = await axios.get(`${process.env.ETA_API_URL}/documents/${doc.uuid}/raw`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            // Save to invoices_full with proper naming
            const docType = getDocumentType(fullDocResponse.data);
            const filename = generateFilename(doc.internalId, docType);
            const filepath = path.join(__dirname, '../invoices_full', filename);
            fs.writeFileSync(filepath, JSON.stringify(fullDocResponse.data, null, 2));

            return res.json({
                success: true,
                message: `Invoice ${internalId} fetched successfully`,
                invoice: fullDocResponse.data
            });
        } else if (month) {
            // Fetch invoices for a specific month (YYYY-MM)
            const [year, monthNum] = month.split('-');
            const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);

            const searchResponse = await axios.get(`${process.env.ETA_API_URL}/documents/search`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    submissionDateFrom: startDate.toISOString(),
                    submissionDateTo: endDate.toISOString(),
                    pageSize: 100
                }
            });

            const documents = searchResponse.data.result || [];
            const validDocs = documents.filter(doc => doc.status === 'Valid');

            let fetchedCount = 0;
            let failedCount = 0;

            for (const doc of validDocs) {
                try {
                    const fullDocResponse = await axios.get(`${process.env.ETA_API_URL}/documents/${doc.uuid}/raw`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });

                    const docType = getDocumentType(fullDocResponse.data);
                    const filename = generateFilename(doc.internalId, docType);
                    const filepath = path.join(__dirname, '../invoices_full', filename);
                    fs.writeFileSync(filepath, JSON.stringify(fullDocResponse.data, null, 2));
                    fetchedCount++;

                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                    failedCount++;
                    console.error(`Failed to fetch ${doc.internalId}:`, error.response?.status);
                }
            }

            return res.json({
                success: true,
                message: `Fetched ${fetchedCount} invoices for ${month}`,
                total: validDocs.length,
                fetched: fetchedCount,
                failed: failedCount
            });
        } else {
            return res.status(400).json({ error: 'Please provide either month or internalId' });
        }
    } catch (error) {
        console.error('Fetch error:', error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
});

// API: Get single invoice by internalId (local)
app.get('/api/invoices/:internalId', (req, res) => {
    const { internalId } = req.params;
    const invoicesFullDir = path.join(__dirname, '../invoices_full');

    if (!fs.existsSync(invoicesFullDir)) {
        return res.status(404).json({ error: 'Invoices directory not found' });
    }

    const files = fs.readdirSync(invoicesFullDir);

    // Find file matching internalId (handling prefixes like credit_, debit_ and suffixes like _uuid)
    const file = files.find(f => {
        let name = f.replace('.json', '');

        // Remove prefixes
        if (name.startsWith('credit_')) name = name.substring(7);
        else if (name.startsWith('debit_')) name = name.substring(6);

        // Check for exact match or suffix (e.g. "104" or "104_ABC...")
        return name === internalId || name.startsWith(`${internalId}_`);
    });

    if (!file) {
        return res.status(404).json({ error: 'Invoice not found' });
    }

    try {
        const data = JSON.parse(fs.readFileSync(path.join(invoicesFullDir, file), 'utf8'));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read invoice file' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Invoices Directory: ${path.join(__dirname, '../invoices_full')}`);
});
