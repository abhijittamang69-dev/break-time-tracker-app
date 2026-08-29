"""Generate a comprehensive Break Time Tracker User Guide PDF."""

import os
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image, PageBreak, KeepTogether, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PDF = os.path.join(OUTPUT_DIR, "Break_Time_Tracker_User_Guide.pdf")
DIAGRAM_PATH = os.path.join(OUTPUT_DIR, "flow_diagram.png")
ROLES_DIAGRAM_PATH = os.path.join(OUTPUT_DIR, "roles_diagram.png")

# ============================================================
# 1. Generate Flow Diagram (matplotlib)
# ============================================================
def create_flow_diagram():
    fig, ax = plt.subplots(figsize=(10, 14))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 14)
    ax.axis('off')

    def draw_box(x, y, w, h, text, color, text_color='white', fontsize=11, icon=''):
        box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                             boxstyle="round,pad=0.02,rounding_size=0.25",
                             facecolor=color, edgecolor='none', linewidth=0)
        ax.add_patch(box)
        if icon:
            text = f"{icon}\n{text}"
        ax.text(x, y, text, ha='center', va='center', fontsize=fontsize,
                color=text_color, fontweight='bold', wrap=True,
                linespacing=1.3)
        return box

    def draw_arrow(x1, y1, x2, y2, color='#9ca3af'):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=color, lw=2.5,
                                    connectionstyle='arc3,rad=0'))

    def draw_small_label(x, y, text, color='#6b7280'):
        ax.text(x, y, text, ha='center', va='center', fontsize=9,
                color=color, style='italic')

    # Steps from top to bottom
    step_w, step_h = 5.5, 1.3
    colors = {
        'login': '#1a56db',
        'scan': '#0e9f6e',
        'request': '#0e9f6e',
        'pending': '#ff5a1f',
        'approve': '#1a56db',
        'reject': '#f05252',
        'reminder': '#f59e0b',
        'end': '#0e9f6e',
        'complete': '#047857',
    }

    y = 13.0
    draw_box(5, y, step_w, step_h, 'Login\nAll users', colors['login'], fontsize=12)
    draw_arrow(5, y - step_h/2, 5, y - 1.4)

    y = 11.0
    draw_box(5, y, step_w, step_h, 'Scan QR Code\nOperator', colors['scan'], fontsize=12)
    draw_arrow(5, y - step_h/2, 5, y - 1.4)

    y = 9.0
    draw_box(5, y, step_w, step_h, 'Request Break\nOperator', colors['request'], fontsize=12)
    draw_arrow(5, y - step_h/2, 5, y - 1.4)

    y = 7.0
    draw_box(5, y, step_w, step_h, 'Pending Approval\nSupervisor / TL / Coordinator', colors['pending'], fontsize=11)
    draw_arrow(5, y - step_h/2, 5, y - 1.4)

    y = 5.0
    # Approve branch (left) and Reject branch (right) - actually let's keep it simple
    draw_box(3.2, y, 3.0, 1.0, 'Approve\nBreak Starts', colors['approve'], fontsize=10)
    draw_box(6.8, y, 3.0, 1.0, 'Reject\nRequest Denied', colors['reject'], fontsize=10)

    # Arrows from pending to approve/reject
    draw_arrow(3.8, 6.35, 3.2, 5.5, '#1a56db')
    draw_arrow(6.2, 6.35, 6.8, 5.5, '#f05252')
    draw_small_label(3.2, 6.0, 'Approve', '#1a56db')
    draw_small_label(6.8, 6.0, 'Reject', '#f05252')

    # Arrow from approve down
    draw_arrow(3.2, 4.5, 3.2, 3.6)
    y = 2.9
    draw_box(3.2, y, 3.0, 1.0, '5-Min Reminder\nAuto Alert', colors['reminder'], fontsize=10)
    draw_arrow(3.2, y - 0.5, 3.2, y - 1.0)

    y = 1.4
    draw_box(3.2, y, 3.0, 1.0, 'Scan QR to End\nOperator Returns', colors['end'], fontsize=10)
    draw_arrow(3.2, y - 0.5, 3.2, y - 1.0)

    y = 0.3
    draw_box(3.2, y, 3.0, 0.8, 'Break Completed\nDuration Recorded', colors['complete'], fontsize=10)

    fig.tight_layout(pad=0.5)
    fig.savefig(DIAGRAM_PATH, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Flow diagram saved to {DIAGRAM_PATH}")


def create_roles_diagram():
    fig, ax = plt.subplots(figsize=(10, 4.5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 4.5)
    ax.axis('off')

    roles = [
        (1.7, 2.25, '#ecfdf5', '#0e9f6e', 'OPERATOR', 'Requests breaks\nvia QR scan'),
        (5.0, 2.25, '#eff6ff', '#1a56db', 'SUPERVISOR / TL', 'Reviews & approves\nbreak requests'),
        (8.3, 2.25, '#fff7ed', '#ff5a1f', 'ADMIN', 'Manages users,\nsettings & reports'),
    ]

    for x, y, bg, fg, title, desc in roles:
        box = FancyBboxPatch((x - 1.4, y - 1.6), 2.8, 3.2,
                             boxstyle="round,pad=0.02,rounding_size=0.3",
                             facecolor=bg, edgecolor=fg, linewidth=2.5)
        ax.add_patch(box)
        ax.text(x, y + 0.7, title, ha='center', va='center', fontsize=12,
                color=fg, fontweight='bold')
        ax.text(x, y - 0.2, desc, ha='center', va='center', fontsize=10,
                color='#374151', linespacing=1.4)

    fig.tight_layout(pad=0.5)
    fig.savefig(ROLES_DIAGRAM_PATH, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f"Roles diagram saved to {ROLES_DIAGRAM_PATH}")


# ============================================================
# 2. Build PDF
# ============================================================
def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PDF, pagesize=A4,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
        leftMargin=2.5*cm, rightMargin=2.5*cm
    )
    doc.title = "Break Time Tracker — User Guide"
    doc.author = "Break Time Tracker"

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Title'], fontSize=28, leading=34,
        textColor=HexColor('#1a56db'), spaceAfter=20, alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'], fontSize=14, leading=18,
        textColor=HexColor('#6b7280'), alignment=TA_CENTER, spaceAfter=30
    )
    heading1 = ParagraphStyle(
        'Heading1Custom', parent=styles['Heading1'], fontSize=18, leading=22,
        textColor=HexColor('#111827'), spaceBefore=24, spaceAfter=12,
        fontName='Helvetica-Bold', borderColor=HexColor('#1a56db'),
        borderWidth=2, borderPadding=5, leftIndent=0, borderRadius=4
    )
    heading2 = ParagraphStyle(
        'Heading2Custom', parent=styles['Heading2'], fontSize=14, leading=18,
        textColor=HexColor('#1f2937'), spaceBefore=18, spaceAfter=8,
        fontName='Helvetica-Bold'
    )
    body = ParagraphStyle(
        'BodyCustom', parent=styles['Normal'], fontSize=11, leading=16,
        textColor=HexColor('#374151'), alignment=TA_JUSTIFY, spaceAfter=10
    )
    bullet_style = ParagraphStyle(
        'BulletCustom', parent=styles['Normal'], fontSize=10.5, leading=15,
        textColor=HexColor('#374151'), leftIndent=20, spaceAfter=6,
        bulletIndent=10, bulletFontName='Helvetica-Bold'
    )
    tip_style = ParagraphStyle(
        'TipBox', parent=styles['Normal'], fontSize=10.5, leading=15,
        textColor=HexColor('#1f2937'), backColor=HexColor('#eff6ff'),
        borderColor=HexColor('#bfdbfe'), borderWidth=1, borderPadding=10,
        spaceBefore=12, spaceAfter=12, borderRadius=6
    )
    caption_style = ParagraphStyle(
        'Caption', parent=styles['Normal'], fontSize=9, leading=12,
        textColor=HexColor('#6b7280'), alignment=TA_CENTER, spaceAfter=16
    )
    code_style = ParagraphStyle(
        'CodeStyle', parent=styles['Normal'], fontName='Courier', fontSize=9.5,
        leading=13, textColor=HexColor('#1f2937'), backColor=HexColor('#f3f4f6'),
        leftIndent=10, rightIndent=10, spaceBefore=6, spaceAfter=6,
        borderPadding=8, borderColor=HexColor('#e5e7eb'), borderWidth=1,
        borderRadius=4
    )

    story = []

    # -------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------
    story.append(Spacer(1, 4*cm))
    story.append(Paragraph("Break Time Tracker", title_style))
    story.append(Paragraph("Complete User Guide", subtitle_style))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(
        "QR Code-based Break Time Management System<br/>"
        "For Operators, Supervisors, Team Leaders, Coordinators, and Admins",
        ParagraphStyle('CoverSub', parent=styles['Normal'], fontSize=12,
                       leading=18, textColor=HexColor('#6b7280'),
                       alignment=TA_CENTER)
    ))
    story.append(Spacer(1, 2*cm))

    # Roles summary on cover
    if os.path.exists(ROLES_DIAGRAM_PATH):
        story.append(Image(ROLES_DIAGRAM_PATH, width=15*cm, height=6.75*cm))
    story.append(PageBreak())

    # -------------------------------------------------------
    # SECTION 1: INTRODUCTION
    # -------------------------------------------------------
    story.append(Paragraph("1. Introduction", heading1))
    story.append(Paragraph(
        "The Break Time Tracker is a full-stack web application designed to streamline "
        "break time management for teams and organizations. It uses QR code scanning "
        "to allow operators to request breaks quickly, while supervisors and team leaders "
        "review and approve requests with custom durations. The system provides real-time "
        "dashboards, automated reminders, and comprehensive reports.",
        body
    ))
    story.append(Paragraph(
        "This guide covers everything you need to know to use the application effectively, "
        "from your first login to generating daily reports.",
        body
    ))

    # -------------------------------------------------------
    # SECTION 2: USER ROLES & PERMISSIONS
    # -------------------------------------------------------
    story.append(Paragraph("2. User Roles & Permissions", heading1))
    story.append(Paragraph(
        "The application uses role-based access control. Every user logs in through the same "
        "login page, but the features available depend on their assigned role.",
        body
    ))

    role_data = [
        ['Role', 'Primary Responsibilities', 'Key Access'],
        ['Operator', 'Request breaks via QR scan; return on time', 'Scan, Dashboard, History'],
        ['Supervisor / TL / Coordinator', 'Review, approve, or reject break requests', 'Dashboard (approve/reject), Reports'],
        ['Admin', 'Manage users, devices, settings; view all reports', 'Users, Devices, Settings, Reports'],
    ]
    role_table = Table(role_data, colWidths=[4.5*cm, 6.5*cm, 5.5*cm])
    role_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a56db')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, HexColor('#1a56db')),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, HexColor('#1a56db')),
        ('LINEABOVE', (0, 0), (-1, 0), 1.5, HexColor('#1a56db')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f9fafb'), white]),
    ]))
    story.append(role_table)
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph(
        "<b>Important:</b> All roles share the same login page. Your username and password "
        "determine your role and available features automatically.",
        tip_style
    ))

    # -------------------------------------------------------
    # SECTION 3: BREAK REQUEST FLOW
    # -------------------------------------------------------
    story.append(Paragraph("3. Break Request Flow", heading1))
    story.append(Paragraph(
        "The following diagram illustrates the complete lifecycle of a break request, "
        "from login to completion.",
        body
    ))

    if os.path.exists(DIAGRAM_PATH):
        story.append(Image(DIAGRAM_PATH, width=13*cm, height=18.2*cm))
        story.append(Paragraph("Figure 1: Break Request Flow Diagram", caption_style))

    story.append(PageBreak())

    # -------------------------------------------------------
    # SECTION 4: STEP-BY-STEP GUIDE
    # -------------------------------------------------------
    story.append(Paragraph("4. Step-by-Step User Guide", heading1))

    # 4.1 Login
    story.append(Paragraph("4.1 Logging In", heading2))
    story.append(Paragraph(
        "Open the application in your web browser. You will see a single login screen "
        "for all users. Enter your username and password, then click the Login button.",
        body
    ))
    story.append(Paragraph("Default Admin Credentials:", body))
    story.append(Paragraph("Username: admin<br/>Password: Admin123", code_style))
    story.append(Paragraph(
        "The admin account is automatically created when the server starts for the first time. "
        "Use this account to create additional users for your team.",
        body
    ))

    # 4.2 Operator: Request a Break
    story.append(Paragraph("4.2 Requesting a Break (Operator)", heading2))
    story.append(Paragraph(
        "Operators can request breaks using the QR code scanner or directly from the Dashboard.",
        body
    ))
    steps_request = [
        "Navigate to the <b>Scan</b> page from the sidebar menu.",
        "Tap the <b>Request Break</b> button.",
        "Point your device's camera at the QR code placed at the break area.",
        "The request is sent to your Supervisor / Team Leader / Coordinator for approval.",
        "Wait for approval. You will see your request status update in real time.",
    ]
    for step in steps_request:
        story.append(Paragraph(f"• {step}", bullet_style))
    story.append(Spacer(1, 0.2*cm))

    story.append(Paragraph(
        "<b>Alternative:</b> You can also request a break directly from the Dashboard "
        "without scanning a QR code. The QR code is simply the fastest method.",
        tip_style
    ))

    # 4.3 Supervisor: Approve or Reject
    story.append(Paragraph("4.3 Approving or Rejecting Requests (Supervisor / TL / Coordinator)", heading2))
    story.append(Paragraph(
        "When an operator requests a break, it appears on the Dashboard as a pending request.",
        body
    ))
    steps_approve = [
        "Open the <b>Dashboard</b> page.",
        "Locate the pending break request in the 'Pending Requests' section.",
        "Review the operator's name and current status.",
        "Set a custom break duration (in minutes) using the duration field.",
        "Click <b>Approve</b> to allow the break, or <b>Reject</b> to deny it.",
        "The operator is notified immediately of your decision.",
    ]
    for step in steps_approve:
        story.append(Paragraph(f"• {step}", bullet_style))
    story.append(Spacer(1, 0.2*cm))

    # 4.4 During the Break
    story.append(Paragraph("4.4 During the Break", heading2))
    story.append(Paragraph(
        "Once a break is approved, the system automatically starts a countdown timer. "
        "The operator's status changes to 'On Break' and is visible on the live Dashboard "
        "to all team members.",
        body
    ))
    story.append(Paragraph(
        "<b>5-Minute Reminder:</b> The app sends an automatic notification to the operator "
        "5 minutes before their approved break duration ends. This gives them enough time "
        "to wrap up and return to their station.",
        tip_style
    ))

    # 4.5 Ending the Break
    story.append(Paragraph("4.5 Ending a Break (Operator)", heading2))
    story.append(Paragraph(
        "When the operator returns from their break, they must mark it as ended.",
        body
    ))
    steps_end = [
        "Return to the break area QR code.",
        "Navigate to the <b>Scan</b> page and tap <b>End Break</b>.",
        "Scan the QR code to confirm your return.",
        "The system records the exact return time and marks the break as 'Completed'.",
    ]
    for step in steps_end:
        story.append(Paragraph(f"• {step}", bullet_style))
    story.append(Spacer(1, 0.2*cm))

    story.append(Paragraph(
        "<b>Note:</b> You can also end the break from the Dashboard if you are unable to scan "
        "the QR code.",
        tip_style
    ))

    # -------------------------------------------------------
    # SECTION 5: APP SCREENS OVERVIEW
    # -------------------------------------------------------
    story.append(Paragraph("5. App Screens Overview", heading1))
    story.append(Paragraph(
        "The application is organized into several screens, each serving a specific purpose. "
        "Below is a summary of every screen and who can access it.",
        body
    ))

    screen_data = [
        ['Screen', 'Description', 'Who Can Access'],
        ['Dashboard', 'Live break status, pending requests, staffing coverage, request/end breaks', 'Everyone'],
        ['Scan', 'QR code scanner for quick break request and end', 'Everyone'],
        ['History', 'Personal break history for the current day', 'Everyone'],
        ['Reports', 'Daily break statistics, late returns, staff summaries', 'Everyone'],
        ['Users', 'Add, edit, and remove team members', 'Admin, Supervisor'],
        ['Devices', 'Manage registered devices and access control', 'Admin, Supervisor'],
    ]
    screen_table = Table(screen_data, colWidths=[3.5*cm, 8*cm, 5*cm])
    screen_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a56db')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, HexColor('#1a56db')),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, HexColor('#1a56db')),
        ('LINEABOVE', (0, 0), (-1, 0), 1.5, HexColor('#1a56db')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f9fafb'), white]),
    ]))
    story.append(screen_table)
    story.append(Spacer(1, 0.3*cm))

    # -------------------------------------------------------
    # SECTION 6: KEY FEATURES
    # -------------------------------------------------------
    story.append(Paragraph("6. Key Features Explained", heading1))

    story.append(Paragraph("6.1 QR Code Scanning", heading2))
    story.append(Paragraph(
        "Place a printed QR code at each break area. Operators simply point their device camera "
        "at the code to request or end breaks. No typing or manual entry is required, reducing "
        "errors and saving time. The system validates the scan and links it to the operator's account.",
        body
    ))

    story.append(Paragraph("6.2 Approval Workflow", heading2))
    story.append(Paragraph(
        "Every break request goes through an approval process. Supervisors, Team Leaders, and "
        "Coordinators can set custom break durations per request, ensuring staffing coverage "
        "is maintained. Approved breaks start automatically; rejected requests notify the operator immediately.",
        body
    ))

    story.append(Paragraph("6.3 Real-Time Dashboard", heading2))
    story.append(Paragraph(
        "The Dashboard provides a live view of all break activity: who is on break, who has pending "
        "requests, and overall staffing coverage. It updates in real time without requiring a page refresh, "
        "so supervisors always have current information.",
        body
    ))

    story.append(Paragraph("6.4 Smart Reminders", heading2))
    story.append(Paragraph(
        "Operators receive an automatic notification 5 minutes before their break ends. This helps "
        "prevent late returns and keeps operations running smoothly. Late returns are flagged in reports "
        "for follow-up.",
        body
    ))

    story.append(Paragraph("6.5 Reports & Analytics", heading2))
    story.append(Paragraph(
        "The Reports screen provides daily summaries including total break counts, average break duration, "
        "late return statistics, and per-staff breakdowns. Use these insights to identify patterns and "
        "optimize team scheduling.",
        body
    ))

    story.append(Paragraph("6.6 Shift Management", heading2))
    story.append(Paragraph(
        "The system supports multiple shift types: Morning, Afternoon, Night, and Rotating. "
        "Break policies and reports can be filtered by shift, making it easy to manage teams "
        "that work across different time periods.",
        body
    ))

    story.append(Paragraph("6.7 Password Management", heading2))
    story.append(Paragraph(
        "All users can change their own password from the Settings menu. Admins can also reset "
        "passwords for other users if needed. Passwords are stored securely using industry-standard hashing.",
        body
    ))

    story.append(PageBreak())

    # -------------------------------------------------------
    # SECTION 7: TIPS & BEST PRACTICES
    # -------------------------------------------------------
    story.append(Paragraph("7. Tips & Best Practices", heading1))

    tips = [
        ("Keep QR Codes Visible",
         "Ensure QR codes at break areas are printed clearly, protected from damage, and placed at a comfortable scanning height."),
        ("Approve Promptly",
         "Supervisors should check the Dashboard regularly and approve requests quickly to minimize operator waiting time."),
        ("Set Realistic Durations",
         "When approving breaks, set durations that match your team's operational needs while complying with labor regulations."),
        ("Monitor Late Returns",
         "Use the Reports screen to track late returns. Address patterns early to maintain discipline and coverage."),
        ("Update Settings as Needed",
         "Admins should review app settings periodically to ensure break policies and shift configurations remain accurate."),
        ("Register Devices",
         "For added security, use the Devices screen to register and manage which devices can access the application."),
    ]
    for title, text in tips:
        story.append(Paragraph(f"<b>{title}:</b> {text}", bullet_style))

    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        "<b>Pro Tip:</b> Operators can use the Dashboard as a backup if the QR code scanner "
        "is unavailable. Both methods achieve the same result.",
        tip_style
    ))

    # -------------------------------------------------------
    # SECTION 8: TROUBLESHOOTING
    # -------------------------------------------------------
    story.append(Paragraph("8. Troubleshooting", heading1))

    trouble_data = [
        ['Issue', 'Solution'],
        ['Cannot scan QR code', 'Ensure camera permissions are enabled. Try the Dashboard button as a backup.'],
        ['Break request not appearing', 'Check your internet connection. Refresh the Dashboard page.'],
        ['Approval buttons not visible', 'Your account may have Operator role only. Contact an Admin to verify.'],
        ['Forgot password', 'Contact your Admin to reset your password from the Users screen.'],
        ['Page not loading', 'Clear browser cache or try a different browser. Check server status.'],
    ]
    trouble_table = Table(trouble_data, colWidths=[6*cm, 10*cm])
    trouble_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor('#ffffff')),
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1a56db')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, HexColor('#1a56db')),
        ('LINEBELOW', (0, -1), (-1, -1), 1.5, HexColor('#1a56db')),
        ('LINEABOVE', (0, 0), (-1, 0), 1.5, HexColor('#1a56db')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor('#f9fafb'), white]),
    ]))
    story.append(trouble_table)

    # -------------------------------------------------------
    # FOOTER NOTE
    # -------------------------------------------------------
    story.append(Spacer(1, 1.5*cm))
    story.append(Paragraph(
        "For technical support or feature requests, contact your system administrator.<br/>"
        "Built with React, Node.js, Express, and MongoDB.",
        ParagraphStyle('FooterNote', parent=styles['Normal'], fontSize=9,
                       textColor=HexColor('#9ca3af'), alignment=TA_CENTER)
    ))

    # Build with header/footer
    def header_footer(canvas, doc):
        canvas.saveState()
        width, height = A4
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(HexColor('#9ca3af'))
        canvas.drawCentredString(width / 2, height - 1.2*cm,
                                 "Break Time Tracker — User Guide")
        canvas.drawCentredString(width / 2, 1.0*cm,
                                 f"Page {doc.page}")
        canvas.restoreState()

    def first_page(canvas, doc):
        pass  # No header/footer on cover

    doc.build(story, onFirstPage=first_page, onLaterPages=header_footer)
    print(f"PDF created successfully: {OUTPUT_PDF}")


if __name__ == '__main__':
    create_flow_diagram()
    create_roles_diagram()
    build_pdf()
    print("All done!")
