import {integer,sqliteTable,text,index} from 'drizzle-orm/sqlite-core';
export const workspaceState=sqliteTable('workspace_state',{owner:text('owner').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(1)});
export const quotes=sqliteTable('quotes',{id:text('id').primaryKey(),owner:text('owner').notNull(),folio:text('folio').notNull(),created:text('created').notNull(),payload:text('payload').notNull()},t=>[index('idx_quotes_owner_created').on(t.owner,t.created)]);
