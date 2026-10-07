// ---------- storage ----------
let DB=null;try{DB=JSON.parse(localStorage.getItem('pp')||'null')}catch(e){}
DB=DB||{customers:[],enquiries:[],quotations:[],orders:[],payments:[],inventory:[],suppliers:[],expenses:[],audit:[],
 set:{name:'My Printing Press',addr:'',phone:'',gst:'',upi:'',products:'Visiting Cards,Letterheads,Bill Books,Brochures,Flyers,Posters,Banners,Stickers,Wedding Cards,ID Cards,Calendars,Envelopes,Custom Printing'},users:[]};
DB.users=DB.users||[];
const save=()=>{try{DB.ts=Date.now();localStorage.setItem('pp',JSON.stringify(DB));localStorage.setItem('pp_public',JSON.stringify({name:DB.set.name,phone:DB.set.phone,products:DB.set.products}))}catch(e){alert('Storage full or blocked')}schedPush()};
// ---------- helpers ----------
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₹'+(+n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const today=()=>new Date().toISOString().slice(0,10);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const log=m=>{DB.audit.unshift({t:new Date().toLocaleString(),u:(ME?ME.name+(ME.admin?' (Admin)':''):'system'),m});DB.audit=DB.audit.slice(0,500)};
const tot=o=>Math.max(0,o.qty*o.rate-(+o.disc||0))*(1+(+o.gst||0)/100);
const paid=o=>(+o.advance||0)+DB.payments.filter(p=>p.order==o.id).reduce((a,p)=>a+ +p.amount,0);
const bal=o=>Math.max(0,tot(o)-paid(o));
const pst=o=>{if(tot(o)>0&&paid(o)>=tot(o))return'Paid';if(o.status!='Cancelled'&&o.delivery&&o.delivery<today()&&bal(o)>0)return'Overdue';return paid(o)>0?'Partially Paid':'Unpaid'};
const nm=(c,id)=>{const x=DB[c].find(v=>v.id==id);return x?(x.name||x.no):''};
const products=()=>DB.set.products.split(',').map(s=>s.trim()).filter(Boolean);
const ST=['New','Design Pending','Design Review','Customer Approval','Approved','Production Pending','In Production','Quality Check','Ready','Delivered','Completed','Cancelled'];
const PRI=['Normal','Urgent'],PM=['Cash','UPI','Bank Transfer','Card','Cheque','Other'];
// ---------- module config: [key,label,type,options] ----------
const M={
customers:{t:'Customers',p:'CUS',f:[['name','Name','text'],['company','Company','text'],['mobile','Mobile','text'],['email','Email','text'],['gst','GST No','text'],['address','Address','text'],['type','Type','sel',['Retail','Business','School','Event']],['credit','Credit limit','number'],['status','Status','sel',['Active','Inactive']]],c:['no','name','company','mobile','status']},
enquiries:{t:'Enquiries',p:'ENQ',f:[['customer','Customer','ref','customers'],['product','Product','prod'],['qty','Quantity','number'],['required','Required date','date'],['notes','Notes','text'],['status','Status','sel',['New','Contacted','Quotation Sent','Follow-up','Converted','Lost']]],c:['no','customer','product','qty','required','status']},
quotations:{t:'Quotations',p:'QUO',f:[['customer','Customer','ref','customers'],['product','Product','prod'],['qty','Quantity','number'],['rate','Unit price','number'],['disc','Discount (₹)','number'],['gst','GST %','number'],['valid','Valid until','date'],['status','Status','sel',['Draft','Sent','Accepted','Rejected','Expired','Converted']]],c:['no','customer','product','qty','total','status']},
orders:{t:'Orders',p:'ORD',f:[['customer','Customer','ref','customers'],['product','Product','prod'],['qty','Quantity','number'],['size','Size','text'],['material','Paper/Material','text'],['rate','Unit price','number'],['disc','Discount (₹)','number'],['gst','GST %','number'],['advance','Advance','number'],['delivery','Delivery date','date'],['priority','Priority','sel',PRI],['notes','Special instructions','text'],['status','Status','sel',ST]],c:['no','customer','product','delivery','total','paid','balance','pay','status']},
payments:{t:'Payments',p:'PAY',f:[['order','Order','ref','orders'],['amount','Amount','number'],['date','Date','date'],['method','Method','sel',PM],['ref','Reference no.','text']],c:['no','order','amount','date','method']},
inventory:{t:'Inventory',p:'ITM',f:[['name','Item','text'],['category','Category','sel',['Paper','Vinyl','Flex','Ink','Toner','Lamination','Binding','Packaging','Other']],['unit','Unit','text'],['stock','Current stock','number'],['min','Minimum stock','number'],['price','Purchase price','number'],['supplier','Supplier','text']],c:['name','category','stock','min','price','supplier']},
suppliers:{t:'Suppliers',p:'SUP',f:[['name','Name','text'],['contact','Contact person','text'],['mobile','Mobile','text'],['gst','GST','text'],['supplies','Products supplied','text'],['outstanding','Outstanding','number']],c:['name','contact','mobile','supplies','outstanding']},
expenses:{t:'Expenses',p:'EXP',f:[['date','Date','date'],['category','Category','sel',['Electricity','Rent','Salary','Raw Materials','Machine Maintenance','Transport','Internet','Office','Marketing','Other']],['amount','Amount','number'],['method','Method','sel',PM],['desc','Description','text']],c:['no','date','category','amount','method','desc']}};
let route='dash',V={q:'',st:'',pg:0,from:'',to:''};
// ---------- cell rendering ----------
function cell(m,r,k){
 if(k=='total')return money(tot(r));if(k=='paid')return money(paid(r));if(k=='balance')return money(bal(r));
 if(k=='pay'){const s=pst(r);return`<span class="bd ${s=='Overdue'?'r':s=='Paid'?'':'y'}">${s}</span>`}
 if(k=='customer'||k=='order')return esc(nm(k=='order'?'orders':'customers',r[k]));
 if(['amount','price','outstanding','credit'].includes(k))return money(r[k]);
 if(k=='status')return`<span class="bd ${['Cancelled','Lost','Rejected','Inactive'].includes(r[k])?'r':''}">${esc(r[k])}</span>`;
 if(m=='inventory'&&k=='stock')return esc(r.stock)+(+r.stock<=+r.min?' <span class="bd r">Low</span>':'');
 return esc(r[k])}
