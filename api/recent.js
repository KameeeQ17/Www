const { createHash, timingSafeEqual } = require('node:crypto');
const base = 'https://api.github.com/repos/KameeeQ17/Www';
const branch = 'wildlands-player-data';
const filePath = '/contents/recent-players.json';
function equal(a,b) { const hash=x=>createHash('sha256').update(x).digest();return timingSafeEqual(hash(a),hash(b)); }
async function github(path,method='GET',body) {
  return fetch(base+path,{method,headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'WildLands-recent',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000),cache:'no-store'});
}
function clean(players) {
  if(!Array.isArray(players)||players.length>5)return null;
  const ids=new Set();const result=[];
  for(const p of players) {
    if(!p || typeof p.name!=='string' || !/^[A-Za-z0-9_]{1,16}$/.test(p.name) || typeof p.uuid!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(p.uuid) || typeof p.joinedAt!=='string' || p.joinedAt.length>40 || Number.isNaN(Date.parse(p.joinedAt)) || Date.parse(p.joinedAt)>Date.now()+300000 || ids.has(p.uuid.toLowerCase())) return null;
    ids.add(p.uuid.toLowerCase());result.push({name:p.name,uuid:p.uuid.toLowerCase(),joinedAt:new Date(p.joinedAt).toISOString()});
  }
  return result.sort((a,b)=>b.joinedAt.localeCompare(a.joinedAt));
}
async function ensureBranch() {
  const exists=await github('/git/ref/heads/'+branch);
  if(exists.ok)return;
  if(exists.status!==404)throw Error('branch access');
  const main=await github('/git/ref/heads/main');if(!main.ok)throw Error('main access');
  const data=await main.json();
  const created=await github('/git/refs','POST',{ref:'refs/heads/'+branch,sha:data.object.sha});
  if(!created.ok&&created.status!==422)throw Error('branch create');
}
module.exports = async function handler(req,res) {
  const post=req.method==='POST';
  res.setHeader('Cache-Control',post?'no-store':'public, max-age=0, s-maxage=30, stale-while-revalidate=30');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Niedozwolona metoda'});}
  const secret=process.env.RECENT_PLAYERS_SECRET;
  const configured=typeof secret==='string'&&secret.length>=32&&!!process.env.GITHUB_TOKEN;
  if(!configured)return res.status(post?503:200).json({configured:false,players:[],...(post?{error:'Ustaw RECENT_PLAYERS_SECRET i GITHUB_TOKEN w Vercel'}:{})});
  let players;
  if(post) {
    const auth=req.headers.authorization;
    if(typeof auth!=='string'||auth.length>1024||!equal(auth,'Bearer '+secret))return res.status(401).json({error:'Nieprawidlowy klucz polaczenia'});
    if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Wymagany JSON'});
    try {
      if(Number(req.headers['content-length']||0)>16000) return res.status(413).json({error:'Zbyt duzo danych'});
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(Buffer.byteLength(JSON.stringify(body||{}))>16000)return res.status(413).json({error:'Zbyt duzo danych'});
      players=clean(body?.players);if(!players)return res.status(400).json({error:'Nieprawidlowa lista graczy'});
    }catch{return res.status(400).json({error:'Nieprawidlowe dane'});}
  }
  try {
    if(post)await ensureBranch();
    const current=await github(filePath+'?ref='+branch);
    let sha,stored={players:[]};
    if(current.ok){const file=await current.json();sha=file.sha;stored=JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));}
    else if(current.status!==404)throw Error('read');
    if(!post)return res.status(200).json({configured:true,players:clean(stored.players)||[]});
    if(sha&&JSON.stringify(players)===JSON.stringify(stored.players))return res.status(200).json({ok:true,unchanged:true});
    const saved=await github(filePath,'PUT',{branch,message:'Aktualizacja ostatnich wejsc na lobby',...(sha?{sha}:{}),content:Buffer.from(JSON.stringify({players},null,2)+'\n').toString('base64')});
    if(saved.status===409||saved.status===422)return res.status(409).json({error:'Konflikt zapisu. Wtyczka ponowi probe.'});
    if(!saved.ok)throw Error('write');
    return res.status(200).json({ok:true});
  }catch{return res.status(502).json({error:'Nie udalo sie zapisac lub odczytac historii. Sprawdz GITHUB_TOKEN i dostep do repozytorium.'});}
};
