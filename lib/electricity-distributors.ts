/** Recognition catalog, not a tariff table or an exhaustive authorization list.
 * Sources and limitations: docs/distribuidoras-chile.md. Keep legacy bill names.
 */
export const electricityDistributors = [
  {name:'ENEL',aliases:['ENEL DISTRIBUCIÓN CHILE','CHILECTRA']},
  {name:'CGE',aliases:['CGED','COMPAÑÍA GENERAL DE ELECTRICIDAD']},
  {name:'CHILQUINTA',aliases:['CHILQUINTA ENERGÍA']},
  {name:'SAESA',aliases:['SOCIEDAD AUSTRAL DE ELECTRICIDAD']},
  {name:'FRONTEL',aliases:['EMPRESA ELÉCTRICA DE LA FRONTERA']},
  {name:'EDELAYSEN',aliases:['EMPRESA ELÉCTRICA DE AISÉN']},
  {name:'EDELMAG',aliases:['EMPRESA ELÉCTRICA DE MAGALLANES']},
  {name:'LUZ OSORNO',aliases:['LUZOSORNO','COMPAÑÍA ELÉCTRICA OSORNO']},
  {name:'LUZ LINARES',aliases:['LUZLINARES']},
  {name:'LUZ PARRAL',aliases:['LUZPARRAL','DISTRIBUIDORA PARRAL']},
  {name:'LUZ ANDES',aliases:['LUZANDES']},
  {name:'EEPA',aliases:['EMPRESA ELÉCTRICA PUENTE ALTO']},
  {name:'EEC',aliases:['EMPRESA ELÉCTRICA DE COLINA','ELÉCTRICA COLINA']},
  {name:'EMELCA',aliases:['EMPRESA ELÉCTRICA DE CASABLANCA']},
  {name:'EDECSA',aliases:['ENERGÍA DE CASABLANCA']},
  {name:'CEC',aliases:['COOPERATIVA ELÉCTRICA CURICÓ','COOPERATIVA DE ABASTECIMIENTO DE ENERGÍA ELÉCTRICA CURICÓ']},
  {name:'CODINER',aliases:['COMPAÑÍA DISTRIBUIDORA DE ENERGÍA ELÉCTRICA']},
  {name:'COELCHA',aliases:['COOPERATIVA ELÉCTRICA CHARRÚA','COOPERATIVA DE CONSUMO DE ENERGÍA ELÉCTRICA CHARRÚA']},
  {name:'COPELEC',aliases:['COOPERATIVA DE CONSUMO DE ENERGÍA ELÉCTRICA CHILLÁN']},
  {name:'COOPELAN',aliases:['COOPERATIVA ELÉCTRICA LOS ÁNGELES']},
  {name:'COOPERSOL',aliases:['COOPERATIVA DE ABASTECIMIENTO DE ENERGÍA ELÉCTRICA SOCOROMA']},
  {name:'COOPREL',aliases:['COOPERATIVA RURAL ELÉCTRICA RÍO BUENO']},
  {name:'CRELL',aliases:['COOPERATIVA REGIONAL ELÉCTRICA LLANQUIHUE','COOPERATIVA RURAL ELÉCTRICA LLANQUIHUE']},
  {name:'SOCOEPA',aliases:['COOPERATIVA ELÉCTRICA PAILLACO']},
  {name:'LITORAL',aliases:['COMPAÑÍA ELÉCTRICA DEL LITORAL'],ambiguous:true},
  {name:'TILTIL',aliases:['TIL TIL','TIL-TIL','EMPRESA ELÉCTRICA MUNICIPAL DE TIL TIL'],ambiguous:true},
  {name:'SASIPA',aliases:[]},
  {name:'MATAQUITO',aliases:['ELÉCTRICA MATAQUITO','EMPRESA ELÉCTRICA MATAQUITO'],ambiguous:true},
  {name:'CONAFE',aliases:[]},
  {name:'ELECDA',aliases:['EMPRESA ELÉCTRICA DE ANTOFAGASTA']},
  {name:'ELIQSA',aliases:['EMPRESA ELÉCTRICA DE IQUIQUE']},
  {name:'EMELARI',aliases:['EMPRESA ELÉCTRICA DE ARICA']},
  {name:'EMELAT',aliases:['EMPRESA ELÉCTRICA DE ATACAMA']},
  {name:'EMELECTRIC',aliases:[]},
  {name:'EMETAL',aliases:[]},
  {name:'ENELSA',aliases:[]},
] as const;

const key=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
function matches(text:string,explicit=false){
 const normalized=key(text);
 return electricityDistributors.filter(provider=>[provider.name,...provider.aliases].some(alias=>{
  const name=key(alias);
  // A commune or street called Tiltil / Litoral / Mataquito is not an issuer.
  if('ambiguous' in provider&&name.split(' ').length<=2&&!explicit){
   return normalized===name||normalized===name+' SA'||normalized===name+' S A'||normalized===name+' LTDA';
  }
  return (' '+normalized+' ').includes(' '+name+' ');
 }));
}

export function detectElectricityDistributor(text:string):{name?:string;evidence?:string;ambiguous:boolean}{
 const lines=text.split('\n').map(line=>line.trim()).filter(Boolean);
 const labeled=lines.flatMap(line=>{
  const match=line.match(/^(?:Empresa\s+distribuidora|Distribuidora(?:\s+el[eé]ctrica)?|Empresa\s+el[eé]ctrica|Proveedor(?:\s+de\s+electricidad)?)\s*:\s*(.{2,120})$/i);
  return match?[{value:match[1],line}]:[];
 });
 if(labeled.length){
  const found=labeled.flatMap(item=>{
   const known=matches(item.value,true);
   return known.length?known.map(provider=>({name:provider.name,evidence:item.line})):[{name:item.value,evidence:item.line}];
  });
  const unique=[...new Set(found.map(item=>key(item.name)))];
  return unique.length===1?{...found[0],ambiguous:false}:{ambiguous:true};
 }
 const found=lines.filter(line=>! /^(?:Direcci[oó]n|Domicilio|Comuna|Regi[oó]n|Sucursal|Casa matriz|Sr\.?|Titular|Nombre|Correo|E-?mail|Tel[eé]fono|Celular)\b/i.test(line))
  .flatMap(line=>matches(line).map(provider=>({name:provider.name,evidence:line})));
 const names=new Set(found.map(item=>item.name));
 return names.size===1?{...found[0],ambiguous:false}:{ambiguous:names.size>1};
}
