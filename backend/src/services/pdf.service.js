/**
 * PDF Generation Service — Creates signed consent PDFs
 */
import PDFDocument from 'pdfkit';

/**
 * Generate a PDF for a signed consent
 */
export function generateConsentPDF(consent) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(20).font('Helvetica-Bold').text('MEDICAL CONSENT FORM', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').text('Proof of Consent — Digitally Signed', { align: 'center' });
            doc.moveDown(1);

            // Consent Info Box
            doc.rect(50, doc.y, 500, 80).fillAndStroke('#f0fdfa', '#0d9488');
            doc.fill('#0d9488').fontSize(12).font('Helvetica-Bold');
            doc.text('CONSENT INFORMATION', 60, doc.y + 10);
            doc.fill('#334155').fontSize(10).font('Helvetica');
            doc.text(`Consent ID: ${consent.consentId || 'N/A'}`, 60, doc.y + 5);
            doc.text(`Date: ${new Date(consent.signedAt || consent.createdAt).toLocaleDateString()}`, 300, doc.y - 12);
            doc.text(`Patient: ${consent.patientName || 'N/A'}`, 60, doc.y + 5);
            doc.text(`Procedure: ${consent.procedure || 'N/A'}`, 300, doc.y - 12);
            doc.text(`Doctor: ${consent.doctorName || 'N/A'}`, 60, doc.y + 5);
            doc.text(`Hospital: ${consent.hospital || 'N/A'}`, 300, doc.y - 12);
            doc.moveDown(2);

            // Overview
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0d9488').text('Overview');
            doc.moveDown(0.3);
            doc.fontSize(10).font('Helvetica').fillColor('#334155');
            doc.text(consent.overview || consent.aiSummary || 'No overview available.', { lineGap: 3 });
            doc.moveDown(1);

            // Procedure Steps
            if (consent.steps?.length) {
                doc.fontSize(14).font('Helvetica-Bold').fillColor('#0d9488').text('Procedure Steps');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica').fillColor('#334155');
                consent.steps.forEach((step, i) => {
                    doc.font('Helvetica-Bold').text(`${i + 1}. ${step.title}`);
                    doc.font('Helvetica').text(`   ${step.description}`, { lineGap: 2 });
                });
                doc.moveDown(1);
            }

            // Risks
            if (consent.risks?.length) {
                doc.fontSize(14).font('Helvetica-Bold').fillColor('#0d9488').text('Risks');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica').fillColor('#334155');
                consent.risks.forEach(risk => {
                    doc.font('Helvetica-Bold').text(`• ${risk.title} (${risk.likelihood || 'Uncommon'})`);
                    doc.font('Helvetica').text(`  ${risk.description}`, { lineGap: 2 });
                });
                doc.moveDown(1);
            }

            // Alternatives
            if (consent.alternatives?.length) {
                doc.fontSize(14).font('Helvetica-Bold').fillColor('#0d9488').text('Alternatives');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica').fillColor('#334155');
                consent.alternatives.forEach(alt => {
                    doc.font('Helvetica-Bold').text(`• ${alt.title}`);
                    doc.font('Helvetica').text(`  ${alt.description}`, { lineGap: 2 });
                });
                doc.moveDown(1);
            }

            // Recovery
            if (consent.recovery) {
                doc.fontSize(14).font('Helvetica-Bold').fillColor('#0d9488').text('Recovery');
                doc.moveDown(0.3);
                doc.fontSize(10).font('Helvetica').fillColor('#334155');
                doc.text(consent.recovery.summary || '', { lineGap: 3 });

                if (consent.recovery.do?.length) {
                    doc.moveDown(0.5);
                    doc.font('Helvetica-Bold').text('Do:');
                    consent.recovery.do.forEach(item => doc.text(`  ✓ ${item}`));
                }
                if (consent.recovery.dont?.length) {
                    doc.moveDown(0.5);
                    doc.font('Helvetica-Bold').text("Don't:");
                    consent.recovery.dont.forEach(item => doc.text(`  ✗ ${item}`));
                }
                doc.moveDown(1);
            }

            // Digital Signature Section
            doc.addPage();
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0d9488').text('DIGITAL SIGNATURE', { align: 'center' });
            doc.moveDown(1);

            // Patient Signature
            doc.rect(50, doc.y, 500, 120).fillAndStroke('#f0fdfa', '#0d9488');
            doc.fill('#0d9488').fontSize(11).font('Helvetica-Bold').text('Patient Signature', 60, doc.y + 10);
            doc.fill('#334155').fontSize(10).font('Helvetica');

            if (consent.patientSignature) {
                // Draw signature image if available
                doc.text(`Signed digitally`, 60, doc.y + 15);
                doc.text(`Signature Hash: ${consent.patientSignature.substring(0, 50)}...`, 60, doc.y + 5);
            } else {
                doc.text('Signature pending', 60, doc.y + 15);
            }
            doc.text(`Date: ${new Date(consent.signedAt || consent.createdAt).toLocaleString()}`, 60, doc.y + 5);
            doc.text(`Patient: ${consent.patientName || 'N/A'}`, 300, doc.y - 12);

            doc.moveDown(2);

            // Doctor Verification
            doc.rect(50, doc.y, 500, 80).fillAndStroke('#f0fdfa', '#0d9488');
            doc.fill('#0d9488').fontSize(11).font('Helvetica-Bold').text('Doctor Verification', 60, doc.y + 10);
            doc.fill('#334155').fontSize(10).font('Helvetica');
            doc.text(`Doctor: ${consent.doctorName || 'N/A'}`, 60, doc.y + 15);
            doc.text(`Hospital: ${consent.hospital || 'N/A'}`, 300, doc.y - 12);
            doc.text(`Status: ${consent.status || 'Signed'}`, 60, doc.y + 5);

            doc.moveDown(2);

            // Blockchain Verification
            if (consent.consentHash || consent.blockchainTx) {
                doc.rect(50, doc.y, 500, 60).fillAndStroke('#eff6ff', '#3b82f6');
                doc.fill('#1e40af').fontSize(11).font('Helvetica-Bold').text('Blockchain Verification', 60, doc.y + 10);
                doc.fill('#334155').fontSize(9).font('Helvetica');
                if (consent.consentHash) {
                    doc.text(`Consent Hash: ${consent.consentHash}`, 60, doc.y + 15);
                }
                if (consent.blockchainTx) {
                    doc.text(`Transaction: ${consent.blockchainTx}`, 60, doc.y + 5);
                }
                doc.text(`Network: Base Sepolia`, 60, doc.y + 5);
            }

            doc.moveDown(2);

            // Footer
            doc.fontSize(8).font('Helvetica').fillColor('#94a3b8');
            doc.text('This document was generated by Proof of Consent (PoC) — Medical Consent Management System', { align: 'center' });
            doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}
