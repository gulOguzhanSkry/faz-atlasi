import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lessonSteps,lessonKeys} from '../web/mikroyapi/atom-dersleri.js';

// Every lesson text key, step label and badge used by kup.js exists in both languages.
const dictionary=readFileSync(new URL('../web/mikroyapi/bootstrap.js',import.meta.url),'utf8');
const entry=key=>dictionary.match(new RegExp(`'${key.replaceAll('.','\\.')}':\\['([^']*)','([^']*)'\\]`));
test('guided atomic lesson: every step title, body, short label and badge is bilingual',()=>{
 const keys=new Set(lessonKeys());
 for(const code of ['G','A','D','C','L'])for(const step of lessonSteps(code)){keys.add(`kup.lesson.${step.id}.short`);for(const badge of step.badges)keys.add(`kup.badge.${badge}`);}
 for(const key of [...keys,'kup.lesson.label','kup.lesson.prev','kup.lesson.next','kup.legend.octa','kup.legend.tetra','kup.legend.carbon','kup.cmp.conclusion','kup.cmp.source']){
  const m=entry(key);assert.ok(m,`missing ${key}`);assert.ok(m[1].trim()&&m[2].trim(),`empty ${key}`);assert.notEqual(m[1],m[2],`${key} is not translated`);
 }
});
test('guided atomic lesson markup: step strip, card and free-exploration controls are present',()=>{
 for(const hook of ['data-kup-lesson ','data-kup-lesson-card','data-kup-free-controls'])assert.ok(dictionary.includes(hook),hook);
 const kup=readFileSync(new URL('../web/mikroyapi/kup.js',import.meta.url),'utf8');
 assert.match(kup,/renderer\.localClippingEnabled=true/);assert.match(kup,/drawAtomicLesson\(group,reference,step\.view\)/);
});
