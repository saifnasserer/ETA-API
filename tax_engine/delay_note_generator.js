const fs = require('fs');
const path = require('path');

const COMPANY_ID = '767043545';
const COMPANY_NAME_AR = 'لابك لتجاره الالكترونيات';
const COMPANY_NAME_EN = 'Laapak Electronics Trading';

/**
 * Delay Explanation Note Generator
 * Creates supporting documentation for late voluntary submission under Law 5/2025
 */
class DelayNoteGenerator {
    constructor() {
        this.outputDir = path.join(__dirname, '../output');

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Generate delay explanation note
     */
    generateNote() {
        const currentDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const vatPeriods = [
            'December 2024',
            'January 2025',
            'February 2025',
            'March 2025',
            'April 2025',
            'May 2025',
            'June 2025',
            'July 2025',
            'August 2025',
            'September 2025',
            'October 2025',
            'November 2025',
            'December 2025'
        ];

        const note = {
            documentType: 'Delay Explanation Note',
            submissionType: 'Voluntary Late Submission',
            legalBasis: 'Law 5/2025 Article 3',
            generatedDate: new Date().toISOString(),

            header: {
                to: 'Egyptian Tax Authority',
                toArabic: 'مصلحة الضرائب المصرية',
                from: COMPANY_NAME_EN,
                fromArabic: COMPANY_NAME_AR,
                taxId: COMPANY_ID,
                date: currentDate,
                subject: 'Voluntary Late Submission of Tax Declarations under Law 5/2025',
                subjectArabic: 'تقديم طوعي متأخر للإقرارات الضريبية بموجب القانون رقم 5 لسنة 2025'
            },

            content: {
                introduction: `We, ${COMPANY_NAME_EN} (Tax ID: ${COMPANY_ID}), hereby submit the following tax declarations voluntarily under the provisions of Law 5/2025 Article 3.`,

                vatDeclarations: {
                    title: 'Monthly VAT Declarations (Form 10)',
                    periods: vatPeriods,
                    count: vatPeriods.length
                },

                incomeTaxDeclarations: {
                    title: 'Annual Corporate Income Tax Declarations',
                    periods: ['Fiscal Year 2024', 'Fiscal Year 2025'],
                    count: 2
                },

                delayReason: {
                    title: 'Reason for Delay',
                    explanation: [
                        'Technical difficulties accessing the Egyptian Tax Authority e-portal prevented timely submission of the above declarations.',
                        'All business transactions during these periods were properly documented through the ETA e-invoicing system.',
                        'The company has maintained complete and accurate records of all sales and purchases.',
                        'There was no intent of tax evasion or deliberate non-compliance.'
                    ]
                },

                legalBasis: {
                    title: 'Legal Basis for Submission',
                    points: [
                        'This submission is made voluntarily under Law 5/2025 Article 3.',
                        'No tax audit or assessment has been initiated against the company.',
                        'The company qualifies for penalty waiver under Law 5/2025.',
                        'All declarations are submitted within the 6-month amnesty window (deadline: August 12, 2026).'
                    ]
                },

                declaration: {
                    title: 'Company Declaration',
                    statement: 'We declare that all information provided in the attached tax returns is true, complete, and accurate to the best of our knowledge. We understand our obligations under Egyptian tax law and commit to timely compliance going forward.'
                },

                attachments: {
                    title: 'Attached Documents',
                    list: [
                        '13 Monthly VAT Returns (December 2024 - December 2025)',
                        '2 Annual Corporate Income Tax Returns (2024, 2025)',
                        'Invoice listings by month',
                        'VAT reconciliation worksheets',
                        'Supporting financial documentation'
                    ]
                }
            },

            footer: {
                respectfully: 'Respectfully submitted,',
                companyName: COMPANY_NAME_EN,
                companyNameArabic: COMPANY_NAME_AR,
                taxId: COMPANY_ID,
                date: currentDate,
                signature: '[Authorized Signatory]',
                stamp: '[Company Stamp]'
            }
        };

        return note;
    }

    /**
     * Generate text version of the note
     */
    generateTextVersion(note) {
        const lines = [];

        // Header
        lines.push('═'.repeat(80));
        lines.push('DELAY EXPLANATION NOTE');
        lines.push('Voluntary Late Submission under Law 5/2025');
        lines.push('═'.repeat(80));
        lines.push('');

        lines.push(`To: ${note.header.to}`);
        lines.push(`    ${note.header.toArabic}`);
        lines.push('');
        lines.push(`From: ${note.header.from}`);
        lines.push(`      ${note.header.fromArabic}`);
        lines.push(`      Tax ID: ${note.header.taxId}`);
        lines.push('');
        lines.push(`Date: ${note.header.date}`);
        lines.push('');
        lines.push(`Subject: ${note.header.subject}`);
        lines.push(`         ${note.header.subjectArabic}`);
        lines.push('');
        lines.push('─'.repeat(80));
        lines.push('');

        // Introduction
        lines.push(note.content.introduction);
        lines.push('');

        // VAT Declarations
        lines.push(`1. ${note.content.vatDeclarations.title}`);
        lines.push('');
        note.content.vatDeclarations.periods.forEach((period, idx) => {
            lines.push(`   ${String(idx + 1).padStart(2, ' ')}. ${period}`);
        });
        lines.push('');
        lines.push(`   Total: ${note.content.vatDeclarations.count} monthly declarations`);
        lines.push('');

        // Income Tax Declarations
        lines.push(`2. ${note.content.incomeTaxDeclarations.title}`);
        lines.push('');
        note.content.incomeTaxDeclarations.periods.forEach((period, idx) => {
            lines.push(`   ${String(idx + 1).padStart(2, ' ')}. ${period}`);
        });
        lines.push('');
        lines.push(`   Total: ${note.content.incomeTaxDeclarations.count} annual declarations`);
        lines.push('');

        // Delay Reason
        lines.push(`3. ${note.content.delayReason.title}`);
        lines.push('');
        note.content.delayReason.explanation.forEach(exp => {
            lines.push(`   • ${exp}`);
        });
        lines.push('');

        // Legal Basis
        lines.push(`4. ${note.content.legalBasis.title}`);
        lines.push('');
        note.content.legalBasis.points.forEach(point => {
            lines.push(`   • ${point}`);
        });
        lines.push('');

        // Declaration
        lines.push(`5. ${note.content.declaration.title}`);
        lines.push('');
        lines.push(`   ${note.content.declaration.statement}`);
        lines.push('');

        // Attachments
        lines.push(`6. ${note.content.attachments.title}`);
        lines.push('');
        note.content.attachments.list.forEach((item, idx) => {
            lines.push(`   ${String(idx + 1).padStart(2, ' ')}. ${item}`);
        });
        lines.push('');

        // Footer
        lines.push('─'.repeat(80));
        lines.push('');
        lines.push(note.footer.respectfully);
        lines.push('');
        lines.push(note.footer.companyName);
        lines.push(note.footer.companyNameArabic);
        lines.push(`Tax ID: ${note.footer.taxId}`);
        lines.push('');
        lines.push(note.footer.signature);
        lines.push(note.footer.stamp);
        lines.push('');
        lines.push(`Date: ${note.footer.date}`);
        lines.push('');
        lines.push('═'.repeat(80));

        return lines.join('\n');
    }

    /**
     * Save note to files
     */
    saveNote() {
        console.log('=== Delay Explanation Note Generator ===\n');

        const note = this.generateNote();
        const textVersion = this.generateTextVersion(note);

        // Save JSON version
        const jsonPath = path.join(this.outputDir, 'delay_explanation_note.json');
        fs.writeFileSync(jsonPath, JSON.stringify(note, null, 2), 'utf8');
        console.log(`Saved JSON: ${jsonPath}`);

        // Save text version
        const txtPath = path.join(this.outputDir, 'delay_explanation_note.txt');
        fs.writeFileSync(txtPath, textVersion, 'utf8');
        console.log(`Saved Text: ${txtPath}`);

        console.log('\n✓ Delay explanation note generated successfully');
        console.log(`✓ Legal basis: Law 5/2025 Article 3`);
        console.log(`✓ Covers: 13 VAT declarations + 2 income tax declarations`);

        return { note, textVersion, jsonPath, txtPath };
    }
}

// CLI execution
if (require.main === module) {
    const generator = new DelayNoteGenerator();
    generator.saveNote();
}

module.exports = new DelayNoteGenerator();
