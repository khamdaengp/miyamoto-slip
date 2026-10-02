import { toBlob, toPng } from 'html-to-image';
import { EmployeeRecord } from '../types/payroll';

/**
 * Capture an HTMLElement as a high-resolution PNG Blob
 */
export async function captureElementToBlob(element: HTMLElement): Promise<Blob | null> {
  try {
    const blob = await toBlob(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true, // Prevents security errors with external Google Fonts stylesheet rules
    });
    return blob;
  } catch (error) {
    console.error('Failed to capture payslip element to blob:', error);
    try {
      // Fallback capture without cache busting
      const fallbackBlob = await toBlob(element, {
        pixelRatio: 1.5,
        backgroundColor: '#ffffff',
        skipFonts: true,
      });
      return fallbackBlob;
    } catch (fallbackErr) {
      console.error('Fallback capture also failed:', fallbackErr);
      return null;
    }
  }
}

/**
 * Capture an HTMLElement as a high-resolution Data URL (PNG)
 */
export async function captureElementToDataUrl(element: HTMLElement): Promise<string | null> {
  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to capture payslip element to data URL:', error);
    return null;
  }
}

import { Capacitor } from '@capacitor/core';
import { Clipboard as CapClipboard } from '@capacitor/clipboard';
import { Share as CapShare } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * Safely copies an image Blob to the user's system clipboard.
 * Supports Capacitor Native Clipboard (base64 image), Web ClipboardItem, and Data URLs.
 */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  // 1. Try Capacitor Native Clipboard Plugin (Mobile Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const dataUrl = await base64Promise;
      
      await CapClipboard.write({
        image: dataUrl
      });
      console.log('Successfully copied image using Capacitor Native Clipboard');
      return true;
    } catch (nativeErr) {
      console.warn('Capacitor Native Clipboard write failed, trying web fallback:', nativeErr);
    }
  }

  // 2. Modern Async Web Clipboard API with ClipboardItem (Desktop & Modern Mobile Web)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const mimeType = blob.type || 'image/png';
      const item = new ClipboardItem({ [mimeType]: blob });
      await navigator.clipboard.write([item]);
      console.log('Successfully copied image to clipboard via ClipboardItem');
      return true;
    } catch (error) {
      console.warn('navigator.clipboard.write([ClipboardItem]) error:', error);
    }
  }

  return false;
}

/**
 * Triggers a direct file download of an image Blob
 */
export function downloadImageBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Shares an image Blob using Capacitor Native Share or Web Share API
 */
export async function sharePayslipImageFile(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<boolean> {
  // 1. Try Capacitor Native File Save & Share (Best on Android & iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          // extract base64 data without prefix for Filesystem.writeFile
          const base64Data = res.split(',')[1] || res;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const base64Data = await base64Promise;

      const fileResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });

      if (fileResult.uri) {
        await CapShare.share({
          title,
          text,
          url: fileResult.uri,
          dialogTitle: 'ສົ່ງໃບເງິນເດືອນຜ່ານ WhatsApp'
        });
        return true;
      }
    } catch (shareErr) {
      console.warn('Native Filesystem/Share failed, falling back:', shareErr);
    }
  }

  // 2. Web Share API fallback (e.g. Chrome Mobile)
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return true;
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.warn('Web share failed:', error);
    }
  }

  return false;
}

/**
 * Standard filename generator for an employee payslip
 */
export function getPayslipFilename(employee: EmployeeRecord, periodId: string): string {
  const cleanId = employee.employeeId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `Payslip_${cleanId}_${periodId}.png`;
}
