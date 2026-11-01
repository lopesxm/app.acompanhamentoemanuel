import test from 'node:test';import assert from 'node:assert/strict';
import {profileLevel,levels,levelCard} from '../assets/js/profile-level.js';
test('cada patente exige o marco completo de pontos',()=>{
 assert.equal(levels.length,10);
 levels.forEach(([,name,min],i)=>{assert.equal(profileLevel(min).name,name);if(i)assert.equal(profileLevel(min-1).name,levels[i-1][1]);});
 assert.equal(profileLevel(749).remaining,1);assert.equal(profileLevel(750).progress,0);assert.equal(profileLevel(3000).name,'Ouro');assert.equal(profileLevel(65000).next,null);assert.equal(profileLevel(90000).progress,100);
});
test('não inventa pontuação e mantém os pontos existentes',()=>{for(const x of [null,undefined,'2026-01-01',NaN,-1,Infinity])assert.equal(profileLevel(x),null);assert.equal(profileLevel(4321).points,4321);assert.match(levelCard(65000),/Nível máximo alcançado/);});