const hd={no:'No.',pay:'Payment',paid:'Paid',balance:'Balance',total:'Total'};
// ---------- layout ----------
const NAV=[['dash','Dashboard'],['customers','Customers'],['enquiries','Enquiries'],['quotations','Quotations'],['orders','Orders'],['payments','Payments'],['inventory','Inventory'],['suppliers','Suppliers'],['expenses','Expenses'],['reports','Reports'],['users','Users & Access'],['audit','Audit Log'],['settings','Settings']];
function draw(){
 if(!ME)return loginScreen();$('nav').style.display='';if(!can(route))route='dash';
 $('nav').innerHTML=`<h2>🦜 ${esc(DB.set.name)}</h2>`+NAV.filter(n=>can(n[0])).map(n=>`<a class="${n[0]==route?'on':''}" onclick="go('${n[0]}')">${n[1]}</a>`).join('')+'<a href="customer2.html" target="_blank" rel="noopener">🌐 Customer Page ↗</a>';
 const roleSel=`<small>${esc(ME.name)} · ${ME.admin?'Admin':esc(ME.role)}</small><button class="s" onclick="chPw()">Password</button><button class="s" onclick="logout()">Logout</button>`;
 let h='';
 if(route=='dash')h=dash();else if(route=='reports')h=reports();else if(route=='audit')h=audit();else if(route=='settings')h=settings();else if(route=='users')h=usersView();else h=(route=='expenses'?finance():'')+list(route);
 $('main').innerHTML=`<div class="top"><h1>${(NAV.find(n=>n[0]==route)||[])[1]}</h1>${roleSel}</div>`+h}
const $=s=>document.querySelector(s);
function go(r){route=r;V={q:'',st:'',pg:0,from:'',to:''};draw()}
// ---------- list view ----------
function list(m){
 const C=M[m],hasSt=C.f.some(f=>f[0]=='status');
 let rows=DB[m].filter(r=>{
  const s=JSON.stringify(r).toLowerCase()+nm('customers',r.customer).toLowerCase();
  const d=r.date||r.date||r.created||'';
  return s.includes(V.q.toLowerCase())&&(!V.st||r.status==V.st)&&(!V.from||(d||'9')>=V.from)&&(!V.to||(d||'0')<=V.to)});
 const pages=Math.max(1,Math.ceil(rows.length/10));if(V.pg>=pages)V.pg=0;
 const stOpts=hasSt?C.f.find(f=>f[0]=='status')[3]:[];
 return`<div class="top"><input placeholder="Search…" value="${esc(V.q)}" oninput="V.q=this.value;V.pg=0;keep(this)">
 ${hasSt?`<select onchange="V.st=this.value;V.pg=0;draw()"><option value="">All status</option>${stOpts.map(s=>`<option ${V.st==s?'selected':''}>${s}</option>`).join('')}</select>`:''}
 <input type="date" title="From" value="${V.from}" onchange="V.from=this.value;draw()"><input type="date" title="To" value="${V.to}" onchange="V.to=this.value;draw()">
 <button class="s" onclick="csv('${m}')">Export CSV</button>${has(m,'a')?`<button onclick="edit('${m}')">+ Add</button>`:''}</div>
 <div class="wrap"><table><tr>${C.c.map(k=>`<th>${hd[k]||(C.f.find(f=>f[0]==k)||[0,k])[1]}</th>`).join('')}<th></th></tr>
 ${rows.slice(V.pg*10,V.pg*10+10).map(r=>`<tr>${C.c.map(k=>`<td>${cell(m,r,k)}</td>`).join('')}<td>${acts(m,r)}</td></tr>`).join('')||`<tr><td colspan="9">Nothing here yet. Click “+ Add”.</td></tr>`}</table></div>
 <div class="top" style="margin-top:8px"><button class="s" onclick="V.pg=Math.max(0,V.pg-1);draw()">Prev</button> Page ${V.pg+1} of ${pages} (${rows.length}) <button class="s" onclick="V.pg=Math.min(${pages-1},V.pg+1);draw()">Next</button></div>`}
function keep(el){const p=el.selectionStart;draw();const i=$('main input');i.focus();i.setSelectionRange(p,p)}
function acts(m,r){let a='';
 if(m=='orders')a+=`<button class="s" onclick="view('${r.id}')">Open</button> `;
 if(m=='quotations'&&has('orders','a'))a+=`<button class="s" onclick="toOrder('${r.id}')">→ Order</button> `;
 if(m=='inventory'&&has('inventory','e'))a+=`<button class="s" onclick="stock('${r.id}',1)">+In</button><button class="s" onclick="stock('${r.id}',-1)">−Out</button> `;
 if(has(m,'e'))a+=`<button class="s" onclick="edit('${m}','${r.id}')">Edit</button>`;
 if(canDel(m))a+=` <button class="x" onclick="del('${m}','${r.id}')">✕</button>`;return a}
