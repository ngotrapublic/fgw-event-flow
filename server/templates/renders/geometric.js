/**
 * Geometric Modern Template - "Prism Modern" UI/UX Pro Max
 * High-tech architectural aesthetic with Cyber Mint accents
 * 
 * DESIGN CONCEPT: "Prism Modern"
 * - Archetype: Tech Dashboard / Architectural Blueprint
 * - Palette: Slate 900 (Header), Cyber Mint (Accents), Slate 100 (Canvas)
 * - Typography: Modern Sans-serif (Segoe UI, Arial)
 * - Vibe: Precision, High-tech, Professional
 * 
 * OUTLOOK COMPATIBILITY:
 * - 100% Table-based structure
 * - Inline CSS only
 * - No Flexbox/Grid
 */

module.exports = function renderGeometric(title, bodyContent) {
    // Destructure bodyContent like splitScreen.js pattern
    const {
        eventName = title,
        eventDate = new Date(),
        timeString = 'TBD',
        timeEnd = '',
        location = 'TBD',
        department = 'N/A',
        facilitiesChecklist = [],
        notes = ''
    } = bodyContent || {};

    // Design Tokens - Prism Modern
    const SLATE_900 = '#0F172A';
    const SLATE_700 = '#334155';
    const SLATE_100 = '#F1F5F9';
    const SLATE_200 = '#E2E8F0';
    const CYBER_MINT = '#2DD4BF';
    const CYBER_MINT_DARK = '#14B8A6';
    const WHITE = '#FFFFFF';
    const TEXT_PRIMARY = '#0F172A';
    const TEXT_SECONDARY = '#475569';

    // Process facilities checklist (handle both array and string)
    const facilitiesList = Array.isArray(facilitiesChecklist)
        ? facilitiesChecklist
        : (facilitiesChecklist ? facilitiesChecklist.split(',').map(f => f.trim()) : []);

    // Format date
    const dateObj = new Date(eventDate);
    const formattedDate = dateObj.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // Helper to render facilities list
    const getFacilitiesHtml = () => {
        if (!facilitiesList.length) {
            return `<tr><td style="color: #64748B; font-family: Arial, sans-serif; font-size: 14px; padding: 8px 0;">Không có yêu cầu</td></tr>`;
        }

        return facilitiesList.map(item => `
            <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid ${SLATE_200};">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td width="24" valign="top" style="padding-top: 2px;">
                                <span style="display: inline-block; width: 8px; height: 8px; background-color: ${CYBER_MINT};"></span>
                            </td>
                            <td align="left" style="color: ${TEXT_PRIMARY}; font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px;">
                                ${item}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `).join('');
    };

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="x-apple-disable-message-reformatting">
    <!--[if gte mso 9]>
    <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    <style>
        table { border-collapse: collapse; }
        td { font-family: Arial, sans-serif; }
    </style>
    <![endif]-->
    <title>${eventName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${SLATE_100};">
    <!-- WRAPPER -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${SLATE_100}">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                
                <!-- MAIN CARD (600px) -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color: ${WHITE}; border: 1px solid ${SLATE_200};">
                    
                    <!-- ============================================
                         HEADER: Dark Slate with Cyber Mint Accent
                         ============================================ -->
                    <tr>
                        <td bgcolor="${SLATE_900}" style="padding: 0;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="padding: 40px 48px 32px 48px;">
                                        <!-- Header Layout -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <!-- Left Accent Bar -->
                                                <td width="8" bgcolor="${CYBER_MINT}" style="height: 48px;"></td>
                                                <td width="16"></td>
                                                <!-- Title -->
                                                <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 28px; font-weight: 700; color: ${WHITE}; letter-spacing: -0.5px;">
                                                    ${eventName}
                                                </td>
                                                <!-- Diamond Icon -->
                                                <td width="48" align="right" valign="middle">
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 24px; height: 24px; background-color: ${CYBER_MINT}; font-size: 0; line-height: 0;"></td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- ============================================
                         ACCENT STRIP: Cyber Mint Line
                         ============================================ -->
                    <tr>
                        <td style="padding: 0;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="120" height="4" bgcolor="${CYBER_MINT}"></td>
                                    <td bgcolor="${WHITE}"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ============================================
                         EVENT DETAILS SECTION
                         ============================================ -->
                    <tr>
                        <td style="padding: 40px 48px;">
                            <!-- Content with Left Border -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="4" bgcolor="${SLATE_200}"></td>
                                    <td style="padding-left: 24px;">
                                        
                                        <!-- Section Label -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; font-weight: 600; color: ${CYBER_MINT}; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 20px;">
                                                    Thông tin sự kiện
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Date & Time Row -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                                            <tr>
                                                <!-- Date -->
                                                <td width="50%" valign="top">
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 6px;">
                                                                Ngày
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600; color: ${TEXT_PRIMARY};">
                                                                ${formattedDate}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <!-- Time -->
                                                <td width="50%" valign="top">
                                                    <table border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 6px;">
                                                                Thời gian
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600; color: ${TEXT_PRIMARY};">
                                                                ${timeString}${timeEnd ? ' - ' + timeEnd : ''}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Location Row -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                                            <tr>
                                                <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 6px;">
                                                    Địa điểm
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600; color: ${TEXT_PRIMARY};">
                                                    ${location}
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Department Row -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 6px;">
                                                    Phòng ban
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600; color: ${TEXT_PRIMARY};">
                                                    ${department}
                                                </td>
                                            </tr>
                                        </table>

                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ============================================
                         FACILITIES SECTION
                         ============================================ -->
                    <tr>
                        <td style="padding: 0 48px 40px 48px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td width="4" bgcolor="${CYBER_MINT}"></td>
                                    <td style="padding-left: 24px;">
                                        <!-- Section Label -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; font-weight: 600; color: ${CYBER_MINT}; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 16px;">
                                                    Yêu cầu cơ sở vật chất
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Facilities List -->
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            ${getFacilitiesHtml()}
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ============================================
                         NOTES SECTION (if exists)
                         ============================================ -->
                    ${notes ? `
                    <tr>
                        <td style="padding: 0 48px 40px 48px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${SLATE_100}; border-left: 4px solid ${SLATE_700};">
                                <tr>
                                    <td style="padding: 20px;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 8px;">
                                                    Ghi chú
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: ${TEXT_PRIMARY}; line-height: 1.6;">
                                                    ${notes}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    ` : ''}



                    <!-- ============================================
                         FOOTER
                         ============================================ -->
                    <tr>
                        <td bgcolor="${SLATE_100}" style="border-top: 1px solid ${SLATE_200}; padding: 32px 48px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <!-- Geometric Footer Icon -->
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td width="8" height="8" bgcolor="${CYBER_MINT}"></td>
                                                <td width="4"></td>
                                                <td width="8" height="8" bgcolor="${SLATE_700}"></td>
                                                <td width="4"></td>
                                                <td width="8" height="8" bgcolor="${SLATE_200}"></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td height="16"></td>
                                </tr>
                                <tr>
                                    <td align="center" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: ${TEXT_SECONDARY};">
                                        © 2026 AntiGravity — Được tạo với ❤️
                                    </td>
                                </tr>
                                <tr>
                                    <td height="8"></td>
                                </tr>
                                <tr>
                                    <td align="center" style="font-family: 'Courier New', monospace; font-size: 10px; color: ${SLATE_200}; letter-spacing: 2px;">
                                        PRISM • MODERN • V1.0
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                <!-- End Main Card -->
                
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};
