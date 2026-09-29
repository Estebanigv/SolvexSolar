export function whatsappNumber(value:string):string|null{
  if(!value.trim())return '';
  if(!/^[+\d\s().-]+$/.test(value))return null;
  let digits=value.replace(/\D/g,'').replace(/^00/,'');
  if(/^9\d{8}$/.test(digits))digits='56'+digits;
  return /^[1-9]\d{7,14}$/.test(digits)?digits:null;
}
export function whatsappUrl(phone:string,text:string){
  const number=whatsappNumber(phone);
  return number===null?null:`https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