// ---------- add / edit ----------
function edit(m,id){
 const C=M[m],r=id?DB[m].find(x=>x.id==id):{status:C.f.find(f=>f[0]=='status')?C.f.find(f=>f[0]=='status')[3][0]:'',date:today(),gst:18,qty:1,gstd:1};
 if(!has(m,id?'e':'a'))return alert('You do not have permission.');if(m=='orders'&&r.status=='Completed'&&!ME.admin)return alert('Completed orders can only be reopened by an Admin.');
 const inp=f=>{const[k,l,t,o]=f,v=r[k]??'';
  if(t=='sel'||t=='prod'||t=='ref'){const op=t=='sel'?o.map(x=>[x,x]):t=='prod'?products().map(x=>[x,x]):DB[o].map(x=>[x.id,(x.no||'')+' '+(x.name||nm('customers',x.customer))]);
   return`<label>${l}<select name="${k}"><option value="">—</option>${op.map(x=>`<option value="${esc(x[0])}" ${x[0]==v?'selected':''}>${esc(x[1])}</option>`).join('')}</select></label>`}
  return`<label>${l}<input name="${k}" type="${t}" step="any" value="${esc(v)}"></label>`};
 $('#modal').innerHTML=`<div class="m"><div><h3>${id?'Edit':'Add'} ${C.t.replace(/s$/,'')}</h3><form onsubmit="return saveRec(event,'${m}','${id||''}')">${C.f.map(inp).join('')}<div class="top" style="margin-top:12px"><button>Save</button><button type="button" class="s" onclick="closeM()">Cancel</button></div></form></div></div>`}
function closeM(){$('#modal').innerHTML=''}
function saveRec(e,m,id){e.preventDefault();if(!has(m,id?'e':'a'))return false;const C=M[m],fd=new FormData(e.target),d={};
 for(const f of C.f){let v=fd.get(f[0])||'';if(f[2]=='number')v=v===''?0:+v;d[f[0]]=v}
 const first=C.f[0];if(!d[first[0]]&&!['number'].includes(first[2]))return alert(first[1]+' is required'),false;
 if(m=='payments'&&!(d.amount>0))return alert('Enter a payment amount'),false;
 if(id){const r=DB[m].find(x=>x.id==id);
  if(m=='orders'){if(r.rate!=d.rate)log(`Price of ${r.no} changed from ${r.rate} to ${d.rate}`);if(r.status!=d.status)log(`${r.no} status changed from ${r.status} to ${d.status}`)}
  Object.assign(r,d);log(`Edited ${C.t.slice(0,-1)} ${r.no||r.name||''}`)}
 else{d.id=uid();d.created=today();if(C.p!='ITM'&&m!='suppliers')d.no=C.p+'-'+new Date().getFullYear()+'-'+String(DB[m].length+1+Math.floor(Math.random()*0)).padStart(5,'0');
  if(m=='orders')d.priority=d.priority||'Normal';DB[m].push(d);log(`Created ${C.t.slice(0,-1)} ${d.no||d.name}`)}
 save();closeM();draw();return false}
function del(m,id){if(!has(m,'d'))return;if(!confirm('Delete this record?'))return;const r=DB[m].find(x=>x.id==id);DB[m]=DB[m].filter(x=>x.id!=id);log(`Deleted ${M[m].t.slice(0,-1)} ${r.no||r.name}`);save();draw()}
function toOrder(id){if(!has('orders','a'))return;const q=DB.quotations.find(x=>x.id==id);const o={...q,id:uid(),status:'New',advance:0,delivery:'',priority:'Normal',created:today()};
 o.no='ORD-'+new Date().getFullYear()+'-'+String(DB.orders.length+1).padStart(5,'0');DB.orders.push(o);q.status='Converted';log(`Converted ${q.no} to ${o.no}`);save();go('orders')}
function stock(id,s){if(!has('inventory','e'))return;const r=DB.inventory.find(x=>x.id==id),n=+prompt(s>0?'Stock in quantity:':'Stock out quantity:');if(!n)return;r.stock=+r.stock+s*n;log(`Stock ${s>0?'in':'out'} ${n} ${r.name}`);save();draw()}
// ---------- order detail ----------
function view(id){const o=DB.orders.find(x=>x.id==id),i=ST.indexOf(o.status),ps=DB.payments.filter(p=>p.order==id);
 $('#modal').innerHTML=`<div class="m"><div><h3>ORDER ${esc(o.no)}</h3>
 <p>${esc(nm('customers',o.customer))} · ${esc(o.product)} × ${o.qty} · Delivery ${esc(o.delivery||'—')}<br>Total <b>${money(tot(o))}</b> · Paid ${money(paid(o))} · Balance <b>${money(bal(o))}</b> · ${pst(o)}</p>
 <div class="tl">${ST.filter(s=>s!='Cancelled').map((s,k)=>`<span class="${o.status=='Cancelled'?'':k<i?'done':k==i?'now':''}">${s}</span>`).join('')}</div>
 <label>Change status<select onchange="setSt('${id}',this.value)">${ST.map(s=>`<option ${s==o.status?'selected':''}>${s}</option>`).join('')}</select></label>
 <h4>Payments</h4>${ps.map(p=>`<div>${p.date} · ${p.method} · ${money(p.amount)}</div>`).join('')||'<small>No payments yet (advance counted separately).</small>'}
 <div class="top" style="margin-top:12px"><button onclick="addPay('${id}')">Record payment</button><button class="s" onclick="invoice('${id}')">Invoice</button><button class="s" onclick="closeM();draw()">Close</button></div></div></div>`}
