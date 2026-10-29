import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

/**
 * Format date for PDF display
 */
const formatPdfDate = (dateString) => {
  if (!dateString) return 'Date not specified';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateString;
  }
};

/**
 * Format currency for PDF display (using INR / Rs. to ensure clean font rendering in standard PDF fonts)
 */
const formatPdfAmount = (amount) => {
  const num = Number(amount) || 0;
  return `INR ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Generate and trigger download of high-resolution, professional PDF Ticket
 * @param {Object} params
 * @param {Object} params.booking - The booking record object
 * @param {Object} [params.user] - The authenticated user profile { name, email }
 * @param {Object} [params.event] - Optional fallback event object if not nested in booking
 */
export const downloadTicketPdf = async ({ booking, user = {}, event = null }) => {
  if (!booking) {
    throw new Error('Booking data is required to generate ticket');
  }

  const evt = booking.event || event || {};
  const ref = booking.bookingReference || 'TICKET';
  const seats = booking.seats || [];
  const seatNumbers = seats.map((s) => s.seatNumber).join(', ') || 'General Admission';
  const eventTitle = evt.title || 'Live Event';
  const eventVenue = evt.venue || 'Main Arena / Venue';
  const eventCategory = evt.category || 'Live Experience';
  const eventDate = formatPdfDate(evt.startTime);
  const bookedDate = formatPdfDate(booking.createdAt);
  const customerName = user.name || booking.userName || 'Valued Guest';
  const customerEmail = user.email || booking.userEmail || '';
  const totalAmount = formatPdfAmount(booking.amount);
  const isCancelled = booking.status === 'CANCELLED';

  // 1. Generate QR Code Data URL
  const qrPayload = JSON.stringify({
    system: 'Event Seat Booking System',
    reference: ref,
    event: eventTitle,
    venue: eventVenue,
    date: eventDate,
    seats: seatNumbers,
    holder: customerName,
    email: customerEmail,
    amount: totalAmount,
    status: isCancelled ? 'CANCELLED' : 'CONFIRMED'
  });

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.warn('QR Code generation skipped:', err);
  }

  // 2. Initialize jsPDF Document (A4 portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = 14;

  const isCouple = Boolean(booking.isCoupleBooking);

  // Outer Border Box
  if (isCouple) {
    doc.setDrawColor(251, 113, 133); // rose-400
  } else {
    doc.setDrawColor(226, 232, 240); // slate-200
  }
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 268, 4, 4, 'S');

  // =========================================================================
  // TOP HEADER BANNER (Gradient Dark Indigo / Romantic Crimson)
  // =========================================================================
  const headerHeight = 36;
  if (isCouple) {
    doc.setFillColor(136, 19, 55); // rose-900 (deep romantic crimson)
  } else {
    doc.setFillColor(15, 23, 42); // slate-900
  }
  doc.roundedRect(margin, y, contentWidth, headerHeight, 4, 4, 'F');
  // Fill square corners on bottom of header
  doc.rect(margin, y + headerHeight - 4, contentWidth, 4, 'F');

  // System Brand
  if (isCouple) {
    doc.setTextColor(253, 164, 175); // rose-300
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('EVENT SEAT BOOKING SYSTEM - COUPLE LOVE EDITION', margin + 8, y + 10);

    // Subtitle
    doc.setTextColor(255, 241, 242); // rose-50
    doc.setFontSize(13);
    doc.text('OFFICIAL COUPLE ADMISSION E-TICKET (1 BOY + 1 GIRL)', margin + 8, y + 18);
  } else {
    doc.setTextColor(56, 189, 248); // sky-400
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EVENT SEAT BOOKING SYSTEM', margin + 8, y + 10);

    // Subtitle
    doc.setTextColor(248, 250, 252); // slate-50
    doc.setFontSize(14);
    doc.text('OFFICIAL ADMISSION E-TICKET', margin + 8, y + 18);
  }

  // Booking Reference Pill in Header (Top-Right)
  const refPillWidth = 56;
  const refPillHeight = 18;
  const refPillX = margin + contentWidth - refPillWidth - 8;
  const refPillY = y + 8;

  if (isCouple) {
    doc.setFillColor(76, 5, 25); // rose-950
    doc.setDrawColor(190, 18, 60); // rose-700
  } else {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.setDrawColor(51, 65, 85); // slate-700
  }
  doc.setLineWidth(0.3);
  doc.roundedRect(refPillX, refPillY, refPillWidth, refPillHeight, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setTextColor(isCouple ? 251 : 148, isCouple ? 113 : 163, isCouple ? 133 : 184);
  doc.text('BOOKING REFERENCE', refPillX + refPillWidth / 2, refPillY + 5, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(ref, refPillX + refPillWidth / 2, refPillY + 13, { align: 'center' });

  y += headerHeight + 8;

  // =========================================================================
  // EVENT TITLE & CATEGORY SECTION
  // =========================================================================
  // Category Pill
  if (isCouple) {
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(254, 205, 211); // rose-200
    doc.roundedRect(margin + 8, y, 48, 6, 1.5, 1.5, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.setFont('helvetica', 'bold');
    doc.text('COUPLE PASS • 40% OFF', margin + 32, y + 4.2, { align: 'center' });
  } else {
    doc.setFillColor(240, 249, 255); // sky-50
    doc.setDrawColor(186, 230, 253); // sky-200
    doc.roundedRect(margin + 8, y, 32, 6, 1.5, 1.5, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(3, 105, 161); // sky-700
    doc.setFont('helvetica', 'bold');
    doc.text(eventCategory.toUpperCase(), margin + 24, y + 4.2, { align: 'center' });
  }

  // Status Badge (Confirmed or Cancelled)
  const statusWidth = 28;
  const statusX = margin + contentWidth - statusWidth - 8;
  if (isCancelled) {
    doc.setFillColor(254, 242, 242); // rose-50
    doc.setDrawColor(254, 202, 202); // rose-200
    doc.roundedRect(statusX, y, statusWidth, 6, 1.5, 1.5, 'FD');
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text('CANCELLED', statusX + statusWidth / 2, y + 4.2, { align: 'center' });
  } else {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(statusX, y, statusWidth, 6, 1.5, 1.5, 'FD');
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('CONFIRMED', statusX + statusWidth / 2, y + 4.2, { align: 'center' });
  }

  y += 11;

  // Event Title (Wrap if too long)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  const titleLines = doc.splitTextToSize(eventTitle, contentWidth - 16);
  doc.text(titleLines, margin + 8, y);
  y += titleLines.length * 7 + 4;

  // =========================================================================
  // TWO-COLUMN EVENT & HOLDER DETAILS + QR CODE
  // =========================================================================
  const cardStartY = y;
  const leftColWidth = 108;
  const rightColWidth = contentWidth - leftColWidth - 12;

  // Details Container Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin + 6, cardStartY, leftColWidth, 62, 3, 3, 'FD');

  let detailY = cardStartY + 8;

  // Date & Time
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('EVENT SCHEDULE', margin + 11, detailY);
  detailY += 4.5;
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(eventDate, margin + 11, detailY);

  detailY += 8;

  // Venue
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('VENUE / LOCATION', margin + 11, detailY);
  detailY += 4.5;
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const venueLines = doc.splitTextToSize(eventVenue, leftColWidth - 10);
  doc.text(venueLines, margin + 11, detailY);

  detailY += venueLines.length * 4.5 + 4;

  // Ticket Holder Information
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TICKET HOLDER', margin + 11, detailY);
  detailY += 4.5;
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${customerName}${customerEmail ? ` (${customerEmail})` : ''}`, margin + 11, detailY);

  detailY += 7;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Booking Date: ${bookedDate}`, margin + 11, detailY);

  // Right Column: QR Code Box
  const qrBoxX = margin + leftColWidth + 10;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(qrBoxX, cardStartY, rightColWidth, 62, 3, 3, 'FD');

  if (qrDataUrl) {
    const qrSize = 40;
    const qrX = qrBoxX + (rightColWidth - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, cardStartY + 5, qrSize, qrSize);
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('SCAN AT ENTRY GATE', qrBoxX + rightColWidth / 2, cardStartY + 50, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Digital Admission Pass', qrBoxX + rightColWidth / 2, cardStartY + 54, { align: 'center' });

  y = cardStartY + 62 + 8;

  // =========================================================================
  // PERFORATED STUB DIVIDER LINE (Realistic Ticket Notch)
  // =========================================================================
  doc.setDrawColor(isCouple ? 251 : 203, isCouple ? 113 : 213, isCouple ? 133 : 225);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin + 6, y, margin + contentWidth - 6, y);
  doc.setLineDashPattern([], 0); // reset dash

  y += 7;

  // Romantic Couple Love Note Box for Couple Tickets
  if (isCouple) {
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(251, 113, 133); // rose-400
    doc.setLineWidth(0.4);
    doc.roundedRect(margin + 6, y, contentWidth - 12, 11.5, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(159, 18, 57); // rose-900
    doc.text('COUPLE LOVE NOTE: A Special Night Made For Two', margin + 11, y + 4.2);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(190, 18, 60); // rose-700
    doc.text(
      '"Two hearts, one rhythm, and an unforgettable evening under the lights. Celebrate your love tonight!"',
      margin + 11,
      y + 8.5
    );

    y += 14.5;
  }

  // =========================================================================
  // RESERVED SEATS & PRICING BREAKDOWN
  // =========================================================================
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('RESERVED SEATING & ADMISSION SUMMARY', margin + 8, y);
  y += 5;

  // Seats Container Box
  if (isCouple) {
    doc.setFillColor(255, 245, 245); // rose-50/50
    doc.setDrawColor(254, 205, 211); // rose-200
  } else {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(226, 232, 240);
  }
  doc.roundedRect(margin + 6, y, contentWidth - 12, 38, 3, 3, 'FD');

  const seatBoxY = y + 6;

  // Left side: Reserved Seats Pills
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('ASSIGNED SEAT(S):', margin + 12, seatBoxY);

  // Render Seat badges
  let seatBadgeX = margin + 12;
  const seatBadgeY = seatBoxY + 3;
  const seatBadgeHeight = 8;

  if (seats.length > 0) {
    seats.forEach((s) => {
      const seatText = `Seat ${s.seatNumber}`;
      const seatTextWidth = doc.getTextWidth(seatText) + 8;

      if (isCouple) {
        doc.setFillColor(225, 29, 72); // rose-600
      } else {
        doc.setFillColor(2, 132, 199); // sky-600
      }
      doc.roundedRect(seatBadgeX, seatBadgeY, seatTextWidth, seatBadgeHeight, 1.5, 1.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(seatText, seatBadgeX + seatTextWidth / 2, seatBadgeY + 5.5, { align: 'center' });

      seatBadgeX += seatTextWidth + 3;
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(seatNumbers, margin + 12, seatBadgeY + 6);
  }

  // Seat count notice
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Seats Reserved: ${seats.length || 1}`, margin + 12, seatBadgeY + 16);

  if (booking.isCoupleBooking) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text('Type: COUPLE PASS (Strictly 1 Boy + 1 Girl Required at Gate • 40% OFF)', margin + 12, seatBadgeY + 22);
  } else if (booking.isGroupBooking || (booking.discountAmount && booking.discountAmount > 0)) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`Type: Group Booking (${seats.length} Tickets • ${booking.discountPercentage || 10}% Discount)`, margin + 12, seatBadgeY + 22);
  }

  // Right side: Price & Payment Status
  const priceColX = margin + contentWidth - 65;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL AMOUNT PAID:', priceColX, seatBoxY);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isCancelled ? 148 : isCouple ? 225 : 5, isCancelled ? 163 : isCouple ? 29 : 150, isCancelled ? 184 : isCouple ? 72 : 105);
  doc.text(totalAmount, priceColX, seatBoxY + 8);

  if (booking.isCoupleBooking) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text(`Includes 40% Couple Special Offer`, priceColX, seatBoxY + 13.5);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Payment Mode: Online / Verified', priceColX, seatBoxY + 18.5);
  } else if (booking.discountAmount && booking.discountAmount > 0) {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`Includes -${formatPdfAmount(booking.discountAmount)} Group Discount`, priceColX, seatBoxY + 13.5);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Payment Mode: Online / Verified', priceColX, seatBoxY + 18.5);
  } else {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Payment Mode: Online / Verified', priceColX, seatBoxY + 14);
  }

  y += 44;

  // =========================================================================
  // IMPORTANT ADMISSION GUIDELINES
  // =========================================================================
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('IMPORTANT EVENT & ENTRY GUIDELINES', margin + 8, y);
  y += 4;

  const rules = [
    ...(booking.isCoupleBooking
      ? ['STRICT COUPLE ENTRY POLICY: This ticket is strictly for a couple (1 Boy & 1 Girl). Both partners must reach the gate together. If you arrive without a girl/female companion, NO ENTRY WILL BE GRANTED and no refund will be issued.']
      : []),
    'Please present this digital PDF or printed copy with the scannable QR Code at the entrance gate.',
    'Each e-ticket is strictly valid for the reserved seats listed above and entitles admission to one patron per seat.',
    'A valid government-issued photo identity proof matching the ticket holder name may be requested.',
    'Gates open 45 minutes prior to event start. Late arrivals may be subject to seating holds during performances.',
    'Outside food, beverages, and recording equipment are strictly prohibited inside the event venue.',
    'Refunds and cancellations are subject to the Event Seat Booking System Refund Policy terms.'
  ];

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600

  rules.forEach((rule, idx) => {
    doc.text(`${idx + 1}.`, margin + 8, y);
    const ruleLines = doc.splitTextToSize(rule, contentWidth - 20);
    doc.text(ruleLines, margin + 14, y);
    y += ruleLines.length * 3.8 + 1.2;
  });

  // =========================================================================
  // FOOTER BARCODE SIMULATION & SECURITY WATERMARK
  // =========================================================================
  const footerY = 270;

  // Horizontal separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin + 6, footerY, margin + contentWidth - 6, footerY);

  // Security hash
  const securityHash = `SEC-${ref}-${Math.abs(ref.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}-AUTH`;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Security Verification Hash: ${securityHash}`, margin + 8, footerY + 5);
  doc.text(
    'Event Seat Booking System • Verified Electronic Admission Voucher • Copyright 2026',
    margin + 8,
    footerY + 9
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 105, 161);
  doc.text(
    `Valid for Admission: ${ref}`,
    margin + contentWidth - 8,
    footerY + 7,
    { align: 'right' }
  );

  // Trigger browser download
  const filename = `Ticket-${ref.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
  return { success: true, filename };
};
