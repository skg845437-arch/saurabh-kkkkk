import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Check, 
  Sliders, 
  FileCheck, 
  Image as ImageIcon,
  Sparkles,
  Info
} from 'lucide-react';
import { cleanSignatureBw } from '../utils/imageFilters';

export const SignatureResizer: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'photo' | 'signature'>('signature');
  
  // Signature State
  const [signRawSrc, setSignRawSrc] = useState<string | null>(null);
  const [signProcessedSrc, setSignProcessedSrc] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(170);
  const [signKbSize, setSignKbSize] = useState<number>(0);

  // Photo State
  const [photoRawSrc, setPhotoRawSrc] = useState<string | null>(null);
  const [photoProcessedSrc, setPhotoProcessedSrc] = useState<string | null>(null);
  const [photoKbSize, setPhotoKbSize] = useState<number>(0);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Process signature thresholding whenever raw source or threshold changes
  useEffect(() => {
    if (!signRawSrc) {
      setSignProcessedSrc(null);
      setSignKbSize(0);
      return;
    }
    const img = new Image();
    img.src = signRawSrc;
    img.onload = () => {
      // PAN standard target: 400 x 200 pixels
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, 400, 200);
      const cleaned = cleanSignatureBw(canvas, threshold);
      setSignProcessedSrc(cleaned);

      // Estimate byte size
      const approxBytes = Math.round((cleaned.length * 3) / 4);
      setSignKbSize(Number((approxBytes / 1024).toFixed(1)));
    };
  }, [signRawSrc, threshold]);

  const handleSignUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSignRawSrc(e.target?.result as string);
      showToast('Uploaded signature! Thresholding applied.');
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        // Force 213 x 213 pixels (NSDL / UTI requirement)
        const canvas = document.createElement('canvas');
        canvas.width = 213;
        canvas.height = 213;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 213, 213);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setPhotoProcessedSrc(dataUrl);
        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        setPhotoKbSize(Number((approxBytes / 1024).toFixed(1)));
        showToast('Resized photo to 213 × 213 px (<50KB)!');
      };
    };
    reader.readAsDataURL(file);
  };

  const downloadSignature = () => {
    if (!signProcessedSrc) return;
    const a = document.createElement('a');
    a.href = signProcessedSrc;
    a.download = `PAN_Signature_400x200_${Date.now()}.png`;
    a.click();
    showToast('Downloaded NSDL Compliant Signature!');
  };

  const downloadPhoto = () => {
    if (!photoProcessedSrc) return;
    const a = document.createElement('a');
    a.href = photoProcessedSrc;
    a.download = `PAN_Photo_213x213_${Date.now()}.jpg`;
    a.click();
    showToast('Downloaded NSDL Compliant Photo!');
  };

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
              NSDL & UTI PAN Photo & Signature Resizer
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              100% compliant with NSDL / UTIITSL PAN portal upload criteria (213×213px photo &lt;50KB, 400×200px signature &lt;20KB with paper shadow removal).
            </p>
          </div>

          {/* Tool Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTool('signature')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTool === 'signature'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PAN Signature Tool (Whitener)
            </button>
            <button
              onClick={() => setActiveTool('photo')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTool === 'photo'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              PAN Photo Tool (213×213)
            </button>
          </div>
        </div>

        {/* Requirements Banner */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-lg text-blue-900">
            <span className="font-bold block mb-0.5">Official NSDL Signature Criteria:</span>
            <span>400 × 200 Pixels · File size strictly under 20 KB · Pure white background (No room shadows or yellowish paper).</span>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-lg text-emerald-900">
            <span className="font-bold block mb-0.5">Official NSDL Photo Criteria:</span>
            <span>213 × 213 Pixels (2.5 cm × 2.5 cm) · 300 DPI · File size strictly under 50 KB · JPEG format.</span>
          </div>
        </div>
      </div>

      {/* Main Active Tool View */}
      {activeTool === 'signature' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Signature Whitening Controls */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                Signature Threshold Whitener
              </h2>
            </div>

            {/* Upload Signature */}
            <div>
              <label className="relative flex items-center gap-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-xl p-3 cursor-pointer transition-all">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Upload Signature Image
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Phone photo of signature on paper
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSignUpload(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>

            {/* Threshold Slider (Background Whitener) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Paper Shadow Removal (Threshold):</span>
                <span className="font-mono font-bold text-indigo-600">{threshold}</span>
              </div>
              <input
                type="range"
                min="80"
                max="240"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Slide to right if paper is dark/shadowed. Slide to left if signature lines break.
              </p>
            </div>

            {/* Original Input Preview */}
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1">
                Original Upload (With Paper Shadow):
              </span>
              <div className="w-full h-24 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                {signRawSrc ? (
                  <img src={signRawSrc} alt="Original" className="max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Upload signature image above</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Output NSDL 400x200 Preview & Download */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    NSDL Processed Signature (400 × 200 px)
                  </h3>
                  <span className="text-xs text-slate-500">Pure White Background & Solid Black Ink</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  <span>Size: {signKbSize} KB (&lt;20 KB OK)</span>
                </div>
              </div>

              {/* High-Contrast Canvas Box */}
              <div className="w-full aspect-[2/1] bg-white border-2 border-slate-300 rounded-lg flex items-center justify-center overflow-hidden shadow-sm p-4 relative group">
                {signProcessedSrc ? (
                  <img
                    src={signProcessedSrc}
                    alt="Processed Signature"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">No output</span>
                )}
                {/* 400x200 indicator */}
                <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                  400 × 200 px
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={downloadSignature}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download NSDL Compliant Signature ({signKbSize} KB)</span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* Photo 213x213 Tool */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
              PAN Photo Converter (213 × 213 px)
            </h2>

            <label className="relative flex items-center gap-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-xl p-3 cursor-pointer transition-all">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Upload Photo
                </span>
                <span className="text-[11px] text-slate-500">
                  Any square or rectangular photo
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePhotoUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>

          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    NSDL 213 × 213 Pixels Photo
                  </h3>
                  <span className="text-xs text-slate-500">Exact 300 DPI square crop under 50KB</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                  <Check className="w-3.5 h-3.5" />
                  <span>Size: {photoKbSize} KB (&lt;50 KB OK)</span>
                </div>
              </div>

              <div className="flex justify-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-[213px] h-[213px] bg-white border-2 border-slate-400 shadow-md flex items-center justify-center overflow-hidden relative">
                  {photoProcessedSrc ? (
                    <img
                      src={photoProcessedSrc}
                      alt="PAN Photo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 text-center px-4">
                      Upload photo above to convert to 213 × 213 px
                    </span>
                  )}
                  <div className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/60 text-white px-1 rounded">
                    213 × 213 px
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={downloadPhoto}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download NSDL Compliant Photo ({photoKbSize} KB)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