function setSt(id,s){const o=DB.orders.find(x=>x.id==id);if(!has('orders','e')){alert('You do not have permission.');return view(id)}if(o.status=='Completed'&&!ME.admin){alert('Only Admin can reopen a completed order.');return view(id)}
 if(s=='Delivered'){const who=prompt('Delivery confirmation – received by:');if(!who){return view(id)}o.receivedBy=who}
 log(`${o.no} status changed from ${o.status} to ${s}`);o.status=s;save();view(id)}
function addPay(id){if(!has('payments','a'))return alert('You do not have permission to record payments.');const a=+prompt('Amount received (₹):');if(!(a>0))return;const m=prompt('Method: '+PM.join(', '),'Cash')||'Cash',o=DB.orders.find(x=>x.id==id);
 DB.payments.push({id:uid(),no:'PAY-'+String(DB.payments.length+1).padStart(5,'0'),order:id,amount:a,date:today(),method:m,ref:''});log(`Payment ${money(a)} recorded on ${o.no}`);save();view(id)}
function invoice(id){const o=DB.orders.find(x=>x.id==id),c=DB.customers.find(x=>x.id==o.customer)||{},S=DB.set,sub=o.qty*o.rate-(+o.disc||0);
 $('#modal').innerHTML=`<div class="m"><div><div class="inv" style="display:block"><h2>${esc(S.name)}</h2><small>${esc(S.addr)} · ${esc(S.phone)} · GST ${esc(S.gst)}</small><hr><b>Invoice for ${esc(o.no)}</b> · ${today()}<br>Bill to: ${esc(c.name)} ${esc(c.company)} ${esc(c.gst?'GST '+c.gst:'')}
 <table><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Discount</th><th>GST</th><th>Total</th></tr><tr><td>${esc(o.product)}</td><td>${o.qty}</td><td>${money(o.rate)}</td><td>${money(o.disc)}</td><td>${o.gst}%</td><td>${money(tot(o))}</td></tr></table>
 <p>Subtotal ${money(sub)} · GST ${money(tot(o)-sub)}<br>Paid ${money(paid(o))} · <b>Balance ${money(bal(o))}</b></p><small>Pay via UPI: ${esc(S.upi)}</small></div>
 <div class="top"><button onclick="window.print()">Print / Save PDF</button><button class="s" onclick="view('${id}')">Back</button></div></div></div>`}
// ---------- dashboard ----------
const mon=d=>(d||'').slice(0,7);
function bars(obj){const mx=Math.max(1,...Object.values(obj));return Object.entries(obj).map(([k,v])=>`<div class="bar"><em>${esc(k)}</em><i style="width:${v/mx*60}%"></i>${typeof v=='number'&&v>999?money(v):v}</div>`).join('')||'<small>No data yet</small>'}
function dash(){const O=DB.orders.filter(o=>o.status!='Cancelled'),mo=today().slice(0,7);
 const out=O.reduce((a,o)=>a+bal(o),0),tc=DB.payments.filter(p=>p.date==today()).reduce((a,p)=>a+ +p.amount,0);
 const cards=[['Customers',DB.customers.length],['Total orders',O.length],['Today\'s orders',O.filter(o=>o.created==today()).length],['Pending',O.filter(o=>!['Delivered','Completed'].includes(o.status)).length],['In production',O.filter(o=>o.status=='In Production').length],['Ready',O.filter(o=>o.status=='Ready').length],['Completed',O.filter(o=>o.status=='Completed').length],['Outstanding',money(out)],['Today\'s collection',money(tc)],['Monthly revenue',money(O.filter(o=>mon(o.created)==mo).reduce((a,o)=>a+tot(o),0))],['Monthly expenses',money(DB.expenses.filter(e=>mon(e.date)==mo).reduce((a,e)=>a+ +e.amount,0))],['Low stock',DB.inventory.filter(i=>+i.stock<=+i.min).length]];
 const by=(f,k)=>f.reduce((a,x)=>(a[x[k]||'—']=(a[x[k]||'—']||0)+1,a),{}),ms={};O.forEach(o=>ms[mon(o.created)]=(ms[mon(o.created)]||0)+tot(o));
 const od=O.filter(o=>pst(o)=='Overdue').length;
 return (has('reports','v')?finance():'')+`<div class="cards">${cards.map(c=>`<div class="card"><b>${c[1]}</b><span>${c[0]}</span></div>`).join('')}</div>
 ${od?`<div class="box">⚠ ${od} order(s) overdue for payment.</div>`:''}
 <div class="box"><h3>Monthly sales</h3>${bars(ms)}</div><div class="box"><h3>Orders by status</h3>${bars(by(O,'status'))}</div><div class="box"><h3>Orders by product</h3>${bars(by(O,'product'))}</div>`}

