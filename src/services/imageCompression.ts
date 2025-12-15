interface CompressedImage {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}

interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  targetSize: number;
  maxSize: number;
  format: 'webp' | 'jpeg';
  minQuality?: number;
}

interface ThumbnailOptions {
  width: number;
  height: number;
  maxSize: number;
}

const WEBP_SUPPORTED = (() => {
  const elem = document.createElement('canvas');
  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
})();

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function fixImageOrientation(img: HTMLImageElement, orientation: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  let width = img.width;
  let height = img.height;

  if (orientation > 4 && orientation < 9) {
    canvas.width = height;
    canvas.height = width;
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      break;
  }

  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function getImageOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target?.result as ArrayBuffer);
      if (view.getUint16(0, false) !== 0xffd8) {
        resolve(1);
        return;
      }
      const length = view.byteLength;
      let offset = 2;
      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) {
          resolve(1);
          return;
        }
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xffe1) {
          offset += 2;
          if (view.getUint32(offset, false) !== 0x45786966) {
            resolve(1);
            return;
          }
          const little = view.getUint16((offset += 6), false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + i * 12, little) === 0x0112) {
              resolve(view.getUint16(offset + i * 12 + 8, little));
              return;
            }
          }
        } else if ((marker & 0xff00) !== 0xff00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      resolve(1);
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file);
  });
}

function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width > height) {
    return {
      width: maxWidth,
      height: Math.round(maxWidth / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxHeight * aspectRatio),
      height: maxHeight,
    };
  }
}

async function compressImageWithQuality(
  img: HTMLImageElement,
  width: number,
  height: number,
  format: 'webp' | 'jpeg',
  quality: number
): Promise<{ blob: Blob; size: number }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ blob, size: blob.size });
        } else {
          reject(new Error('Failed to compress image'));
        }
      },
      format === 'webp' ? 'image/webp' : 'image/jpeg',
      quality
    );
  });
}

async function findOptimalQuality(
  img: HTMLImageElement,
  width: number,
  height: number,
  format: 'webp' | 'jpeg',
  targetSize: number,
  maxSize: number,
  minQuality: number = 0.55
): Promise<{ blob: Blob; quality: number }> {
  let quality = 0.92;
  let blob: Blob;
  let size: number;

  const result = await compressImageWithQuality(img, width, height, format, quality);
  blob = result.blob;
  size = result.size;

  if (size <= targetSize) {
    return { blob, quality };
  }

  let lowQuality = minQuality;
  let highQuality = quality;

  while (highQuality - lowQuality > 0.05) {
    quality = (lowQuality + highQuality) / 2;
    const result = await compressImageWithQuality(img, width, height, format, quality);
    blob = result.blob;
    size = result.size;

    if (size > maxSize) {
      highQuality = quality;
    } else if (size > targetSize) {
      return { blob, quality };
    } else {
      lowQuality = quality;
    }
  }

  const finalResult = await compressImageWithQuality(img, width, height, format, lowQuality);
  return { blob: finalResult.blob, quality: lowQuality };
}

export async function compressImage(
  file: File,
  options: CompressionOptions
): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image size must be less than 10MB');
  }

  const orientation = await getImageOrientation(file);
  let img = await loadImage(file);

  let canvas: HTMLCanvasElement;
  if (orientation > 1) {
    canvas = fixImageOrientation(img, orientation);
    const correctedImg = new Image();
    await new Promise((resolve) => {
      correctedImg.onload = resolve;
      correctedImg.src = canvas.toDataURL();
    });
    img = correctedImg;
  }

  const dimensions = calculateDimensions(
    img.width,
    img.height,
    options.maxWidth,
    options.maxHeight
  );

  const format = WEBP_SUPPORTED && options.format === 'webp' ? 'webp' : 'jpeg';

  const { blob, quality } = await findOptimalQuality(
    img,
    dimensions.width,
    dimensions.height,
    format,
    options.targetSize,
    options.maxSize,
    options.minQuality
  );

  const extension = format === 'webp' ? 'webp' : 'jpg';
  const compressedFile = new File([blob], `image.${extension}`, {
    type: `image/${format}`,
  });

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  console.log(
    `Compressed to ${(blob.size / 1024).toFixed(1)}KB (${dimensions.width}x${dimensions.height}) at quality ${(quality * 100).toFixed(0)}%`
  );

  return {
    file: compressedFile,
    dataUrl,
    width: dimensions.width,
    height: dimensions.height,
    size: blob.size,
  };
}

export async function generateThumbnail(
  file: File,
  options: ThumbnailOptions
): Promise<CompressedImage> {
  return compressImage(file, {
    maxWidth: options.width,
    maxHeight: options.height,
    targetSize: options.maxSize * 0.75,
    maxSize: options.maxSize,
    format: 'webp',
    minQuality: 0.6,
  });
}

export async function compressProfilePhoto(file: File): Promise<{
  optimized: CompressedImage;
  thumbnail: CompressedImage;
}> {
  const optimized = await compressImage(file, {
    maxWidth: 1024,
    maxHeight: 1024,
    targetSize: 200 * 1024,
    maxSize: 300 * 1024,
    format: 'webp',
  });

  const thumbnail = await generateThumbnail(file, {
    width: 256,
    height: 256,
    maxSize: 40 * 1024,
  });

  return { optimized, thumbnail };
}

export async function compressVehiclePhoto(file: File): Promise<{
  optimized: CompressedImage;
  thumbnail: CompressedImage;
}> {
  const optimized = await compressImage(file, {
    maxWidth: 1600,
    maxHeight: 1600,
    targetSize: 600 * 1024,
    maxSize: 900 * 1024,
    format: 'webp',
  });

  const thumbnail = await generateThumbnail(file, {
    width: 512,
    height: 512,
    maxSize: 80 * 1024,
  });

  return { optimized, thumbnail };
}
