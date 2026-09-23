import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  Download, 
  Printer, 
  Check, 
  Stamp, 
  User, 
  Layers,
  FileCheck
} from 'lucide-react';
import { BankPassbookConfig } from '../types';
import { generatePassbookPdf } from '../utils/pdfEngine';

export const PassbookGenerator: React.FC = () => {
  const [config, setConfig] = useState<BankPassbookConfig>({
    bankName: 'State Bank of India',
    bankCode: 'SBI',
    accountHolder: '',
    accountNumber: '',
    cifNumber: '',
    ifscCode: 'SBIN0001234',
    micrCode: '',
    branchName: '',
    customerAddress: '',
    issueDate: new Date().toLocaleDateString('en-GB'),
    accountType: 'Savings',
    photoSrc: null,
    stampApproved: true,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const passbookCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleBankChange = (code: BankPassbookConfig['bankCode']) => {
    let name = 'State Bank of India';
    let ifsc = 'SBIN0001234';
    if (code === 'PNB') {
      name = 'Punjab National Bank';
      ifsc = 'PUNB0123400';
    } else if (code === 'BOB') {
      name = 'Bank of Baroda';
      ifsc = 'BARB0RAIPUR';
    } else if (code === 'CANARA') {
      name = 'Canara Bank';
      ifsc = 'CNRB0001234';
    } else if (code === 'BOI') {
      name = 'Bank of India';
      ifsc = 'BKID0001234';
    } else if (code === 'UNION') {
      name = 'Union Bank of India';
      ifsc = 'UBIN0531234';
    }
    setConfig((prev) => ({ ...prev, bankCode: code, bankName: name, ifscCode: ifsc }));
  };

  const handlePhotoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setConfig((p) => ({ ...p, photoSrc: e.target?.result as string }));
      showToast('Customer photo attached!');
    };
    reader.readAsDataURL(file);
  };

  // Render passbook onto hidden canvas for crisp PDF generation
  const renderPassbookToCanvas = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top Header Banner with Bank Theme Color
    let headerColor = '#1E3A8A'; // SBI Blue
    if (config.bankCode === 'PNB') headerColor = '#881337'; // PNB Maroon
    if (config.bankCode === 'BOB') headerColor = '#C2410C'; // BOB Orange
    if (config.bankCode === 'CANARA') headerColor = '#0284C7'; // Canara Blue
    if (config.bankCode === 'BOI') headerColor = '#B45309'; // BOI Gold/Amber

    ctx.fillStyle = headerColor;
    ctx.fillRect(0, 0, canvas.width, 110);

    // Bank Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(config.bankName.toUpperCase(), 60, 68);
    ctx.font = '20px sans-serif';
    ctx.fillText('SAVINGS BANK PASSBOOK / बचत बैंक पासबुक', canvas.width - 480, 68);

    // Watermark Emblem in center
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 + 30, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Inner details grid
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px sans-serif';

    const leftCol = 70;
    let y = 170;
    const rowH = 46;

    const drawField = (label: string, value: string) => {
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(label, leftCol, y);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 22px "JetBrains Mono", monospace';
      ctx.fillText(`:  ${value}`, leftCol + 320, y);
      // Subtle dotted guideline
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(leftCol, y + 10);
      ctx.lineTo(canvas.width - 340, y + 10);
      ctx.stroke();
      ctx.setLineDash([]);
      y += rowH;
    };

    drawField('खाताधारक का नाम / Name', config.accountHolder);
    drawField('खाता संख्या / Account No', config.accountNumber);
    drawField('सीआईएफ / CIF Number', config.cifNumber);
    drawField('आईएफएससी / IFSC Code', config.ifscCode);
    drawField('एमआईसीआर / MICR Code', config.micrCode);
    drawField('शाखा का नाम / Branch', config.branchName);
    drawField('खाता प्रकार / Account Type', `${config.accountType} Bank Account`);
    drawField('जारी करने की तिथि / Issue Date', config.issueDate);

    // Customer Address below
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('ग्राहक का पता / Address', leftCol, y);
    ctx.fillStyle = '#0F172A';
    ctx.font = '20px sans-serif';
    ctx.fillText(`:  ${config.customerAddress}`, leftCol + 320, y);

    // Photo Box on Right
    const photoX = canvas.width - 290;
    const photoY = 160;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(photoX, photoY, 220, 260);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.strokeRect(photoX, photoY, 220, 260);

    if (config.photoSrc) {
      const pImg = new Image();
      pImg.src = config.photoSrc;
      try {
        ctx.drawImage(pImg, photoX, photoY, 220, 260);
      } catch (e) {
        // ignore draw error
      }
    }

    // Official Bank Stamp Simulation
    if (config.stampApproved) {
      const stampX = photoX + 110;
      const stampY = photoY + 360;

      ctx.save();
      ctx.translate(stampX, stampY);
      ctx.rotate((-12 * Math.PI) / 180);

      // Oval Stamp
      ctx.strokeStyle = '#1D4ED8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 100, 60, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, 92, 52, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#1D4ED8';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(config.bankName.toUpperCase(), 0, -22);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('VERIFIED & APPROVED', 0, 4);
      ctx.font = '12px sans-serif';
      ctx.fillText('BRANCH MANAGER', 0, 26);
      ctx.restore();
    }

    // Passbook Footer Bar
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('कृपया पासबुक को समय-समय पर अद्यतन कराएं / PLEASE GET YOUR PASSBOOK UPDATED REGULARLY', canvas.width / 2, canvas.height - 24);

    return canvas.toDataURL('image/png');
  };

  const handleDownloadPdf = () => {
    const dataUrl = renderPassbookToCanvas();
    const doc = generatePassbookPdf(config, dataUrl);
    doc.save(`${config.bankCode}_Passbook_${config.accountHolder.replace(/\s+/g, '_')}.pdf`);
    showToast('Downloaded Passbook Inner Page PDF!');
  };

  const handleDirectPrint = () => {
    window.print();
  };

  // Color bar theme based on bank
  const getBankBadgeColor = () => {
    if (config.bankCode === 'PNB') return 'bg-rose-800 text-white';
    if (config.bankCode === 'BOB') return 'bg-orange-600 text-white';
    if (config.bankCode === 'CANARA') return 'bg-sky-600 text-white';
    if (config.bankCode === 'BOI') return 'bg-amber-700 text-white';
    return 'bg-blue-800 text-white';
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
              Bank Passbook Inner Page Generator & Printer
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Print official passbook front and inner detail pages for SBI, PNB, BOB, Canara, BOI & Union Bank with customer photo & stamp.
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Bank Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-xs font-semibold text-slate-600">Select Bank:</span>
          {(['SBI', 'PNB', 'BOB', 'CANARA', 'BOI', 'UNION'] as const).map((bCode) => (
            <button
              key={bCode}
              onClick={() => handleBankChange(bCode)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                config.bankCode === bCode
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {bCode === 'SBI' && 'State Bank of India (SBI)'}
              {bCode === 'PNB' && 'Punjab National Bank (PNB)'}
              {bCode === 'BOB' && 'Bank of Baroda (BOB)'}
              {bCode === 'CANARA' && 'Canara Bank'}
              {bCode === 'BOI' && 'Bank of India (BOI)'}
              {bCode === 'UNION' && 'Union Bank'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace: Form Inputs (Left) + Realistic Passbook Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Details */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
            Account Holder Details
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Account Holder Name</label>
              <input
                type="text"
                value={config.accountHolder}
                onChange={(e) => setConfig((p) => ({ ...p, accountHolder: e.target.value.toUpperCase() }))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-bold uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  value={config.accountNumber}
                  onChange={(e) => setConfig((p) => ({ ...p, accountNumber: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">CIF Number</label>
                <input
                  type="text"
                  value={config.cifNumber}
                  onChange={(e) => setConfig((p) => ({ ...p, cifNumber: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={config.ifscCode}
                  onChange={(e) => setConfig((p) => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono font-bold uppercase"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Issue Date</label>
                <input
                  type="text"
                  value={config.issueDate}
                  onChange={(e) => setConfig((p) => ({ ...p, issueDate: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Branch Name</label>
              <input
                type="text"
                value={config.branchName}
                onChange={(e) => setConfig((p) => ({ ...p, branchName: e.target.value }))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Customer Address</label>
              <input
                type="text"
                value={config.customerAddress}
                onChange={(e) => setConfig((p) => ({ ...p, customerAddress: e.target.value }))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md"
              />
            </div>

            {/* Customer Photo Upload */}
            <div className="pt-2">
              <label className="relative flex items-center gap-3 border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-lg p-2.5 cursor-pointer">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-700">Attach Customer Photo</span>
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

            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.stampApproved}
                  onChange={(e) => setConfig((p) => ({ ...p, stampApproved: e.target.checked }))}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold">Include Official Verified Bank Stamp Seal</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Passbook Page Visual Preview */}
        <div className="lg:col-span-7 bg-slate-100/70 rounded-xl border border-slate-200 p-6 flex flex-col items-center overflow-x-auto">
          
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-600 font-semibold px-2">
            <span>Passbook Inner Page Print Preview (Landscape A4 or Direct Book Tray)</span>
            <span className="font-mono text-[11px] text-slate-500">200 × 135 mm</span>
          </div>

          {/* Realistic Bank Passbook Frame */}
          <div
            id="print-sheet-area"
            className="w-full max-w-[620px] bg-white rounded-md shadow-xl border border-slate-300 overflow-hidden select-none print:shadow-none print:border-none print:m-0"
          >
            {/* Bank Header Ribbon */}
            <div className={`px-6 py-3.5 flex items-center justify-between ${getBankBadgeColor()}`}>
              <div>
                <h3 className="text-base font-extrabold tracking-wide">
                  {config.bankName.toUpperCase()}
                </h3>
                <span className="text-[10px] text-white/80 font-medium">
                  बचत बैंक पासबुक / SAVINGS BANK PASSBOOK
                </span>
              </div>
              <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                {config.bankCode}
              </span>
            </div>

            {/* Inner Details Layout */}
            <div className="p-6 relative bg-white">
              {/* Center Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <Building2 className="w-56 h-56 text-slate-900" />
              </div>

              <div className="grid grid-cols-12 gap-4">
                {/* Text fields list */}
                <div className="col-span-8 space-y-2 text-xs">
                  <div className="flex border-b border-dashed border-slate-200 pb-1">
                    <span className="w-40 text-slate-500 font-semibold">Name / नाम:</span>
                    <span className="font-bold text-slate-900 truncate">{config.accountHolder}</span>
                  </div>

                  <div className="flex border-b border-dashed border-slate-200 pb-1">
                    <span className="w-40 text-slate-500 font-semibold">Account No / खाता सं.:</span>
                    <span className="font-mono font-bold text-slate-900">{config.accountNumber}</span>
                  </div>

                  <div className="flex border-b border-dashed border-slate-200 pb-1">
                    <span className="w-40 text-slate-500 font-semibold">CIF No / सीआईएफ:</span>
                    <span className="font-mono font-semibold text-slate-800">{config.cifNumber}</span>
                  </div>

                  <div className="flex border-b border-dashed border-slate-200 pb-1">
                    <span className="w-40 text-slate-500 font-semibold">IFSC Code / आईएफएससी:</span>
                    <span className="font-mono font-bold text-indigo-700">{config.ifscCode}</span>
                  </div>

                  <div className="flex border-b border-dashed border-slate-200 pb-1">
                    <span className="w-40 text-slate-500 font-semibold">Branch / शाखा:</span>
                    <span className="font-semibold text-slate-800">{config.branchName}</span>
                  </div>

                  <div className="flex border-b border-dashed border-slate-200 pb-1">
                    <span className="w-40 text-slate-500 font-semibold">Account Type:</span>
                    <span className="font-semibold text-slate-800">{config.accountType} Savings</span>
                  </div>

                  <div className="flex border-b border-dashed border-slate-200 pb-1">
                    <span className="w-40 text-slate-500 font-semibold">Date of Issue:</span>
                    <span className="font-mono font-semibold text-slate-800">{config.issueDate}</span>
                  </div>

                  <div className="flex pt-1 text-[11px]">
                    <span className="w-40 text-slate-500 font-semibold">Address / पता:</span>
                    <span className="text-slate-700">{config.customerAddress}</span>
                  </div>
                </div>

                {/* Photo & Stamp Column */}
                <div className="col-span-4 flex flex-col items-center justify-between">
                  <div className="w-24 h-28 bg-slate-100 border border-slate-300 rounded overflow-hidden shadow-xs">
                    {config.photoSrc ? (
                      <img src={config.photoSrc} alt="Customer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                        Photo
                      </div>
                    )}
                  </div>

                  {config.stampApproved && (
                    <div className="mt-3 border-2 border-dashed border-blue-600 text-blue-700 rounded-full px-3 py-1.5 text-center -rotate-12 select-none">
                      <span className="text-[9px] font-bold block">{config.bankName.slice(0, 16).toUpperCase()}</span>
                      <span className="text-[10px] font-black block">VERIFIED & APPROVED</span>
                      <span className="text-[8px] font-mono block">OFFICIAL SEAL</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Instructions */}
              <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono">
                PLEASE GET YOUR PASSBOOK UPDATED REGULARLY · SK PRINT PORTAL PASSBOOK ENGINE
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
