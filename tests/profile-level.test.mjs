import test from 'node:test';
import assert from 'node:assert/strict';
import {profileLevel} from '../assets/js/profile-level.js';
test('níveis por pontos, limites e progresso',()=>{
 for(const [points,name] of [[0,'Bronze'],[99,'Bronze'],[100,'Prata'],[499,'Prata'],[500,'Ouro'],[1500,'Platina'],[3000,'Diamante']])assert.equal(profileLevel(points).name,name);
 assert.equal(profileLevel(99).remaining,1);assert.equal(profileLevel(100).progress,0);assert.equal(profileLevel(4000).next,null);
});
test('não interpreta data ou pontos ausentes como pontuação',()=>{for(const x of [null,undefined,'2026-01-01',NaN,-1])assert.equal(profileLevel(x),null);});
