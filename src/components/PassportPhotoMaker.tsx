import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Download, 
  Printer, 
  Check, 
  Sliders, 
  Type, 
  Calendar,
  Grid,
  RefreshCw
} from 'lucide-react';
import { PassportPhotoConfig } from '../types';
import { renderPassportPhoto } from '../utils/imageFilters';
import { generatePassportPhotoPdf } from '../utils/pdfEngine';

export const PassportPhotoMaker: React.FC = () => {
  const [config, setConfig] = useState<PassportPhotoConfig>({
    photoSrc: null,
    copiesCount: 8,
    paperSize: '4x6',
    backgroundColor: '#93C5FD', // Standard light blue
    addNameDate: false,
    fullName: '',
    photoDate: new Date().toLocaleDateString('en-GB'),
    borderWidth: 1,
  });

  const [processedPhoto, setProcessedPhoto] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Update processed single photo whenever config changes
  useEffect(() => {
    if (!config.photoSrc) {
      setProcessedPhoto(null);
      return;
    }
    const img = new Image();
    img.src = config.photoSrc;
    img.onload = () => {
      const rendered = renderPassportPhoto(
        img,
        config.backgroundColor,
        config.addNameDate,
        config.fullName,
        config.photoDate
      );
      setProcessedPhoto(rendered);
    };
  }, [config.photoSrc, config.backgroundColor, config.addNameDate, config.fullName, config.photoDate]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setConfig((prev) => ({ ...prev, photoSrc: dataUrl }));
      showToast('Photo uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPdf = () => {
    if (!processedPhoto) return;
    const doc = generatePassportPhotoPdf(config, processedPhoto);
    doc.save(`SK_Passport_Photos_${config.paperSize}_${Date.now()}.pdf`);
    showToast(`Downloaded ${config.copiesCount} Photos PDF!`);
  };

  const handleDownloadSingle = () => {
    if (!processedPhoto) return;
    const a = document.createElement('a');
    a.href = processedPhoto;
    a.download = `Passport_Photo_${config.fullName.replace(/\s+/g, '_')}.png`;
    a.click();
    showToast('Downloaded single passport photo!');
  };

  const handleDirectPrint = () => {
    window.print();
  };

  const copiesArray = Array.from({ length: config.copiesCount }, (_, i) => i);

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Instant Passport Size Photo Maker (35 × 45 mm)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create official passport photos for SSC, Railway, UPSC, Police, Driving License & College exams with Name & Date of Photo (DOP).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSingle}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
            >
              Download Single PNG
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleDirectPrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print (Ctrl+P)</span>
            </button>
          </div>
        </div>

        {/* Upload & Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 items-center">
          <div className="md:col-span-6">
            <label className="relative flex items-center gap-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-xl p-3 cursor-pointer transition-all">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  Upload Photo (JPG, PNG, WEBP)
                </span>
                <span className="text-[11px] text-slate-500">
                  Selfie, passport scan or camera photo
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          {/* Paper Size & Copies Selector */}
          <div className="md:col-span-6 flex flex-wrap items-center gap-3 justify-end">
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1">Paper Size:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setConfig((p) => ({ ...p, paperSize: '4x6', copiesCount: 8 }))}
                  className={`px-3 py-1 text-xs font-semibold rounded-md ${
                    config.paperSize === '4x6' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  4×6 Inch (Glossy)
                </button>
                <button
                  onClick={() => setConfig((p) => ({ ...p, paperSize: 'A4', copiesCount: 30 }))}
                  className={`px-3 py-1 text-xs font-semibold rounded-md ${
                    config.paperSize === 'A4' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  A4 Sheet
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1">Copies:</span>
              <select
                value={config.copiesCount}
                onChange={(e) => setConfig((p) => ({ ...p, copiesCount: Number(e.target.value) }))}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold"
              >
                {config.paperSize === '4x6' ? (
                  <>
                    <option value={8}>8 Photos (4×2)</option>
                    <option value={6}>6 Photos (3×2)</option>
                    <option value={4}>4 Photos (2×2)</option>
                  </>
                ) : (
                  <>
                    <option value={30}>30 Photos (5×6)</option>
                    <option value={24}>24 Photos (4×6)</option>
                    <option value={16}>16 Photos (4×4)</option>
                    <option value={8}>8 Photos</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Photo Adjustments, Background Color & Exam Name/DOP Footer */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              Photo Studio Settings
            </h2>
          </div>

          {/* Background Color Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Background Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Blue', color: '#93C5FD' },
                { label: 'White', color: '#FFFFFF' },
                { label: 'Grey', color: '#E2E8F0' },
                { label: 'Off-White', color: '#F8FAFC' },
              ].map((item) => (
                <button
                  key={item.color}
                  onClick={() => setConfig((p) => ({ ...p, backgroundColor: item.color }))}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                    config.backgroundColor === item.color
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-slate-300 shadow-xs"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="text-[11px] text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SSC / Railway Name & Date Stamp */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.addNameDate}
                  onChange={(e) => setConfig((p) => ({ ...p, addNameDate: e.target.checked }))}
                  className="rounded text-indigo-600"
                />
                <span>Add Name & DOP Strip (Exam Mandatory)</span>
              </label>
            </div>

            {config.addNameDate && (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Candidate Full Name
                  </label>
                  <input
                    type="text"
                    value={config.fullName}
                    onChange={(e) => setConfig((p) => ({ ...p, fullName: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SURESH KUMAR"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-800 uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Date of Photo (DOP)
                  </label>
                  <input
                    type="text"
                    value={config.photoDate}
                    onChange={(e) => setConfig((p) => ({ ...p, photoDate: e.target.value }))}
                    placeholder="e.g. 22/09/2026"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Single Photo Preview Card */}
          <div>
            <span className="text-xs font-bold text-slate-800 block mb-1.5">
              Single Photo Preview (35 × 45 mm)
            </span>
            <div className="flex justify-center p-4 bg-slate-100 rounded-xl border border-slate-200">
              {processedPhoto ? (
                <div className="w-[140px] aspect-[35/45] bg-white shadow-md border border-slate-300 overflow-hidden relative">
                  <img
                    src={processedPhoto}
                    alt="Passport Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-6">
                  Upload a photo above to generate preview
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Printable Photo Sheet Grid */}
        <div className="lg:col-span-8 bg-slate-100/70 rounded-xl border border-slate-200 p-6 flex flex-col items-center overflow-x-auto">
          
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-600 font-semibold px-2">
            <span>
              Printable Sheet: {config.paperSize === '4x6' ? '4×6 Inch Photo Paper' : 'A4 Photo Sheet'} ({config.copiesCount} Copies)
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              35mm × 45mm · 300 DPI
            </span>
          </div>

          {/* Printable Sheet Canvas */}
          <div
            id="print-sheet-area"
            className="bg-white shadow-xl rounded-sm border border-slate-300 p-6 transition-all select-none print:shadow-none print:border-none print:m-0 print:p-0 flex flex-col items-center justify-center"
            style={{
              width: config.paperSize === '4x6' ? '540px' : '620px',
              minHeight: config.paperSize === '4x6' ? '360px' : '820px',
            }}
          >
            {/* Grid of Passport Photos */}
            <div
              className="grid gap-2 justify-center"
              style={{
                gridTemplateColumns: config.paperSize === '4x6' 
                  ? 'repeat(4, minmax(0, 1fr))' 
                  : 'repeat(5, minmax(0, 1fr))',
              }}
            >
              {copiesArray.map((idx) => (
                <div
                  key={idx}
                  className={`w-[95px] aspect-[35/45] overflow-hidden shadow-xs relative flex flex-col items-center justify-center ${
                    processedPhoto ? 'bg-white border border-slate-400' : 'bg-slate-50 border border-dashed border-slate-300 text-[10px] text-slate-400 font-mono'
                  }`}
                >
                  {processedPhoto ? (
                    <img
                      src={processedPhoto}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>Slot {idx + 1}</span>
                  )}
                  {/* Subtle 4-corner crop mark ticks */}
                  <div className="absolute inset-0 pointer-events-none border border-slate-300/40"></div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono">
              SK PRINT PORTAL · PASSPORT PHOTO MAKER · SCALE: 100% · DO NOT FIT TO PAGE
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
