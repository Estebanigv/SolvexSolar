import {MultiFormatReader,RGBLuminanceSource,BinaryBitmap,HybridBinarizer,DecodeHintType,BarcodeFormat} from '@zxing/library';

export function decodeBillPixels(pixels:Uint8ClampedArray,width:number,height:number){
  const gray=new Uint8ClampedArray(width*height);
  for(let i=0;i<gray.length;i++)gray[i]=(pixels[i*4]+2*pixels[i*4+1]+pixels[i*4+2])/4;
  const reader=new MultiFormatReader();
  reader.setHints(new Map<DecodeHintType,BarcodeFormat[]|boolean>([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.QR_CODE,BarcodeFormat.PDF_417,BarcodeFormat.CODE_128,BarcodeFormat.CODE_39,BarcodeFormat.ITF,BarcodeFormat.EAN_13,BarcodeFormat.DATA_MATRIX]],[DecodeHintType.TRY_HARDER,true]]));
  const results:{format:string;text:string}[]=[];
  let data=gray,w=width,h=height;
  for(let rotation=0;rotation<4;rotation++){
    const source=new RGBLuminanceSource(data,w,h);
    for(const part of [source,source.crop(0,0,w,Math.ceil(h/2)),source.crop(0,Math.floor(h/2),w,Math.ceil(h/2))]){
      try{const found=reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(part)));const text=found.getText();if(text.length<=10000&&!results.some(r=>r.text===text))results.push({text,format:BarcodeFormat[found.getBarcodeFormat()]})}catch{/* No decodable symbol in this area. */}
    }
    const rotated=new Uint8ClampedArray(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)rotated[x*h+(h-1-y)]=data[y*w+x];
    data=rotated;[w,h]=[h,w];
  }
  return results;
}
