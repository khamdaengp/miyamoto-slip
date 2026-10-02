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

/**
 * Safely copies an image Blob to the user's system clipboard.
 * Works on modern browsers (Android Chrome, iOS Safari 13.4+, Desktop Chrome/Edge/Safari).
 */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    console.warn('ClipboardItem API is not available on this device/browser');
    return false;
  }

  try {
    const item = new ClipboardItem({ [blob.type || 'image/png']: blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (error) {
    console.warn('navigator.clipboard.write failed:', error);
    return false;
  }
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
 * Shares an image Blob using the device's native Share Sheet (if supported)
 */
export async function shareImageBlob(
  blob: Blob,
  filename: string,
  title: string,
  text: string
): Promise<boolean> {
  try {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title,
        text,
        files: [file],
      });
      return true;
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.warn('Native share failed:', error);
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
