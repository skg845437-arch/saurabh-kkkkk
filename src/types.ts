export type CardType = 
  | 'aadhaar' 
  | 'pan' 
  | 'voter' 
  | 'ayushman' 
  | 'driving_license' 
  | 'eshram' 
  | 'ration' 
  | 'custom';

export type SheetMode = 'a4_5card' | 'pvc_tray' | 'single_pvc' | 'photo_4x6';

export interface CardRecord {
  id: string;
  cardType: CardType;
  holderName: string;
  cardNumber: string;
  frontImage: string | null;
  backImage: string | null;
  borderWidth: number; // 0, 1, 2px
  borderColor: string;
  includeCutMarks: boolean;
  createdAt: number;
}

export interface CropArea {
  x: number; // percentage (0 to 100) or pixels
  y: number;
  width: number;
  height: number;
}

export interface PassportPhotoConfig {
  photoSrc: string | null;
  copiesCount: number; // 8, 12, 16, 32
  paperSize: '4x6' | 'A4' | 'single';
  backgroundColor: string; // 'original' | '#FFFFFF' | '#90CAF9' | '#E0E0E0'
  addNameDate: boolean;
  fullName: string;
  photoDate: string;
  borderWidth: number;
}

export interface PanCropConfig {
  photoSrc: string | null;
  signSrc: string | null;
  thresholdLevel: number; // for signature whitening
  contrast: number;
  brightness: number;
}

export interface BankPassbookConfig {
  bankName: string;
  bankCode: 'SBI' | 'PNB' | 'BOB' | 'CANARA' | 'BOI' | 'UNION' | 'HDFC' | 'ICICI';
  accountHolder: string;
  accountNumber: string;
  cifNumber: string;
  ifscCode: string;
  micrCode: string;
  branchName: string;
  customerAddress: string;
  issueDate: string;
  accountType: 'Savings' | 'Current' | 'PMJDY';
  photoSrc: string | null;
  stampApproved: boolean;
}
