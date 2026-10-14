import assert from 'node:assert/strict';
import {searchClients} from '../lib/client-search';
import {newQuote} from '../lib/quote';
const clients=[
  {id:'a',details:{...newQuote().customer,name:'María González',email:'maria@example.com',phone:'+56 9 1234 5678'}},
  {id:'b',details:{...newQuote().customer,name:'Pedro Pérez',email:'pedro@example.com',phone:'912345679'}},
];
assert.deepEqual(searchClients(clients,''),[],'No enumerar clientes sin búsqueda');
assert.deepEqual(searchClients(clients,'  '),[]);
assert.deepEqual(searchClients(clients,'GONZALEZ maria').map(c=>c.id),['a']);
assert.deepEqual(searchClients(clients,'PEDRO@').map(c=>c.id),['b']);
assert.deepEqual(searchClients(clients,'+56912345678').map(c=>c.id),['a']);
assert.deepEqual(searchClients(clients,'1234-5679').map(c=>c.id),['b']);
assert.deepEqual(searchClients(clients,'sin coincidencias'),[]);
assert.equal(clients[0].details.name,'María González','Buscar no modifica el cliente');
console.log('Client search: OK');
