import {z} from 'zod';
import {newPasswordSchema} from './password-change';

export const memberCreateSchema=z.object({
  name:z.string().trim().min(2,'Ingresa el nombre completo.').max(150,'Usa hasta 150 caracteres.'),
  email:z.string().trim().toLowerCase().email('Ingresa un correo válido.').max(254),
  password:newPasswordSchema,
}).strict();
export type MemberCreate=z.infer<typeof memberCreateSchema>;
