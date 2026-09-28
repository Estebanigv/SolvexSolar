export const maxBillBytes = 10 * 1024 * 1024;

/** Validate size, extension and signature before creating a local preview URL. */
export async function validateBillFile(file: File): Promise<string> {
  if (!file.size || file.size > maxBillBytes) throw new Error('Selecciona un archivo de hasta 10 MB que no esté vacío.');
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const extension = file.name.split('.').pop()?.toLowerCase();
  const signatures: Record<string, {mime: string; bytes: number[]}> = {
    pdf: {mime: 'application/pdf', bytes: [37,80,68,70,45]},
    png: {mime: 'image/png', bytes: [137,80,78,71,13,10,26,10]},
    jpg: {mime: 'image/jpeg', bytes: [255,216,255]},
    jpeg: {mime: 'image/jpeg', bytes: [255,216,255]},
  };
  const format = signatures[extension ?? ''];
  if (!format || !format.bytes.every((b,i) => bytes[i] === b) || (file.type && file.type !== format.mime)) {
    throw new Error('Formato no válido. Usa la boleta original en PDF, JPG o PNG.');
  }
  return format.mime;
}
