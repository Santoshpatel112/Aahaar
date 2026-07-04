import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# ==========================================
# 1. Color Palette & Typography Constants
# ==========================================
COLOR_DARK_BG = RGBColor(10, 15, 30)         # Deep Space Navy (#0a0f1e)
COLOR_LIGHT_BG = RGBColor(248, 250, 252)    # Light Slate Off-White
COLOR_PRIMARY_TEXT = RGBColor(15, 23, 42)    # Slate 900
COLOR_MUTED_TEXT = RGBColor(71, 85, 105)     # Slate 600
COLOR_ORANGE_ACCENT = RGBColor(249, 115, 22) # Vibrant Orange (#f97316)
COLOR_GREEN_ACCENT = RGBColor(34, 197, 94)   # Emerald Green (#22c55e)
COLOR_BLUE_ACCENT = RGBColor(6, 182, 212)    # Cyber Teal (#06b6d4)
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_CARD_BORDER = RGBColor(226, 232, 240)  # Slate 200

FONT_HEADING = "Plus Jakarta Sans"
FONT_BODY = "Plus Jakarta Sans"

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

def add_image_slide(slide, category, title, image_path, card_title, bullets, accent_color=None):
    apply_light_background(slide)
    add_header(slide, category, title)
    
    # Left-hand picture box (preserving 5.0 x 5.0 aspect ratio for posters)
    slide.shapes.add_picture(image_path, Inches(0.8), Inches(1.6), Inches(5.0), Inches(5.0))
    
    # Right-hand explanation card
    add_card(slide, Inches(6.5), Inches(1.6), Inches(6.0), Inches(5.0), card_title, bullets, accent_color)

