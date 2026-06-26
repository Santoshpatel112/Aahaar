import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const doc = new PDFDocument({
  size: 'A4',
  layout: 'landscape',
  margins: { top: 30, bottom: 25, left: 40, right: 40 }
});

const outputPath = path.join(path.resolve(), '../SantoshPatel_ABESENGINEERINGCOLLEGE_SparkRound2.pdf');
const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Premium Color Palette
const COLOR_PRIMARY = '#f97316';   // Aahaar Orange
const COLOR_SECONDARY = '#ea580c'; // Darker Orange
const COLOR_DARK = '#0f172a';      // Deep Midnight Slate
const COLOR_HEADER = '#1e293b';    // Header Dark Gray
const COLOR_TEXT = '#334155';      // Main Body Slate
const COLOR_MUTED = '#64748b';     // Muted Gray
const COLOR_BORDER = '#e2e8f0';    // Light border gray
const COLOR_SUCCESS = '#16a34a';   // Success Green
const COLOR_INFO = '#2563eb';      // Info Blue

const BG_LIGHT_ORANGE = '#fff7ed';  // Soft orange background for alerts
const BG_LIGHT_BLUE = '#f0f9ff';    // Soft blue background for marketing card
const BG_LIGHT_PURPLE = '#faf5ff';  // Soft purple background for DAO governance
const BG_LIGHT_GRAY = '#f8fafc';    // Soft gray for tables/stats

const width = 841.89;
const height = 595.28;

// Helper to draw a shadow card
const drawCard = (x, y, w, h, bgColor, borderColor) => {
  doc.save();
  // Shadow
  doc.opacity(0.04);
  doc.roundedRect(x + 2, y + 2, w, h, 6).fill(COLOR_DARK);
  doc.restore();
  
  // Card Body
  doc.roundedRect(x, y, w, h, 6).fill(bgColor);
  doc.roundedRect(x, y, w, h, 6).strokeColor(borderColor).lineWidth(1).stroke();
};

// Helper to draw a dynamic vector logo
const drawAahaarLogo = (x, y, radius) => {
  doc.save();
  // Outer orange ring
  doc.circle(x, y, radius).strokeColor(COLOR_PRIMARY).lineWidth(2).stroke();
  // Inner white fill
  doc.circle(x, y, radius - 2.5).fillColor('#ffffff').fill();
  // Inner orange brand dot
  doc.circle(x, y, radius - 6.5).fillColor(COLOR_PRIMARY).fill();
  
  // Brand letter "A"
  doc.fontSize(radius * 1.1).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text('A', x - (radius * 0.35), y - (radius * 0.55));
  doc.restore();
};

// Helper to draw a connecting down arrow
const drawDownArrow = (x, y1, y2) => {
  doc.save();
  doc.strokeColor(COLOR_PRIMARY).lineWidth(1.5).dash(3, {space: 2});
  doc.moveTo(x, y1).lineTo(x, y2).stroke();
  doc.restore();
  
  // Arrow head
  doc.save();
  doc.fillColor(COLOR_PRIMARY);
  doc.moveTo(x - 4, y2 - 4).lineTo(x + 4, y2 - 4).lineTo(x, y2).closePath().fill();
  doc.restore();
};