// ---------- money in vs money out ----------
function finance(){
 const O=DB.orders.filter(o=>o.status!='Cancelled'),inn={},out={},cat={};
 O.forEach(o=>{if(+o.advance>0){const k=mon(o.created);inn[k]=(inn[k]||0)+ +o.advance}});
 DB.payments.forEach(p=>{const k=mon(p.date);inn[k]=(inn[k]||0)+ +p.amount});
 DB.expenses.forEach(e=>{const k=mon(e.date);out[k]=(out[k]||0)+ +e.amount;cat[e.category||'Other']=(cat[e.category||'Other']||0)+ +e.amount});
 const I=Object.values(inn).reduce((a,b)=>a+b,0),X=Object.values(out).reduce((a,b)=>a+b,0),months=[...new Set([...Object.keys(inn),...Object.keys(out)])].sort().reverse();
 return`<div class="cards"><div class="card in"><b>${money(I)}</b><span>Money received (advances + payments)</span></div><div class="card out"><b>${money(X)}</b><span>Money spent (expenses)</span></div><div class="card net"><b class="${I-X<0?'neg':'pos'}">${money(I-X)}</b><span>Net balance (received − spent)</span></div></div>
 <div class="box"><h3>Month by month</h3><div class="wrap"><table><tr><th>Month</th><th>Received</th><th>Spent</th><th>Net</th></tr>${months.map(k=>{const n=(inn[k]||0)-(out[k]||0);return`<tr><td>${k}</td><td class="pos">${money(inn[k])}</td><td class="neg">${money(out[k])}</td><td class="${n<0?'neg':'pos'}"><b>${money(n)}</b></td></tr>`}).join('')||'<tr><td colspan=4>No money movement yet</td></tr>'}</table></div></div>
 <div class="box"><h3>Where the money is going (by category)</h3>${bars(cat)}</div>`}
// ---------- reports ----------
function reports(){const O=DB.orders.filter(o=>o.status!='Cancelled'),rev=O.reduce((a,o)=>a+tot(o),0),ex=DB.expenses.reduce((a,e)=>a+ +e.amount,0),mat=DB.inventory.reduce((a,i)=>a,0);
 const cu={},pr={},pm={};O.forEach(o=>{cu[nm('customers',o.customer)||'—']=(cu[nm('customers',o.customer)||'—']||0)+tot(o);pr[o.product||'—']=(pr[o.product||'—']||0)+tot(o)});DB.payments.forEach(p=>pm[p.method]=(pm[p.method]||0)+ +p.amount);
 const pend=O.filter(o=>bal(o)>0);
 return`<div class="cards"><div class="card"><b>${money(rev)}</b><span>Revenue</span></div><div class="card"><b>${money(ex)}</b><span>Expenses</span></div><div class="card"><b>${money(rev-ex)}</b><span>Estimated profit</span></div></div>
 <div class="box"><h3>Customer-wise sales</h3>${bars(cu)}</div><div class="box"><h3>Product-wise sales</h3>${bars(pr)}</div><div class="box"><h3>Payment methods</h3>${bars(pm)}</div>
 <div class="box"><h3>Pending &amp; overdue payments</h3><div class="wrap"><table><tr><th>Order</th><th>Customer</th><th>Due</th><th>Balance</th><th>Status</th></tr>${pend.map(o=>`<tr><td>${esc(o.no)}</td><td>${esc(nm('customers',o.customer))}</td><td>${esc(o.delivery)}</td><td>${money(bal(o))}</td><td>${pst(o)}</td></tr>`).join('')||'<tr><td colspan=5>All clear</td></tr>'}</table></div></div>
 <button onclick="window.print()" class="s">Print report</button>`}
// ---------- audit / settings / csv ----------
function audit(){return`<div class="wrap"><table><tr><th>When</th><th>Who</th><th>What</th></tr>${DB.audit.map(a=>`<tr><td>${esc(a.t)}</td><td>${esc(a.u)}</td><td>${esc(a.m)}</td></tr>`).join('')||'<tr><td colspan=3>No activity yet</td></tr>'}</table></div>`}
function settings(){const S=DB.set;return`<div class="box"><form onsubmit="return saveSet(event)">${[['name','Company name'],['addr','Address'],['phone','Phone'],['gst','GST number'],['upi','UPI / bank details'],['products','Product types (comma separated)']].map(f=>`<label>${f[1]}<input name="${f[0]}" value="${esc(S[f[0]])}"></label>`).join('')}<button>Save settings</button></form></div>
 ${ghBox()}<div class="box"><h3>Backup</h3><button class="s" onclick="backup()">Download backup</button> <label style="display:inline-block">Restore <input type="file" accept=".json" onchange="restore(this.files[0])"></label></div>`}
