module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=30, stale-while-revalidate=30');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const url=process.env.MINECRAFT_RECENT_URL;
  if(!url)return res.status(200).json({configured:false,players:[]});
  try {
    const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw Error();
    const response=await fetch(parsed,{signal:AbortSignal.timeout(7000),redirect:'error'});
    if(!response.ok)throw Error();
    const text=await response.text();if(text.length>20000)throw Error();
    const data=JSON.parse(text);
    if(!Array.isArray(data.players))throw Error();
    const players=data.players.filter(p=>p && /^[A-Za-z0-9_]{1,16}$/.test(p.name) && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(p.uuid) && !Number.isNaN(Date.parse(p.joinedAt))).slice(0,5).map(p=>({name:p.name,uuid:p.uuid,joinedAt:p.joinedAt}));
    return res.status(200).json({configured:true,players});
  }catch{return res.status(502).json({error:'Historia wejść chwilowo niedostępna'});}
};
