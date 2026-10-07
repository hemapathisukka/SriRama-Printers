const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let pub={};try{pub=JSON.parse(localStorage.getItem('pp_public')||'{}')}catch(e){}
const NAME=pub.name&&pub.name!='My Printing Press'?pub.name:'Sri Rama Printers';
const PROD=(pub.products||'Visiting Cards,Letterheads,Bill Books,Brochures,Flyers,Posters,Banners,Stickers,Wedding Cards,ID Cards,Calendars,Envelopes,Custom Printing').split(',').map(s=>s.trim()).filter(Boolean);
const COL=['#0d5c8f','#d81b73','#b8862f','#101828'];
const ph=(pub.phone||'').replace(/\D/g,''),WA=ph?'https://wa.me/'+(ph.length==10?'91'+ph:ph):'';
let basket=[];
document.title=NAME+' | Printing';$$('[data-name]').forEach(e=>e.textContent=NAME);$('#yr').textContent=new Date().getFullYear();
if(pub.phone)$('#phoneBox').innerHTML='<a href="tel:'+esc(ph)+'">'+esc(pub.phone)+'</a>';
$$('[data-wa]').forEach(a=>{if(WA)a.href=WA+'?text='+encodeURIComponent(a.dataset.wa);else a.style.display='none'});
$('#productGrid').innerHTML=PROD.map((p,i)=>`<article class="card"><div class="thumb" style="--c:${COL[i%4]}"><i></i><i></i><i></i></div><h3>${esc(p)}</h3><div class="act"><button class="btn btn-ghost btn-sm" onclick="addEnq(${i})">Add to enquiry</button><button class="btn btn-primary btn-sm" onclick="quoteNow(${i})">Get quote</button></div></article>`).join('');
$('#qProduct').innerHTML=PROD.map(p=>`<option>${esc(p)}</option>`).join('');
$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');$$('#nav a').forEach(a=>a.onclick=()=>$('#nav').classList.remove('open'));
function addEnq(i){const b=basket.find(x=>x.product==PROD[i]);if(b)b.qty+=100;else basket.push({product:PROD[i],qty:100});drawEnq()}
function quoteNow(i){$('#qProduct').value=PROD[i];location.hash='quote'}
function drawEnq(){$('#enqCount').textContent=basket.length;
 const h=basket.map((b,i)=>`<li><span>${esc(b.product)}</span><input type="number" min="1" value="${b.qty}" aria-label="Quantity" onchange="basket[${i}].qty=Math.max(1,+this.value||1)"><button aria-label="Remove" onclick="basket.splice(${i},1);drawEnq()">✕</button></li>`).join('');
 ['#eList','#quoteEnqList'].forEach(s=>$(s).innerHTML=h);$('#eEmpty').hidden=$('#quoteEnqEmpty').hidden=basket.length>0}
drawEnq();
$('#enqOpen').onclick=()=>$('#eDlg').showModal();$('#eClose').onclick=()=>$('#eDlg').close();
$('#eSend').onclick=()=>{$('#eDlg').close();if(basket[0]){$('#qProduct').value=basket[0].product;$('#qQty').value=basket[0].qty}};
$('#qType').onchange=()=>$('#qAddrBox').hidden=$('#qType').value!='Order';
const rid=()=>'REQ-'+Date.now().toString(36).toUpperCase().slice(-4)+Math.random().toString(36).slice(2,6).toUpperCase();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
async function enc(obj,pub){const k=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']),iv=crypto.getRandomValues(new Uint8Array(12)),
 ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},k,new TextEncoder().encode(JSON.stringify(obj))),
 pk=await crypto.subtle.importKey('jwk',pub,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']),
 wk=await crypto.subtle.encrypt({name:'RSA-OAEP'},pk,await crypto.subtle.exportKey('raw',k));
 return JSON.stringify({k:b64(wk),i:b64(iv),c:b64(ct)})}
$('#quoteForm').onsubmit=async e=>{e.preventDefault();const v=id=>$(id).value.trim(),err=$('#qErr');err.textContent='';
 if($('#qHp').value)return;
 if(!v('#qName'))return err.textContent='Please enter your name.';
 if(!/^[0-9+ \-]{8,15}$/.test(v('#qPhone')))return err.textContent='Please enter a valid phone number.';
 if(!(+v('#qQty')>0))return err.textContent='Please enter a quantity.';
 const last=+localStorage.getItem('pp_last')||0;if(Date.now()-last<8000)return err.textContent='Please wait a few seconds before sending again.';
 const extra=basket.filter(b=>b.product!=v('#qProduct')).map(b=>b.product+' x'+b.qty).join(', ');
 const notes=[v('#qSides'),v('#qColour'),v('#qDelivery'),extra&&'Also: '+extra,v('#qNotes')].filter(Boolean).join(' | ').slice(0,500);
 const r={type:v('#qType'),name:v('#qName'),mobile:v('#qPhone'),email:v('#qEmail'),product:v('#qProduct'),qty:+v('#qQty'),size:v('#qSize'),material:v('#qPaper'),required:v('#qDate'),address:v('#qAddr'),notes,created:new Date().toISOString().slice(0,10)};
 r.ref='REQ-'+Date.now().toString(36).toUpperCase().slice(-4)+Math.random().toString(36).slice(2,6).toUpperCase();
 const gh=(typeof CFG!=='undefined'&&CFG.gh)||{};$('#qSubmit').disabled=true;
 try{
  if(gh.token&&gh.pub&&gh.owner&&gh.repo){
   const res=await fetch('https://api.github.com/repos/'+gh.owner+'/'+gh.repo+'/issues',{method:'POST',headers:{Authorization:'Bearer '+gh.token,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({title:r.ref,body:await enc(r,gh.pub)})});
   if(!res.ok)throw new Error(res.status)}
  else{const a=JSON.parse(localStorage.getItem('pp_inbox')||'[]');a.push(r);localStorage.setItem('pp_inbox',JSON.stringify(a))}
  localStorage.setItem('pp_last',Date.now());
 }catch(x){$('#qSubmit').disabled=false;return err.textContent='Sorry, could not send ('+(x&&x.message?x.message:'error')+'). Please call or WhatsApp us.'}
 $('#qSubmit').disabled=false;
 $('#quoteRef').textContent=r.ref;$('#quoteWa').dataset.wa='Hello! I sent a request. Reference '+r.ref;if(WA)$('#quoteWa').href=WA+'?text='+encodeURIComponent($('#quoteWa').dataset.wa);else $('#quoteWa').style.display='none';
 basket=[];drawEnq();e.target.hidden=true;$('#quoteDone').hidden=false};
$('#quoteAgain').onclick=()=>{$('#quoteForm').reset();$('#quoteForm').hidden=false;$('#quoteDone').hidden=true;$('#qAddrBox').hidden=true};