function saveSet(e){e.preventDefault();new FormData(e.target).forEach((v,k)=>DB.set[k]=v);log('Settings updated');save();draw();return false}
function dl(name,txt,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type}));a.download=name;a.click()}
function backup(){dl('press-backup-'+today()+'.json',JSON.stringify(DB),'application/json')}
function restore(f){if(!f||!confirm('Replace all current data with this backup?'))return;f.text().then(t=>{try{DB=JSON.parse(t);DB.users=DB.users||[];save();ME=DB.users.find(u=>ME&&u.id==ME.id&&u.active)||null;draw()}catch(e){alert('Invalid backup file')}})}
function csv(m){const C=M[m],rows=[C.f.map(f=>f[1])].concat(DB[m].map(r=>C.f.map(f=>f[2]=='ref'?nm(f[3],r[f[0]]):r[f[0]])));
 dl(m+'.csv',rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv')}
// ---------- users, login and permissions ----------
const MODS=['dash','customers','enquiries','quotations','orders','payments','inventory','suppliers','expenses','reports'];
const LBL=Object.fromEntries(NAV);
const TPL={Manager:{dash:'v',customers:'vaed',enquiries:'vaed',quotations:'vaed',orders:'vaed',payments:'vaed',inventory:'vaed',suppliers:'vaed',expenses:'vaed',reports:'v'},
 Accounts:{dash:'v',customers:'v',quotations:'vae',orders:'ve',payments:'vaed',expenses:'vaed',reports:'v'},
 Designer:{dash:'v',customers:'v',orders:'ve'},
 'Production Staff':{dash:'v',orders:'ve',inventory:'vae'}};
let ME=null,fails=0,lockUntil=0;
const has=(m,c)=>!!ME&&(ME.admin||(ME.perms[m]||'').includes(c));
const can=k=>['users','audit','settings'].includes(k)?!!(ME&&ME.admin):has(k,'v');
const canDel=m=>has(m,'d');
const sess=()=>{try{localStorage.setItem('pp_me',ME.id)}catch(e){}};
const fb=s=>{let h=5381,i=s.length;while(i)h=(h*33)^s.charCodeAt(--i);return'f'+(h>>>0).toString(16)};
async function hash(u,p){const s='pp:'+u.toLowerCase()+':'+p;try{if(crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}}catch(e){}return fb(s)}
function loginScreen(){$('nav').style.display='none';const first=!DB.users.length;
 $('main').innerHTML=`<div class="box" style="max-width:360px;margin:8vh auto"><h2 style="color:var(--d)">🦜 ${esc(DB.set.name)}</h2><p>${first?'First time here – create the Admin account.':'Sign in to continue.'}</p>
 <form onsubmit="return ${first?'setup':'login'}(event)">${first?'<label>Your name<input name="fname" required></label>':''}
 <label>Username<input name="username" required autocomplete="username"></label>
 <label>Password<input name="password" type="password" required minlength="6" autocomplete="current-password"></label>
 ${first?'<label>Confirm password<input name="confirm" type="password" required></label>':''}
 <button style="width:100%;margin-top:10px">${first?'Create admin and start':'Sign in'}</button><p id="lerr" class="neg"></p></form><details style="margin-top:12px"><summary>Connect GitHub storage</summary><label>GitHub username<input id="gO"></label><label>Private data repository<input id="gR"></label><label>Admin token<input id="gT" type="password"></label><button class="s" type="button" onclick="ghConnect()">Connect &amp; load data</button></details></div>`}
async function setup(e){e.preventDefault();const f=new FormData(e.target),un=f.get('username').trim().toLowerCase();
 if(f.get('password')!=f.get('confirm')){$('#lerr').textContent='Passwords do not match';return false}
 const u={id:uid(),username:un,name:f.get('fname').trim(),role:'Admin',admin:true,active:true,perms:{},pass:await hash(un,f.get('password'))};
 DB.users.push(u);ME=u;log('Admin account created');sess();save();route='dash';draw();return false}
async function login(e){e.preventDefault();const err=$('#lerr'),f=new FormData(e.target);
 if(Date.now()<lockUntil){err.textContent='Too many attempts. Wait 30 seconds.';return false}
 const un=f.get('username').trim().toLowerCase(),u=DB.users.find(x=>x.username==un&&x.active);
 if(u&&u.pass==await hash(un,f.get('password'))){fails=0;ME=u;sess();log('Signed in');save();route='dash';draw();autoSync()}
 else{if(++fails>=5){lockUntil=Date.now()+30000;fails=0}err.textContent='Wrong username or password.'}return false}
function logout(){ME=null;try{localStorage.removeItem('pp_me')}catch(e){}draw()}
async function chPw(){const p=prompt('New password (min 6 characters):');if(!p)return;if(p.length<6)return alert('Too short');ME.pass=await hash(ME.username,p);log('Password changed');save();alert('Password changed')}
function usersView(){return`<div class="top"><button onclick="uEdit()">+ Add user</button></div><div class="wrap"><table><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr>
 ${DB.users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td>${u.admin?'Admin':esc(u.role)}</td><td><span class="bd ${u.active?'':'r'}">${u.active?'Active':'Disabled'}</span></td><td><button class="s" onclick="uEdit('${u.id}')">Edit</button> ${u.id!=ME.id?`<button class="x" onclick="uDel('${u.id}')">✕</button>`:''}</td></tr>`).join('')}</table></div>
 <p><small>For each person, tick what they may View, Add, Edit and Delete in every section. Administrators can do everything and are the only ones who see Users, Audit Log and Settings.</small></p>`}
function uEdit(id){const u=id?DB.users.find(x=>x.id==id):{perms:{},active:true,role:'Custom'};
 $('#modal').innerHTML=`<div class="m"><div><h3>${id?'Edit':'Add'} user</h3><form onsubmit="return uSave(event,'${id||''}')">
 <label>Full name<input name="fname" required value="${esc(u.name)}"></label>
 <label>Username<input name="username" required value="${esc(u.username)}" autocomplete="off"></label>
 <label>${id?'New password (leave blank to keep)':'Password (min 6 characters)'}<input name="password" type="password" ${id?'':'required'} minlength="6" autocomplete="new-password"></label>
 <label>Role template (fills the ticks below)<select name="role" onchange="tpl(this.value)">${['Custom',...Object.keys(TPL)].map(r=>`<option ${r==u.role?'selected':''}>${r}</option>`).join('')}</select></label>
 <label><input type="checkbox" name="admin" ${u.admin?'checked':''} style="display:inline;width:auto"> Administrator (full access)</label>
 <label><input type="checkbox" name="active" ${u.active?'checked':''} style="display:inline;width:auto"> Account active</label>
 <div class="wrap"><table><tr><th>Section</th><th>View</th><th>Add</th><th>Edit</th><th>Delete</th></tr>${MODS.map(m=>`<tr><td>${LBL[m]}</td>${[...'vaed'].map(c=>`<td><input type="checkbox" data-m="${m}" data-c="${c}" ${(u.perms[m]||'').includes(c)?'checked':''} style="width:auto"></td>`).join('')}</tr>`).join('')}</table></div>
 <div class="top" style="margin-top:12px"><button>Save user</button><button type="button" class="s" onclick="closeM()">Cancel</button></div></form></div></div>`}
function tpl(r){const t=TPL[r]||{};document.querySelectorAll('[data-m]').forEach(i=>i.checked=(t[i.dataset.m]||'').includes(i.dataset.c))}
async function uSave(e,id){e.preventDefault();const f=e.target,fd=new FormData(f),un=fd.get('username').trim().toLowerCase(),pw=fd.get('password'),old=id?DB.users.find(x=>x.id==id):null;
 if(DB.users.some(x=>x.username==un&&x.id!=id))return alert('That username is already taken.');
 if(old&&old.username!=un&&!pw)return alert('Username changed – please set a new password too.');
 const perms={};f.querySelectorAll('[data-m]:checked').forEach(i=>perms[i.dataset.m]=(perms[i.dataset.m]||'')+i.dataset.c);
 for(const m in perms)if(!perms[m].includes('v'))perms[m]='v'+perms[m];
 const u={id:id||uid(),username:un,name:fd.get('fname').trim(),role:fd.get('role'),admin:!!fd.get('admin'),active:!!fd.get('active'),perms,pass:pw?await hash(un,pw):old.pass};
 if(u.id==ME.id&&!u.active)return alert('You cannot disable your own account.');
 if(!DB.users.filter(x=>x.id!=u.id).concat(u).some(x=>x.admin&&x.active))return alert('Keep at least one active Administrator.');
 if(old)Object.assign(old,u);else DB.users.push(u);
 log(`${id?'Updated':'Created'} user ${un}`);save();closeM();draw();return false}
function uDel(id){const u=DB.users.find(x=>x.id==id);if(u.id==ME.id)return;
 if(u.admin&&!DB.users.some(x=>x.id!=id&&x.admin&&x.active))return alert('Keep at least one active Administrator.');
 if(!confirm('Delete user '+u.username+'?'))return;DB.users=DB.users.filter(x=>x.id!=id);log('Deleted user '+u.username);save();draw()}
// ---------- online requests -> straight into Enquiries / Orders / Quotations ----------
const inbox=()=>{try{return JSON.parse(localStorage.getItem('pp_inbox')||'[]')}catch(e){return[]}};
const setInbox=a=>{try{localStorage.setItem('pp_inbox',JSON.stringify(a))}catch(e){}};
function importReq(r){DB.imported=DB.imported||[];const ref=String(r.ref||'').slice(0,24);if(!ref||DB.imported.includes(ref))return 0;
 const t=['Order','Enquiry','Quotation'].includes(r.type)?r.type:'Enquiry',m=t=='Order'?'orders':t=='Enquiry'?'enquiries':'quotations';
 const S=(v,n)=>String(v==null?'':v).slice(0,n),yr=new Date().getFullYear(),pad=c=>String(DB[c].length+1).padStart(5,'0');
 let c=DB.customers.find(x=>x.mobile==S(r.mobile,15));
 if(!c){c={id:uid(),created:today(),no:'CUS-'+yr+'-'+pad('customers'),name:S(r.name,80),mobile:S(r.mobile,15),email:S(r.email,100),address:S(r.address,200),type:'Retail',credit:0,status:'Active'};DB.customers.push(c)}
 const rec={id:uid(),created:today(),date:today(),no:M[m].p+'-'+yr+'-'+pad(m),customer:c.id,product:S(r.product,60),qty:Math.max(1,+r.qty||1),rate:0,disc:0,gst:18,advance:0,size:S(r.size,60),material:S(r.material,60),delivery:S(r.required,10),required:S(r.required,10),priority:'Normal',notes:S(r.notes,500)+' [Online '+ref+']',status:M[m].f.find(f=>f[0]=='status')[3][0]};
 DB[m].push(rec);DB.imported.push(ref);log(`Online ${t.toLowerCase()} ${ref} added as ${rec.no}`);return 1}
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function dec(s){const o=JSON.parse(s),pk=await crypto.subtle.importKey('jwk',JSON.parse(DB.set.privKey),{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']),
 raw=await crypto.subtle.decrypt({name:'RSA-OAEP'},pk,unb64(o.k)),ak=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']),
 pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(o.i)},ak,unb64(o.c));return JSON.parse(new TextDecoder().decode(pt))}
// ---------- GitHub storage (private data repo) ----------
const GH=()=>{try{return JSON.parse(localStorage.getItem('pp_gh')||'{}')}catch(e){return{}}};
const b64s=s=>btoa(unescape(encodeURIComponent(s))),ub64s=s=>decodeURIComponent(escape(atob(s.replace(/\s/g,''))));
let ghSha=null,pushT=null,syncing=false;
async function ghApi(path,opt){opt=opt||{};const g=GH(),r=await fetch('https://api.github.com/repos/'+g.owner+'/'+g.repo+path,{...opt,headers:{Authorization:'Bearer '+g.token,Accept:'application/vnd.github+json','Content-Type':'application/json'}});
 if(!r.ok)throw new Error(String(r.status));return r.status==204?null:r.json()}
async function ghPull(){if(!GH().token)return false;let f;try{f=await ghApi('/contents/data.json')}catch(e){if(e.message=='404')return false;throw e}
 ghSha=f.sha;const rd=JSON.parse(ub64s(f.content));if((rd.ts||0)>(DB.ts||0)){DB=rd;DB.users=DB.users||[];try{localStorage.setItem('pp',JSON.stringify(DB))}catch(e){}return true}return false}
async function ghPush(){if(!GH().token)return;const put=()=>ghApi('/contents/data.json',{method:'PUT',body:JSON.stringify({message:'Update data',content:b64s(JSON.stringify(DB)),...(ghSha?{sha:ghSha}:{})})});
 try{ghSha=(await put()).content.sha}catch(e){if(!['409','422'].includes(e.message))throw e;try{ghSha=(await ghApi('/contents/data.json')).sha}catch(x){ghSha=null}ghSha=(await put()).content.sha}}
function schedPush(){if(!GH().token)return;clearTimeout(pushT);pushT=setTimeout(()=>ghPush().catch(e=>toast('GitHub save failed ('+e.message+')')),4000)}
function toast(m){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}t.textContent=m;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',6000)}
async function pullReq(){let n=0;const loc=inbox();if(loc.length){loc.forEach(r=>{n+=importReq(r)});setInbox([])}
 if(GH().token&&DB.set.privKey){const is=(await ghApi('/issues?state=open&per_page=100')).reverse();
  for(const i of is){if(i.pull_request)continue;let r;try{r=await dec(i.body)}catch(e){continue}n+=importReq(r);await ghApi('/issues/'+i.number,{method:'PATCH',body:JSON.stringify({state:'closed'})}).catch(()=>{})}}
 if(n){save();draw()}return n}
async function autoSync(){if(!ME||syncing||!(ME.admin||has('orders','a')))return;syncing=true;try{const n=await pullReq();if(n)toast(n+' new online request(s) added to Enquiries / Orders / Quotations')}catch(e){}syncing=false}
function startSync(){const go=()=>autoSync();if(GH().token)ghPull().then(ch=>{if(ch){ME=ME&&DB.users.find(u=>u.id==ME.id&&u.active)||null;draw()}go()}).catch(go);else go();setInterval(go,30000)}
window.addEventListener('storage',autoSync);
async function ghSave(){const g={owner:$('#ghO').value.trim(),repo:$('#ghR').value.trim(),token:$('#ghT').value.trim()||GH().token};
 if(!g.owner||!g.repo||!g.token)return alert('Fill owner, repository and token.');localStorage.setItem('pp_gh',JSON.stringify(g));
 try{if(await ghPull()){toast('Loaded your data from GitHub');ME=DB.users.find(u=>ME&&u.id==ME.id&&u.active)||null;draw()}else{await ghPush();toast('Connected. Data saved to GitHub.')}}catch(e){toast('GitHub error '+e.message+' - check owner, repo and token')}}
async function ghConnect(){const g={owner:$('#gO').value.trim(),repo:$('#gR').value.trim(),token:$('#gT').value.trim()};if(!g.owner||!g.repo||!g.token)return alert('Fill all three boxes.');
 localStorage.setItem('pp_gh',JSON.stringify(g));try{await ghPull();draw()}catch(e){alert('GitHub error '+e.message+' - check owner, repo and token')}}
function ghBox(){const g=GH();return`<div class="box"><h3>GitHub storage</h3><p><small>Your data is saved to a <b>private</b> repository on GitHub, so you can open the app on any device. The token stays on this device only.</small></p>
 <label>GitHub username<input id="ghO" value="${esc(g.owner)}"></label><label>Private data repository name<input id="ghR" value="${esc(g.repo)}"></label><label>Admin token ${g.token?'(saved - leave blank to keep)':''}<input id="ghT" type="password"></label>
 <button onclick="ghSave()">Save &amp; connect</button> <button class="s" onclick="ghPush().then(()=>toast('Saved to GitHub')).catch(e=>toast('Failed: '+e.message))">Save now</button>
 <h4>Customer page connection</h4><p><small>Customer requests are encrypted before they reach GitHub. Create keys once, then paste the text below into <code>config.js</code> (and add the customer token).</small></p>
 <button class="s" onclick="genKeys()">Create encryption keys</button> <button class="s" onclick="cfgText()">Show config.js text</button><textarea id="cfgOut" rows="5" readonly style="width:100%;margin-top:8px"></textarea></div>`}
async function genKeys(){if(DB.set.privKey&&!confirm('Keys already exist. Creating new ones means unread old requests cannot be opened. Continue?'))return;
 const k=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
 DB.set.privKey=JSON.stringify(await crypto.subtle.exportKey('jwk',k.privateKey));DB.set.pubKey=JSON.stringify(await crypto.subtle.exportKey('jwk',k.publicKey));save();cfgText();toast('Keys created')}
function cfgText(){const g=GH(),o=$('#cfgOut');if(!o)return;o.value=DB.set.pubKey?`const CFG={gh:{owner:'${g.owner||''}',repo:'${g.repo||''}',token:'PASTE_CUSTOMER_TOKEN_HERE',pub:${DB.set.pubKey}}};`:'Create encryption keys first.'}

try{ME=DB.users.find(u=>u.id==localStorage.getItem('pp_me')&&u.active)||null}catch(e){}
draw();
startSync();

if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
