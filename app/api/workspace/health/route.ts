import {protectedApi} from '@/lib/supabase/api';
import {requireMember,privateHeaders} from '@/lib/supabase/server';
export async function GET(){return protectedApi(async()=>{
 const {db}=await requireMember(true);const checks=await Promise.all([db.rpc('workspace_release_status'),db.from('quotes').select('project_id,parent_quote_id,sent_on,deleted_at').limit(1),db.from('quote_followups').select('project_id').limit(1),db.from('client_notes').select('id').limit(1),db.from('member_access_events').select('id').limit(1)]);const ready=checks.every(c=>!c.error)&&checks[0].data==='20261001-productivity';return Response.json({ready,release:ready?'20261001-productivity':null},{status:ready?200:503,headers:privateHeaders});
})}
