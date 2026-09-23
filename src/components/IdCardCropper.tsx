import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Upload, 
  RotateCw, 
  Sliders, 
  Download, 
  Printer, 
  PlusCircle, 
  Check, 
  Layers, 
  Sparkles, 
  AlertCircle,
  FileCheck,
  Wand2,
  Crosshair,
  Crop,
  RefreshCw,
  Sun,
  SlidersHorizontal,
  Zap,
  Maximize2,
  Lock,
  Unlock,
  FileText
} from 'lucide-react';
import { CardRecord, CardType } from '../types';
import { loadDocumentPages, LoadedDocumentPage } from '../utils/fileLoader';
import { 
  adjustImageFilters,
  warpPerspectiveQuad,
  autoDetectCardBounds,
  applyMagicEnhance,
  CornerPoints,
  MagicEnhancerOptions
} from '../utils/imageFilters';
import jsPDF from 'jspdf';
import { CARD_WIDTH_MM, CARD_HEIGHT_MM } from '../utils/pdfEngine';

// Strict CR80 ISO/IEC 7810 ID-1 standard dimensions: 85.60 mm × 53.98 mm (~1.58577 aspect ratio)
const CR80_ASPECT_RATIO = 85.6 / 53.98; // 1.5857725

interface IdCardCropperProps {
  onAddCardToSheet: (card: CardRecord) => void;
  savedCardsCount: number;
  onGoToSheet: () => void;
}

