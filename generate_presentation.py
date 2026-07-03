import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# ==========================================
# 1. Color Palette & Typography Constants
# ==========================================
COLOR_DARK_BG = RGBColor(11, 19, 43)        # Deep Space Navy (for Dark Slides)
COLOR_LIGHT_BG = RGBColor(248, 250, 252)    # Light Slate Off-White (for Content Slides)
COLOR_PRIMARY_TEXT = RGBColor(15, 23, 42)    # Slate 900 (for Dark text on light BG)
COLOR_MUTED_TEXT = RGBColor(71, 85, 105)     # Slate 600 (for Body text)
COLOR_ORANGE_ACCENT = RGBColor(249, 115, 22) # Vibrant Orange (Primary Accent)
COLOR_GREEN_ACCENT = RGBColor(16, 185, 129)  # Emerald Green (Trust Accent)
COLOR_BLUE_ACCENT = RGBColor(59, 130, 246)   # Info Blue Accent
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_CARD_BORDER = RGBColor(226, 232, 240)  # Slate 200 (Card Outline)

FONT_HEADING = "Arial"
FONT_BODY = "Arial"

# ==========================================
# 2. Initialization & Slide Setup
# ==========================================
prs = Presentation()
prs.slide_width = Inches(13.333)  # 16:9 Widescreen standard
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6] # Empty slide layout for full design control

# ==========================================
# 3. Helper Design Functions
# ==========================================
def apply_dark_background(slide):
    rect = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    rect.fill.solid()
    rect.fill.fore_color.rgb = COLOR_DARK_BG
    rect.line.fill.background()
    return rect

def apply_light_background(slide):
    rect = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    rect.fill.solid()
    rect.fill.fore_color.rgb = COLOR_LIGHT_BG
    rect.line.fill.background()
    return rect

def add_header(slide, category, title):
    # Category / Section indicator (Small Orange text)
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(8.0), Inches(0.4))
    tf_cat = cat_box.text_frame
    tf_cat.word_wrap = True
    tf_cat.margin_left = tf_cat.margin_right = tf_cat.margin_top = tf_cat.margin_bottom = 0
    p_cat = tf_cat.paragraphs[0]
    p_cat.text = category.upper()
    p_cat.font.name = FONT_HEADING
    p_cat.font.size = Pt(10)
    p_cat.font.bold = True
    p_cat.font.color.rgb = COLOR_ORANGE_ACCENT
    
    # Slide Main Title (Large Deep Navy text)
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(9.0), Inches(0.6))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_right = tf_title.margin_top = tf_title.margin_bottom = 0
    p_title = tf_title.paragraphs[0]
    p_title.text = title
    p_title.font.name = FONT_HEADING
    p_title.font.size = Pt(24)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_PRIMARY_TEXT
    
    # Corner metadata indicator (Top Right)
    meta_box = slide.shapes.add_textbox(Inches(9.5), Inches(0.4), Inches(3.0), Inches(0.4))
    tf_meta = meta_box.text_frame
    tf_meta.word_wrap = True
    tf_meta.margin_left = tf_meta.margin_right = tf_meta.margin_top = tf_meta.margin_bottom = 0
    p_meta = tf_meta.paragraphs[0]
    p_meta.alignment = PP_ALIGN.RIGHT
    p_meta.text = "AAHAAR ENTERPRISE SYSTEM"
    p_meta.font.name = FONT_BODY
    p_meta.font.size = Pt(9)
    p_meta.font.bold = True
    p_meta.font.color.rgb = COLOR_MUTED_TEXT

    # Thin divider line below header
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.35), Inches(11.733), Inches(0.02))
    line.fill.solid()
    line.fill.fore_color.rgb = COLOR_CARD_BORDER
    line.line.fill.background()

def add_card(slide, left, top, width, height, card_title, bullets, accent_color=None):
    # Draw card body (white fill, thin slate outline)
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_WHITE
    card.line.color.rgb = COLOR_CARD_BORDER
    card.line.width = Pt(1.5)
    card.adjustments[0] = 0.04
    
    # Optional left-border accent strip
    if accent_color:
        strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top + Inches(0.12), Inches(0.08), height - Inches(0.24))
        strip.fill.solid()
        strip.fill.fore_color.rgb = accent_color
        strip.line.fill.background()
        
    # Text box within the card (padded)
    pad = Inches(0.3)
    tb = slide.shapes.add_textbox(left + pad, top + pad - Inches(0.1), width - (pad * 2), height - (pad * 2) + Inches(0.2))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    
    # Card Header
    p_head = tf.paragraphs[0]
    p_head.text = card_title
    p_head.font.name = FONT_HEADING
    p_head.font.size = Pt(14)
    p_head.font.bold = True
    p_head.font.color.rgb = COLOR_PRIMARY_TEXT
    p_head.space_after = Pt(10)
    
    # Card Bullets
    for bullet_text in bullets:
        p = tf.add_paragraph()
        p.text = "•  " + bullet_text
        p.font.name = FONT_BODY
        p.font.size = Pt(10.5)
        p.font.color.rgb = COLOR_MUTED_TEXT
        p.space_after = Pt(5)
        p.line_spacing = 1.05

