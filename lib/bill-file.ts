export const maxBillBytes = 10 * 1024 * 1024;
export const maxBillFiles = 8;
export const maxBillTotalBytes = 40 * 1024 * 1024;
export function validateBillBatch(files:Pick<File,'size'>[]){
  if(files.length>maxBillFiles)throw Error(`Puedes adjuntar hasta ${maxBillFiles} archivos de la misma boleta.`);
  if(files.reduce((sum,file)=>sum+file.size,0)>maxBillTotalBytes)throw Error('El total de documentos no puede superar 40 MB.');
}
export function billStorageName(index:number){
  if(!Number.isInteger(index)||index<0||index>=maxBillFiles)throw Error('Documento fuera del límite permitido.');
  return index===0?'frente':index===1?'reverso':`documento-${index+1}`;
}
export const billStorageNames=Array.from({length:maxBillFiles},(_,i)=>billStorageName(i));

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
