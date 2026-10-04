export const manualUrl='/manual-solvex-solar.pdf';
export const manualFilename='Solvex-Solar-Manual-visual-de-uso.pdf';
export const manualChapters=[
 {title:'Comenzar',pages:[{page:1,title:'Portada'},{page:2,title:'Recorrido por la plataforma'},{page:3,title:'Acceso y uso desde el celular'}]},
 {title:'Preparar una cotización',pages:[{page:4,title:'Datos del cliente'},{page:5,title:'Lectura y respaldo de boletas'},{page:6,title:'Equipos e instalación'},{page:7,title:'Ubicación y generación solar'},{page:8,title:'Referencia de consumo CNE'},{page:9,title:'Revisión de la propuesta'},{page:10,title:'Descarga y envío al cliente'}]},
 {title:'Gestionar y administrar',pages:[{page:11,title:'Cotizaciones y resumen'},{page:12,title:'Directorio de clientes'},{page:13,title:'Equipos y precios'},{page:14,title:'Usuarios y actividad'},{page:15,title:'Comprobaciones antes de enviar'}]},
];
export const manualPages=manualChapters.flatMap(chapter=>chapter.pages);
