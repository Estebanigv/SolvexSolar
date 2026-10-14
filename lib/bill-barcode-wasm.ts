import {readBarcodes, type ReaderOptions} from 'zxing-wasm/reader';
import type {BillCode} from './bill-barcode';

const options:ReaderOptions={formats:['PDF417','QRCode','Code128','Code39','ITF','EAN13','DataMatrix'],tryHarder:true,tryRotate:true,tryInvert:true,tryDenoise:true,maxNumberOfSymbols:8,textMode:'Plain',returnErrors:false};
const names:Record<string,string>={PDF417:'PDF_417',QRCode:'QR_CODE',Code128:'CODE_128',Code39:'CODE_39',EAN13:'EAN_13',DataMatrix:'DATA_MATRIX'};

/** Accept only successfully decoded symbols. Never fetch a decoded URL. */
export async function decodeBillPixelsEnhanced(pixels:Uint8ClampedArray,width:number,height:number):Promise<BillCode[]>{
 const result:BillCode[]=[];
 const input={data:pixels,width,height,colorSpace:'srgb'} as ImageData;
 for(const binarizer of ['LocalAverage','GlobalHistogram'] as const){
  const found=await readBarcodes(input,{...options,binarizer});
  for(const code of found)if(code.isValid&&code.text.length>0&&code.text.length<=10000&&!result.some(item=>item.text===code.text))result.push({format:names[code.format]??code.format,text:code.text});
  if(result.length)break;
 }
 return result;
}
