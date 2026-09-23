import jsPDF from 'jspdf';
import { CardRecord, PassportPhotoConfig, BankPassbookConfig } from '../types';

/**
 * Standard CR80 PVC Card Dimensions:
 * 85.60 mm width x 53.98 mm height
 */
export const CARD_WIDTH_MM = 85.6;
export const CARD_HEIGHT_MM = 53.98;

/**
 * Generate A4 5-Card PVC Sheet PDF (10 sides: Fronts & Backs)
 * CSC standard format: 5 cards aligned with cut marks and 1px borders
 */
export function generateA4SheetPdf(cards: CardRecord[]): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = (pageWidth - (CARD_WIDTH_MM * 2 + 10)) / 2; // ~14.4mm
  const startY = 15;
  const gapY = 3.5;
  const gapX = 10;

  // Header banner info
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('SK PRINT PORTAL - 5-CARD PVC SHEET LAYOUT (PRINT AT 100% SCALE - DO NOT FIT TO PAGE)', 14, 8);

  const maxCards = Math.min(cards.length, 5);

  for (let i = 0; i < maxCards; i++) {
    const card = cards[i];
    const yPos = startY + i * (CARD_HEIGHT_MM + gapY);

    // Front Side (Left Column)
    if (card.frontImage) {
      doc.addImage(
        card.frontImage,
        'PNG',
        marginX,
        yPos,
        CARD_WIDTH_MM,
        CARD_HEIGHT_MM,
        undefined,
        'FAST'
      );

      // Card Border & Cut Marks
      if (card.borderWidth > 0) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(card.borderWidth * 0.2);
        doc.roundedRect(marginX, yPos, CARD_WIDTH_MM, CARD_HEIGHT_MM, 2, 2, 'S');
      }

      if (card.includeCutMarks) {
        drawCutMarks(doc, marginX, yPos, CARD_WIDTH_MM, CARD_HEIGHT_MM);
      }
    }

    // Back Side (Right Column)
    if (card.backImage) {
      const backX = marginX + CARD_WIDTH_MM + gapX;
      doc.addImage(
        card.backImage,
        'PNG',
        backX,
        yPos,
        CARD_WIDTH_MM,
        CARD_HEIGHT_MM,
        undefined,
        'FAST'
      );

      if (card.borderWidth > 0) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(card.borderWidth * 0.2);
        doc.roundedRect(backX, yPos, CARD_WIDTH_MM, CARD_HEIGHT_MM, 2, 2, 'S');
      }

      if (card.includeCutMarks) {
        drawCutMarks(doc, backX, yPos, CARD_WIDTH_MM, CARD_HEIGHT_MM);
      }
    }

    // Card Index label in margin
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`#${i + 1} ${card.holderName || card.cardType.toUpperCase()}`, 4, yPos + 10, { angle: 90 });
  }

  // Footer guide
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Cut along the thin guidelines. 100% Free Service provided by SK Print Portal.', 14, pageHeight - 6);

  return doc;
}

/**
 * Generate Epson / Canon PVC Tray PDF (Tray J / Tray G)
 * Exactly 2 PVC cards side by side positioned for printer tray alignment
 */