# ==========================================
# 4. Slide Data Definition
# ==========================================
slides_data = [
    # Slide 1: Title Slide (Dark Theme)
    {
        "type": "dark_title",
        "title": "AAHAAR",
        "subtitle": "Intelligent Food Donation, CSR Compliance & Environmental Impact Management Platform",
        "desc": "A Unified B2B SaaS Enterprise Ecosystem Orchestrating Surplus Redirection, Cryptographic Verification, and Compliance Automation",
        "presenter": "Presenter: Santosh Patel | Department of Computer Science & Engineering",
        "college": "ABES Engineering College | Spark Fellowship Round 2 Selection Challenge",
        "ip_spec": "IP Status: Patent-Pending Technology (System & Method for Secure Real-time Surplus Logistics Verification)"
    },
    # Slide 2: Vision & Executive Summary (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 01: Strategic Vision",
        "title": "Executive Summary & Core Vision",
        "layout": "2-column",
        "cards": [
            {
                "title": "Platform Vision (Zero Waste Ecosystem)",
                "bullets": [
                    "Empower enterprises to eliminate edible food waste while addressing global malnutrition challenges.",
                    "Design a transparent, automated circular economy model for redistribution.",
                    "Bridge the gap between food donors (commercial kitchens, banquets, offices) and verified NGOs in real time.",
                    "Log all transactions securely to build immutable impact records and carbon offset credits."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Executive Summary",
                "bullets": [
                    "Aahaar is an enterprise-grade SaaS utility linking donors with local shelters.",
                    "Solves the trust deficit via a proprietary cryptographic QR + PIN handshake workflow.",
                    "Provides real-time environmental metrics (methane reduction, tree absorption equivalents).",
                    "Automates tax savings audits under Section 80G and board reporting under CSR Section 135."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 3: Problem Statement: The Waste & Trust Paradox (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 01: Strategic Vision",
        "title": "The Food Waste & Trust Paradox",
        "layout": "2-column",
        "cards": [
            {
                "title": "The Distribution Crisis (SDG 2, 12, 13)",
                "bullets": [
                    "40% of food produced in India is wasted annually (worth over Rs. 92,000 crores).",
                    "Over 190 million citizens go hungry daily due to massive coordinate mismatch.",
                    "Organic waste dumped in municipal landfills releases potent methane gas.",
                    "No centralized enterprise collection interface exists for corporate kitchens and caterers."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Systemic Operational Obstacles",
                "bullets": [
                    "Logistics Spoilage: Cooked food has a strict 4-hour shelf-life. Manual pickup routing is too slow.",
                    "Trust Deficit: Donors lack transparency and auditing capabilities to verify receipt of donations.",
                    "Incentive Deficit: High logistical costs discourage donation without immediate financial/tax write-offs.",
                    "Fraud Vulnerability: Absence of active user credentials allows bad-actor redirection."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 4: Proposed Solution: The Unified Ecosystem (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 01: Strategic Vision",
        "title": "The AAHAAR Solution Architecture",
        "layout": "2-column",
        "cards": [
            {
                "title": "Intelligent Surplus Logistics",
                "bullets": [
                    "Real-time food listing with description, quantity, shelf life, and photo logs.",
                    "Nearest Verified NGO Selection Algorithm handles geofenced matching under 15 mins.",
                    "Role-based dashboard notifications (WebSockets) route allocations automatically.",
                    "Secure document gate processes validation credentials before claims are allowed."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Compliance & Financial Automation",
                "bullets": [
                    "Automated Section 80G Indian Income Tax calculations value assets instantly.",
                    "Dynamic certificate generator builds watermarked, scannable compliance receipts.",
                    "Integrated ESG analytics dashboard charts greenhouse gas offsets and meals served.",
                    "Smart contract logs on EVM provide an immutable, decentralized audit trail."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 5: Enterprise Target Customers (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 02: Commercial Model",
        "title": "Enterprise Target Segments & Stakeholders",
        "layout": "2-column",
        "cards": [
            {
                "title": "Primary Commercial Donors",
                "bullets": [
                    "Hospitality: Large hotels, restaurants, and cloud kitchen clusters.",
                    "Events: Wedding halls, banquet venues, and exhibition caterers.",
                    "Corporate: Enterprise offices and manufacturing company cafeterias.",
                    "Retailers: Supermarkets, grocery chains, and packaged food distributors.",
                    "Institutions: Colleges, schools, and hospital kitchen networks."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Logistics & Governance Entities",
                "bullets": [
                    "NGO Partners: Verified local shelters, food banks, and charitable organizations.",
                    "Municipalities: City corporations seeking to divert landfill organic mass.",
                    "Corporate CSR: Compliance departments auditing social development indexes.",
                    "Tax Auditors: Enterprise accountants validating deductible tax certificates."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 6: Multi-Role User Matrix (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 02: Commercial Model",
        "title": "Multi-Role User Matrix & Permissions",
        "layout": "2-column",
        "cards": [
            {
                "title": "Operational Role Invariants",
                "bullets": [
                    "Donors: Authorize food listings, scan pick-up QR codes, and download tax receipts.",
                    "NGO Representatives: Claim available listings, execute collections, and update statuses.",
                    "Volunteers / Riders: Claim transit routes, handle physical cargo, and log handovers.",
                    "Delivery Partners: Third-party API operators tracking geofenced vehicle logs."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Enterprise & Administrative Roles",
                "bullets": [
                    "CSR Managers: Review dashboard stats, compile carbon offset ledgers, and download files.",
                    "Corporate Executives: Audit Section 135 spends and monitor CSR program growth.",
                    "System Admins: Audit identity documents (PAN/Aadhaar), verify NGOs, and handle disputes.",
                    "DAO Voters: Verified NGOs cast votes on-chain to approve new registry entrants."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 7: Complete System Workflow (Light Theme, 4-Column Sequence)
    {
        "type": "light_content",
        "category": "Section 03: Process Workflows",
        "title": "Complete System Workflow: Surplus Food Rescue",
        "layout": "4-column",
        "cards": [
            {
                "title": "1. Detect & Match",
                "bullets": [
                    "Donor logs surplus.",
                    "System validates food details and category tags.",
                    "Matching Engine selects closest verified NGO."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "2. Claim & Code",
                "bullets": [
                    "NGO claims matching allocation.",
                    "Admin verifies files.",
                    "System compiles secure QR + 6-digit PIN pass."
                ],
                "accent": COLOR_GREEN_ACCENT
            },
            {
                "title": "3. Scan & Verify",
                "bullets": [
                    "NGO rider reaches donor pickup site.",
                    "Donor scans NGO QR (proximity validation).",
                    "Hand-off verified."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "4. Log & Report",
                "bullets": [
                    "Donation state locked to EVM database.",
                    "ESG dashboard matches carbon offsets.",
                    "Tax Exemption receipt is issued."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 8: NGO Food Request Workflow (Light Theme, 4-Column Sequence)
    {
        "type": "light_content",
        "category": "Section 03: Process Workflows",
        "title": "NGO Food Request Workflow (Demand-Pull)",
        "layout": "4-column",
        "cards": [
            {
                "title": "1. Create & Broadcast",
                "bullets": [
                    "NGO files custom food demand request.",
                    "Specifies category, quantity needed, and city.",
                    "Broadcasts alert."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "2. Claim & Lock",
                "bullets": [
                    "Nearby donors receive push notifications.",
                    "One matching donor claims request.",
                    "Request locked instantly."
                ],
                "accent": COLOR_GREEN_ACCENT
            },
            {
                "title": "3. Transit & Handover",
                "bullets": [
                    "NGO assigns vehicle / pickup time.",
                    "Representative reaches donor site.",
                    "Presents transaction QR."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "4. Settle & Sync",
                "bullets": [
                    "Donor scans QR code to verify pickup.",
                    "EVM logs confirmation hash.",
                    "System updates metrics."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 9: Direct NGO Donation Workflow (Light Theme, 4-Column Sequence)
    {
        "type": "light_content",
        "category": "Section 03: Process Workflows",
        "title": "Direct NGO Donation Workflow (Ad-hoc)",
        "layout": "4-column",
        "cards": [
            {
                "title": "1. Target Selection",
                "bullets": [
                    "Donor skips geofence routing.",
                    "Selects target NGO from verified registry.",
                    "Submits donation details."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "2. NGO Audit Gate",
                "bullets": [
                    "Target NGO receives push/Socket.IO alert.",
                    "Evaluates shelf-life and volume matches.",
                    "Accepts or rejects listing."
                ],
                "accent": COLOR_GREEN_ACCENT
            },
            {
                "title": "3. Security Pass",
                "bullets": [
                    "Acceptance triggers QR generation.",
                    "Transmits secure pickup code to NGO representative.",
                    "Rendezvous scheduled."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "4. Verify & Seal",
                "bullets": [
                    "Donor inputs pickup verification token.",
                    "Status committed to complete on EVM ledger.",
                    "Issues digital receipt."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 10: QR Verification Workflow (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 03: Process Workflows",
        "title": "Cryptographic QR Handshake & Geo-Verification",
        "layout": "2-column",
        "cards": [
            {
                "title": "Token & QR Generation",
                "bullets": [
                    "System compiles verification payload containing transaction ID, timestamp, and signature.",
                    "Generates dynamic, single-use QR code and corresponding 6-digit OTP code.",
                    "Restricts token validation to a geofenced radius surrounding the donor's coordinates.",
                    "Enforces code expiry if pickup is not executed within specified timeline gates."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Validation & Verification Handshake",
                "bullets": [
                    "NGO representative displays QR code to the donor at physical pickup site.",
                    "Donor scans QR code via camera portal (or manually inputs verification code).",
                    "System validates match, logs client coordinate proximity, and seals state.",
                    "Smart contract executes verifyDonation() to commit transaction on-chain."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 11: Status Lifecycle (Light Theme, 3-Column)
    {
        "type": "light_content",
        "category": "Section 03: Process Workflows",
        "title": "Unified Donation Lifecycle State Machine",
        "layout": "3-column",
        "cards": [
            {
                "title": "1. Initialization States",
                "bullets": [
                    "Pending: Surplus listed; awaiting verification and matching algorithm run.",
                    "Accepted: Matched NGO claims listing; logistics coordinates generated.",
                    "Pickup Started: Rider dispatched; location transit coordinates active."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "2. Verification States",
                "bullets": [
                    "Verification Pending: Food delivered at site; awaiting scan validation.",
                    "Verified: Dual-party QR/PIN handshake completed and validated.",
                    "Completed: On-chain transaction committed; certificates unlocked."
                ],
                "accent": COLOR_GREEN_ACCENT
            },
            {
                "title": "3. Exception & Terminal States",
                "bullets": [
                    "Rejected: Listing fails safety audits or verification checks.",
                    "Cancelled: Cancelled by donor or NGO before pickup transit starts.",
                    "Expired: Food exceeds safe shelf-life limits without matching."
                ],
                "accent": COLOR_BLUE_ACCENT
            }
        ]
    },
    # Slide 12: Notification Architecture (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 04: Technical Architecture",
        "title": "Real-time Multi-channel Notification Engine",
        "layout": "2-column",
        "cards": [
            {
                "title": "Delivery Speed & Channels",
                "bullets": [
                    "Real-Time: Socket.IO broadcasts instant listings to nearby NGO dashboards.",
                    "Background Push: Firebase Cloud Messaging (FCM) alerts mobile devices when apps are closed.",
                    "Audit: Transactional emails transmit certificates, reports, and ledger invoices.",
                    "Failsafe SMS: Automated text alerts bypass low mobile internet zones."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Reliability & Queue Architecture",
                "bullets": [
                    "Offline Queue: Caches alerts for delivery when network coverage is restored.",
                    "Retry Manager: Automatically retries message transfers with exponential backoff.",
                    "Geofence Filters: Restricts notifications to active NGOs inside a 5km radius.",
                    "History Log: Retains a read/unread status database for audit tracking."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 13: Dashboard Architecture (Light Theme, 3-Column)
    {
        "type": "light_content",
        "category": "Section 04: Technical Architecture",
        "title": "Enterprise Dashboard Architecture",
        "layout": "3-column",
        "cards": [
            {
                "title": "Corporate / CSR Dashboard",
                "bullets": [
                    "Section 135 Spend tracker.",
                    "Contributions ledger (audit trail).",
                    "Carbon reduction offsets (ESG).",
                    "Employee engagement logs."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "NGO Registry Dashboard",
                "bullets": [
                    "Active matching listings board.",
                    "Custom food request broadcasts.",
                    "Delivery rider dispatch metrics.",
                    "Reputation scorecard ledger."
                ],
                "accent": COLOR_GREEN_ACCENT
            },
            {
                "title": "System Admin Control Panel",
                "bullets": [
                    "Identity verification vault (PAN/Aadhaar check).",
                    "Credential reviews and approvals.",
                    "Dispute routing board.",
                    "System health indicators."
                ],
                "accent": COLOR_BLUE_ACCENT
            }
        ]
    },
    # Slide 14: Environmental Impact Engine (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 04: Technical Architecture",
        "title": "Automated Environmental Impact Engine",
        "layout": "2-column",
        "cards": [
            {
                "title": "Carbon Offset Mechanics (SDG 13)",
                "bullets": [
                    "Diverting food waste avoids landfill decay methane emissions (a GHG 25x more potent than CO₂).",
                    "Formula: CO₂ Saved (kg) = Rescued Food (kg) x 2.5 (Standard Diversion Factor).",
                    "Sequestration translation: Tree Equivalent = CO₂ Saved / 22 (absorption per tree per year).",
                    "Converts raw solid waste metrics into audit-ready carbon offset credits."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "ESG Resource Metrics",
                "bullets": [
                    "Water Footprint Restored: Tracks virtual water saved by redirecting items (liters).",
                    "Landfill Diversion Weight: Measures total organic matter prevented from decay (tons).",
                    "Social Impact Multiplier: Meals Distributed = Saved Food (kg) x 2.",
                    "Electricity Offset: Models energy savings in farm-to-table supply chains."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 15: CSR Compliance Module (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 05: Compliance & Security",
        "title": "Corporate CSR & Section 135 Compliance",
        "layout": "2-column",
        "cards": [
            {
                "title": "Audit-Ready CSR Reporting",
                "bullets": [
                    "Aligns directly with Section 135 of the Indian Companies Act, 2013.",
                    "Generates automated monthly, quarterly, and annual compliance reports.",
                    "Provides secure digital audit trails mapping donor logs to verified NGO registration certificates.",
                    "Tracks employee volunteer participation logs for ESG rating systems."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Enterprise ESG Compliance Suite",
                "bullets": [
                    "Automated corporate carbon footprint credit validation.",
                    "Contributions ledger linking invoices to physical delivery proofs.",
                    "Direct export formats for board reviews and statutory filings.",
                    "Verified compliance rating scoring NGO reliability and hygiene."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 16: Tax Benefit Management (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 05: Compliance & Security",
        "title": "Tax Benefit Management & Section 80G Auditing",
        "layout": "2-column",
        "cards": [
            {
                "title": "Exemption Valuation Engine",
                "bullets": [
                    "Automates tax savings under Section 80G of the Indian Income Tax Act, 1961.",
                    "Maps weight to category base rates for valuation (e.g. ₹45/kg Cooked Meals, ₹100/kg Packaged).",
                    "Direct savings calculation: Exemption claim (50% value) x Corporate Tax Bracket (e.g. 30%).",
                    "Enforces document verification gate (approved PAN) before downloads are unlocked."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Anti-Forgery PDF Receipts",
                "bullets": [
                    "Compiled with dynamic watermark layer to prevent duplication and forgery.",
                    "Embedded QR code contains signed transaction summary (Receipt ID, timestamp, PAN, NGO).",
                    "Scanning verification QR pulls details instantly from secure backend registry.",
                    "Official green circular ink stamp rendering style mimics physical audit stamp."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 17: Fraud Prevention (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 05: Compliance & Security",
        "title": "Fraud Prevention & Trust Safeguards",
        "layout": "2-column",
        "cards": [
            {
                "title": "Operational Verification Gates",
                "bullets": [
                    "Donor Identity Check: Required Aadhaar/identity validation at registration onboarding.",
                    "NGO Credentials Gate: Required registration certificate audits before claims are permitted.",
                    "Proximity Verification: Captures geo-coordinates during handshake scans.",
                    "Rules-Based Duplicate Detection: Flags copycat donation weights and description logs."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Cryptographic & Technical Controls",
                "bullets": [
                    "Time-Limited QR: Code regeneration occurs every 60 seconds to prevent replay attacks.",
                    "One-Time Code: Verification codes expire 15 minutes after issuance.",
                    "Audit Logging: Captures every state change with admin footprint stamps.",
                    "Security Proxy: Smart contract roles block unauthorized reputation point writes."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 18: Technical Architecture (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 04: Technical Architecture",
        "title": "System Architecture & Core Technology Stack",
        "layout": "2-column",
        "cards": [
            {
                "title": "Web2 Speed & Logistics Layer",
                "bullets": [
                    "Frontend UI: Next.js, React, TailwindCSS, and Shadcn UI components.",
                    "API Core: Node.js / Express.js managing routes and user databases.",
                    "Real-Time Engine: Socket.IO handles sub-second dispatch and alerts.",
                    "Storage: MongoDB caches records; AWS S3 vaults identity documentation.",
                    "Background Sync: Redis queues manage notifications and PDF compilation."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Web3 Immutability & Trust Layer",
                "bullets": [
                    "Smart Contracts: Solidity contracts built and compiled via Hardhat.",
                    "NGORegistry.sol: Stores registered NGO wallet addresses and documentation IPFS hashes.",
                    "Donation.sol: Enforces state transitions (Accepted, Transit, Completed).",
                    "ReputationSystem.sol: Upgradeable proxy contract rewarding logistics score points (+50/+30).",
                    "AahaarDAO.sol: Governs peer-onboarding of NGOs to bypass centralized admin gate."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 19: Database Architecture (Light Theme, 3-Column)
    {
        "type": "light_content",
        "category": "Section 04: Technical Architecture",
        "title": "Database Schema & Entity Relationships",
        "layout": "3-column",
        "cards": [
            {
                "title": "Core Users & NGOs",
                "bullets": [
                    "Users: Name, Email, PasswordHash, Role, VerificationStatus, WalletAddress.",
                    "NGOs: NGOName, RegisterNumber, PAN, Wallet, ReputationScore, ActiveFlag."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Donations & Requests",
                "bullets": [
                    "Donation: DonorID, RecipientNGO, ItemsList, Weight, Geohash, Status, EVMHash, ProofCID.",
                    "FoodRequest: NGOID, TargetQty, Category, UrgencyLevel, FulfilledQty, Expiry."
                ],
                "accent": COLOR_GREEN_ACCENT
            },
            {
                "title": "Audits & Certificates",
                "bullets": [
                    "Certificates: CertificateID, DonationID, TaxExemptionClaim, DigitalSignature, ScannableQR.",
                    "VerificationLogs: GeoCoordinates, Timestamp, ScannerID, OTPHash."
                ],
                "accent": COLOR_BLUE_ACCENT
            }
        ]
    },
    # Slide 20: Security Architecture (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 05: Compliance & Security",
        "title": "Data Protection & Security Architecture",
        "layout": "2-column",
        "cards": [
            {
                "title": "Network & API Security",
                "bullets": [
                    "Enforces HTTPS with TLS 1.3 encryption across all communication routes.",
                    "JWT authentication with secure, HTTP-only cookie refresh token rotation.",
                    "Rate limiting policies restrict brute-force access to verification and auth endpoints.",
                    "Helmet middleware secures HTTP headers; strict CORS boundaries restrict cross-origin threats."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Data & Contract Protections",
                "bullets": [
                    "MongoDB validation schemas enforce data types and prevent injection attacks.",
                    "Solidity smart contracts utilize OpenZeppelin base contracts to prevent reentrancy.",
                    "All documents stored in S3 are encrypted at rest using AES-256 keys.",
                    "UUPS smart contract upgrade proxy blocks unauthorized execution gates."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 21: Patent-Worthy Technical Innovations (Light Theme, 3-Column)
    {
        "type": "light_content",
        "category": "Section 06: Innovation Case",
        "title": "Key Patentable Technical Claims (Provisional)",
        "layout": "3-column",
        "cards": [
            {
                "title": "Claim 1: Logistics Handshake",
                "bullets": [
                    "Method for double-verifying physical handover coordinates.",
                    "Dynamic, signed QR code generation linked to localized geohashes.",
                    "System rejects verification if donor camera coordinates mismatch pickup coordinates."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Claim 2: Dual-State Syncing",
                "bullets": [
                    "System synchronizes high-performance database state with EVM log transactions.",
                    "Asynchronous polling middleware catches blockchain log events to update MongoDB.",
                    "Maintains operational continuity during low-internet drops."
                ],
                "accent": COLOR_GREEN_ACCENT
            },
            {
                "title": "Claim 3: Exemption Engine",
                "bullets": [
                    "System automates Indian Income Tax Section 80G calculations at food handover.",
                    "Category rate mapping values donor assets in real-time.",
                    "Generates secure, watermarked certificates with embedded QR codes."
                ],
                "accent": COLOR_BLUE_ACCENT
            }
        ]
    },
    # Slide 22: Commercial Sustainability & Business Model (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 02: Commercial Model",
        "title": "Commercial Business Model & Profitability",
        "layout": "2-column",
        "cards": [
            {
                "title": "Enterprise Revenue Streams",
                "bullets": [
                    "B2B SaaS Subscriptions: Charge corporate kitchens Rs. 1,500/month for ESG dashboards.",
                    "80G Tax Exemption Commission: 3% fee on realized cash tax savings downloaded.",
                    "Premium NGO Console: Logistics tracking tools licensed to large food banks.",
                    "CSR API Integrations: Enterprise system connectors sold to SAP/Oracle ERPs."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Financial Scale Targets",
                "bullets": [
                    "Launch Capitalization: Rs. 10,000 hyper-local rollout budget (Flyers, basic fuel, staging runs).",
                    "12-Month Targets: Rescuing 10,000+ kg food; serving 20,000+ meals; avoiding 25,000 kg CO₂.",
                    "Economic Value: Unlocking Rs. 3,50,000+ in corporate tax savings.",
                    "Scales city-by-city through low startup cost geofenced cells."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 23: Competitive Analysis & Differentiators (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 06: Innovation Case",
        "title": "Competitive Differentiators & Market Position",
        "layout": "2-column",
        "cards": [
            {
                "title": "Competitor Landscape Limitations",
                "bullets": [
                    "Robin Hood Army: High volunteer base but lacks corporate compliance and dashboards.",
                    "Feeding India: Large programmatic execution but lacks automated tax deduction files.",
                    "Traditional NGOs: Inefficient manual pickup matching leads to high cooked food waste.",
                    "Food Aggregators (Zomato/Swiggy): Core commercial delivery models lack CSR integration."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "AAHAAR Key Differentiators",
                "bullets": [
                    "Unified B2B Platform: Bridges donors, logistics, and accountants under one SaaS console.",
                    "Zero Fraud Handshake: Geofenced QR validations secure physical asset transfers.",
                    "Compliance Ledgers: Automated, audited reports satisfy CSR Section 135 regulations.",
                    "Real-Time ESG Indexes: Carbon footprint calculations map offsets to trees saved."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 24: Enterprise Growth Roadmap & Future Directions (Light Theme, 2-Column)
    {
        "type": "light_content",
        "category": "Section 07: Roadmap",
        "title": "Growth Roadmap & Technological Future",
        "layout": "2-column",
        "cards": [
            {
                "title": "Advanced Automation & IoT Integrations",
                "bullets": [
                    "Food Freshness Assessment: Computer vision analyzes item photos to predict remaining shelf life.",
                    "IoT Cold Chain Tracking: Hardware sensors audit transportation temperatures in real time.",
                    "Demand Forecasting: Machine learning models predict food deficits across city geohashes.",
                    "Drone Delivery Integrations: Autonomous airborne routing for critical, short shelf-life cooked meals."
                ],
                "accent": COLOR_ORANGE_ACCENT
            },
            {
                "title": "Ecosystem Scaling & Integrations",
                "bullets": [
                    "Carbon Credit Marketplace: Let corporate partners trade carbon savings points on Web3 exchanges.",
                    "POS Integrations: Connect with Zomato/Swiggy order APIs to log commercial kitchen waste.",
                    "Public Distribution Sync: Connect with municipal PDS networks to support urban food security.",
                    "Global Rollout: Replicate geofenced model across developing urban centers globally."
                ],
                "accent": COLOR_GREEN_ACCENT
            }
        ]
    },
    # Slide 25: Summary & Closing Slide (Dark Theme)
    {
        "type": "dark_closing",
        "title": "AAHAAR: DIGITIZING TRUST, FEEDING LIVES",
        "subtitle": "Together, We Can Eliminate Food Waste, Empower Communities, and Build a Sustainable Future.",
        "tagline": "AAHAAR — Feeding People. Empowering NGOs. Transforming CSR. Protecting the Planet.",
        "bullets": [
            "Patent-Pending Framework: Safeguards core verification and automated tax valuation algorithms from copycats.",
            "Enterprise Utility Dashboard: Full-scale SaaS solution addressing corporate CSR and green ESG targets.",
            "Operational MVP: Deployed codebase integrating Express APIs, Socket.IO, and Solidity smart contracts."
        ],
        "footer": "ABES Engineering College  •  Investor Pitch  •  Contact: santosh.patel@abes.ac.in"
    }
]

# ==========================================
# 5. Slide Generation Loop
# ==========================================
for idx, data in enumerate(slides_data):
    slide_layout = blank_layout
    slide = prs.slides.add_slide(slide_layout)
    
    if data["type"] == "dark_title":
        apply_dark_background(slide)
        
        # Decorative accent bar
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(1.8), Inches(0.12), Inches(3.9))
        bar.fill.solid()
        bar.fill.fore_color.rgb = COLOR_ORANGE_ACCENT
        bar.line.fill.background()
        
        # Text block
        tb = slide.shapes.add_textbox(Inches(1.3), Inches(1.7), Inches(11.0), Inches(2.2))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        
        p_title = tf.paragraphs[0]
        p_title.text = data["title"]
        p_title.font.name = FONT_HEADING
        p_title.font.size = Pt(56)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_WHITE
        
        p_sub = tf.add_paragraph()
        p_sub.text = data["subtitle"]
        p_sub.font.name = FONT_HEADING
        p_sub.font.size = Pt(19)
        p_sub.font.bold = True
        p_sub.font.color.rgb = COLOR_ORANGE_ACCENT
        p_sub.space_before = Pt(8)
        
        p_desc = tf.add_paragraph()
        p_desc.text = data["desc"]
        p_desc.font.name = FONT_BODY
        p_desc.font.size = Pt(13)
        p_desc.font.color.rgb = COLOR_WHITE
        p_desc.space_before = Pt(14)
        
        # Presenter info
        tb_pres = slide.shapes.add_textbox(Inches(1.3), Inches(4.7), Inches(10.0), Inches(1.5))
        tf_pres = tb_pres.text_frame
        tf_pres.word_wrap = True
        tf_pres.margin_left = tf_pres.margin_right = tf_pres.margin_top = tf_pres.margin_bottom = 0
        
        pp1 = tf_pres.paragraphs[0]
        pp1.text = data["presenter"]
        pp1.font.name = FONT_BODY
        pp1.font.size = Pt(13.5)
        pp1.font.bold = True
        pp1.font.color.rgb = COLOR_WHITE
        
        pp2 = tf_pres.add_paragraph()
        pp2.text = data["college"]
        pp2.font.name = FONT_BODY
        pp2.font.size = Pt(12)
        pp2.font.color.rgb = COLOR_MUTED_TEXT
        pp2.space_before = Pt(4)
        
        pp3 = tf_pres.add_paragraph()
        pp3.text = data["ip_spec"]
        pp3.font.name = FONT_BODY
        pp3.font.size = Pt(10.5)
        pp3.font.italic = True
        pp3.font.color.rgb = COLOR_ORANGE_ACCENT
        pp3.space_before = Pt(8)

    elif data["type"] == "dark_closing":
        apply_dark_background(slide)
        
        # Title block
        tb = slide.shapes.add_textbox(Inches(1.0), Inches(1.5), Inches(11.333), Inches(1.5))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        
        p_title = tf.paragraphs[0]
        p_title.alignment = PP_ALIGN.CENTER
        p_title.text = data["title"]
        p_title.font.name = FONT_HEADING
        p_title.font.size = Pt(36)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_WHITE
        
        p_sub = tf.add_paragraph()
        p_sub.alignment = PP_ALIGN.CENTER
        p_sub.text = data["subtitle"]
        p_sub.font.name = FONT_HEADING
        p_sub.font.size = Pt(16)
        p_sub.font.bold = True
        p_sub.font.color.rgb = COLOR_ORANGE_ACCENT
        p_sub.space_before = Pt(6)

        p_tag = tf.add_paragraph()
        p_tag.alignment = PP_ALIGN.CENTER
        p_tag.text = data["tagline"]
        p_tag.font.name = FONT_HEADING
        p_tag.font.size = Pt(12.5)
        p_tag.font.bold = True
        p_tag.font.color.rgb = COLOR_GREEN_ACCENT
        p_tag.space_before = Pt(8)

        # Bullets block
        tb_bullets = slide.shapes.add_textbox(Inches(2.0), Inches(3.6), Inches(9.333), Inches(2.0))
        tf_bullets = tb_bullets.text_frame
        tf_bullets.word_wrap = True
        tf_bullets.margin_left = tf_bullets.margin_right = tf_bullets.margin_top = tf_bullets.margin_bottom = 0
        
        for bullet in data["bullets"]:
            p = tf_bullets.add_paragraph()
            p.alignment = PP_ALIGN.CENTER
            p.text = bullet
            p.font.name = FONT_BODY
            p.font.size = Pt(12.5)
            p.font.color.rgb = COLOR_WHITE
            p.space_before = Pt(10)
            
        # Footer
        tb_foot = slide.shapes.add_textbox(Inches(1.0), Inches(6.4), Inches(11.333), Inches(0.5))
        tf_foot = tb_foot.text_frame
        tf_foot.word_wrap = True
        tf_foot.margin_left = tf_foot.margin_right = tf_foot.margin_top = tf_foot.margin_bottom = 0
        p_foot = tf_foot.paragraphs[0]
        p_foot.alignment = PP_ALIGN.CENTER
        p_foot.text = data["footer"]
        p_foot.font.name = FONT_BODY
        p_foot.font.size = Pt(10.5)
        p_foot.font.color.rgb = COLOR_MUTED_TEXT

    elif data["type"] == "light_content":
        apply_light_background(slide)
        add_header(slide, data["category"], data["title"])
        
        layout = data["layout"]
        cards = data["cards"]
        
        if layout == "2-column":
            add_card(slide, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8), cards[0]["title"], cards[0]["bullets"], cards[0]["accent"])
            add_card(slide, Inches(6.933), Inches(1.8), Inches(5.6), Inches(4.8), cards[1]["title"], cards[1]["bullets"], cards[1]["accent"])
            
        elif layout == "3-column":
            add_card(slide, Inches(0.8), Inches(1.8), Inches(3.64), Inches(4.8), cards[0]["title"], cards[0]["bullets"], cards[0]["accent"])
            add_card(slide, Inches(4.84), Inches(1.8), Inches(3.64), Inches(4.8), cards[1]["title"], cards[1]["bullets"], cards[1]["accent"])
            add_card(slide, Inches(8.88), Inches(1.8), Inches(3.64), Inches(4.8), cards[2]["title"], cards[2]["bullets"], cards[2]["accent"])
            
        elif layout == "4-column":
            add_card(slide, Inches(0.8), Inches(1.8), Inches(2.68), Inches(4.8), cards[0]["title"], cards[0]["bullets"], cards[0]["accent"])
            add_card(slide, Inches(3.78), Inches(1.8), Inches(2.68), Inches(4.8), cards[1]["title"], cards[1]["bullets"], cards[1]["accent"])
            add_card(slide, Inches(6.76), Inches(1.8), Inches(2.68), Inches(4.8), cards[2]["title"], cards[2]["bullets"], cards[2]["accent"])
            add_card(slide, Inches(9.74), Inches(1.8), Inches(2.68), Inches(4.8), cards[3]["title"], cards[3]["bullets"], cards[3]["accent"])

# Save the presentation
output_path = "Aahaar_Patent_Presentation.pptx"
prs.save(output_path)
print(f"Presentation saved successfully to: {os.path.abspath(output_path)}")