// Helper to draw common background template
const drawTemplate = (slideNo, title) => {
  // Page Border
  doc.rect(15, 15, width - 30, height - 30).strokeColor(COLOR_PRIMARY).lineWidth(2.5).stroke();
  doc.rect(20, 20, width - 40, height - 40).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
  
  // Header bar
  doc.rect(20, 20, width - 40, 52).fill(COLOR_HEADER);
  
  // Draw Vector Brand Logo in Header
  drawAahaarLogo(46, 46, 15);
  
  // Header Branding & Slide Info
  doc.fontSize(14).fillColor('#ffffff').font('Helvetica-Bold').text('AAHAAR: DECENTRALIZED FOOD RESCUE PLATFORM', 74, 38);
  doc.fontSize(9.5).fillColor(COLOR_PRIMARY).font('Helvetica-Bold').text(`SLIDE ${slideNo}/4 : ${title.toUpperCase()}`, width - 350, 39, { align: 'right', width: 310 });
  
  // Temporarily disable bottom margin checks to draw footer without auto page-break
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  
  // Footer content
  doc.fontSize(8.5).fillColor(COLOR_MUTED).font('Helvetica').text('Santosh Patel  |  ABES Engineering College  |  Spark Fellowship Round 2 Selection Challenge', 40, height - 33);
  doc.fontSize(8.5).fillColor(COLOR_MUTED).font('Helvetica-Bold').text(`Slide ${slideNo} of 4`, width - 100, height - 33, { align: 'right', width: 60 });
  
  // Restore margin
  doc.page.margins.bottom = originalBottomMargin;
};

// ================= SLIDE 1 =================
drawTemplate(1, 'Problem Statement & Target Customer');

let col1X = 40;
let col2X = 445;
let contentY = 100;
let colWidth = 355;

// Title 1
doc.fontSize(14).fillColor(COLOR_DARK).font('Helvetica-Bold').text('The Food Waste & Trust Paradox in Urban India', col1X, contentY);
doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica').text('Operational and trust-based barriers in food recovery systems.', col1X, contentY + 18);

// Stats Card
drawCard(col1X, contentY + 38, colWidth, 92, BG_LIGHT_GRAY, COLOR_BORDER);
doc.fontSize(28).fillColor(COLOR_PRIMARY).font('Helvetica-Bold').text('40%', col1X + 15, contentY + 54);
doc.fontSize(10).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Of food produced is wasted in India', col1X + 90, contentY + 58);
doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text(
  'Worth ₹92,000 crores annually, while 190M+ citizens sleep hungry. Organic waste in landfills accounts for a massive chunk of urban carbon footprint.',
  col1X + 90,
  contentY + 72,
  { width: 250, align: 'justify', lineHeight: 1.25 }
);

// Gaps Bullet points
let bulletY = contentY + 150;
doc.fontSize(11).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Core Gaps in Existing Models:', col1X, bulletY);

const gaps = [
  { title: 'Logistics Spoilage', text: 'Inefficient pickup times exceed the 4-hour cooked food shelf life.' },
  { title: 'Trust Deficit', text: 'Donors lack transparency on whether food reached verified shelters.' },
  { title: 'Lack of Incentives', text: 'No financial/tax write-offs to offset donation logistical costs.' }
];

gaps.forEach((gap, idx) => {
  let itemY = bulletY + 18 + (idx * 34);
  doc.circle(col1X + 6, itemY + 5, 3).fill(COLOR_PRIMARY);
  doc.fontSize(9.5).fillColor(COLOR_DARK).font('Helvetica-Bold').text(gap.title + ':', col1X + 16, itemY);
  doc.fontSize(9).fillColor(COLOR_TEXT).font('Helvetica').text(gap.text, col1X + 115, itemY, { width: colWidth - 115 });
});

// Target Customer (Column 2)
doc.fontSize(14).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Beachhead Target Segment & Environmental Impact', col2X, contentY);
doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica').text('Selecting target clusters for rapid local rollout.', col2X, contentY + 18);

// Beachhead Alert Box
drawCard(col2X, contentY + 38, colWidth, 105, BG_LIGHT_ORANGE, '#ffedd5');
doc.fontSize(10).fillColor('#c2410c').font('Helvetica-Bold').text('BEACHHEAD: B2B Commercial Caterers & Wedding Halls', col2X + 15, contentY + 50);
doc.fontSize(8.5).fillColor('#7c2d12').font('Helvetica').text(
  'Caterers and banquet venues operate on tight deadlines and generate predictable, high-volume (50kg–300kg) surplus cooked food. By targeting these clustered hubs within a 5 km radius, we keep travel costs low and maximize recovery yield.',
  col2X + 15,
  contentY + 65,
  { width: colWidth - 30, align: 'justify', lineHeight: 1.3 }
);

