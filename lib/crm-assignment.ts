import {z} from 'zod';

export type CrmTeamMember={id:string;full_name:string};
export const crmAssignmentSchema=z.object({
  client_id:z.string().uuid(),new_owner_id:z.string().uuid(),
  expected_owner_id:z.string().uuid(),expected_updated_at:z.string().datetime({offset:true}),
});
export type CrmAssignment=z.infer<typeof crmAssignmentSchema>;
