/**
 * Utility functions for image adjustments, signature thresholding, 
 * 4-dot perspective cropping, auto edge detection, and magic scanner enhancement.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface CornerPoints {
  tl: Point2D;
  tr: Point2D;
  br: Point2D;
  bl: Point2D;
}

export interface MagicEnhancerOptions {
  mode: 'magic_color' | 'photocopy_bw' | 'color_boost' | 'original';
  whitening?: number; // 0 to 100
  contrast?: number;  // 0 to 100
  sharpness?: number; // 0 to 100
  brightness?: number; // -50 to 50
  saturation?: number; // 0 to 100
}

export function adjustImageFilters(
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  brightness: number, // -100 to 100
  contrast: number,   // -100 to 100
  rotation: number = 0 // 0, 90, 180, 270
): string {
  const canvas = document.createElement('canvas');
  const isRotated = rotation === 90 || rotation === 270;
  canvas.width = isRotated ? sourceImg.height : sourceImg.width;
  canvas.height = isRotated ? sourceImg.width : sourceImg.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);

  // Apply CSS filters for brightness and contrast
  const b = 100 + brightness;
  const c = 100 + contrast;
  ctx.filter = `brightness(${b}%) contrast(${c}%)`;

  ctx.drawImage(
    sourceImg,
    -sourceImg.width / 2,
    -sourceImg.height / 2,
    sourceImg.width,
    sourceImg.height
  );
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * 4-Point Perspective Quadrilateral Warp
 * Maps arbitrary 4 corner dots (TL, TR, BR, BL) into a flat, rectangular CR80 card (1012x638 px, 300 DPI)
 * using true projective homography with bilinear anti-aliased pixel interpolation.
 */
export function warpPerspectiveQuad(
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  pointsPercent: CornerPoints,
  targetWidth: number = 1012,
  targetHeight: number = 638
): string {
  const srcW = sourceImg.width;
  const srcH = sourceImg.height;

  // Convert percentage points to source pixel coordinates
  const p0 = { x: (pointsPercent.tl.x / 100) * srcW, y: (pointsPercent.tl.y / 100) * srcH };
  const p1 = { x: (pointsPercent.tr.x / 100) * srcW, y: (pointsPercent.tr.y / 100) * srcH };
  const p2 = { x: (pointsPercent.br.x / 100) * srcW, y: (pointsPercent.br.y / 100) * srcH };
  const p3 = { x: (pointsPercent.bl.x / 100) * srcW, y: (pointsPercent.bl.y / 100) * srcH };

  // Create temporary source canvas to read image pixels
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return '';
  srcCtx.drawImage(sourceImg, 0, 0);
  const srcImageData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcData = srcImageData.data;

  // Destination canvas
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = targetWidth;
  dstCanvas.height = targetHeight;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) return '';
  const dstImageData = dstCtx.createImageData(targetWidth, targetHeight);
  const dstData = dstImageData.data;

  // Projective mapping coefficients calculation (unit square [0..1] -> quad [p0, p1, p2, p3])
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sy = p0.y - p1.y + p2.y - p3.y;

  const det = dx1 * dy2 - dy1 * dx2;
  const isAffine = Math.abs(sx) < 1e-4 && Math.abs(sy) < 1e-4;

  let a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;

  if (isAffine || Math.abs(det) < 1e-7) {
    // Affine mapping
    a = p1.x - p0.x;
    b = p3.x - p0.x;
    c = p0.x;
    d = p1.y - p0.y;
    e = p3.y - p0.y;
    f = p0.y;
    g = 0;
    h = 0;
  } else {
    // Projective mapping
    g = (sx * dy2 - sy * dx2) / det;
    h = (dx1 * sy - dy1 * sx) / det;
    a = p1.x - p0.x + g * p1.x;
    b = p3.x - p0.x + h * p3.x;
    c = p0.x;
    d = p1.y - p0.y + g * p1.y;
    e = p3.y - p0.y + h * p3.y;
    f = p0.y;
  }

  // Iterate over destination pixels and sample with bilinear interpolation
  for (let dy = 0; dy < targetHeight; dy++) {
    const v = dy / targetHeight;
    for (let dx = 0; dx < targetWidth; dx++) {
      const u = dx / targetWidth;

      let srcX: number;
      let srcY: number;

      if (isAffine) {
        // Bilinear quad mapping fallback
        srcX = (1 - u) * (1 - v) * p0.x + u * (1 - v) * p1.x + u * v * p2.x + (1 - u) * v * p3.x;
        srcY = (1 - u) * (1 - v) * p0.y + u * (1 - v) * p1.y + u * v * p2.y + (1 - u) * v * p3.y;
      } else {
        const denom = g * u + h * v + 1;
        srcX = (a * u + b * v + c) / denom;
        srcY = (d * u + e * v + f) / denom;
      }

      // Bilinear sampling
      if (srcX >= 0 && srcX < srcW - 1 && srcY >= 0 && srcY < srcH - 1) {
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const xFrac = srcX - x0;
        const yFrac = srcY - y0;

        const w00 = (1 - xFrac) * (1 - yFrac);
        const w10 = xFrac * (1 - yFrac);
        const w01 = (1 - xFrac) * yFrac;
        const w11 = xFrac * yFrac;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        const dstIdx = (dy * targetWidth + dx) * 4;

        dstData[dstIdx] = Math.round(
          srcData[idx00] * w00 + srcData[idx10] * w10 + srcData[idx01] * w01 + srcData[idx11] * w11
        );
        dstData[dstIdx + 1] = Math.round(
          srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11
        );
        dstData[dstIdx + 2] = Math.round(
          srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11
        );
        dstData[dstIdx + 3] = 255;
      } else if (srcX >= 0 && srcX < srcW && srcY >= 0 && srcY < srcH) {
        // Edge nearest neighbor clamp
        const nearestIdx = (Math.floor(srcY) * srcW + Math.floor(srcX)) * 4;
        const dstIdx = (dy * targetWidth + dx) * 4;
        dstData[dstIdx] = srcData[nearestIdx];
        dstData[dstIdx + 1] = srcData[nearestIdx + 1];
        dstData[dstIdx + 2] = srcData[nearestIdx + 2];
        dstData[dstIdx + 3] = 255;
      }
    }
  }

  dstCtx.putImageData(dstImageData, 0, 0);
  return dstCanvas.toDataURL('image/png');
}

