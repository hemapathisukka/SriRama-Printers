// Free backend: Google Sheet + Apps Script. (1) Make a Google Sheet; put these headers in row 1:
// created, ref, type, name, mobile, email, product, qty, size, material, required, address, notes, status
// (2) Extensions > Apps Script > paste this > set KEY > Deploy > Web app > Execute as: Me, Access: Anyone. (3) Paste the URL in config.js.
const KEY='CHANGE-ME-SECRET'; // same value goes in the admin app: Settings > Online requests admin key
const COLS=['created','ref','type','name','mobile','email','product','qty','size','material','required','address','notes','status'];
function sh(){return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]}
function out(t){return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.JSON)}
function doPost(e){const d=JSON.parse(e.postData.contents),s=sh();
 if(d.action==='status'){if(d.key!==KEY)return out('denied');const v=s.getDataRange().getValues();
  for(let i=1;i<v.length;i++)if(v[i][1]===d.ref)s.getRange(i+1,14).setValue(d.status);return out('ok')}
 if(!d.ref||!d.name||!d.mobile)return out('bad');
 s.appendRow(COLS.map(c=>c==='created'?new Date().toISOString():c==='status'?'New':String(d[c]===undefined?'':d[c]).slice(0,500)));return out('ok')}
function doGet(e){const p=e.parameter,v=sh().getDataRange().getValues().slice(1);
 if(p.action==='track'){const r=v.find(x=>x[1]===p.ref);return out(JSON.stringify({status:r?r[13]:null}))}
 if(p.action==='list'&&p.key===KEY)return out(JSON.stringify(v.map(r=>Object.fromEntries(COLS.map((c,i)=>[c,r[i]])))));
 return out('denied')}
