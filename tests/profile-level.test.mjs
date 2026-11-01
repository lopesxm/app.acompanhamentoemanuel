import test from 'node:test';
import assert from 'node:assert/strict';
import {profileLevel} from '../assets/js/profile-level.js';
const start='2026-01-01T00:00:00Z',at=days=>Date.parse(start)+days*86400000;
test('níveis mudam apenas ao completar cada prazo',()=>{
 for(const [day,name] of [[0,'Bronze'],[29,'Bronze'],[30,'Prata'],[89,'Prata'],[90,'Ouro'],[180,'Platina'],[365,'Diamante']])assert.equal(profileLevel(start,at(day)).name,name);
 assert.equal(profileLevel(start,at(29)).remaining,1);
 assert.equal(profileLevel(start,at(30)).progress,0);
 assert.equal(profileLevel(start,at(500)).progress,100);
 assert.equal(profileLevel(start,at(500)).next,null);
});
test('data ausente não inventa nível e data futura não gera dias negativos',()=>{
 assert.equal(profileLevel(null),null);
 assert.equal(profileLevel('inválido'),null);
 assert.equal(profileLevel(start,at(-1)).days,0);
});