/**
 * Intelligent Auto Edge Detection for ID Cards
 * Detects card boundaries from scanner background or mobile phone photos.
 */
export function autoDetectCardBounds(
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  cardType: string = 'aadhaar',
  activeSide: 'front' | 'back' = 'front'
): { cropBox: { x: number; y: number; w: number; h: number }; cornerPoints: CornerPoints } {
  // Special case: e-Aadhaar PDF standard UIDAI layout
  if (cardType === 'aadhaar') {
    if (activeSide === 'front') {
      const box = { x: 4.5, y: 68.2, w: 45.2, h: 45.2 / 1.586 };
      return {
        cropBox: box,
        cornerPoints: {
          tl: { x: box.x, y: box.y },
          tr: { x: box.x + box.w, y: box.y },
          br: { x: box.x + box.w, y: box.y + box.h },
          bl: { x: box.x, y: box.y + box.h },
        },
      };
    } else {
      const box = { x: 50.3, y: 68.2, w: 45.2, h: 45.2 / 1.586 };
      return {
        cropBox: box,
        cornerPoints: {
          tl: { x: box.x, y: box.y },
          tr: { x: box.x + box.w, y: box.y },
          br: { x: box.x + box.w, y: box.y + box.h },
          bl: { x: box.x, y: box.y + box.h },
        },
      };
    }
  }

  // Downsample to small analysis canvas
  const analysisW = 300;
  const analysisH = Math.round((sourceImg.height / sourceImg.width) * analysisW);
  const canvas = document.createElement('canvas');
  canvas.width = analysisW;
  canvas.height = analysisH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallbackBox = { x: 8, y: 15, w: 84, h: 84 / 1.586 };
    return {
      cropBox: fallbackBox,
      cornerPoints: {
        tl: { x: fallbackBox.x, y: fallbackBox.y },
        tr: { x: fallbackBox.x + fallbackBox.w, y: fallbackBox.y },
        br: { x: fallbackBox.x + fallbackBox.w, y: fallbackBox.y + fallbackBox.h },
        bl: { x: fallbackBox.x, y: fallbackBox.y + fallbackBox.h },
      },
    };
  }

  ctx.drawImage(sourceImg, 0, 0, analysisW, analysisH);
  const imgData = ctx.getImageData(0, 0, analysisW, analysisH);
  const d = imgData.data;

  // Compute average corner background color
  const sampleCornerLuma = (startX: number, startY: number) => {
    let sum = 0;
    let count = 0;
    for (let y = startY; y < startY + 10; y++) {
      for (let x = startX; x < startX + 10; x++) {
        if (x >= 0 && x < analysisW && y >= 0 && y < analysisH) {
          const idx = (y * analysisW + x) * 4;
          sum += 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
          count++;
        }
      }
    }
    return sum / (count || 1);
  };

  const cornerLuma = (
    sampleCornerLuma(0, 0) +
    sampleCornerLuma(analysisW - 10, 0) +
    sampleCornerLuma(0, analysisH - 10) +
    sampleCornerLuma(analysisW - 10, analysisH - 10)
  ) / 4;

  // Find bounding box where pixel luminance significantly deviates from background
  let minX = analysisW, maxX = 0, minY = analysisH, maxY = 0;
  const threshold = 32; // contrast delta from background

  for (let y = 5; y < analysisH - 5; y++) {
    for (let x = 5; x < analysisW - 5; x++) {
      const idx = (y * analysisW + x) * 4;
      const luma = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
      if (Math.abs(luma - cornerLuma) > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fallback if not detected cleanly
  if (maxX - minX < 40 || maxY - minY < 30) {
    minX = analysisW * 0.08;
    maxX = analysisW * 0.92;
    minY = analysisH * 0.15;
    maxY = analysisH * 0.85;
  }

  let boxWPercent = ((maxX - minX) / analysisW) * 100;
  let boxHPercent = boxWPercent / 1.586; // enforce CR80 1.586 aspect ratio
  let boxXPercent = (minX / analysisW) * 100;
  let boxYPercent = (minY / analysisH) * 100;

  // Clamp bounds
  boxWPercent = Math.min(boxWPercent, 94);
  boxHPercent = boxWPercent / 1.586;
  boxXPercent = Math.max(3, Math.min(boxXPercent, 97 - boxWPercent));
  boxYPercent = Math.max(3, Math.min(boxYPercent, 97 - boxHPercent));

  const detectedBox = {
    x: Math.round(boxXPercent * 10) / 10,
    y: Math.round(boxYPercent * 10) / 10,
    w: Math.round(boxWPercent * 10) / 10,
    h: Math.round(boxHPercent * 10) / 10,
  };

  return {
    cropBox: detectedBox,
    cornerPoints: {
      tl: { x: detectedBox.x, y: detectedBox.y },
      tr: { x: detectedBox.x + detectedBox.w, y: detectedBox.y },
      br: { x: detectedBox.x + detectedBox.w, y: detectedBox.y + detectedBox.h },
      bl: { x: detectedBox.x, y: detectedBox.y + detectedBox.h },
    },
  };
}

/**
 * Magic Scanner Enhancer
 * Cleans grayish paper background to pure white, sharpens fine Aadhaar/PAN text,
 * and boosts official colors for ultra-crisp PVC card printing.
 */
export function applyMagicEnhance(
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  options: MagicEnhancerOptions
): string {
  if (options.mode === 'original') {
    return adjustImageFilters(sourceImg, options.brightness || 0, options.contrast || 0, 0);
  }

  const canvas = document.createElement('canvas');
  canvas.width = sourceImg.width;
  canvas.height = sourceImg.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(sourceImg, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  const whitening = options.whitening ?? 50; // 0..100
  const contrastBoost = options.contrast ?? 35; // 0..100
  const saturationBoost = (options.saturation ?? 30) / 100; // 0..1

  // Whitening threshold (higher whitening = whiter background)
  const whiteThreshold = 255 - Math.round((whitening / 100) * 65); // ~190 to 255
  const blackStretch = 50 + Math.round((contrastBoost / 100) * 50); // ~50 to 100

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    if (options.mode === 'photocopy_bw') {
      // Photocopy monochrome thresholding
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      if (gray > whiteThreshold - 20) {
        r = 255;
        g = 255;
        b = 255;
      } else {
        // Deep crisp text ink
        const val = Math.max(0, Math.min(255, (gray / (whiteThreshold - 20)) * 255 * 0.4));
        r = val;
        g = val;
        b = val;
      }
    } else {
      // Magic Color & Color Boost modes
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const chroma = maxVal - minVal;

      // Detect background: high lightness and low chroma (grayish/yellowish paper noise)
      if (luma >= whiteThreshold && chroma < 40) {
        // Pull smoothly to pure white
        const blend = Math.min(1, (luma - whiteThreshold) / (255 - whiteThreshold) + (whitening / 120));
        r = Math.round(r + (255 - r) * blend);
        g = Math.round(g + (255 - g) * blend);
        b = Math.round(b + (255 - b) * blend);
      } else {
        // Contrast curve on text and colored regions
        if (luma < blackStretch) {
          // Darken dark text
          const factor = Math.max(0.4, luma / blackStretch);
          r = Math.round(r * factor);
          g = Math.round(g * factor);
          b = Math.round(b * factor);
        }

        // Saturation boost on colored seals, photo, and Ashoka emblem
        if (chroma > 18) {
          const gray = luma;
          r = Math.max(0, Math.min(255, Math.round(gray + (r - gray) * (1 + saturationBoost))));
          g = Math.max(0, Math.min(255, Math.round(gray + (g - gray) * (1 + saturationBoost))));
          b = Math.max(0, Math.min(255, Math.round(gray + (b - gray) * (1 + saturationBoost))));
        }
      }
    }

    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);

  // Unsharp mask / Sharpening filter for crisp text & QR code clarity
  const sharpness = options.sharpness ?? 40;
  if (sharpness > 0) {
    const sharpCanvas = document.createElement('canvas');
    sharpCanvas.width = canvas.width;
    sharpCanvas.height = canvas.height;
    const sharpCtx = sharpCanvas.getContext('2d');
    if (sharpCtx) {
      sharpCtx.drawImage(canvas, 0, 0);
      const origData = sharpCtx.getImageData(0, 0, sharpCanvas.width, sharpCanvas.height);
      const od = origData.data;
      const nd = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const out = nd.data;
      const w = canvas.width;
      const h = canvas.height;
      const amount = (sharpness / 100) * 0.65;

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = od[idx + c];
            const neighbors = (
              od[((y - 1) * w + x) * 4 + c] +
              od[((y + 1) * w + x) * 4 + c] +
              od[(y * w + x - 1) * 4 + c] +
              od[(y * w + x + 1) * 4 + c]
            ) * 0.25;
            const diff = center - neighbors;
            out[idx + c] = Math.max(0, Math.min(255, Math.round(center + diff * amount)));
          }
        }
      }
      ctx.putImageData(nd, 0, 0);
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Clean & threshold signature: convert paper background to pure white
 * and ink to crisp black for NSDL / UTI PAN portal compliance (under 20KB, 400x200 or 2cm x 4.5cm)
 */
export function cleanSignatureBw(
  sourceImg: HTMLImageElement | HTMLCanvasElement,
  threshold: number = 160 // 0 to 255
): string {
  const canvas = document.createElement('canvas');
  canvas.width = sourceImg.width;
  canvas.height = sourceImg.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(sourceImg, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    // Luminance grayscale
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (gray > threshold) {
      // Background -> pure white
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
    } else {
      // Ink -> solid dark
      d[i] = 15;
      d[i + 1] = 23;
      d[i + 2] = 42;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Prepare passport photo with optional background replacement and Name/Date footer
 */
export function renderPassportPhoto(
  img: HTMLImageElement,
  bgColor: string,
  addNameDate: boolean,
  fullName: string,
  photoDate: string
): string {
  // 35mm x 45mm at ~300 DPI is approx 413 x 531 pixels
  const width = 413;
  const height = 531;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  if (bgColor && bgColor !== 'original') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }

  // Draw image centered & fitted
  const aspect = img.width / img.height;
  const targetAspect = width / height;

  let drawW = width;
  let drawH = height;
  let offsetX = 0;
  let offsetY = 0;

  if (aspect > targetAspect) {
    drawH = height;
    drawW = height * aspect;
    offsetX = -(drawW - width) / 2;
  } else {
    drawW = width;
    drawH = width / aspect;
    offsetY = -(drawH - height) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

  // Footer for Name and Date (SSC / Railway / Army requirement)
  if (addNameDate && (fullName || photoDate)) {
    const stripH = 75;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(0, height - stripH, width, stripH);

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - stripH);
    ctx.lineTo(width, height - stripH);
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';

    if (fullName && photoDate) {
      ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(fullName.toUpperCase(), width / 2, height - stripH + 30);
      ctx.font = '600 18px "JetBrains Mono", monospace';
      ctx.fillStyle = '#334155';
      ctx.fillText(`DOP: ${photoDate}`, width / 2, height - stripH + 58);
    } else {
      ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText((fullName || `DOP: ${photoDate}`).toUpperCase(), width / 2, height - stripH + 45);
    }
  }

  return canvas.toDataURL('image/png');
}
