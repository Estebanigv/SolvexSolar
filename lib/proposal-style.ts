import {z} from 'zod';

const color=z.string().regex(/^#[0-9a-fA-F]{6}$/,'Usa un color hexadecimal válido.');
export const proposalStyleSchema=z.object({
 font:z.enum(['sans','serif','mono']),
 textScale:z.number().min(.85).max(1.15),
 accent:color,primary:color,text:color,background:color,panel:color,cover:color,
 coverPhoto:z.boolean(),
}).strict();
export type ProposalStyle=z.infer<typeof proposalStyleSchema>;
export const defaultProposalStyle:ProposalStyle={font:'sans',textScale:1,accent:'#bdd548',primary:'#16563f',text:'#103b45',background:'#ffffff',panel:'#eef4f2',cover:'#092f38',coverPhoto:true};
export const proposalFonts={sans:'Arial, Helvetica, sans-serif',serif:'"Times New Roman", Times, serif',mono:'"Courier New", Courier, monospace'};
export function resolveProposalStyle(value:unknown):ProposalStyle {const parsed=proposalStyleSchema.safeParse(value);return parsed.success?parsed.data:{...defaultProposalStyle};}
export function readableOn(hex:string){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722>.179?'#142c28':'#ffffff';}
export function tint(hex:string,amount=.88){return '#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-amount)+255*amount).toString(16).padStart(2,'0')).join('');}
export const personalStyleKey='solvex_proposal_style_v1';
