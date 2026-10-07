import {Font,FontNames,Encodings} from '@pdf-lib/standard-fonts';
import type {ProposalStyle} from './proposal-style';
const regular=Font.load(FontNames.Helvetica),bold=Font.load(FontNames.HelveticaBold);
export const printableText=(text:string)=>Array.from(text.normalize('NFC').replace(/\t/g,'  ').replace(/\u202f/g,' ').replace(/₂/g,'2').replace(/−/g,'-')).map(c=>c==='\n'||Encodings.WinAnsi.canEncodeUnicodeCodePoint(c.codePointAt(0)!)?c:'?').join('');
export function measure(text:string,size:number,isBold=false,family:ProposalStyle['font']='sans'){const font=family==='sans'?(isBold?bold:regular):Font.load(family==='serif'?(isBold?FontNames.TimesRomanBold:FontNames.TimesRoman):(isBold?FontNames.CourierBold:FontNames.Courier));return Array.from(printableText(text)).reduce((sum,c)=>sum+(font.getWidthOfGlyph(Encodings.WinAnsi.encodeUnicodeCodePoint(c.codePointAt(0)!).name)||0),0)*size/1000;}
export function wrapProposal(text:string,size:number,maxWidth:number,isBold=false,family:ProposalStyle['font']='sans'){
 const width=(text:string,size:number,b=false)=>measure(text,size,b,family);
 const result:string[]=[];
 for(const paragraph of printableText(text).split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   if(width(line?line+' '+word:word,size,isBold)<=maxWidth){line=line?line+' '+word:word;continue;}
   if(line){result.push(line);line='';}
   for(const char of word){if(line&&width(line+char,size,isBold)>maxWidth){result.push(line);line='';}line+=char;}
  }
  result.push(line);
 }
 return result;
}