export function generatePvcTrayPdf(card: CardRecord): jsPDF {
  // Standard Tray dimensions: 130mm x 220mm (or A4 with tray offset)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Tray centers for Epson L805/L850/L8050
  // Card 1: Top slot, Card 2: Bottom slot
  const slotX = (210 - CARD_WIDTH_MM) / 2;
  const slot1Y = 32;
  const slot2Y = slot1Y + CARD_HEIGHT_MM + 20;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('SK PRINT PORTAL - PVC TRAY TEMPLATE (EPSON / CANON L805/L850/L8050)', 14, 12);

  if (card.frontImage) {
    doc.addImage(card.frontImage, 'PNG', slotX, slot1Y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(slotX, slot1Y, CARD_WIDTH_MM, CARD_HEIGHT_MM, 2.5, 2.5, 'S');
  }

  if (card.backImage) {
    doc.addImage(card.backImage, 'PNG', slotX, slot2Y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(slotX, slot2Y, CARD_WIDTH_MM, CARD_HEIGHT_MM, 2.5, 2.5, 'S');
  }

  return doc;
}

/**
 * Generate 4x6 Photo Sheet PDF (2 cards or 1 front+back)
 */
export function generate4x6CardPdf(card: CardRecord): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [101.6, 152.4], // 4 x 6 inches in mm
  });

  const startX = (101.6 - CARD_WIDTH_MM) / 2; // ~8mm
  const startY = 12;
  const gapY = 8;

  if (card.frontImage) {
    doc.addImage(card.frontImage, 'PNG', startX, startY, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    doc.setDrawColor(180, 180, 180);
    doc.roundedRect(startX, startY, CARD_WIDTH_MM, CARD_HEIGHT_MM, 2, 2, 'S');
    drawCutMarks(doc, startX, startY, CARD_WIDTH_MM, CARD_HEIGHT_MM);
  }

  if (card.backImage) {
    const y2 = startY + CARD_HEIGHT_MM + gapY;
    doc.addImage(card.backImage, 'PNG', startX, y2, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    doc.setDrawColor(180, 180, 180);
    doc.roundedRect(startX, y2, CARD_WIDTH_MM, CARD_HEIGHT_MM, 2, 2, 'S');
    drawCutMarks(doc, startX, y2, CARD_WIDTH_MM, CARD_HEIGHT_MM);
  }

  return doc;
}

/**
 * Generate Passport Photo Sheet PDF
 */
export function generatePassportPhotoPdf(config: PassportPhotoConfig, preparedPhotoDataUrl: string): jsPDF {
  const is4x6 = config.paperSize === '4x6';
  const doc = new jsPDF({
    orientation: is4x6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: is4x6 ? [101.6, 152.4] : 'a4',
  });

  const photoWidthMm = 35;
  const photoHeightMm = 45;
  const gapMm = 3;

  if (is4x6) {
    // 4x6 landscape is 152.4mm wide x 101.6mm high
    // Fits 4 columns x 2 rows = 8 photos (or 6 photos)
    const cols = 4;
    const rows = 2;
    const startX = (152.4 - (cols * photoWidthMm + (cols - 1) * gapMm)) / 2;
    const startY = (101.6 - (rows * photoHeightMm + (rows - 1) * gapMm)) / 2;

    let printed = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (printed >= config.copiesCount) break;
        const x = startX + c * (photoWidthMm + gapMm);
        const y = startY + r * (photoHeightMm + gapMm);

        doc.addImage(preparedPhotoDataUrl, 'PNG', x, y, photoWidthMm, photoHeightMm);
        if (config.borderWidth > 0) {
          doc.setDrawColor(160, 160, 160);
          doc.setLineWidth(0.2);
          doc.rect(x, y, photoWidthMm, photoHeightMm, 'S');
        }
        printed++;
      }
    }
  } else {
    // A4 sheet: 210mm x 297mm
    // Fits 5 columns x 6 rows = up to 30/32 photos
    const cols = 5;
    const rows = 6;
    const startX = (210 - (cols * photoWidthMm + (cols - 1) * gapMm)) / 2;
    const startY = 15;

    let printed = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (printed >= config.copiesCount) break;
        const x = startX + c * (photoWidthMm + gapMm);
        const y = startY + r * (photoHeightMm + gapMm);

        doc.addImage(preparedPhotoDataUrl, 'PNG', x, y, photoWidthMm, photoHeightMm);
        if (config.borderWidth > 0) {
          doc.setDrawColor(160, 160, 160);
          doc.setLineWidth(0.2);
          doc.rect(x, y, photoWidthMm, photoHeightMm, 'S');
        }
        printed++;
      }
    }
  }

  return doc;
}

/**
 * Generate Bank Passbook Print PDF
 */
export function generatePassbookPdf(config: BankPassbookConfig, passbookCanvasDataUrl: string): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Standard bank passbook size open: ~180mm x 120mm
  const pbWidth = 200;
  const pbHeight = 135;
  const startX = (297 - pbWidth) / 2;
  const startY = (210 - pbHeight) / 2;

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`SK PRINT PORTAL - ${config.bankName} PASSBOOK INNER PAGE (100% SCALE PRINT)`, 14, 12);

  doc.addImage(passbookCanvasDataUrl, 'PNG', startX, startY, pbWidth, pbHeight);
  doc.setDrawColor(180, 180, 180);
  doc.rect(startX, startY, pbWidth, pbHeight, 'S');

  return doc;
}

/**
 * Draw 4 corner cut marks around card
 */
function drawCutMarks(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const markLen = 2.5;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.15);

  // Top Left
  doc.line(x - markLen, y, x, y);
  doc.line(x, y - markLen, x, y);

  // Top Right
  doc.line(x + w, y, x + w + markLen, y);
  doc.line(x + w, y - markLen, x + w, y);

  // Bottom Left
  doc.line(x - markLen, y + h, x, y + h);
  doc.line(x, y + h, x, y + h + markLen);

  // Bottom Right
  doc.line(x + w, y + h, x + w + markLen, y + h);
  doc.line(x + w, y + h, x + w, y + h + markLen);
}
