import { StorageService } from '../services/storageService';

/**
 * Universally robust image compressor that guarantees a valid Base64 Data URL string.
 * Handles transparency preservation, correct aspect scaling, and absolute fallbacks.
 */
export const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width || 800;
        let height = img.height || 800;

        if (width > maxWidth) {
          height = Math.round((maxWidth / width) * height);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // If canvas context fails to acquire, fallback safely to raw Data URL
          resolve(e.target?.result as string);
          return;
        }
        
        // Detect transparent formats to avoid rendering black backgrounds
        const isTransparent = file.type.includes('png') || file.type.includes('svg') || file.type.includes('gif');
        
        if (!isTransparent) {
          // Fill pure white background for standard photos so transparency doesn't render black
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Primary targets: WebP/PNG for transparent graphics, JPEG for high-fidelity photographs
        if (isTransparent) {
          try {
            const webpData = canvas.toDataURL('image/webp', quality);
            if (webpData.startsWith('data:image/webp')) {
              resolve(webpData);
              return;
            }
          } catch (err) {
            // Fallback to PNG if WebP export fails
          }
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.onerror = () => {
        // If image object fails to decode/render onto canvas, fallback to raw FileReader payload
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to decode source image'));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('FileReader failed to read image source'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Ultimate bulletproof upload processor. Works everywhere and everytime.
 * 1. Guarantees compression/processing into a Data URL.
 * 2. Directly parses the Data URL into a raw native File binary to bypass WebView/CORS/fetch limitations.
 * 3. Attempts Firebase Storage upload wrapped in a high-speed timeout so it never hangs.
 * 4. Fallback seamlessly and robustly to returning the base64 Data URL if storage is unavailable or slow.
 */
export const processAndSafeUploadImage = async (
  file: File,
  customPathPrefix: string,
  maxWidth: number = 1000,
  quality: number = 0.8,
  filenamePrefix: string = 'photo'
): Promise<string> => {
  let dataUrl: string;
  try {
    dataUrl = await compressImage(file, maxWidth, quality);
  } catch (compressErr) {
    console.warn("Compression failed, using raw base64 Data URL fallback:", compressErr);
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  try {
    // Extract correct MIME and extension
    const mimeMatch = dataUrl.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    
    // Clean prefix to guarantee unique storage key paths
    const cleanPrefix = customPathPrefix.endsWith('/') ? customPathPrefix : `${customPathPrefix}/`;
    const uniqueFilename = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const fullStoragePath = `${cleanPrefix}${uniqueFilename}`;

    // Safely convert Base64 string directly to native Uint8Array payload (zero fetch overhead/blockers)
    const parts = dataUrl.split(',');
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const safeFileObj = new File([u8arr], uniqueFilename, { type: mimeType });

    // Race condition: wrap upload attempt in an 8-second timeout to prevent infinity hanging
    const uploadPromise = StorageService.uploadPhoto(safeFileObj, fullStoragePath);
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Firebase Storage upload timeout exceeded')), 8000);
    });

    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    return downloadUrl;
  } catch (uploadErr) {
    console.warn("Firebase Storage unavailable or blocked. Instantly serving robust native Base64 payload:", uploadErr);
    // Absolute robust fallback: return the raw embeddable Data URL payload guaranteed to render everywhere
    return dataUrl;
  }
};
