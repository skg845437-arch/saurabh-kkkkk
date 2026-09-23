import * as pdfjsLib from 'pdfjs-dist';

// Set up pdf.js worker safely
try {
  // Use public unpkg/cdnjs worker for clean browser execution
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF Worker initialization notice:', e);
}

export interface LoadedDocumentPage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Load an uploaded file (PDF or Image) and return an array of pages as high-res images
 */
export async function loadDocumentPages(
  file: File,
  password?: string
): Promise<{ pages: LoadedDocumentPage[]; isPdf: boolean; error?: string }> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    // Standard Image File (JPG, PNG, WEBP)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          resolve({
            isPdf: false,
            pages: [
              {
                pageNumber: 1,
                dataUrl,
                width: img.width,
                height: img.height,
              },
            ],
          });
        };
        img.onerror = () => {
          resolve({ isPdf: false, pages: [], error: 'Unable to decode image file.' });
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        resolve({ isPdf: false, pages: [], error: 'Failed to read file.' });
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle PDF with pdfjs-dist
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password || undefined,
    });

    const pdfDoc = await loadingTask.promise;
    const pages: LoadedDocumentPage[] = [];

    // Render up to 5 pages
    const numPages = Math.min(pdfDoc.numPages, 5);

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      // Scale 2.5x for sharp 300 DPI print quality
      const viewport = page.getViewport({ scale: 2.5 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await page.render({
          canvasContext: ctx,
          viewport,
          canvas,
        }).promise;

        pages.push({
          pageNumber: i,
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        });
      }
    }

    return { isPdf: true, pages };
  } catch (err: unknown) {
    const errObj = err as { name?: string; message?: string };
    if (errObj.name === 'PasswordException' || errObj.message?.includes('password')) {
      return {
        isPdf: true,
        pages: [],
        error: 'PASSWORD_REQUIRED',
      };
    }
    return {
      isPdf: true,
      pages: [],
      error: errObj.message || 'Error parsing PDF document.',
    };
  }
}
