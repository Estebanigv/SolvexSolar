import assert from 'node:assert/strict';
import {activityFilterSchema,activityValue,activityTime} from '../lib/activity';
assert.equal(activityFilterSchema.parse({}).offset,0);
assert.equal(activityFilterSchema.safeParse({from:'2026-02-30'}).success,false);
assert.equal(activityFilterSchema.safeParse({from:'2026-10-01',to:'2026-09-01'}).success,false);
assert.equal(activityFilterSchema.safeParse({offset:-1}).success,false);
assert.equal(activityFilterSchema.safeParse({kind:'secret'}).success,false);
assert.equal(activityValue('price',0),'$0');
assert.equal(activityValue('price',null),'Sin valor');
assert.equal(activityValue('role','admin'),'Administrador');
assert.match(activityTime('2026-09-29T18:42:06Z'),/15:42:06/);
// Chile's winter time differs from September; never use a fixed UTC offset.
assert.match(activityTime('2026-06-29T18:42:06Z'),/14:42:06/);
console.log('Activity filters, values and Chile timestamps passed');
