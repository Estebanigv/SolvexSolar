import {decodeBillPixels} from './bill-barcode-decode';
self.onmessage=(event:MessageEvent<{pixels:Uint8ClampedArray;width:number;height:number}>)=>{const {pixels,width,height}=event.data;self.postMessage(decodeBillPixels(pixels,width,height))};