// Environmental Cost (SDG 13)
let envY = contentY + 160;
doc.fontSize(11).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Curbing Landfill Carbon (SDG 13)', col2X, envY);
doc.fontSize(9).fillColor(COLOR_TEXT).font('Helvetica').text(
  'Landfill food decay emits potent methane gas. Diverting 1 kg of food avoids 2.5 kg of CO2 equivalent emissions. We translate these metrics into tree equivalents for corporate impact tracking.',
  col2X,
  envY + 18,
  { width: colWidth, align: 'justify', lineHeight: 1.25 }
);

// Formula Box
drawCard(col2X, envY + 54, colWidth, 48, BG_LIGHT_GRAY, COLOR_BORDER);
doc.fontSize(9).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Landfill Carbon Reduction Factor:', col2X + 15, envY + 64);
doc.fontSize(10).fillColor(COLOR_PRIMARY).font('Helvetica-Bold').text('Carbon Saved (kg CO2) = Rescued Food (kg) x 2.5', col2X + 15, envY + 80);


// ================= SLIDE 2 =================
doc.addPage();
drawTemplate(2, 'Platform Architecture & trust framework');

doc.fontSize(14).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Aahaar: Deployed Web3 Pipeline Workflow', col1X, contentY);
doc.fontSize(9.5).fillColor(COLOR_PRIMARY).font('Helvetica-Bold').text('Canva-Style Interactive Verification Pipeline', col1X, contentY + 18);

// Canva Style Visual Workflow Diagram (Vertical Pipeline Cards)
let flowY = contentY + 45;
let flowCardH = 46;
let gapH = 14;

const flowSteps = [
  { step: '1. LISTING', text: 'Donor registers surplus food details and signs a fresh food log.', color: BG_LIGHT_ORANGE, borderColor: '#ffedd5', txtColor: '#c2410c' },
  { step: '2. ROUTING', text: 'Aahaar maps the listing and sends push notifications to nearby shelters.', color: BG_LIGHT_BLUE, borderColor: '#bfdbfe', txtColor: '#1e40af' },
  { step: '3. HANDSHAKE', text: 'NGO picks up food and donor scans NGO\'s dynamic QR code to log transaction.', color: BG_LIGHT_PURPLE, borderColor: '#e9d5ff', txtColor: '#7e22ce' },
  { step: '4. TAX WRITE-OFF', text: 'On-chain verification triggers instant Sec 80G PDF receipt generation.', color: '#f0fdf4', borderColor: '#bbf7d0', txtColor: '#15803d' }
];

flowSteps.forEach((fsItem, idx) => {
  let cardY = flowY + (idx * (flowCardH + gapH));
  
  // Draw step card
  drawCard(col1X, cardY, colWidth, flowCardH, fsItem.color, fsItem.borderColor);
  
  // Content inside card
  doc.fontSize(9.5).fillColor(fsItem.txtColor).font('Helvetica-Bold').text(fsItem.step, col1X + 15, cardY + 8);
  doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text(fsItem.text, col1X + 15, cardY + 22, { width: colWidth - 30 });
  
  // Draw connecting arrow if not last item
  if (idx < 3) {
    drawDownArrow(col1X + (colWidth / 2), cardY + flowCardH, cardY + flowCardH + gapH);
  }
});

// Column 2: Deployed app links & explore instructions
doc.fontSize(14).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Explore Deployed Application', col2X, contentY);
doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica').text('Test our live code repository and web application.', col2X, contentY + 18);

