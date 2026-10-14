import {decodeBillPixels} from './bill-barcode-decode';
import {prepareZXingModule} from 'zxing-wasm/reader';
import {decodeBillPixelsEnhanced} from './bill-barcode-wasm';
import type {BillCodeScan} from './bill-barcode';
// Self hosted: no bill image or code is sent to a third party.
prepareZXingModule({overrides:{locateFile:()=>'/ocr/zxing_reader.wasm'}});
self.onmessage=async(event:MessageEvent<{pixels:Uint8ClampedArray;width:number;height:number}>)=>{
 const {pixels,width,height}=event.data;
 let response:BillCodeScan;
 try{response={codes:await decodeBillPixelsEnhanced(pixels,width,height)}}
 catch{response={codes:decodeBillPixels(pixels,width,height),warning:'El lector avanzado no pudo cargarse. Se utilizó el lector básico; vuelve a intentar con conexión para leer timbres PDF417.'}}
 self.postMessage(response);
};
