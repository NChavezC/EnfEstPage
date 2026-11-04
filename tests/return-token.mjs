import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingReturnToken } from '../src/features/agenda/returnToken.js';
const token='a'.repeat(43);
test('path token survives appended TUU query',()=>assert.equal(bookingReturnToken(token,'?x_result=completed&token=other',null),token));
test('existing query and malformed second question mark',()=>{
 assert.equal(bookingReturnToken(null,'?token='+token+'&x_result=completed',null),token);
 assert.equal(bookingReturnToken(null,'?token='+token+'?x_result=completed&x_amount=100',null),token);
});
test('does not silently use a different stored reservation for invalid explicit token',()=>assert.equal(bookingReturnToken(null,'?token=invalid',token),null));
test('stored token fallback only for missing link',()=>assert.equal(bookingReturnToken(null,'?x_result=completed',token),token));
