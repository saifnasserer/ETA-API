const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

/**
 * Accountant Package Generator
 * Creates a complete ZIP package with all tax documents for accountant review
 */
class AccountantPackage {
    constructor() {
        this.outputDir = path.join(__dirname, '../output');
        this.packageDir = path.join(this.outputDir, 'tax_submission_package');

        // Ensure directories exist
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Create package directory structure
     */
    createDirectoryStructure() {
        const dirs = [
            this.packageDir,
            path.join(this.packageDir, '01_summary'),
            path.join(this.packageDir, '02_delay_note'),
            path.join(this.packageDir, '03_monthly_vat_returns'),
            path.join(this.packageDir, '04_annual_income_tax'),
            path.join(this.packageDir, '05_supporting_documents')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        console.log('✓ Created directory structure');
    }

    /**
     * Copy VAT returns
     */
    copyVATReturns() {
        const vatFiles = fs.readdirSync(this.outputDir)
            .filter(f => f.match(/^\d{4}-\d{2}_vat_return\.json$/));

        const destDir = path.join(this.packageDir, '03_monthly_vat_returns');

        vatFiles.forEach(file => {
            const src = path.join(this.outputDir, file);
            const dest = path.join(destDir, file);
            fs.copyFileSync(src, dest);
        });

        console.log(`✓ Copied ${vatFiles.length} monthly VAT returns`);
        return vatFiles.length;
    }

    /**
     * Copy income tax returns
     */
    copyIncomeTaxReturns() {
        const taxFiles = fs.readdirSync(this.outputDir)
            .filter(f => f.match(/^\d{4}_income_tax_return\.json$/));

        const destDir = path.join(this.packageDir, '04_annual_income_tax');

        taxFiles.forEach(file => {
            const src = path.join(this.outputDir, file);
            const dest = path.join(destDir, file);
            fs.copyFileSync(src, dest);
        });

        console.log(`✓ Copied ${taxFiles.length} annual income tax returns`);
        return taxFiles.length;
    }

    /**
     * Copy delay note
     */
    copyDelayNote() {
        const noteFiles = ['delay_explanation_note.json', 'delay_explanation_note.txt'];
        const destDir = path.join(this.packageDir, '02_delay_note');

        let copied = 0;
        noteFiles.forEach(file => {
            const src = path.join(this.outputDir, file);
            if (fs.existsSync(src)) {
                const dest = path.join(destDir, file);
                fs.copyFileSync(src, dest);
                copied++;
            }
        });

        console.log(`✓ Copied delay explanation note`);
        return copied;
    }

    /**
     * Copy summary
     */
    copySummary() {
        const summaryFile = 'all_vat_returns_summary.json';
        const src = path.join(this.outputDir, summaryFile);

        if (fs.existsSync(src)) {
            const dest = path.join(this.packageDir, '01_summary', summaryFile);
            fs.copyFileSync(src, dest);
            console.log(`✓ Copied VAT summary`);
            return true;
        }
        return false;
    }

    /**
     * Generate README file
     */
    generateReadme() {
        const readme = `
TAX SUBMISSION PACKAGE
======================

Company: لابك لتجاره الالكترونيات (Laapak Electronics Trading)
Tax ID: 767043545
Generated: ${new Date().toLocaleString()}

Legal Basis: Law 5/2025 Article 3 - Voluntary Late Submission
Deadline: August 12, 2026

PACKAGE CONTENTS
================

01_summary/
  └── all_vat_returns_summary.json
      Complete summary of all 13 monthly VAT returns

02_delay_note/
  ├── delay_explanation_note.json
  └── delay_explanation_note.txt
      Official explanation for late submission

03_monthly_vat_returns/
  ├── 2024-12_vat_return.json
  ├── 2025-01_vat_return.json
  ├── ... (13 files total)
  └── 2025-12_vat_return.json
      Individual VAT returns for each month (Dec 2024 - Dec 2025)

04_annual_income_tax/
  ├── 2024_income_tax_return.json
  └── 2025_income_tax_return.json
      Annual corporate income tax returns

05_supporting_documents/
  (Additional documentation as needed)

IMPORTANT NOTES
===============

1. ACCOUNTANT REVIEW REQUIRED
   All returns must be reviewed by a qualified accountant before submission.

2. OPERATING EXPENSES
   Annual income tax returns require manual entry of operating expenses
   (salaries, rent, utilities, etc.). These are NOT included in invoice data.

3. SUBMISSION PROCESS
   - Each monthly VAT return must be submitted separately on ETA portal
   - Do NOT combine months into one declaration
   - Mark each as "Late Voluntary Submission - Law 5/2025"
   - Attach delay explanation note to each submission

4. PAYMENT
   - Net VAT position: -73,379.5 EGP (REFUNDABLE)
   - You have a VAT credit, not a liability
   - Corporate income tax depends on operating expenses (not yet calculated)

5. DEADLINE
   All declarations must be submitted by August 12, 2026 to qualify
   for penalty waiver under Law 5/2025.

NEXT STEPS
==========

1. Review all VAT returns for accuracy
2. Add operating expense data to income tax returns
3. Have accountant verify all calculations
4. Prepare for ETA portal submission
5. Submit before August 12, 2026

For questions or assistance, consult your tax accountant.
`;

        const readmePath = path.join(this.packageDir, 'README.txt');
        fs.writeFileSync(readmePath, readme.trim(), 'utf8');
        console.log('✓ Generated README.txt');
    }

    /**
     * Generate package summary dashboard
     */
    generateDashboard() {
        // Load VAT summary
        const summaryPath = path.join(this.outputDir, 'all_vat_returns_summary.json');
        let vatSummary = null;

        if (fs.existsSync(summaryPath)) {
            vatSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        }

        const dashboard = {
            packageInfo: {
                generatedDate: new Date().toISOString(),
                companyName: 'لابك لتجاره الالكترونيات',
                companyNameEn: 'Laapak Electronics Trading',
                taxId: '767043545',
                legalBasis: 'Law 5/2025 Article 3',
                deadline: '2026-08-12'
            },

            declarations: {
                monthlyVAT: {
                    count: vatSummary ? vatSummary.totalReturns : 0,
                    periods: vatSummary ? vatSummary.periods : []
                },
                annualIncomeTax: {
                    count: 2,
                    years: [2024, 2025]
                },
                total: (vatSummary ? vatSummary.totalReturns : 0) + 2
            },

            vatSummary: vatSummary ? vatSummary.totals : null,

            warnings: [
                'Operating expenses must be added to income tax returns',
                'All returns require accountant review before submission',
                'Each monthly VAT return must be submitted separately',
                'Deadline: August 12, 2026'
            ],

            nextSteps: [
                'Review all VAT calculations',
                'Add operating expense data',
                'Accountant verification',
                'ETA portal submission',
                'Track confirmation numbers'
            ]
        };

        const dashboardPath = path.join(this.packageDir, '01_summary', 'package_dashboard.json');
        fs.writeFileSync(dashboardPath, JSON.stringify(dashboard, null, 2), 'utf8');
        console.log('✓ Generated package dashboard');
    }

    /**
     * Create ZIP archive
     */
    async createZipArchive() {
        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString().split('T')[0];
            const zipPath = path.join(this.outputDir, `tax_submission_package_${timestamp}.zip`);

            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
                console.log(`\n✓ Created ZIP archive: ${zipPath}`);
                console.log(`  Size: ${sizeMB} MB`);
                resolve(zipPath);
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);
            archive.directory(this.packageDir, 'tax_submission_package');
            archive.finalize();
        });
    }

    /**
     * Generate complete accountant package
     */
    async generatePackage() {
        console.log('=== Accountant Package Generator ===\n');

        try {
            // Create directory structure
            this.createDirectoryStructure();

            // Copy all files
            const vatCount = this.copyVATReturns();
            const taxCount = this.copyIncomeTaxReturns();
            this.copyDelayNote();
            this.copySummary();

            // Generate additional files
            this.generateReadme();
            this.generateDashboard();

            // Create ZIP
            const zipPath = await this.createZipArchive();

            console.log('\n=== Package Complete ===');
            console.log(`✓ ${vatCount} monthly VAT returns`);
            console.log(`✓ ${taxCount} annual income tax returns`);
            console.log(`✓ Delay explanation note`);
            console.log(`✓ Summary dashboard`);
            console.log(`✓ README file`);
            console.log(`\n✓ ZIP archive ready: ${path.basename(zipPath)}`);
            console.log(`\n📦 Package ready for accountant review!`);

            return zipPath;
        } catch (error) {
            console.error('Error generating package:', error);
            throw error;
        }
    }
}

// CLI execution
if (require.main === module) {
    const generator = new AccountantPackage();
    generator.generatePackage().catch(console.error);
}

module.exports = new AccountantPackage();
