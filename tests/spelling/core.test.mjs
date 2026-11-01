import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {latestResults,selectWords,countResults,csvCell} from '../../public/spelling/core.js';
const words=JSON.parse(readFileSync(new URL('../../public/spelling/words.json',import.meta.url)));
const attempts=[
 {id:'a1',studentId:'one',wordId:'ape',outcome:'incorrect',createdAt:1},
 {id:'a2',studentId:'one',wordId:'ape',outcome:'correct',createdAt:2},
 {id:'a3',studentId:'two',wordId:'ape',outcome:'slow',createdAt:3},
 {id:'a4',studentId:'one',wordId:'bee',outcome:'two',createdAt:4},
];
test('bank contains 514 distinct words and correct original vowel memberships',()=>{assert.equal(words.length,514);assert.equal(new Set(words.map(w=>w.id)).size,514);assert.deepEqual(words.find(w=>w.id==='head').groups,['a','e']);assert(words.some(w=>w.text==='ice cream'));assert(!words.some(w=>w.text.includes('*')));assert(words.every(w=>w.groups.length&&w.sourcePages.length));});
test('latest outcomes are isolated by student and preserve correction history',()=>{const l=latestResults(attempts,'one');assert.equal(l.get('ape').outcome,'correct');assert.equal(selectWords(words,l,{filter:'incorrect'}).length,0);assert.equal(latestResults(attempts,'two').get('ape').outcome,'slow');});
test('undo restores the previous result rather than losing it',()=>{const data=attempts.map(a=>({...a,voided:a.id==='a2'}));assert.equal(latestResults(data,'one').get('ape').outcome,'incorrect');});
test('review and vowel filters intersect and unpracticed words remain distinct',()=>{const l=latestResults(attempts,'one');assert.deepEqual(selectWords(words,l,{group:'e',filter:'two'}).map(w=>w.id),['bee']);assert.equal(selectWords(words,l,{group:'a',filter:'two'}).length,0);assert.equal(selectWords(words,l,{filter:'review'}).length,1);assert.equal(selectWords(words,l,{filter:'new'}).length,512);assert.equal(countResults(words,l).correct,1);});
test('shuffle never drops or duplicates a word, does not mutate bank',()=>{const before=words.map(w=>w.id);const shuffled=selectWords(words,new Map(),{order:'random'},()=>0.25);assert.deepEqual(shuffled.map(w=>w.id).sort(),[...before].sort());assert.notDeepEqual(shuffled.map(w=>w.id),before);assert.deepEqual(words.map(w=>w.id),before);});
test('session snapshots do not shrink when review words change result',()=>{const l=latestResults(attempts,'one');const queue=selectWords(words,l,{filter:'two'}).map(w=>w.id);l.set('bee',{outcome:'correct'});assert.deepEqual(queue,['bee']);assert.equal(selectWords(words,l,{filter:'two'}).length,0);});
test('CSV quotes user text and neutralizes spreadsheet formulas',()=>{assert.equal(csvCell('A "name"'),'"A ""name"""');assert.equal(csvCell('=1+1'),'"\'=1+1"');});
