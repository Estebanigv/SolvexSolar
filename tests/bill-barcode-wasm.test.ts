import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {prepareZXingModule} from 'zxing-wasm/reader';
import {decodeBillPixelsEnhanced} from '../lib/bill-barcode-wasm';
import fixture from './fixtures/pdf417.json';

async function run(){
 prepareZXingModule({overrides:{wasmBinary:readFileSync(require.resolve('zxing-wasm/reader/zxing_reader.wasm'))}});
 // Fictional TED, encoded by Zint via ZXing's writer. No customer data in fixtures.
 const luma=inflateSync(Buffer.from(fixture.luma,'base64'));
 const width=fixture.width*3+60,height=fixture.height*3+60;
 const pixels=new Uint8ClampedArray(width*height*4).fill(255);
 for(let y=0;y<fixture.height*3;y++)for(let x=0;x<fixture.width*3;x++){
  const value=luma[Math.floor(y/3)*fixture.width+Math.floor(x/3)];
  const offset=((y+30)*width+x+30)*4;pixels[offset]=pixels[offset+1]=pixels[offset+2]=value;
 }
 assert.deepEqual(await decodeBillPixelsEnhanced(pixels,width,height),[{format:'PDF_417',text:fixture.text}]);
 const rotated=new Uint8ClampedArray(pixels.length);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<4;c++)rotated[(x*height+height-1-y)*4+c]=pixels[(y*width+x)*4+c];
 assert.deepEqual(await decodeBillPixelsEnhanced(rotated,height,width),[{format:'PDF_417',text:fixture.text}]);
 assert.deepEqual(await decodeBillPixelsEnhanced(new Uint8ClampedArray(200*200*4).fill(255),200,200),[]);
 console.log('PDF417 real: timbre, rotación y ausencia de falsos resultados: OK');
}
void run().catch(error=>{console.error(error);process.exitCode=1});
