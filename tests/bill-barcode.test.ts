import assert from 'node:assert/strict';
import {QRCodeWriter,BarcodeFormat} from '@zxing/library';
import {decodeBillPixels} from '../lib/bill-barcode-decode';
import {billCodeSummary} from '../lib/bill-code-summary';
const code='REFERENCIA-DE-PRUEBA-123456';
const matrix=new QRCodeWriter().encode(code,BarcodeFormat.QR_CODE,240,240,new Map());
const pixels=new Uint8ClampedArray(240*240*4);
for(let y=0;y<240;y++)for(let x=0;x<240;x++){const i=(y*240+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=matrix.get(x,y)?0:255;pixels[i+3]=255}
assert.ok(decodeBillPixels(pixels,240,240).some(result=>result.text===code&&result.format==='QR_CODE'));
// Independent fixture: ReportLab Code128 encoder, including its checksum and stop pattern.
const pattern='BaAbCbAaBbCbAcAaBcCcAaBaBdAaAbBaDaBaAaBbCbAcAaBcCcAaBaBdAaAbBaBbBbBcCaAaB';
const widths=[...pattern].map(c=>(c.toLowerCase().charCodeAt(0)-96)*3);
const barcodeWidth=widths.reduce((a,b)=>a+b,60),barcodeHeight=130;
const bars=new Uint8ClampedArray(barcodeWidth*barcodeHeight*4).fill(255);
let column=30;
for(let i=0;i<pattern.length;i++){if(pattern[i]===pattern[i].toUpperCase())for(let y=10;y<120;y++)for(let x=column;x<column+widths[i];x++){const offset=(y*barcodeWidth+x)*4;bars[offset]=bars[offset+1]=bars[offset+2]=0}column+=widths[i]}
assert.ok(decodeBillPixels(bars,barcodeWidth,barcodeHeight).some(result=>result.text==='123456789012345678'&&result.format==='CODE_128'));
assert.equal(billCodeSummary('812159058824221494'),null,'Opaque payment digits must not become a bill amount');
assert.equal(billCodeSummary('https://example.com/boleta?total=999999'),null,'URLs are not fetched or trusted as bill values');
assert.deepEqual(billCodeSummary('<TED version="1.0"><DD><RE>11111111-1</RE><RR>22222222-2</RR><RSR>Cliente de prueba</RSR><F>123</F><MNT>120000</MNT></DD></TED>'),{recipient:'Cliente de prueba',recipientRut:'22222222-2',folio:'123',documentAmount:120000});
assert.equal(billCodeSummary('<!DOCTYPE foo><TED><DD><MNT>120000</MNT></DD></TED>'),null);
console.log('Códigos: decodificación QR real y separación del emisor, receptor y monto: OK');
