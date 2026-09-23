import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  HelpCircle, 
  Check, 
  Sliders,
  Layers,
  RotateCcw,
  GripVertical
} from 'lucide-react';
import { CardRecord, SheetMode } from '../types';
import { 
  generateA4SheetPdf, 
  generatePvcTrayPdf, 
  generate4x6CardPdf, 
  CARD_WIDTH_MM, 
  CARD_HEIGHT_MM 
} from '../utils/pdfEngine';

interface MultiCardSheetProps {
  cards: CardRecord[];
  setCards: React.Dispatch<React.SetStateAction<CardRecord[]>>;
  onGoToCropper: () => void;
}

export const MultiCardSheet: React.FC<MultiCardSheetProps> = ({
  cards,
  setCards,
  onGoToCropper,
}) => {
  const [sheetMode, setSheetMode] = useState<SheetMode>('a4_5card');
  const [includeCutMarks, setIncludeCutMarks] = useState<boolean>(true);
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag and Drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    showToast('Card removed from sheet.');
  };

  const moveCard = (index: number, direction: 'up' | 'down') => {
    const newCards = [...cards];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newCards.length) return;
    const temp = newCards[index];
    newCards[index] = newCards[targetIdx];
    newCards[targetIdx] = temp;
    setCards(newCards);
  };

  // Reorder cards when dragged and dropped
  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= cards.length) return;
    const clampedTo = Math.max(0, Math.min(toIndex, cards.length - 1));
    const newCards = [...cards];
    const [movedCard] = newCards.splice(fromIndex, 1);
    newCards.splice(clampedTo, 0, movedCard);
    setCards(newCards);
    showToast(`Moved "${movedCard.holderName || 'Card'}" to slot #${clampedTo + 1}`);
  };

  const clearAllCards = () => {
    if (window.confirm('Clear all cards from the current sheet queue?')) {
      setCards([]);
      showToast('Sheet queue cleared.');
    }
  };

  // Download PDF based on selected layout mode
  const handleDownloadPdf = () => {
    if (cards.length === 0) {
      alert('Please add at least one card to the sheet first.');
      return;
    }

    if (sheetMode === 'a4_5card') {
      const doc = generateA4SheetPdf(cards);
      doc.save(`SK_Print_Portal_A4_5Card_Sheet_${Date.now()}.pdf`);
    } else if (sheetMode === 'pvc_tray') {
      const doc = generatePvcTrayPdf(cards[0]);
      doc.save(`SK_Print_Portal_PVC_Tray_${Date.now()}.pdf`);
    } else if (sheetMode === 'photo_4x6') {
      const doc = generate4x6CardPdf(cards[0]);
      doc.save(`SK_Print_Portal_4x6_Photo_${Date.now()}.pdf`);
    } else {
      const doc = generateA4SheetPdf([cards[0]]);
      doc.save(`SK_Print_Portal_Single_Card_${Date.now()}.pdf`);
    }

    showToast('Downloaded High-Res Print PDF!');
  };

  // Trigger browser direct print with print stylesheet
  const handleDirectPrint = () => {
    if (cards.length === 0) {
      alert('Please add at least one card to the sheet before printing.');
      return;
    }
    window.print();
  };

  // Render cards limited to current mode maximum
  const displayCards = sheetMode === 'a4_5card' ? cards.slice(0, 5) : cards.slice(0, 2);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Mode Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Multi-Card A4 Sheet & PVC Tray Layout
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Fit up to 5 PVC cards (10 sides) on standard A4 photo paper or print directly using Epson / Canon PVC tray.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSheetMode('a4_5card')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                sheetMode === 'a4_5card'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 5-Card Sheet ({cards.length}/5)
            </button>
            <button
              onClick={() => setSheetMode('pvc_tray')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                sheetMode === 'pvc_tray'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PVC Tray (L805/L850)
            </button>
            <button
              onClick={() => setSheetMode('photo_4x6')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                sheetMode === 'photo_4x6'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4×6 Photo Paper
            </button>
          </div>
        </div>

        {/* Toolbar: Add Cards, Sample Fill, Direct Print, Settings */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onGoToCropper}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crop & Add Another Card</span>
            </button>

            {cards.length > 0 && (
              <button
                onClick={clearAllCards}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1"
              >
                Clear Sheet
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 mr-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCutMarks}
                onChange={(e) => setIncludeCutMarks(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span>Cut Marks</span>
            </label>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF (300 DPI)</span>
            </button>

            <button
              onClick={handleDirectPrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet (Ctrl+P)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Card Queue Management List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-900">
              Queued Cards ({cards.length} / 5 slots)
            </span>
            <span className="text-xs text-indigo-600 font-medium flex items-center gap-0.5">
              <GripVertical className="w-3.5 h-3.5" />
              <span>Drag to reorder</span>
            </span>
          </div>

          {/* Active Dragging Instruction Banner */}
          {draggedIndex !== null && (
            <div className="mb-3 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-800 flex items-center gap-2 animate-pulse">
              <GripVertical className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Drop onto any slot to rearrange print order</span>
            </div>
          )}

          {cards.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Layers className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs font-medium text-slate-600">No cards in sheet queue yet</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Upload and crop any ID card (Aadhaar, Voter, PAN, Ayushman) to add it to this print sheet.
              </p>
              <button
                onClick={onGoToCropper}
                className="mt-4 flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Crop New Card</span>
              </button>
            </div>
          ) : (
            <div 
              className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
            >
              {cards.map((card, index) => {
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index && draggedIndex !== index;

                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(index));
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedIndex(index);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverIndex !== index) {
                        setDragOverIndex(index);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverIndex === index) {
                        setDragOverIndex(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceIdx = draggedIndex !== null 
                        ? draggedIndex 
                        : parseInt(e.dataTransfer.getData('text/plain'), 10);
                      if (!isNaN(sourceIdx)) {
                        handleReorder(sourceIdx, index);
                      }
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`group relative p-3 rounded-lg border transition-all duration-150 flex items-center justify-between gap-2 select-none ${
                      isDragging
                        ? 'opacity-35 border-dashed border-indigo-500 bg-indigo-50/60 scale-[0.98]'
                        : isDragOver
                        ? 'border-indigo-600 bg-indigo-50/90 ring-2 ring-indigo-400/50 shadow-sm -translate-y-0.5'
                        : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-indigo-300 hover:shadow-xs'
                    }`}
                  >
                    {/* Visual Insertion Line indicator */}
                    {isDragOver && (
                      <div className="absolute -top-1 left-2 right-2 h-0.5 bg-indigo-600 rounded-full z-10 pointer-events-none shadow-xs" />
                    )}

                    <div className="flex items-center gap-2 overflow-hidden flex-1 cursor-grab active:cursor-grabbing">
                      {/* Drag Handle */}
                      <div 
                        className="p-1 -ml-1 text-slate-300 group-hover:text-slate-500 hover:text-indigo-600 rounded cursor-grab active:cursor-grabbing transition-colors"
                        title="Drag to reorder card in sheet"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Slot Badge */}
                      <span className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                        isDragOver 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {index + 1}
                      </span>

                      {/* Card Details */}
                      <div className="truncate flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {card.holderName}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 truncate">
                          {card.cardNumber} · {card.cardType.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Move Up / Down & Remove */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveCard(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200/50"
                        title="Move Up (Slot -1)"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveCard(index, 'down')}
                        disabled={index === cards.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200/50"
                        title="Move Down (Slot +1)"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeCard(card.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                        title="Remove Card from Queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CSC Printing Tips Box */}
          <div className="mt-4 pt-3 border-t border-slate-100 bg-amber-50/50 rounded-lg p-3 text-[11px] text-amber-900 border border-amber-200/60">
            <p className="font-bold flex items-center gap-1 mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
              CSC Printer Settings (Crucial):
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
              <li>Set Scale to <strong>100%</strong> or <strong>Actual Size</strong> (Never select &apos;Fit to printable area&apos;).</li>
              <li>Paper Type: <strong>Glossy / Premium Matte</strong>.</li>
              <li>Quality: <strong>High</strong> or <strong>Photo RPM</strong>.</li>
            </ul>
          </div>
        </div>

        {/* Right: Printable Sheet Canvas Preview (A4 / Tray / 4x6) */}
        <div className="lg:col-span-8 bg-slate-100/70 rounded-xl border border-slate-200 p-6 flex flex-col items-center overflow-x-auto">
          
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-600 font-semibold px-2">
            <span>
              {sheetMode === 'a4_5card' && 'A4 Sheet Preview (210 × 297 mm) — Exactly 5 Cards Front & Back'}
              {sheetMode === 'pvc_tray' && 'PVC Tray Preview (Epson / Canon J & G Tray Alignment)'}
              {sheetMode === 'photo_4x6' && '4×6 Photo Paper Preview (102 × 152 mm)'}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Scale: 1:1 CR80 (85.6 × 54 mm)
            </span>
          </div>

          {/* Printable Sheet Frame */}
          <div 
            id="print-sheet-area"
            className="bg-white shadow-xl rounded-sm border border-slate-300 p-6 transition-all select-none print:shadow-none print:border-none print:m-0 print:p-0"
            style={{
              width: sheetMode === 'photo_4x6' ? '400px' : '580px',
              minHeight: sheetMode === 'photo_4x6' ? '600px' : '820px',
            }}
          >
            {/* Sheet Title for Print */}
            <div className="text-center pb-2 mb-3 border-b border-slate-200 text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>SK PRINT PORTAL · 100% FREE DIGITAL CARD PRINTING</span>
              <span>SCALE: 100% (DO NOT FIT TO PAGE)</span>
            </div>

            {displayCards.length === 0 ? (
              <div className="py-24 text-center text-slate-300">
                <Layers className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <span className="text-xs">No cards placed on sheet.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {displayCards.map((card, i) => {
                  const isDraggingSheet = draggedIndex === i;
                  const isDragOverSheet = dragOverIndex === i && draggedIndex !== i;

                  return (
                    <div 
                      key={card.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(i));
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedIndex(i);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverIndex !== i) {
                          setDragOverIndex(i);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        if (dragOverIndex === i) {
                          setDragOverIndex(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceIdx = draggedIndex !== null 
                          ? draggedIndex 
                          : parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (!isNaN(sourceIdx)) {
                          handleReorder(sourceIdx, i);
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`group relative flex items-center justify-between gap-4 p-1 rounded-sm transition-all duration-150 cursor-grab active:cursor-grabbing ${
                        isDraggingSheet
                          ? 'opacity-35 scale-[0.99] ring-2 ring-dashed ring-indigo-400 bg-indigo-50/40'
                          : isDragOverSheet
                          ? 'ring-2 ring-indigo-600 bg-indigo-50/70 scale-[1.01] shadow-md'
                          : 'hover:ring-1 hover:ring-indigo-300 hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Front Side */}
                      <div className="relative flex-1 aspect-[1.586/1] bg-slate-50 rounded-sm border border-slate-300 overflow-hidden shadow-xs">
                        {card.frontImage ? (
                          <img
                            src={card.frontImage}
                            alt="Front"
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                            Front Blank
                          </div>
                        )}

                        {/* Cut Marks */}
                        {includeCutMarks && (
                          <div className="absolute inset-0 pointer-events-none border border-slate-400"></div>
                        )}
                      </div>

                      {/* Back Side */}
                      <div className="relative flex-1 aspect-[1.586/1] bg-slate-50 rounded-sm border border-slate-300 overflow-hidden shadow-xs">
                        {card.backImage ? (
                          <img
                            src={card.backImage}
                            alt="Back"
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                            Back Blank
                          </div>
                        )}

                        {/* Cut Marks */}
                        {includeCutMarks && (
                          <div className="absolute inset-0 pointer-events-none border border-slate-400"></div>
                        )}
                      </div>

                      {/* Slot Marker & Reorder Grip Handle (hidden on print) */}
                      <div className="absolute -left-6 flex flex-col items-center gap-0.5 text-slate-400 group-hover:text-indigo-600 transition-colors print:hidden">
                        <GripVertical className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-mono font-bold">
                          #{i + 1}
                        </span>
                      </div>

                      {/* Print only clean Slot number */}
                      <div className="hidden print:block absolute -left-5 text-[9px] font-mono text-slate-400">
                        #{i + 1}
                      </div>

                    </div>
                  );
                })}

                {/* Empty Slot Placeholders for A4 5-Card Sheet */}
                {sheetMode === 'a4_5card' && displayCards.length > 0 && displayCards.length < 5 && (
                  Array.from({ length: 5 - displayCards.length }).map((_, emptyIdx) => {
                    const slotNumber = displayCards.length + emptyIdx + 1;
                    const isOverEmptySlot = dragOverIndex === (displayCards.length + emptyIdx);

                    return (
                      <div
                        key={`empty_slot_${slotNumber}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverIndex !== slotNumber - 1) {
                            setDragOverIndex(slotNumber - 1);
                          }
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          if (dragOverIndex === slotNumber - 1) {
                            setDragOverIndex(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const sourceIdx = draggedIndex !== null 
                            ? draggedIndex 
                            : parseInt(e.dataTransfer.getData('text/plain'), 10);
                          if (!isNaN(sourceIdx)) {
                            handleReorder(sourceIdx, slotNumber - 1);
                          }
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        className={`relative flex items-center justify-between gap-4 p-2.5 rounded-sm border-2 border-dashed transition-all print:hidden ${
                          isOverEmptySlot
                            ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                            : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex-1 aspect-[1.586/1] border border-dashed border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-400">
                          Slot #{slotNumber} Front (Available)
                        </div>
                        <div className="flex-1 aspect-[1.586/1] border border-dashed border-slate-200 rounded flex items-center justify-center text-[10px] text-slate-400">
                          Slot #{slotNumber} Back (Available)
                        </div>
                        <div className="absolute -left-6 text-[9px] font-mono text-slate-300 font-bold">
                          #{slotNumber}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Sheet Footer Guide */}
            <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono">
              Cut along the guidelines. Standard CR80 Dimensions: 85.60 mm × 53.98 mm.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
