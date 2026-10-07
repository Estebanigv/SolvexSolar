import {requireMember,privateHeaders,checkOrigin,AccessError} from '@/lib/supabase/server';
import {protectedApi} from '@/lib/supabase/api';
import {proposalStyleSchema,personalStyleKey} from '@/lib/proposal-style';

export async function GET(){return protectedApi(async()=>{
 const {user}=await requireMember();
 const parsed=proposalStyleSchema.safeParse(user.user_metadata?.[personalStyleKey]);
 return Response.json({style:parsed.success?parsed.data:null},{headers:privateHeaders});
});}
export async function PUT(request:Request){return protectedApi(async()=>{
 checkOrigin(request);
 const {db}=await requireMember();
 const style=proposalStyleSchema.parse(await request.json());
 // Presentation preferences only. Never used to grant permissions or identify a user.
 const {error}=await db.auth.updateUser({data:{[personalStyleKey]:style}});
 if(error)throw new AccessError('No se pudo guardar tu estilo. Inténtalo nuevamente.',503);
 return Response.json({style},{headers:privateHeaders});
});}
