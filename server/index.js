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

function generateFilename(internalId, documentType, dateTimeIssued, uuid) {
    const type = documentType.toLowerCase();
    
    // Create a safe, unique suffix based on date time or uuid
    let uniquePart = uuid || Date.now().toString();
    if (dateTimeIssued) {
        // Format: 2025-10-15T14-30-00Z
        uniquePart = dateTimeIssued.replace(/[:.Z]/g, '-');
    }

    if (type === 'c') {
        return `credit_${internalId}_${uniquePart}.json`;
    } else if (type === 'd') {
        return `debit_${internalId}_${uniquePart}.json`;
    } else {
        return `${internalId}_${uniquePart}.json`;
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
            const filename = generateFilename(doc.internalId, docType, doc.dateTimeIssued, doc.uuid);
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
            let skippedCount = 0;

            // Read existing files to prevent re-downloading
            const invoicesDir = path.join(__dirname, '../invoices_full');
            const existingFiles = fs.existsSync(invoicesDir) ? fs.readdirSync(invoicesDir) : [];

            for (const doc of validDocs) {
                try {
                    // Check if already downloaded based on unique suffix
                    let uniquePart = doc.uuid || '';
                    if (doc.dateTimeIssued) {
                        uniquePart = doc.dateTimeIssued.replace(/[:.Z]/g, '-');
                    }
                    
                    const suffix = `_${uniquePart}.json`;
                    if (existingFiles.some(file => file.endsWith(suffix))) {
                        skippedCount++;
                        continue;
                    }

                    const fullDocResponse = await axios.get(`${process.env.ETA_API_URL}/documents/${doc.uuid}/raw`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });

                    const docType = getDocumentType(fullDocResponse.data);
                    const filename = generateFilename(doc.internalId, docType, doc.dateTimeIssued, doc.uuid);
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
                message: `Fetched ${fetchedCount} new invoices, skipped ${skippedCount} existing.`,
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

// ==================== TAX COMPLIANCE API ENDPOINTS ====================

const multiPeriodVAT = require('../tax_engine/multi_period_vat');
const annualIncomeTax = require('../tax_engine/annual_income_tax');
const delayNoteGenerator = require('../tax_engine/delay_note_generator');
const accountantPackage = require('../tax_engine/accountant_package');

// API: Get Tax Compliance Dashboard Data
app.get('/api/tax/dashboard', (req, res) => {
    try {
        // Load VAT summary
        const vatSummaryPath = path.join(__dirname, '../output/all_vat_returns_summary.json');
        let vatData = null;

        if (fs.existsSync(vatSummaryPath)) {
            vatData = JSON.parse(fs.readFileSync(vatSummaryPath, 'utf8'));
        }

        // Load income tax returns
        const incomeTax = {};
        const tax2024Path = path.join(__dirname, '../output/2024_income_tax_return.json');
        const tax2025Path = path.join(__dirname, '../output/2025_income_tax_return.json');

        if (fs.existsSync(tax2024Path)) {
            incomeTax['2024'] = JSON.parse(fs.readFileSync(tax2024Path, 'utf8'));
        }
        if (fs.existsSync(tax2025Path)) {
            incomeTax['2025'] = JSON.parse(fs.readFileSync(tax2025Path, 'utf8'));
        }

        // Calculate days remaining until deadline
        const deadline = new Date('2026-08-12');
        const now = new Date();
        const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        res.json({
            vat: vatData,
            incomeTax: incomeTax,
            deadline: '2026-08-12',
            daysRemaining: daysRemaining,
            generated: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Generate all VAT returns
app.post('/api/tax/vat/generate-all', (req, res) => {
    try {
        const returns = multiPeriodVAT.generateAllMonthlyReturns();
        res.json({ success: true, count: returns.length, returns });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Get specific month VAT return
app.get('/api/tax/vat/month/:month', (req, res) => {
    try {
        const { month } = req.params;
        const filePath = path.join(__dirname, '../output', `${month}_vat_return.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'VAT return not found for this month' });
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Generate income tax returns
app.post('/api/tax/income/generate', (req, res) => {
    try {
        const { expenses2024, expenses2025 } = req.body;
        const result = annualIncomeTax.generateBothYears(expenses2024 || {}, expenses2025 || {});
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Get delay explanation note
app.get('/api/tax/delay-note', (req, res) => {
    try {
        const note = delayNoteGenerator.generateNote();
        res.json(note);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Download accountant package (ZIP)
app.get('/api/tax/download-package', async (req, res) => {
    try {
        const zipPath = await accountantPackage.generatePackage();
        res.download(zipPath, path.basename(zipPath));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Generate SAP Excel Files
const sapExcelGenerator = require('./sap_generator');

app.get('/api/reports/sap-excel', (req, res) => {
    try {
        const { month, year } = req.query; // Format: month=YYYY-MM or year=YYYY

        let rawInvoices = loadInvoices();

        if (year) {
            const yearInt = parseInt(year);
            rawInvoices = rawInvoices.filter(inv => {
                const date = new Date(inv.dateTimeIssued);
                return date.getFullYear() === yearInt;
            });
            console.log(`Filtering SAP export for Year: ${year}, found ${rawInvoices.length} invoices`);
        } else if (month) {
            // ---------------------------------------------------------
            // EXCEPTION FOR FEB 2025 (AMNESTY / CATCH-UP PERIOD)
            // ---------------------------------------------------------
            // If month is Feb 2025, user wants to include ALL previous invoices 
            // (Jan 2025, 2024, etc) to file them in this first return.
            // ---------------------------------------------------------
            if (month === '2025-02') {
                console.log('Generating Cumulative Catch-up Report for Feb 2025');
                rawInvoices = rawInvoices.filter(inv => {
                    const date = new Date(inv.dateTimeIssued);
                    // Include everything UP TO Feb 28, 2025
                    // Note: This relies on the fact that future invoices (March+) will be excluded
                    // simply by this date check.
                    return date <= new Date('2025-02-28T23:59:59');
                });
                console.log(`Cumulative Report (<= Feb 2025) found ${rawInvoices.length} invoices`);
            } else {
                // Standard Monthly Filtering
                rawInvoices = rawInvoices.filter(inv => {
                    const date = new Date(inv.dateTimeIssued);
                    const invMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    return invMonth === month;
                });
                console.log(`Filtering SAP export for month: ${month}, found ${rawInvoices.length} invoices`);
            }
        }

        // Pass isAdjustment flag for Feb 2025 pre-registration invoices
        const isAdjustment = (month === '2025-02');
        const result = sapExcelGenerator.generateSapExcel(rawInvoices, isAdjustment);
        res.json({
            success: true,
            message: 'SAP Excel files generated successfully',
            data: result,
            urls: {
                sales: `/api/reports/download/${encodeURIComponent(path.basename(result.sales))}`,
                purchases: `/api/reports/download/${encodeURIComponent(path.basename(result.purchases))}`
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// API: Annual Income Report
app.get('/api/reports/annual-income', (req, res) => {
    try {
        const { year } = req.query; // e.g. 2024
        if (!year) return res.status(400).json({ error: 'Year is required' });

        const rawInvoices = loadInvoices();
        const yearInt = parseInt(year);

        const yearInvoices = rawInvoices.filter(inv => {
            const d = new Date(inv.dateTimeIssued);
            return d.getFullYear() === yearInt;
        });

        const totalSales = yearInvoices.reduce((sum, inv) => {
            // totalSalesAmount is usually the net amount excluding tax
            return sum + (inv.totalSalesAmount || 0);
        }, 0);

        const details = yearInvoices.map(inv => ({
            id: inv.internalID,
            date: inv.dateTimeIssued,
            customer: inv.receiver?.name || 'Unknown',
            total: inv.totalSalesAmount || 0,
            tax: inv.taxTotals?.[0]?.amount || 0 // Assuming T1 is first, simpler for summary
        }));

        res.json({
            year: yearInt,
            invoiceCount: yearInvoices.length,
            totalRevenue: totalSales,
            details: details,
            currency: 'EGP'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Download Reports
app.get('/api/reports/download/:filename', (req, res) => {
    const filename = req.params.filename;
    console.log('Download requested for filename:', filename);
    
    // Allow downloads from output and output/excel_uploads_eta
    const possiblePaths = [
        path.join(__dirname, '../output', filename),
        path.join(__dirname, '../output/excel_uploads_eta', filename)
    ];

    possiblePaths.forEach(p => console.log('Checking path:', p, 'Exists:', fs.existsSync(p)));

    const validPath = possiblePaths.find(p => fs.existsSync(p));

    if (validPath) {
        console.log('Sending file:', validPath);
        res.download(validPath);
    } else {
        console.error('File not found among possible paths');
        res.status(404).json({ error: 'File not found' });
    }
});

// Serve Static Files (Production)
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
    console.log('🌐 Serving static files from:', clientDistPath);
    app.use(express.static(clientDistPath));

    // Catch-all route for SPA (Using middleware for Express 5 compatibility)
    app.use((req, res, next) => {
        if (req.url.startsWith('/api')) return next();
        if (req.method !== 'GET') return next();
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Invoices Directory: ${path.join(__dirname, '../invoices_full')}`);
});
