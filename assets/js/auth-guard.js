import {profile,configured,isDemo} from './supabase.js';
export async function guard(role){if(!configured()&&!isDemo()){location.replace('/login.html');return null;}const p=await profile();if(!p){location.replace('/login.html');return null;}if(p.papel!==role){location.replace(p.papel==='admin'?'/admin/index.html':'/app/hoje.html');return null;}return p;}