// Explore Application Box (Live links)
drawCard(col2X, contentY + 38, colWidth, 110, BG_LIGHT_BLUE, '#bfdbfe');
doc.fontSize(9.5).fillColor(COLOR_INFO).font('Helvetica-Bold').text('PRODUCTION-READY DEPLOYMENT & CODEBASE', col2X + 15, contentY + 48);

doc.fontSize(8.5).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Live Project Web Link:', col2X + 15, contentY + 64);
doc.fontSize(8.5).fillColor(COLOR_INFO).font('Helvetica').text('https://aahaar-seven.vercel.app/', col2X + 125, contentY + 64);

doc.fontSize(8.5).fillColor(COLOR_DARK).font('Helvetica-Bold').text('GitHub Repository:', col2X + 15, contentY + 77);
doc.fontSize(8.5).fillColor(COLOR_INFO).font('Helvetica').text('github.com/Santoshpatel112/Aahaar', col2X + 125, contentY + 77);

doc.fontSize(8.5).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Test Credentials:', col2X + 15, contentY + 90);
doc.fontSize(8).fillColor(COLOR_TEXT).font('Helvetica-Oblique').text('Email: donor123@gmail.com / Pwd: Password123', col2X + 125, contentY + 90);

doc.fontSize(7.5).fillColor(COLOR_MUTED).font('Helvetica').text('Log in to list surplus food and download verified 80G PDF receipts instantly.', col2X + 15, contentY + 104, { width: colWidth - 30 });

// Purple Governance box
drawCard(col2X, contentY + 160, colWidth, 102, BG_LIGHT_PURPLE, '#e9d5ff');
doc.fontSize(10).fillColor('#7e22ce').font('Helvetica-Bold').text('PEER-REVIEW ONBOARDING (AahaarDAO.sol)', col2X + 15, contentY + 172);
doc.fontSize(8.5).fillColor('#6b21a8').font('Helvetica').text(
  'To prevent fake NGOs, candidates register their credentials and wallet addresses. Existing verified NGOs vote on-chain. Once the voting threshold is passed, the candidate is verified in the registry, granting them a baseline reputation score to claim listings.',
  col2X + 15,
  contentY + 187,
  { width: colWidth - 30, align: 'justify', lineHeight: 1.25 }
);

// Safety & Reputation System
let repY = contentY + 274;
doc.fontSize(11).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Hygiene & Logistics Safeguards', col2X, repY);

doc.circle(col2X + 5, repY + 22, 3).fill(COLOR_PRIMARY);
doc.fontSize(9.5).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Food Quality Declaration:', col2X + 15, repY + 17);
doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text('Donors upload listing photos and digitally sign a checklist declaring preparation time.', col2X + 15, repY + 29, { width: colWidth - 15 });

doc.circle(col2X + 5, repY + 62, 3).fill(COLOR_PRIMARY);
doc.fontSize(9.5).fillColor(COLOR_DARK).font('Helvetica-Bold').text('On-Chain Reputation System:', col2X + 15, repY + 57);
doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text('Completed pickups award +50 points to donors and +30 to NGOs. Late pickups decrease scores, restricting access.', col2X + 15, repY + 69, { width: colWidth - 15 });

doc.circle(col2X + 5, repY + 102, 3).fill(COLOR_PRIMARY);
doc.fontSize(9.5).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Offline Verification Failsafe:', col2X + 15, repY + 97);
doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text('Low internet at pickup? A secure administrative override key completes the workflow.', col2X + 15, repY + 109, { width: colWidth - 15 });


// ================= SLIDE 3 =================
doc.addPage();
drawTemplate(3, 'Business Model & 7-Day launch plan');

doc.fontSize(14).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Self-Sustaining Financial Model', col1X, contentY);
doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica').text('How Aahaar covers operations and generates value.', col1X, contentY + 18);

// Revenue Stream Box
drawCard(col1X, contentY + 38, colWidth, 120, BG_LIGHT_GRAY, COLOR_BORDER);
doc.fontSize(10).fillColor(COLOR_DARK).font('Helvetica-Bold').text('REVENUE STREAMS', col1X + 15, contentY + 50);

