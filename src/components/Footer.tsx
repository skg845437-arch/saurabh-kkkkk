import React from 'react';
import { ShieldCheck, Heart, Printer, CreditCard, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                SK
              </div>
              <span className="font-bold text-base text-slate-900 tracking-tight">
                SK Print Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              India&apos;s 100% Free Professional ID Card, PVC 5-Card Sheet, Passport Photo & Bank Passbook print portal designed for CSC Kendras, Cyber Cafés, Online Jan Seva Kendras, and print shops.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Zero Server Upload · 100% Client-Side Privacy Guaranteed</span>
            </div>
          </div>

          {/* Supported ID Standards */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Supported ID Cards
            </h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>UIDAI e-Aadhaar Card (CR80 PVC)</li>
              <li>NSDL &amp; UTI PAN Card (ITD standard)</li>
              <li>Election Commission Voter EPIC 2.0</li>
              <li>Ayushman Bharat PM-JAY Golden Card</li>
              <li>Parivahan Driving License &amp; RC</li>
              <li>Ministry of Labour e-Shram Card</li>
            </ul>
          </div>

          {/* Quick Printing Guidelines */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Printer Settings
            </h4>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>Paper: <strong>A4 Photo Glossy (180-250 GSM)</strong></li>
              <li>Scale: <strong>100% / Actual Size</strong></li>
              <li>Margins: <strong>None / Minimum</strong></li>
              <li>Tray Mode: <strong>Epson / Canon PVC Tray</strong></li>
              <li>Resolution: <strong>300 DPI - 600 DPI High</strong></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} SK Print Portal. Free for public &amp; CSC use.
          </p>
          <div className="flex items-center gap-4">
            <span>Shortcut: <strong>Ctrl + P</strong> for Instant Print</span>
            <span aria-hidden="true">·</span>
            <span>CR80 PVC Standard: 85.60 mm × 53.98 mm</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
