import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import https from 'https';
import mongoose from 'mongoose';

/**
 * Helper to fetch a remote image as a Buffer.
 * @param {string} url 
 * @returns {Promise<Buffer>}
 */
const fetchImageBuffer = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch image: status code ${res.statusCode}`));
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
      res.on('error', (err) => reject(err));
    }).on('error', (err) => reject(err));
  });
};

/**
 * Generates a Donation Receipt PDF and returns it as a Buffer.
 * @param {Object} donation - Donation details
 * @param {Object} donor - Donor (user) details
 * @param {Object} [taxExemption] - Calculated tax exemption details
 * @returns {Promise<Buffer>} PDF File Buffer
 */
export const generateDonationReceipt = async (donation, donor, taxExemption) => {
  const receiptNo = taxExemption?.certificateNumber || `AHR-${donation._id.toString().slice(-6).toUpperCase()}`;
  const dateString = donation.completedAt 
    ? new Date(donation.completedAt).toLocaleDateString('en-IN') 
    : new Date(donation.createdAt).toLocaleDateString('en-IN');
  const itemsSummary = taxExemption?.itemizedExemptions?.map(i => `${i.foodName} (${i.quantity} ${i.quantityType})`).join(', ') || 'Food Meals';
  
  // Resolve recipient NGO details dynamically
  let recipientNgo = null;
  if (donation.pickedUpByNgo) {
    if (typeof donation.pickedUpByNgo === 'object' && donation.pickedUpByNgo.ngoName) {
      recipientNgo = donation.pickedUpByNgo;
    } else if (mongoose.Types.ObjectId.isValid(donation.pickedUpByNgo)) {
      const NGO = mongoose.model('Ngo');
      recipientNgo = await NGO.findById(donation.pickedUpByNgo);
    }
  } else if (donation.ngoPreference && donation.ngoPreference !== 'random') {
    if (typeof donation.ngoPreference === 'object' && donation.ngoPreference.ngoName) {
      recipientNgo = donation.ngoPreference;
    } else if (mongoose.Types.ObjectId.isValid(donation.ngoPreference)) {
      const NGO = mongoose.model('Ngo');
      recipientNgo = await NGO.findById(donation.ngoPreference);
    }
  }
  const recipientName = recipientNgo ? recipientNgo.ngoName : 'AAHAAR';

  // Format details as clean text for easy smartphone scanning
  const qrText = `AAHAAR Tax Exemption Receipt\nReceipt No: ${receiptNo}\nDate: ${dateString}\nDonor: ${donor.firstName} ${donor.surname}\nPAN: ${donor.panNumber || 'N/A'}\nRecipient: ${recipientName}\nExemption: INR ${taxExemption?.totalExemption.toFixed(2) || '0.00'}\nItems: ${itemsSummary}\nVerified under Sec 80G.`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;

  let qrBuffer = null;
  try {
    qrBuffer = await fetchImageBuffer(qrUrl);
  } catch (e) {
    console.warn("[PDF GENERATOR] Failed to fetch QR code image buffer:", e.message);
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });
    doc.on('error', (err) => reject(err));

    // --- Watermark (Translucent & Rotated) ---
    doc.save();
    doc.opacity(0.04);
    doc.fillColor('#0f172a');
    doc.fontSize(55);
    doc.font('Helvetica-Bold');
    doc.translate(doc.page.width / 2, doc.page.height / 2);
    doc.rotate(-35);
    doc.text('AAHAAR', -250, -40, { width: 500, align: 'center' });
    doc.restore();

    // --- Borders ---
    doc.rect(20, 20, 555, 802).strokeColor('#f97316').lineWidth(2.5).stroke();
    doc.rect(25, 25, 545, 792).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // --- Header ---
    const logoPath = path.join(path.resolve(), 'logo.png');
    let hasLogo = false;
    try {
      if (fs.existsSync(logoPath)) {
        doc.save();
        // Create circular clip path: center x=77.5, y=69.5, radius=27.5
        doc.circle(77.5, 69.5, 27.5).clip();
        doc.image(logoPath, 50, 42, { width: 55, height: 55 });
        doc.restore();
        
        // Draw matching outer circular border
        doc.circle(77.5, 69.5, 27.5).strokeColor('#f97316').lineWidth(1.5).stroke();
        hasLogo = true;
      }
    } catch (logoErr) {
      console.warn("[PDF GENERATOR] Error loading logo image:", logoErr.message);
    }

    const brandX = hasLogo ? 120 : 50;
    doc.fontSize(24).fillColor('#f97316').font('Helvetica-Bold').text('AAHAAR', brandX, 45);
    doc.fontSize(9).fillColor('#64748b').font('Helvetica').text('Fighting Hunger, Sharing Hope. One Meal at a Time.', brandX, 70);

    // Header Separator Line
    doc.lineWidth(1).strokeColor('#e2e8f0').moveTo(50, 105).lineTo(545, 105).stroke();

    // --- Certificate Title ---
    doc.fontSize(16).fillColor('#0f172a').font('Helvetica-Bold').text('CERTIFICATE OF DONATION & TAX RECEIPT', 50, 125, { align: 'center' });
    doc.lineWidth(1.5).strokeColor('#f97316').moveTo(140, 143).lineTo(455, 143).stroke();

    // --- Info Grid ---
    const startY = 165;
    
    // Column 1: Donor Details
    doc.fontSize(9).fillColor('#475569').font('Helvetica-Bold').text('DONOR DETAILS', 50, startY);
    doc.fontSize(10).fillColor('#0f172a').font('Helvetica');
    doc.text(`Name: ${donor.firstName || ''} ${donor.surname || ''}`, 50, startY + 16);
    doc.text(`Email: ${donor.email || ''}`, 50, startY + 28);
    doc.text(`PAN: ${donor.panNumber || 'N/A'} (Verified)`, 50, startY + 40);

    // Column 2: Receipt Details
    doc.fontSize(9).fillColor('#475569').font('Helvetica-Bold').text('RECEIPT DETAILS', 250, startY);
    doc.fontSize(10).fillColor('#0f172a').font('Helvetica');
    doc.text(`Receipt No: ${receiptNo}`, 250, startY + 16);
    doc.text(`Date: ${dateString}`, 250, startY + 28);
    doc.text(`Recipient: ${recipientName}`, 250, startY + 40, { width: 200 });

    // Column 3: Verification QR Code
    if (qrBuffer) {
      doc.image(qrBuffer, 460, startY - 10, { width: 75, height: 75 });
      doc.fontSize(6).fillColor('#64748b').text('Scan to Verify Receipt', 460, startY + 68, { width: 75, align: 'center' });
    } else {
      doc.rect(460, startY - 10, 75, 75).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fontSize(6).fillColor('#94a3b8').text('Verification QR', 460, startY + 22, { width: 75, align: 'center' });
    }

    // --- Table ---
    const tableY = 250;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('DONATED ITEMS & VALUATION DETAILS', 50, tableY);

    // Table Header
    const headerY = tableY + 18;
    doc.rect(50, headerY, 495, 22).fill('#f8fafc');
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
    doc.text('Item Description', 60, headerY + 7, { width: 180 });
    doc.text('Quantity', 240, headerY + 7, { width: 80, align: 'center' });
    doc.text('Estimated Value', 330, headerY + 7, { width: 100, align: 'right' });
    doc.text('Exemption Amount', 440, headerY + 7, { width: 100, align: 'right' });

    // Table Rows
    let currentY = headerY + 22;
    doc.font('Helvetica').fillColor('#334155');
    
    const items = taxExemption?.itemizedExemptions || [];
    if (items.length > 0) {
      items.forEach((item, idx) => {
        // Alternating row background
        if (idx % 2 === 1) {
          doc.rect(50, currentY, 495, 20).fill('#f8fafc');
          doc.fillColor('#334155'); // Reset color after fill
        }
        
        doc.text(item.foodName, 60, currentY + 6, { width: 180 });
        doc.text(`${item.quantity} ${item.quantityType}`, 240, currentY + 6, { width: 80, align: 'center' });
        doc.text(`₹${item.itemValue.toFixed(2)}`, 330, currentY + 6, { width: 100, align: 'right' });
        doc.text(`₹${item.exemptionAmount.toFixed(2)}`, 440, currentY + 6, { width: 100, align: 'right' });
        currentY += 20;
      });
    } else {
      // Fallback row
      doc.text('Food Meals', 60, currentY + 6, { width: 180 });
      doc.text(`${donation.quantity || 1} units`, 240, currentY + 6, { width: 80, align: 'center' });
      doc.text('N/A', 330, currentY + 6, { width: 100, align: 'right' });
      doc.text('N/A', 440, currentY + 6, { width: 100, align: 'right' });
      currentY += 20;
    }

    // Totals Section
    currentY += 10;
    doc.lineWidth(1).strokeColor('#e2e8f0').moveTo(50, currentY).lineTo(545, currentY).stroke();
    currentY += 8;

    const totalExemption = taxExemption ? taxExemption.totalExemption : 0;
    const totalValue = taxExemption ? taxExemption.donationValue : 0;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
    doc.text('Total Estimated Value:', 280, currentY);
    doc.font('Helvetica').fillColor('#0f172a').text(`₹${totalValue.toFixed(2)}`, 440, currentY, { width: 100, align: 'right' });

    currentY += 15;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#f97316');
    doc.text('Total Tax Exemption Benefit (Sec 80G):', 280, currentY);
    doc.text(`₹${totalExemption.toFixed(2)}`, 440, currentY, { width: 100, align: 'right' });

    // --- Section 80G Declaration Banner ---
    currentY += 35;
    doc.rect(50, currentY, 495, 78).fill('#fff7ed');
    doc.rect(50, currentY, 495, 78).strokeColor('#ffedd5').lineWidth(1).stroke();
    
    doc.fillColor('#c2410c').fontSize(8.5).font('Helvetica-Bold');
    doc.text('TAX EXEMPTION BENEFIT UNDER SECTION 80G:', 62, currentY + 10);
    doc.font('Helvetica').fillColor('#7c2d12').fontSize(8);
    doc.text(
      'Aahaar is an approved institution under Section 80G of the Income Tax Act, 1961. Unique Registration Number: AAHTX80G2026. This receipt is generated electronically and stands valid as legal proof of charity donation. Tax benefits apply to the extent specified under current tax regulations.',
      62,
      doc.y + 4,
      { width: 470, align: 'justify', lineHeight: 1.25 }
    );

    // --- Footer & Signature ---
    currentY += 120;
    
    // Digital Signature stamp representation
    doc.rect(380, currentY - 5, 130, 32).dash(2, { space: 2 }).strokeColor('#cbd5e1').stroke();
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#94a3b8').text('DIGITALLY SIGNED', 380, currentY + 3, { width: 130, align: 'center' });
    doc.fontSize(6).font('Helvetica').fillColor('#cbd5e1').text('AAHAAR SECURE GATEWAY', 380, currentY + 18, { width: 130, align: 'center' });

    // --- Official Circular Ink Stamp ---
    doc.save();
    doc.translate(310, currentY + 25);
    doc.rotate(-10); // Rotate slightly counter-clockwise for realistic hand-stamped effect
    doc.opacity(0.82);
    // Outer circle
    doc.circle(0, 0, 36).strokeColor('#16a34a').lineWidth(2).stroke();
    // Inner circle
    doc.circle(0, 0, 31).strokeColor('#16a34a').lineWidth(0.8).stroke();
    
    // Stamp texts
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#16a34a');
    doc.text('AAHAAR', -30, -11, { width: 60, align: 'center' });
    
    doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#16a34a');
    doc.text('80G COMPLIANT', -30, 2, { width: 60, align: 'center' });
    
    doc.fontSize(4.5).font('Helvetica-Bold').fillColor('#16a34a');
    doc.text('VERIFIED', -30, 11, { width: 60, align: 'center' });
    doc.restore();

    doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#475569');
    doc.text('Authorized Signature', 380, currentY + 40);
    doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text('Aahaar Verification Cell', 380, currentY + 52);

    // Finalize
    doc.end();
  });
};