doc.circle(col1X + 20, contentY + 73, 2).fill(COLOR_PRIMARY);
doc.fontSize(9).fillColor(COLOR_DARK).font('Helvetica-Bold').text('B2B ESG Dashboard (Section 135 Indian Companies Act):', col1X + 30, contentY + 68);
doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text('Charge ₹1,500/month to corporate donors for automated, audited reports mapping food rescue metrics directly to their CSR compliance requirements.', col1X + 30, contentY + 79, { width: colWidth - 45, align: 'justify' });

doc.circle(col1X + 20, contentY + 113, 2).fill(COLOR_PRIMARY);
doc.fontSize(9).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Section 80G Tax Exemption Commission:', col1X + 30, contentY + 108);
doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text('Charge a micro-fee of 3% on realized tax savings when corporate donors download audit-ready tax exemption certificates.', col1X + 30, contentY + 119, { width: colWidth - 45, align: 'justify' });

// Risks table
let tableY = contentY + 175;
doc.fontSize(11).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Risk Matrix & Mitigation', col1X, tableY);

doc.fontSize(9).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Risk: Spoilage & Health Liability', col1X, tableY + 20);
doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text('Mitigation: Built-in electronic liability waivers protect donors, combined with strict 4-hour shelf-life gates.', col1X, tableY + 31, { width: colWidth });

doc.fontSize(9).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Risk: NGO No-Shows / Coordination Failures', col1X, tableY + 55);
doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text('Mitigation: Contract-based reputation penalties automatically trigger back-up standby volunteer riders for uncollected food.', col1X, tableY + 66, { width: colWidth });

// Launch Timeline (Column 2)
doc.fontSize(14).fillColor(COLOR_DARK).font('Helvetica-Bold').text('7-Day Launch & Rollout Plan (Budget: ₹10,000)', col2X, contentY);
doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica').text('Executing a hyper-local cluster rollout in 1 week.', col2X, contentY + 18);

const rolloutSteps = [
  { days: 'Days 1-2', task: 'Cluster Audit & Flyer Printing', budget: '₹1,500', desc: 'Map 15 caterers in a single dense urban hub. Print flyers highlighting zero-cost ESG tax relief.' },
  { days: 'Days 3-4', task: 'Direct Pitching & Live MVP Demo', budget: '₹1,000', desc: 'Pitch caterers in-person. Demo our live MVP (aahaar-seven.vercel.app) generating instantaneous tax PDFs.' },
  { days: 'Days 5-6', task: 'NGO Onboarding & Staging Runs', budget: '₹4,000', desc: 'Partner with 3 local shelter kitchens. Setup wallets and dynamic QR training. Allocate ₹4,000 fuel support.' },
  { days: 'Day 7', task: 'Go Live: First 10 Partners', budget: '₹3,500', desc: 'Begin live collections. Keep ₹3,500 for emergency vehicle hire/volunteer coordination.' }
];

rolloutSteps.forEach((item, idx) => {
  let itemY = contentY + 38 + (idx * 55);
  drawCard(col2X, itemY, colWidth, 48, BG_LIGHT_GRAY, COLOR_BORDER);
  
  doc.fontSize(9).fillColor(COLOR_PRIMARY).font('Helvetica-Bold').text(item.days, col2X + 10, itemY + 8);
  doc.fontSize(9.5).fillColor(COLOR_DARK).font('Helvetica-Bold').text(item.task, col2X + 70, itemY + 8);
  doc.fontSize(9).fillColor(COLOR_SUCCESS).font('Helvetica-Bold').text(item.budget, col2X + colWidth - 60, itemY + 8, { align: 'right', width: 50 });
  doc.fontSize(8).fillColor(COLOR_TEXT).font('Helvetica').text(item.desc, col2X + 10, itemY + 22, { width: colWidth - 20, align: 'justify' });
});