export const IdCardCropper: React.FC<IdCardCropperProps> = ({
  onAddCardToSheet,
  savedCardsCount,
  onGoToSheet,
}) => {
  const [selectedCardType, setSelectedCardType] = useState<CardType>('aadhaar');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  
  // Document state - clean initial state (no demo sample)
  const [documentPages, setDocumentPages] = useState<LoadedDocumentPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [docLoading, setDocLoading] = useState<boolean>(false);
  const [pdfPassword, setPdfPassword] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Card Metadata
  const [holderName, setHolderName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [includeCutMarks, setIncludeCutMarks] = useState<boolean>(true);

  // Resulting cropped sides
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Crop Mode: 'box' (Standard CR80 Rectangle) | 'dot' (4-Dot Selected Perspective Crop)
  const [cropMode, setCropMode] = useState<'box' | 'dot'>('box');

  // Fixed CR80 size lock state
  const [isFixedSizeLocked, setIsFixedSizeLocked] = useState<boolean>(true);

  // Dot selected 4 corner points in percentage [0..100]
  const [cornerPoints, setCornerPoints] = useState<CornerPoints>({
    tl: { x: 8, y: 15 },
    tr: { x: 92, y: 15 },
    br: { x: 92, y: 15 + 84 / CR80_ASPECT_RATIO },
    bl: { x: 8, y: 15 + 84 / CR80_ASPECT_RATIO },
  });
  const [activeDot, setActiveDot] = useState<'tl' | 'tr' | 'br' | 'bl' | null>(null);
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number } | null>(null);

  // Magic Scanner Enhancer State
  const [magicEnhanceActive, setMagicEnhanceActive] = useState<boolean>(true);
  const [magicMode, setMagicMode] = useState<'magic_color' | 'photocopy_bw' | 'color_boost' | 'original'>('magic_color');
  const [whitening, setWhitening] = useState<number>(55);
  const [contrastBoost, setContrastBoost] = useState<number>(35);
  const [sharpness, setSharpness] = useState<number>(45);
  const [showEnhanceSliders, setShowEnhanceSliders] = useState<boolean>(false);

  // Image adjust state
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);

  // Canvas & interactive cropper
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Crop coordinates in percentage of image [0..100] strictly adhering to CR80 aspect ratio
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 8,
    y: 15,
    w: 84,
    h: 84 / CR80_ASPECT_RATIO, // Fixed CR80 aspect ratio 1.58577
  });

  const isDraggingRef = useRef<boolean>(false);
  const resizeCornerRef = useRef<'nw' | 'ne' | 'se' | 'sw' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startCropBoxRef = useRef(cropBox);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch card type without loading fake demo samples
  const handleSelectCardType = (type: CardType) => {
    setSelectedCardType(type);
    if (type === 'aadhaar') {
      const box = { x: 4.5, y: 68.2, w: 45.2, h: 45.2 / CR80_ASPECT_RATIO };
      setCropBox(box);
      setCornerPoints({
        tl: { x: box.x, y: box.y },
        tr: { x: box.x + box.w, y: box.y },
        br: { x: box.x + box.w, y: box.y + box.h },
        bl: { x: box.x, y: box.y + box.h },
      });
      showToast('Set to Aadhaar preset (UIDAI slip format)');
    } else {
      const box = { x: 8, y: 15, w: 84, h: 84 / CR80_ASPECT_RATIO };
      setCropBox(box);
      setCornerPoints({
        tl: { x: box.x, y: box.y },
        tr: { x: box.x + box.w, y: box.y },
        br: { x: box.x + box.w, y: box.y + box.h },
        bl: { x: box.x, y: box.y + box.h },
      });
      showToast(`Set to ${type.toUpperCase()} standard CR80 format`);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File, pwd?: string) => {
    setDocLoading(true);
    setErrorMessage(null);

    const result = await loadDocumentPages(file, pwd);
    setDocLoading(false);

    if (result.error === 'PASSWORD_REQUIRED') {
      setPendingFile(file);
      setShowPasswordModal(true);
      return;
    }

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    if (result.pages.length > 0) {
      setDocumentPages(result.pages);
      setCurrentPageIndex(0);
      setShowPasswordModal(false);
      setPendingFile(null);
      
      // Auto-set crop coordinates based on card type standard layout
      if (selectedCardType === 'aadhaar') {
        // e-Aadhaar typically has front and back at the bottom of page 1
        const box = { x: 4.5, y: 68.2, w: 45.2, h: 45.2 / 1.586 };
        setCropBox(box);
        setCornerPoints({
          tl: { x: box.x, y: box.y },
          tr: { x: box.x + box.w, y: box.y },
          br: { x: box.x + box.w, y: box.y + box.h },
          bl: { x: box.x, y: box.y + box.h },
        });
      } else {
        const box = { x: 8, y: 15, w: 84, h: 84 / 1.586 };
        setCropBox(box);
        setCornerPoints({
          tl: { x: box.x, y: box.y },
          tr: { x: box.x + box.w, y: box.y },
          br: { x: box.x + box.w, y: box.y + box.h },
          bl: { x: box.x, y: box.y + box.h },
        });
      }
      showToast(`Document loaded (${result.pages.length} pages). Crop your card.`);
    }
  };

  const handlePasswordSubmit = () => {
    if (pendingFile && pdfPassword) {
      handleFileUpload(pendingFile, pdfPassword);
    }
  };

  // Perform crop from current canvas
  const performCrop = useCallback(() => {
    if (documentPages.length === 0) return;
    const page = documentPages[currentPageIndex];
    if (!page) return;

    const img = new Image();
    img.src = page.dataUrl;
    img.onload = () => {
      // Apply rotation, brightness, contrast
      const filteredUrl = adjustImageFilters(img, brightness, contrast, rotation);
      const filteredImg = new Image();
      filteredImg.src = filteredUrl;
      filteredImg.onload = () => {
        let resultUrl = '';

        if (cropMode === 'dot') {
          // 4-Dot Selected Perspective Homography Warp!
          resultUrl = warpPerspectiveQuad(filteredImg, cornerPoints, 1012, 638);
        } else {
          // Standard CR80 Box Crop
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = 1012;
          cropCanvas.height = 638;
          const ctx = cropCanvas.getContext('2d');
          if (!ctx) return;

          const srcX = (cropBox.x / 100) * filteredImg.width;
          const srcY = (cropBox.y / 100) * filteredImg.height;
          const srcW = (cropBox.w / 100) * filteredImg.width;
          const srcH = (cropBox.h / 100) * filteredImg.height;

          ctx.drawImage(filteredImg, srcX, srcY, srcW, srcH, 0, 0, 1012, 638);
          resultUrl = cropCanvas.toDataURL('image/png');
        }

        const finalizeCrop = (finalUrl: string) => {
          if (activeSide === 'front') {
            setFrontImage(finalUrl);
            showToast('Front Side Cropped! Now crop Back Side.');
            setActiveSide('back');
            // Advance to back side coordinates if e-Aadhaar
            if (selectedCardType === 'aadhaar' && cropBox.x < 50) {
              const nextBox = { x: 50.3, y: 68.2, w: 45.2, h: 45.2 / 1.586 };
              setCropBox(nextBox);
              setCornerPoints({
                tl: { x: nextBox.x, y: nextBox.y },
                tr: { x: nextBox.x + nextBox.w, y: nextBox.y },
                br: { x: nextBox.x + nextBox.w, y: nextBox.y + nextBox.h },
                bl: { x: nextBox.x, y: nextBox.y + nextBox.h },
              });
            }
          } else {
            setBackImage(finalUrl);
            showToast('Back Side Cropped! Card is ready for print.');
          }
        };

        // Apply Magic Scanner Enhancer if active
        if (magicEnhanceActive && magicMode !== 'original') {
          const resImg = new Image();
          resImg.src = resultUrl;
          resImg.onload = () => {
            const enhancedUrl = applyMagicEnhance(resImg, {
              mode: magicMode,
              whitening,
              contrast: contrastBoost,
              sharpness,
            });
            finalizeCrop(enhancedUrl);
          };
        } else {
          finalizeCrop(resultUrl);
        }
      };
    };
  }, [
    documentPages,
    currentPageIndex,
    brightness,
    contrast,
    rotation,
    cropBox,
    cornerPoints,
    cropMode,
    magicEnhanceActive,
    magicMode,
    whitening,
    contrastBoost,
    sharpness,
    activeSide,
    selectedCardType,
  ]);

  // 1-Click Auto Crop (Detect Card Boundaries)
  const handleAutoCrop = () => {
    if (documentPages.length === 0) return;
    const page = documentPages[currentPageIndex];
    if (!page) return;

    const img = new Image();
    img.src = page.dataUrl;
    img.onload = () => {
      const { cropBox: detectedBox, cornerPoints: detectedPoints } = autoDetectCardBounds(
        img,
        selectedCardType,
        activeSide
      );
      setCropBox(detectedBox);
      setCornerPoints(detectedPoints);
      showToast(`⚡ Auto-detected ${activeSide.toUpperCase()} card boundaries!`);
    };
  };

  // 1-Click Auto Crop Both Sides (Aadhaar / Dual-card layout)
  const handleAutoCropBothSides = () => {
    if (documentPages.length === 0) return;
    const page = documentPages[currentPageIndex];
    if (!page) return;

    const img = new Image();
    img.src = page.dataUrl;
    img.onload = () => {
      const filteredUrl = adjustImageFilters(img, brightness, contrast, rotation);
      const filteredImg = new Image();
      filteredImg.src = filteredUrl;
      filteredImg.onload = () => {
        // Front Side
        const frontBounds = autoDetectCardBounds(filteredImg, 'aadhaar', 'front');
        const fCanvas = document.createElement('canvas');
        fCanvas.width = 1012;
        fCanvas.height = 638;
        const fCtx = fCanvas.getContext('2d');
        if (fCtx) {
          fCtx.drawImage(
            filteredImg,
            (frontBounds.cropBox.x / 100) * filteredImg.width,
            (frontBounds.cropBox.y / 100) * filteredImg.height,
            (frontBounds.cropBox.w / 100) * filteredImg.width,
            (frontBounds.cropBox.h / 100) * filteredImg.height,
            0,
            0,
            1012,
            638
          );
          let fUrl = fCanvas.toDataURL('image/png');
          if (magicEnhanceActive && magicMode !== 'original') {
            fUrl = applyMagicEnhance(fCanvas, {
              mode: magicMode,
              whitening,
              contrast: contrastBoost,
              sharpness,
            });
          }
          setFrontImage(fUrl);
        }

        // Back Side
        const backBounds = autoDetectCardBounds(filteredImg, 'aadhaar', 'back');
        const bCanvas = document.createElement('canvas');
        bCanvas.width = 1012;
        bCanvas.height = 638;
        const bCtx = bCanvas.getContext('2d');
        if (bCtx) {
          bCtx.drawImage(
            filteredImg,
            (backBounds.cropBox.x / 100) * filteredImg.width,
            (backBounds.cropBox.y / 100) * filteredImg.height,
            (backBounds.cropBox.w / 100) * filteredImg.width,
            (backBounds.cropBox.h / 100) * filteredImg.height,
            0,
            0,
            1012,
            638
          );
          let bUrl = bCanvas.toDataURL('image/png');
          if (magicEnhanceActive && magicMode !== 'original') {
            bUrl = applyMagicEnhance(bCanvas, {
              mode: magicMode,
              whitening,
              contrast: contrastBoost,
              sharpness,
            });
          }
          setBackImage(bUrl);
        }

        showToast('🚀 1-Click Auto Cropped Both Front & Back with Magic Enhancer!');
      };
    };
  };

  // Re-apply Magic Scanner Enhancer to already cropped card side
  const handleReapplyMagic = (side: 'front' | 'back') => {
    const currentUrl = side === 'front' ? frontImage : backImage;
    if (!currentUrl) return;

    const img = new Image();
    img.src = currentUrl;
    img.onload = () => {
      const enhanced = applyMagicEnhance(img, {
        mode: magicMode,
        whitening,
        contrast: contrastBoost,
        sharpness,
      });
      if (side === 'front') {
        setFrontImage(enhanced);
      } else {
        setBackImage(enhanced);
      }
      showToast(`✨ Magic Enhancer applied to ${side.toUpperCase()} card!`);
    };
  };

  // Quick auto crop presets strictly matching standard CR80 aspect ratio
  const applyPresetCrop = (preset: 'aadhaar_front' | 'aadhaar_back' | 'pan_front' | 'full') => {
    let box = { x: 8, y: 15, w: 84, h: 84 / CR80_ASPECT_RATIO };
    if (preset === 'aadhaar_front') {
      box = { x: 4.5, y: 68.2, w: 45.2, h: 45.2 / CR80_ASPECT_RATIO };
      setActiveSide('front');
    } else if (preset === 'aadhaar_back') {
      box = { x: 50.3, y: 68.2, w: 45.2, h: 45.2 / CR80_ASPECT_RATIO };
      setActiveSide('back');
    } else if (preset === 'pan_front') {
      box = { x: 8, y: 18, w: 84, h: 84 / CR80_ASPECT_RATIO };
      setActiveSide('front');
    } else {
      box = { x: 5, y: 5, w: 90, h: 90 / CR80_ASPECT_RATIO };
    }
    setCropBox(box);
    setCornerPoints({
      tl: { x: box.x, y: box.y },
      tr: { x: box.x + box.w, y: box.y },
      br: { x: box.x + box.w, y: box.y + box.h },
      bl: { x: box.x, y: box.y + box.h },
    });
  };

  // Reset 4 corner dots to rectangular CR80
  const handleResetDots = () => {
    const box = cropBox;
    setCornerPoints({
      tl: { x: box.x, y: box.y },
      tr: { x: box.x + box.w, y: box.y },
      br: { x: box.x + box.w, y: box.y + box.h },
      bl: { x: box.x, y: box.y + box.h },
    });
    showToast('Reset 4 corner dots to standard card alignment');
  };

  // Switch between Box and 4-Dot modes
  const handleToggleCropMode = (mode: 'box' | 'dot') => {
    setCropMode(mode);
    if (mode === 'dot') {
      // Sync 4 dots from current cropBox
      setCornerPoints({
        tl: { x: cropBox.x, y: cropBox.y },
        tr: { x: cropBox.x + cropBox.w, y: cropBox.y },
        br: { x: cropBox.x + cropBox.w, y: cropBox.y + cropBox.h },
        bl: { x: cropBox.x, y: boxHeightY(cropBox) },
      });
      showToast('Switched to 4-Dot Perspective Cropping! Drag any corner.');
    } else {
      showToast('Switched to Standard CR80 Box Mode');
    }
  };

  const boxHeightY = (b: { y: number; h: number }) => b.y + b.h;

  // Add current card to multi-sheet queue
  const handleSaveToSheet = () => {
    if (!frontImage && !backImage) {
      setErrorMessage('Please crop at least the Front side of the card first.');
      return;
    }

    const newCard: CardRecord = {
      id: 'card_' + Date.now(),
      cardType: selectedCardType,
      holderName: holderName.trim() || 'Citizen Card',
      cardNumber: cardNumber.trim() || 'PVC-ID',
      frontImage,
      backImage,
      borderWidth,
      borderColor: '#94a3b8',
      includeCutMarks,
      createdAt: Date.now(),
    };

    onAddCardToSheet(newCard);
    showToast(`Added "${newCard.holderName}" to A4 Multi-Card Sheet!`);
  };

  // Download standalone single PVC Card PDF
  const handleDownloadSinglePdf = () => {
    if (!frontImage && !backImage) {
      setErrorMessage('No card images to export.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const startX = (210 - CARD_WIDTH_MM) / 2;
    const startY = 30;

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`SK PRINT PORTAL - ${holderName} (${selectedCardType.toUpperCase()})`, startX, startY - 8);

    if (frontImage) {
      doc.addImage(frontImage, 'PNG', startX, startY, CARD_WIDTH_MM, CARD_HEIGHT_MM);
      if (borderWidth > 0) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(borderWidth * 0.2);
        doc.roundedRect(startX, startY, CARD_WIDTH_MM, CARD_HEIGHT_MM, 2, 2, 'S');
      }
    }

    if (backImage) {
      const y2 = startY + CARD_HEIGHT_MM + 10;
      doc.addImage(backImage, 'PNG', startX, y2, CARD_WIDTH_MM, CARD_HEIGHT_MM);
      if (borderWidth > 0) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(borderWidth * 0.2);
        doc.roundedRect(startX, y2, CARD_WIDTH_MM, CARD_HEIGHT_MM, 2, 2, 'S');
      }
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Print at 100% scale (No scaling). Standard CR80 PVC dimensions (85.6mm x 54mm).', startX, startY + (CARD_HEIGHT_MM * 2) + 22);

    doc.save(`${holderName.replace(/\s+/g, '_')}_PVC_Card.pdf`);
    showToast('Downloaded High-Res PVC Card PDF!');
  };

  // Download Front & Back PNGs
  const handleDownloadPng = (side: 'front' | 'back') => {
    const target = side === 'front' ? frontImage : backImage;
    if (!target) return;
    const a = document.createElement('a');
    a.href = target;
    a.download = `${holderName.replace(/\s+/g, '_')}_${side}.png`;
    a.click();
    showToast(`Downloaded ${side} PNG!`);
  };

  // Interactive Drag & Resize handlers for the Crop Box and 4 Corner Dots
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (cropMode === 'dot') return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    startCropBoxRef.current = { ...cropBox };
  };

  const handleMouseDownDot = (
    dotKey: 'tl' | 'tr' | 'br' | 'bl',
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    setActiveDot(dotKey);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : (e as React.TouchEvent).touches[0].clientY;
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      setMagnifierPos({ x, y });
    }
  };

  const handleMouseDownResize = (
    corner: 'nw' | 'ne' | 'se' | 'sw',
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    resizeCornerRef.current = corner;
    const clientX = 'clientX' in e ? e.clientX : (e as React.TouchEvent).touches[0].clientX;
    const clientY = 'clientY' in e ? e.clientY : (e as React.TouchEvent).touches[0].clientY;
    dragStartRef.current = { x: clientX, y: clientY };
    startCropBoxRef.current = { ...cropBox };
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'clientX' in e ? (e as React.MouseEvent).clientX : (e as React.TouchEvent).touches[0]?.clientX;
    const clientY = 'clientY' in e ? (e as React.MouseEvent).clientY : (e as React.TouchEvent).touches[0]?.clientY;

    if (clientX === undefined || clientY === undefined) return;

    // 1. If dragging a 4-dot perspective corner
    if (activeDot) {
      const xPercent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

      setCornerPoints((prev) => ({
        ...prev,
        [activeDot]: {
          x: Math.round(xPercent * 10) / 10,
          y: Math.round(yPercent * 10) / 10,
        },
      }));
      setMagnifierPos({ x: xPercent, y: yPercent });
      return;
    }

    // 2. If resizing crop box with strict fixed CR80 aspect ratio
    if (resizeCornerRef.current) {
      const deltaXPercent = ((clientX - dragStartRef.current.x) / rect.width) * 100;
      const corner = resizeCornerRef.current;
      const start = startCropBoxRef.current;

      let newW = start.w;
      let newX = start.x;
      let newY = start.y;

      if (corner === 'se') {
        newW = Math.max(20, Math.min(start.w + deltaXPercent, 100 - start.x));
      } else if (corner === 'sw') {
        const allowedDelta = Math.min(start.w - 20, Math.max(-start.x, deltaXPercent));
        newW = start.w - allowedDelta;
        newX = start.x + allowedDelta;
      } else if (corner === 'ne') {
        newW = Math.max(20, Math.min(start.w + deltaXPercent, 100 - start.x));
        const newH = newW / CR80_ASPECT_RATIO;
        newY = Math.max(0, start.y + (start.h - newH));
      } else if (corner === 'nw') {
        const allowedDelta = Math.min(start.w - 20, Math.max(-start.x, deltaXPercent));
        newW = start.w - allowedDelta;
        newX = start.x + allowedDelta;
        const newH = newW / CR80_ASPECT_RATIO;
        newY = Math.max(0, start.y + (start.h - newH));
      }

      const newH = newW / CR80_ASPECT_RATIO;

      if (newX >= 0 && newX + newW <= 100 && newY >= 0 && newY + newH <= 100) {
        setCropBox({
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          w: Math.round(newW * 10) / 10,
          h: Math.round(newH * 10) / 10,
        });
      }
      return;
    }

    // 3. If dragging the rectangular box (moves without deforming fixed size)
    if (isDraggingRef.current) {
      const deltaXPercent = ((clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaYPercent = ((clientY - dragStartRef.current.y) / rect.height) * 100;

      let newX = startCropBoxRef.current.x + deltaXPercent;
      let newY = startCropBoxRef.current.y + deltaYPercent;

      newX = Math.max(0, Math.min(newX, 100 - cropBox.w));
      newY = Math.max(0, Math.min(newY, 100 - cropBox.h));

      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    resizeCornerRef.current = null;
    setActiveDot(null);
    setMagnifierPos(null);
  };

  // Fixed CR80 size scaling
  const handleResizeCrop = (deltaWidth: number) => {
    const newW = Math.max(20, Math.min(cropBox.w + deltaWidth, 98));
    const newH = newW / CR80_ASPECT_RATIO;
    const newBox = {
      w: newW,
      h: newH,
      x: Math.min(cropBox.x, 100 - newW),
      y: Math.min(cropBox.y, 100 - newH),
    };
    setCropBox(newBox);
    setCornerPoints({
      tl: { x: newBox.x, y: newBox.y },
      tr: { x: newBox.x + newBox.w, y: newBox.y },
      br: { x: newBox.x + newBox.w, y: newBox.y + newBox.h },
      bl: { x: newBox.x, y: newBox.y + newBox.h },
    });
  };

  const handleSetFixedScale = (scalePercent: number) => {
    const newW = Math.max(20, Math.min(scalePercent, 98));
    const newH = newW / CR80_ASPECT_RATIO;
    const newBox = {
      w: newW,
      h: newH,
      x: Math.min(cropBox.x, 100 - newW),
      y: Math.min(cropBox.y, 100 - newH),
    };
    setCropBox(newBox);
    setCornerPoints({
      tl: { x: newBox.x, y: newBox.y },
      tr: { x: newBox.x + newBox.w, y: newBox.y },
      br: { x: newBox.x + newBox.w, y: newBox.y + newBox.h },
      bl: { x: newBox.x, y: newBox.y + newBox.h },
    });
    showToast(`🔒 Fixed CR80 scale set to ${scalePercent}% (${(scalePercent * 0.856).toFixed(1)}mm)`);
  };

  // Snap 4-dot perspective crop to strict fixed CR80 rectangle
  const handleSnapToFixedCR80 = () => {
    const minX = Math.min(cornerPoints.tl.x, cornerPoints.bl.x);
    const maxX = Math.max(cornerPoints.tr.x, cornerPoints.br.x);
    const minY = Math.min(cornerPoints.tl.y, cornerPoints.tr.y);
    const width = Math.max(25, Math.min(maxX - minX, 95));
    const height = width / CR80_ASPECT_RATIO;
    const clampedY = Math.min(minY, 100 - height);

    const newPoints: CornerPoints = {
      tl: { x: minX, y: clampedY },
      tr: { x: minX + width, y: clampedY },
      br: { x: minX + width, y: clampedY + height },
      bl: { x: minX, y: clampedY + height },
    };
    setCornerPoints(newPoints);
    setCropBox({
      x: minX,
      y: clampedY,
      w: width,
      h: height,
    });
    showToast('🔒 Snapped to Strict Fixed CR80 Dimensions (85.6 × 54.0 mm)');
  };

  const activePage = documentPages[currentPageIndex];

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Controls: Card Type Selector & Document Upload (No Demo Mock) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Smart PVC ID Card Cropper & Print Engine
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Crop e-Aadhaar, PAN, Voter EPIC, Ayushman & Driving License into standard fixed CR80 PVC (85.6mm × 54mm) with 100% precision.
            </p>
          </div>

          {/* Clean Card Type Selector without demo sample mockups */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Card Type:
            </span>
            <button
              onClick={() => handleSelectCardType('aadhaar')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                selectedCardType === 'aadhaar'
                  ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Aadhaar (UIDAI)
            </button>
            <button
              onClick={() => handleSelectCardType('pan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                selectedCardType === 'pan'
                  ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              PAN Card (NSDL/UTI)
            </button>
            <button
              onClick={() => handleSelectCardType('voter')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                selectedCardType === 'voter'
                  ? 'bg-teal-50 border-teal-400 text-teal-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Voter ID (EPIC)
            </button>
            <button
              onClick={() => handleSelectCardType('ayushman')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                selectedCardType === 'ayushman'
                  ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Ayushman Bharat
            </button>
            <button
              onClick={() => handleSelectCardType('driving_license')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                selectedCardType === 'driving_license'
                  ? 'bg-slate-800 border-slate-800 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Driving License / Other
            </button>
          </div>
        </div>

        {/* Upload Zone & Quick Auto Presets */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 items-center">
          <div className="md:col-span-8">
            <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-xl p-4 cursor-pointer transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">
                    Choose PDF or Image (e-Aadhaar, Voter, PAN, Ayushman)
                  </span>
                  <span className="text-xs text-slate-500">
                    Supports password-protected e-Aadhaar PDF, JPG, PNG · Processed 100% locally on your PC
                  </span>
                </div>
              </div>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          <div className="md:col-span-4 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-600">Quick 1-Click Crop Presets:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => applyPresetCrop('aadhaar_front')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md text-left truncate"
                title="Crop Aadhaar Front"
              >
                1. Aadhaar Front
              </button>
              <button
                onClick={() => applyPresetCrop('aadhaar_back')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md text-left truncate"
                title="Crop Aadhaar Back"
              >
                2. Aadhaar Back
              </button>
              <button
                onClick={() => applyPresetCrop('pan_front')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md text-left truncate"
                title="Crop Full Card Area"
              >
                Full Card Area
              </button>
              <button
                onClick={() => applyPresetCrop('full')}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md text-left truncate"
                title="Reset Selection"
              >
                Reset Box
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace: Interactive Cropper Canvas (Left) + High-Res PVC Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Document Viewport with Drag Crop Box & Dot Perspective */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          
          {/* Header Bar: Page switcher, Crop Modes & Auto Tools */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Document Canvas</span>
              {documentPages.length > 1 && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500">Page:</span>
                  {documentPages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPageIndex(idx)}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        currentPageIndex === idx
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Side Indicator Switch */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveSide('front')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeSide === 'front'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cropping: FRONT
              </button>
              <button
                onClick={() => setActiveSide('back')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  activeSide === 'back'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cropping: BACK
              </button>
            </div>
          </div>

          {/* Cropping Mode & Auto-Crop Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500 font-semibold text-[11px] uppercase mr-1">Crop Mode:</span>
              <button
                onClick={() => handleToggleCropMode('box')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-all ${
                  cropMode === 'box'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>CR80 Box</span>
              </button>
              <button
                onClick={() => handleToggleCropMode('dot')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-all ${
                  cropMode === 'dot'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
                title="Perspective quad crop for phone photos or tilted cards"
              >
                <Crosshair className="w-3.5 h-3.5 text-emerald-300" />
                <span>4-Dot Selected</span>
              </button>

              {/* Strict Fixed Size Lock Badge & Scale Presets */}
              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Fixed CR80 (85.6 × 54mm)</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              {cropMode === 'box' ? (
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500 font-medium">Scale:</span>
                  <button
                    onClick={() => handleSetFixedScale(84)}
                    className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium"
                    title="Fit Standard Box"
                  >
                    100% Fit
                  </button>
                  <button
                    onClick={() => handleSetFixedScale(45.2)}
                    className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium"
                    title="Standard UIDAI Slip Box"
                  >
                    UIDAI Slip
                  </button>
                  <button
                    onClick={() => handleSetFixedScale(65)}
                    className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium"
                    title="Medium Scale"
                  >
                    65%
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSnapToFixedCR80}
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded font-bold text-[11px]"
                  title="Snap current dots into exact fixed CR80 rectangle"
                >
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>Snap to Fixed CR80</span>
                </button>
              )}

              <button
                onClick={handleAutoCrop}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded shadow-xs transition-all"
                title="Intelligent edge detection auto-locates card"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Auto Crop</span>
              </button>

              {selectedCardType === 'aadhaar' && (
                <button
                  onClick={handleAutoCropBothSides}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded shadow-xs transition-all"
                  title="Crop both Front and Back at once with Magic Enhancer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>1-Click Both Sides</span>
                </button>
              )}

              <button
                onClick={cropMode === 'dot' ? handleResetDots : () => applyPresetCrop('full')}
                className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded font-medium"
                title="Reset crop coordinates"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Interactive Document Viewport (Supports Box Drag, Corner Fixed-Ratio Resize & 4-Dot Perspective Drag) */}
          <div 
            ref={containerRef}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="relative w-full aspect-[4/3] bg-slate-900/95 rounded-lg overflow-hidden flex items-center justify-center select-none shadow-inner"
          >
            {docLoading ? (
              <div className="flex flex-col items-center gap-2 text-white">
                <div className="w-8 h-8 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Rendering Document Pages at 300 DPI...</span>
              </div>
            ) : activePage ? (
              <>
                <img
                  src={activePage.dataUrl}
                  alt="Document Page"
                  className="max-w-full max-h-full object-contain pointer-events-none transition-all"
                  style={{
                    filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`,
                    transform: `rotate(${rotation}deg)`,
                  }}
                />

                {/* Mask overlay */}
                <div className="absolute inset-0 pointer-events-none border border-white/20"></div>

                {/* MODE 1: Standard CR80 Box Mode with Fixed Size Proportional Resize Handles */}
                {cropMode === 'box' && (
                  <div
                    onMouseDown={handleMouseDown}
                    className="absolute border-2 border-emerald-400 bg-emerald-500/15 cursor-move shadow-2xl transition-shadow group"
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.w}%`,
                      height: `${cropBox.h}%`,
                      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
                    }}
                  >
                    {/* Aspect Ratio & Side Badge */}
                    <div className="absolute -top-7 left-0 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1.5 whitespace-nowrap">
                      <Lock className="w-3 h-3 text-emerald-200" />
                      <span>{activeSide.toUpperCase()} FIXED CR80 (85.6 × 54.0 mm)</span>
                    </div>

                    {/* Corner Visual Indicators */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-3 border-l-3 border-emerald-300 pointer-events-none"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-3 border-r-3 border-emerald-300 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-3 border-l-3 border-emerald-300 pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-3 border-r-3 border-emerald-300 pointer-events-none"></div>

                    {/* Fixed Size Interactive Corner Resize Grips (Locked CR80 Ratio 85.6/54mm) */}
                    <div
                      onMouseDown={(e) => handleMouseDownResize('nw', e)}
                      onTouchStart={(e) => handleMouseDownResize('nw', e)}
                      className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      title="Proportional Fixed Size Resize"
                    ></div>
                    <div
                      onMouseDown={(e) => handleMouseDownResize('ne', e)}
                      onTouchStart={(e) => handleMouseDownResize('ne', e)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      title="Proportional Fixed Size Resize"
                    ></div>
                    <div
                      onMouseDown={(e) => handleMouseDownResize('se', e)}
                      onTouchStart={(e) => handleMouseDownResize('se', e)}
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                      title="Proportional Fixed Size Resize"
                    ></div>
                    <div
                      onMouseDown={(e) => handleMouseDownResize('sw', e)}
                      onTouchStart={(e) => handleMouseDownResize('sw', e)}
                      className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                      title="Proportional Fixed Size Resize"
                    ></div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 text-xs font-semibold pointer-events-none select-none">
                      <span>Drag to Reposition</span>
                      <span className="text-[10px] text-emerald-300 font-mono font-normal">Fixed 85.6 × 54 mm (1012 × 638 px)</span>
                    </div>
                  </div>
                )}

                {/* MODE 2: 4-Dot Selected Perspective Cropping */}
                {cropMode === 'dot' && (
                  <>
                    {/* SVG Connecting Polygon */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                      <polygon
                        points={`
                          ${cornerPoints.tl.x * 0.01 * (containerRef.current?.clientWidth || 400)},${cornerPoints.tl.y * 0.01 * (containerRef.current?.clientHeight || 300)} 
                          ${cornerPoints.tr.x * 0.01 * (containerRef.current?.clientWidth || 400)},${cornerPoints.tr.y * 0.01 * (containerRef.current?.clientHeight || 300)} 
                          ${cornerPoints.br.x * 0.01 * (containerRef.current?.clientWidth || 400)},${cornerPoints.br.y * 0.01 * (containerRef.current?.clientHeight || 300)} 
                          ${cornerPoints.bl.x * 0.01 * (containerRef.current?.clientWidth || 400)},${cornerPoints.bl.y * 0.01 * (containerRef.current?.clientHeight || 300)}
                        `}
                        fill="rgba(16, 185, 129, 0.20)"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                      />
                    </svg>

                    {/* 4 Interactive Draggable Corner Dots */}
                    {(['tl', 'tr', 'br', 'bl'] as const).map((dotKey) => {
                      const pt = cornerPoints[dotKey];
                      const isCurrentActive = activeDot === dotKey;
                      const dotLabels: Record<string, string> = {
                        tl: 'Top-Left',
                        tr: 'Top-Right',
                        br: 'Bottom-Right',
                        bl: 'Bottom-Left',
                      };

                      return (
                        <div
                          key={dotKey}
                          onMouseDown={(e) => handleMouseDownDot(dotKey, e)}
                          onTouchStart={(e) => handleMouseDownDot(dotKey, e)}
                          className={`absolute z-30 cursor-grab active:cursor-grabbing transition-transform -translate-x-1/2 -translate-y-1/2 select-none group ${
                            isCurrentActive ? 'scale-125 z-40' : 'hover:scale-115'
                          }`}
                          style={{
                            left: `${pt.x}%`,
                            top: `${pt.y}%`,
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-xl ring-4 ring-emerald-400/40">
                            {dotKey.toUpperCase()}
                          </div>
                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-950/85 text-white text-[9px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {dotLabels[dotKey]} ({pt.x.toFixed(0)}%, {pt.y.toFixed(0)}%)
                          </div>
                        </div>
                      );
                    })}

                    {/* Magnifier Loupe Zoom Window while dragging corner dot */}
                    {activeDot && magnifierPos && (
                      <div 
                        className="absolute pointer-events-none z-50 rounded-full border-3 border-emerald-400 bg-slate-950 shadow-2xl overflow-hidden flex items-center justify-center animate-fade-in"
                        style={{
                          width: '120px',
                          height: '120px',
                          left: `${Math.max(8, Math.min(magnifierPos.x + (magnifierPos.x > 65 ? -30 : 6), 72))}%`,
                          top: `${Math.max(8, Math.min(magnifierPos.y + (magnifierPos.y > 65 ? -30 : 6), 72))}%`,
                        }}
                      >
                        <div
                          className="absolute"
                          style={{
                            width: '400%',
                            height: '400%',
                            left: `${50 - magnifierPos.x * 4}%`,
                            top: `${50 - magnifierPos.y * 4}%`,
                          }}
                        >
                          <img
                            src={activePage.dataUrl}
                            alt="Magnifier View"
                            className="w-full h-full object-contain"
                            style={{
                              filter: `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`,
                              transform: `rotate(${rotation}deg)`,
                            }}
                          />
                        </div>
                        {/* Red precision target crosshair */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-0.5 bg-rose-500 shadow-xs"></div>
                          <div className="h-8 w-0.5 bg-rose-500 absolute shadow-xs"></div>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-rose-500 absolute"></div>
                        </div>
                        <div className="absolute bottom-1 bg-black/85 text-emerald-300 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold shadow-xs">
                          {activeDot.toUpperCase()} 2.5× Zoom
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              /* Clean Upload Dropzone (when no document loaded) */
              <label className="flex flex-col items-center justify-center p-8 text-center cursor-pointer group w-full h-full">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 group-hover:bg-indigo-500/20 transition-all">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  Upload Document or Scan Image
                </h3>
                <p className="text-xs text-slate-300 max-w-sm mb-4">
                  Drag & drop your e-Aadhaar PDF, PAN, Voter ID, or scanned document here to begin cropping.
                </p>
                <div className="flex items-center gap-2">
                  <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm">
                    Select File (PDF or Image)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-3">
                  Supports password-protected e-Aadhaar PDF, JPG, PNG, WEBP · 100% Private & Local
                </span>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Magic Scanner Enhancer Control Suite */}
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Wand2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Magic Enhancer (CamScanner Quality)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={magicEnhanceActive} 
                        onChange={(e) => setMagicEnhanceActive(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Removes gray scanner shadows, brightens background to #fff & makes text razor sharp
                  </span>
                </div>
              </div>

              {/* Quick Preset Filter Buttons */}
              {magicEnhanceActive && (
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    onClick={() => setMagicMode('magic_color')}
                    className={`px-2 py-1 rounded font-medium transition-all ${
                      magicMode === 'magic_color'
                        ? 'bg-amber-600 text-white font-bold shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    🌟 Magic Color
                  </button>
                  <button
                    onClick={() => setMagicMode('photocopy_bw')}
                    className={`px-2 py-1 rounded font-medium transition-all ${
                      magicMode === 'photocopy_bw'
                        ? 'bg-slate-800 text-white font-bold shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    📄 B&W Photocopy
                  </button>
                  <button
                    onClick={() => setMagicMode('color_boost')}
                    className={`px-2 py-1 rounded font-medium transition-all ${
                      magicMode === 'color_boost'
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    🎨 Vivid Color
                  </button>
                  <button
                    onClick={() => setShowEnhanceSliders(!showEnhanceSliders)}
                    className="p-1 bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 rounded"
                    title="Fine tune sliders"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Fine Tuning Sliders (Whitening, Contrast, Sharpness) */}
            {magicEnhanceActive && (showEnhanceSliders || true) && (
              <div className="grid grid-cols-3 gap-3 pt-2.5 text-[11px]">
                <div>
                  <div className="flex items-center justify-between font-semibold text-slate-600 mb-1">
                    <span>Whitening:</span>
                    <span className="font-mono text-slate-800">{whitening}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={whitening}
                    onChange={(e) => setWhitening(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between font-semibold text-slate-600 mb-1">
                    <span>Text Contrast:</span>
                    <span className="font-mono text-slate-800">{contrastBoost}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={contrastBoost}
                    onChange={(e) => setContrastBoost(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between font-semibold text-slate-600 mb-1">
                    <span>Text Sharpness:</span>
                    <span className="font-mono text-slate-800">{sharpness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sharpness}
                    onChange={(e) => setSharpness(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Adjustments & Primary Crop Action */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Rotate:</span>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{rotation}°</span>
              </button>
            </div>

            {cropMode === 'box' && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Box:</span>
                <button
                  onClick={() => handleResizeCrop(-4)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-800"
                >
                  - Smaller
                </button>
                <button
                  onClick={() => handleResizeCrop(4)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-800"
                >
                  + Larger
                </button>
              </div>
            )}

            {/* Primary Crop Action Button */}
            <button
              onClick={performCrop}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-all ml-auto"
            >
              <Check className="w-4 h-4" />
              <span>
                Crop & Enhance {activeSide.toUpperCase()} {cropMode === 'dot' ? '(Perspective)' : ''}
              </span>
            </button>
          </div>
        </div>

        {/* Right: CR80 PVC Live Card Preview & Sheet Queuing */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">CR80 PVC Card Live Preview</h2>
                <span className="text-xs text-slate-500">ISO/IEC 7810 ID-1 standard (85.60 mm × 53.98 mm)</span>
              </div>
              <div className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200">
                100% Scale Ready
              </div>
            </div>

            {/* Card Information Inputs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Holder Name</label>
                <input
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Suresh Kumar"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Card / Aadhaar Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. XXXX XXXX 8454"
                />
              </div>
            </div>

            {/* Front & Back Render Cards */}
            <div className="space-y-4">
              {/* Front Side */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    FRONT SIDE
                    {frontImage && magicEnhanceActive && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                        ✨ Magic Enhanced
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {frontImage && (
                      <>
                        <button
                          onClick={() => handleReapplyMagic('front')}
                          className="text-amber-600 hover:text-amber-800 text-[11px] font-semibold flex items-center gap-0.5"
                          title="Reapply Magic Scanner Filter"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>Re-enhance</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPng('front')}
                          className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium"
                        >
                          PNG
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div 
                  className="relative w-full aspect-[1.586/1] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center group"
                  style={{
                    borderWidth: `${borderWidth}px`,
                    borderColor: '#cbd5e1',
                  }}
                >
                  {frontImage ? (
                    <>
                      <img
                        src={frontImage}
                        alt="Front Side Crop"
                        className="w-full h-full object-cover rounded-xl"
                      />
                      {/* Realistic Gloss Sheen */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-transparent pointer-events-none rounded-xl"></div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-xs text-slate-400 block font-medium">Front Side Not Cropped</span>
                      <button
                        onClick={() => setActiveSide('front')}
                        className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Set crop box & click Crop Front
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Back Side */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    BACK SIDE
                    {backImage && magicEnhanceActive && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                        ✨ Magic Enhanced
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {backImage && (
                      <>
                        <button
                          onClick={() => handleReapplyMagic('back')}
                          className="text-amber-600 hover:text-amber-800 text-[11px] font-semibold flex items-center gap-0.5"
                          title="Reapply Magic Scanner Filter"
                        >
                          <Wand2 className="w-3 h-3" />
                          <span>Re-enhance</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPng('back')}
                          className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium"
                        >
                          PNG
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div 
                  className="relative w-full aspect-[1.586/1] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center group"
                  style={{
                    borderWidth: `${borderWidth}px`,
                    borderColor: '#cbd5e1',
                  }}
                >
                  {backImage ? (
                    <>
                      <img
                        src={backImage}
                        alt="Back Side Crop"
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-transparent pointer-events-none rounded-xl"></div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-xs text-slate-400 block font-medium">Back Side Not Cropped</span>
                      <button
                        onClick={() => setActiveSide('back')}
                        className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Set crop box & click Crop Back
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Print Preferences (Border, Cut Marks) */}
              <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={borderWidth > 0}
                    onChange={(e) => setBorderWidth(e.target.checked ? 1 : 0)}
                    className="rounded text-indigo-600"
                  />
                  <span>1px Cut Border</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCutMarks}
                    onChange={(e) => setIncludeCutMarks(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Corner Cut Marks</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action CTAs: Add to 5-Card Sheet & Export */}
          <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
            <button
              onClick={handleSaveToSheet}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-lg shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add to 5-Card A4 Sheet ({savedCardsCount}/5 in Queue)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadSinglePdf}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors truncate"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Single PVC PDF</span>
              </button>

              <button
                onClick={onGoToSheet}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-lg transition-colors truncate"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>View A4 Sheet ({savedCardsCount})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal for Protected e-Aadhaar PDF */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                !
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Protected PDF Password Required</h3>
                <p className="text-xs text-slate-500">e-Aadhaar and official documents are encrypted by UIDAI.</p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-xs text-amber-800 mb-4">
              <p className="font-semibold mb-1">Standard Aadhaar Password Format:</p>
              <p>First 4 letters of your Name in CAPITAL + 4-digit Year of Birth.</p>
              <p className="font-mono mt-1 text-[11px] text-amber-900">Example: Name: SURESH, YOB: 1992 → Password: <strong>SURE1992</strong></p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Enter PDF Password</label>
              <input
                type="text"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value.toUpperCase())}
                placeholder="e.g. SURE1992"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:border-indigo-600"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePasswordSubmit();
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPendingFile(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Unlock & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="font-bold text-rose-900 hover:underline">
            Dismiss
          </button>
        </div>
      )}

    </div>
  );
};
