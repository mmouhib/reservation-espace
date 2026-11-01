const MAX_SIDE = 1600;
const MAX_BYTES = 1024 * 1024;

/**
 * Makes a phone photo small enough to upload: at most 1600 px wide or high, as a JPEG. Photos that are
 * already small, and formats the browser cannot draw (such as HEIC), are sent as they are.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  if (file.size <= MAX_BYTES || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return jpeg && jpeg.size < file.size ? jpeg : file;
  } catch {
    return file;
  }
}