// ================= SLIDE 4 =================
doc.addPage();
drawTemplate(4, 'Outreach, Metrics & Fellowship Fit');

doc.fontSize(14).fillColor(COLOR_DARK).font('Helvetica-Bold').text('B2B Marketing & Success Metrics', col1X, contentY);
doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica').text('Scalable acquisition template and KPIs.', col1X, contentY + 18);

// Marketing message card
drawCard(col1X, contentY + 38, colWidth, 105, BG_LIGHT_BLUE, '#bfdbfe');
doc.fontSize(9).fillColor(COLOR_INFO).font('Helvetica-Bold').text('SAMPLE MARKETING MESSAGE (Caterer Outreach)', col1X + 15, contentY + 48);
doc.fontSize(8.5).fillColor('#1e3a8a').font('Helvetica-Oblique').text(
  '"Turn food waste into tax assets. Donate your banquet surplus with Aahaar. We match your food with verified shelters in 15 minutes, handle the logistics, and instantly deliver your Section 80G tax-exemption certificate backed by blockchain trust. Reduce landfill emissions, feed your city, and claim 50% tax deductions. Get started at aahaar-seven.vercel.app"',
  col1X + 15,
  contentY + 63,
  { width: colWidth - 30, align: 'justify', lineHeight: 1.3 }
);

// Metrics List
let kpiY = contentY + 160;
doc.fontSize(11).fillColor(COLOR_DARK).font('Helvetica-Bold').text('12-Month Targets & KPIs', col1X, kpiY);

const kpis = [
  'Rescued Volume: 10,000+ kg of surplus food saved in Year 1.',
  'Social Impact: 20,000+ nutritious meals distributed to shelters.',
  'Ecological Impact: 25,000 kg of landfill CO2 offset (1,100 tree equivalents).',
  'Economic Value: ₹3,50,000+ in tax write-offs unlocked for donors.'
];

kpis.forEach((kpi, idx) => {
  let itemY = kpiY + 20 + (idx * 24);
  doc.circle(col1X + 5, itemY + 5, 2.5).fill(COLOR_PRIMARY);
  doc.fontSize(9).fillColor(COLOR_TEXT).font('Helvetica').text(kpi, col1X + 15, itemY);
});

// Candidate Fit & Reflection (Column 2)
doc.fontSize(14).fillColor(COLOR_DARK).font('Helvetica-Bold').text('Candidate Fit: Santosh Patel', col2X, contentY);
doc.fontSize(9).fillColor(COLOR_MUTED).font('Helvetica').text('Why I am ready for the Spark Fellowship.', col2X, contentY + 18);

// Personal reflection box
drawCard(col2X, contentY + 38, colWidth, 230, BG_LIGHT_GRAY, COLOR_BORDER);
doc.fontSize(8.5).fillColor(COLOR_TEXT).font('Helvetica').text(
  'As a student builder, observing the contrast between commercial food waste and urban malnutrition inspired me to build a practical, tech-driven solution. I did not want to submit just a slide deck—I wanted to write code that works. Over the past months, my team and I built and deployed Aahaar’s full-stack MVP, integrating Solidity smart contracts, automated Indian Income Tax Section 80G valuation, S3 document storage, and live WebSockets.\n\nJoining the Spark Fellowship will give me the mentorship, business modeling skills, and community support needed to transition Aahaar from a deployed prototype into a sustainable, scalable social enterprise.\n\nI bring a bias for action and a proven execution mindset; while others pitch ideas, we build them. I am eager to learn, adapt, and work tirelessly to make "Zero Hunger" a reality in urban India.',
  col2X + 15,
  contentY + 52,
  { width: colWidth - 30, align: 'justify', lineHeight: 1.45 }
);

// End Document
doc.end();

console.log('✅ Spark Fellowship Submission PDF successfully generated at:', outputPath);