# ==========================================
# 4. Slide Data Definition (8 Slides Total)
# ==========================================
slides_data = [
    # Slide 1: Title Slide (Dark Theme)
    {
        "type": "dark_title",
        "title": "AAHAAR",
        "subtitle": "Zero Waste. Zero Hunger. Fully Verified.",
        "desc": "A Unified B2B SaaS Enterprise Ecosystem Orchestrating Surplus Redirection, Cryptographic Verification, and Compliance Automation",
        "presenter": "Presenter: Santosh Patel | Department of Computer Science & Engineering",
        "college": "ABES Engineering College | Spark Fellowship Selection Challenge",
        "ip_spec": "IP Status: Patent-Pending Technology (System & Method for Secure Real-time Surplus Logistics Verification)"
    },
    # Slide 2: The Core Problem vs Aahaar (Light Theme, Image + Text)
    {
        "type": "light_image",
        "category": "Section 01: Strategic Vision",
        "title": "The Food Waste & Trust Paradox",
        "image_path": "images/aahaar_versus_traditional.png",
        "card_title": "Solving the Operational Bottlenecks",
        "bullets": [
            "Traditional charity networks rely on manual entries, leading to data manipulation and food loss.",
            "Lack of proof-of-delivery creates verification disputes between donors and NGOs.",
            "Direct food donations typically fail to secure Section 80G corporate tax benefits.",
            "Aahaar resolves these limitations with blockchain trust, QR verification, and structured tax metrics."
        ],
        "accent": COLOR_ORANGE_ACCENT
    },
    # Slide 3: Ecosystem Mind Map (Light Theme, Image + Text)
    {
        "type": "light_image",
        "category": "Section 01: Strategic Vision",
        "title": "Aahaar Platform Ecosystem Mind Map",
        "image_path": "images/aahaar_mindmap_real_logo.png",
        "card_title": "Core Ecosystem Connections",
        "bullets": [
            "Donors: Corporate offices, hotels, and event venues list surplus food on the portal.",
            "Secure Handshake: Dual-party QR validation rules out pickup and transit delivery disputes.",
            "Verified NGOs: Credentials checked via administrative gates and managed by EVM DAO.",
            "Impact Incentives: Pre-populated Section 80G tax benefit files and live ESG carbon indexes."
        ],
        "accent": COLOR_GREEN_ACCENT
    },
    # Slide 4: Cryptographic QR Handshake (Light Theme, Image + Text)
    {
        "type": "light_image",
        "category": "Section 02: Logistics Verification",
        "title": "Zero-Leakage Handshake Verification",
        "image_path": "images/aahaar_trust_handshake.png",
        "card_title": "Proof of Physical Delivery",
        "bullets": [
            "System generates a dynamic QR code and 6-digit OTP code when claims are approved.",
            "NGO rider displays the QR code at the physical pickup site to verify arrival coordinates.",
            "Donor scans the QR code to sign off the transaction and commit verification to the blockchain.",
            "Solidity smart contract marks completion, awarding reputation scores on-chain."
        ],
        "accent": COLOR_BLUE_ACCENT
    },
    # Slide 5: Section 80G Tax Exemption Shield (Light Theme, Image + Text)
    {
        "type": "light_image",
        "category": "Section 03: Compliance Automation",
        "title": "Automated Tax Benefit Valuation",
        "image_path": "images/aahaar_tax_exemption.png",
        "card_title": "50% Tax Exemption Protocol",
        "bullets": [
            "System converts food category and weight weights into fair procurement values.",
            "Enables corporate donors to legally claim a 50% Section 80G tax deduction.",
            "Generates compliant, watermarked PDF certificates containing smart smartphone-scannable QR verification.",
            "Verification receipts are locked until admin verifies donor credentials to prevent fraud."
        ],
        "accent": COLOR_ORANGE_ACCENT
    },
    # Slide 6: ESG & Carbon Offset Dashboard (Light Theme, Image + Text)
    {
        "type": "light_image",
        "category": "Section 03: Compliance Automation",
        "title": "Real-Time Environmental & Carbon Offsets",
        "image_path": "images/aahaar_esg_carbon.png",
        "card_title": "ESG Footprint Tracking",
        "bullets": [
            "Diverting organic waste from landfills avoids anaerobic methane emissions.",
            "Applies scientific offset models: 2.5 kg CO₂ reduction per kg of surplus food rescued.",
            "Translates carbon numbers into mature tree equivalents (22 kg CO₂/tree/year).",
            "Prepares clean, board-ready sustainability metrics for annual CSR reports."
        ],
        "accent": COLOR_GREEN_ACCENT
    },
    # Slide 7: Proposed System Architecture (Light Theme, Image + Text)
    {
        "type": "light_image",
        "category": "Section 04: Technical Architecture",
        "title": "Proposed System Architecture & Sync",
        "image_path": "images/proposed_system_architecture.png",
        "card_title": "Notification & Event Listeners",
        "bullets": [
            "Socket.IO connection feeds real-time updates directly to admin and user dashboards.",
            "Firebase Cloud Messaging (FCM) drives offline alerts to browser tabs.",
            "Twilio SMS gateway sends immediate OTP codes to logistics drivers.",
            "Node.js background event listener synchronizes EVM smart contract logs to MongoDB."
        ],
        "accent": COLOR_BLUE_ACCENT
    },
    # Slide 8: The Corporate Partnership Invitation (Dark Theme)
    {
        "type": "dark_closing",
        "title": "AAHAAR: DIGITIZING TRUST, FEEDING LIVES",
        "subtitle": "Together, We Can Eliminate Food Waste, Empower Communities, and Build a Sustainable Future.",
        "tagline": "AAHAAR — Feeding People. Empowering NGOs. Transforming CSR. Protecting the Planet.",
        "bullets": [
            "Enterprise Utility: Complete SaaS solution addressing corporate CSR and green ESG targets.",
            "Operational Codebase: Deployed system integrating Express APIs, Socket.IO, and Solidity contracts.",
            "Call to Action: Inviting foundations (like Reliance Foundation) and enterprise leaders to partner."
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

    elif data["type"] == "light_image":
        add_image_slide(slide, data["category"], data["title"], data["image_path"], data["card_title"], data["bullets"], data["accent"])

# Save the presentation
output_path = "Aahaar_Patent_Presentation.pptx"
prs.save(output_path)
print(f"Presentation saved successfully to: {os.path.abspath(output_path)}")
