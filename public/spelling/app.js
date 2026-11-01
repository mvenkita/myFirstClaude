import {OUTCOMES,latestResults,selectWords,countResults,csvCell} from './core.js';
import {configured,connectCloud} from './cloud.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
const date=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
let words=[],students=[],attempts=[],studentId='',user=null,cloud=null,demo=false,session=null,busy=false,hidden=false,view='practice';
let filters={group:'all',filter:'all',order:'sheet'},notice='',loaded=new Set(),syncMeta={};
const setNotice=text=>{notice=text;$('notice').textContent=text;$('notice').hidden=!text;};
function fail(error){setNotice(error.code==='permission-denied'?'Cloud access was denied. Check the published Firestore rules before recording results.':error.code==='auth/unauthorized-domain'?'This address is not authorized for sign-in. Add mvenkita.github.io in Firebase Authentication → Settings → Authorized domains.':error.code==='auth/popup-blocked'?'The sign-in window was blocked. Allow pop-ups for this site, then tap Sign in again.':error.code==='auth/operation-not-allowed'?'Enable Google sign-in in Firebase Authentication to connect your account.':error.message||'Something went wrong. Please try again.');}
function currentLatest(){return latestResults(attempts,studentId);}
function eligible(){return selectWords(words,currentLatest(),filters);}
function active(){return session&&session.index<session.ids.length&&!session.ended;}
function currentWord(){return active()?words.find(w=>w.id===session.ids[session.index]):null;}
function ready(){return demo||(user&&loaded.size===2);}
function syncLabel(){
 let label=demo?'Demo · on this browser':!user?'Sign in to sync':!navigator.onLine?'Offline · reconnect to save':loaded.size<2?'Loading your records…':Object.values(syncMeta).some(m=>m.pending)?'Saving…':Object.values(syncMeta).some(m=>m.cached)?'Connecting…':'All changes synced';
 $('sync').textContent=label;$('sync').dataset.state=(!navigator.onLine&&!demo)?'error':'';
}
function storeDemo(){localStorage.setItem('spelling-studio-demo-v1',JSON.stringify({students,attempts}));}
async function save(kind,id,data){
 if(demo){const collection=kind==='students'?students:attempts;const next=collection.map(x=>x.id===id?{...x,...data}:x);if(!collection.some(x=>x.id===id))next.push({id,...data});const snapshot={students:kind==='students'?next:students,attempts:kind==='attempts'?next:attempts};localStorage.setItem('spelling-studio-demo-v1',JSON.stringify(snapshot));students=snapshot.students;attempts=snapshot.attempts;return;}
 if(!navigator.onLine)throw new Error('You are offline. Reconnect before recording this result.');
 if(!ready())throw new Error('Wait for your cloud records to load before recording a result.');
 await cloud.save(kind,id,data);
 // Ensure state is available immediately even when the next snapshot has not rendered yet.
 const collection=kind==='students'?students:attempts;
 const existing=collection.find(x=>x.id===id);if(existing)Object.assign(existing,data);else collection.push({id,...data});
}
function render(){
 $('welcome').hidden=Boolean(user||demo);$('workspace').hidden=!user&&!demo;
 $('demo-banner').hidden=!demo;$('account-button').textContent=demo?'Leave demo':user?'Sign out':'Sign in';
 $('word-total').textContent=`${words.length} words · a little practice, every day`;
 syncLabel();
 if(!user&&!demo)return;
 const prev=studentId;if(!students.some(s=>s.id===studentId))studentId=students[0]?.id||'';
 if(prev&&prev!==studentId)session=null;
 $('student').innerHTML=students.length?students.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join(''):'<option value="">Add a student to begin</option>';
 $('student').value=studentId;$('student').disabled=busy;$('add-student').disabled=busy||!ready();
 $('eligible-count').textContent=eligible().length;
 $('start').disabled=busy||!studentId||!eligible().length||!ready();
 $('start').innerHTML=active()?'Start a new list <span>→</span>':'Start practice <span>→</span>';
 $('session-setting-note').hidden=!active();
 $('practice-view').hidden=view!=='practice';$('progress-view').hidden=view!=='progress';
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
 renderPractice();if(view==='progress')renderRecords();
}
function renderPractice(){
 const word=currentWord();$('scoring').hidden=!word;$('skip').hidden=!word;$('hide-word').hidden=!word;$('finish').hidden=!active();
 $('undo').disabled=busy||!session?.steps.length;$('skip').disabled=busy;$('finish').disabled=busy;
 document.querySelectorAll('[data-outcome]').forEach(b=>b.disabled=busy||(!demo&&!navigator.onLine));
 $('progress-bar').style.width=session?`${100*session.index/session.ids.length}%`:'0%';
 $('position').textContent=word?`${session.index+1} of ${session.ids.length}`:'';
 $('word-group').textContent=word?`${word.groups.map(g=>g.toUpperCase()).join(' / ')} WORDS`:session?'SESSION COMPLETE':'READY WHEN YOU ARE';
 $('hide-word').textContent=hidden?'Show word':'Hide word';
 $('last-result').textContent='';
 if(word){
  $('word-content').innerHTML=`<div class="word${hidden?' hidden-word':''}" aria-label="${hidden?'Word hidden':esc(word.text)}">${hidden?'••••••':esc(word.text)}</div><p class="word-context">${hidden?'Keep the spelling out of sight.':'Say it aloud. Let the student spell it.'}</p>`;
  const last=currentLatest().get(word.id);$('last-result').textContent=last?`Last time: ${OUTCOMES[last.outcome].label}`:'Not practiced yet';
 } else if(session){
  const done=attempts.filter(a=>a.sessionId===session.id&&!a.voided&&a.studentId===studentId);
  $('word-content').innerHTML=`<span class="ready-art" aria-hidden="true">✦</span><h2>Another little step forward.</h2><p>${done.length} ${done.length===1?'word':'words'} practiced${session.skipped?`, ${session.skipped} skipped`:''}. Every attempt counts.</p><div class="summary-grid">${Object.entries(OUTCOMES).map(([key,value])=>`<div><strong>${done.filter(a=>a.outcome===key).length}</strong>${value.label}</div>`).join('')}</div>`;
 }else{
  $('word-content').innerHTML='<div class="ready-art" aria-hidden="true">Aa<span>✧</span></div><h2>One word. One step forward.</h2><p>Choose a student and a word list to begin.</p>';
 }
}
function renderRecords(){
 const latest=currentLatest(),counts=countResults(words,latest);
 $('stats').innerHTML=[...Object.entries(OUTCOMES).map(([k,v])=>[k,v.label]),['new','Not practiced']].map(([key,label])=>`<div class="stat"><strong>${counts[key]}</strong><span>${label}</span></div>`).join('');
 const filtered=selectWords(words,latest,{filter:$('record-filter').value,order:'alphabetical'}).filter(w=>w.text.toLowerCase().includes($('search').value.trim().toLowerCase()));
 $('record-count').textContent=`${filtered.length} words · Tap a word to see its history.`;
 const countsByWord=new Map();for(const a of attempts)if(a.studentId===studentId&&!a.voided)countsByWord.set(a.wordId,(countsByWord.get(a.wordId)||0)+1);
 $('records').innerHTML=filtered.length?filtered.map(w=>{const a=latest.get(w.id);return `<tr><td><button class="word-link" data-history="${esc(w.id)}">${esc(w.text)}</button></td><td>${w.groups.map(g=>g.toUpperCase()).join(', ')}</td><td>${a?`<span class="result-badge ${a.outcome}">${OUTCOMES[a.outcome].label}</span>`:'<span class="unpracticed">Not practiced</span>'}</td><td>${countsByWord.get(w.id)||0}</td><td>${a?date(a.createdAt):'—'}</td></tr>`;}).join(''):'<tr><td colspan="5" class="empty-table">No words match this search.</td></tr>';
 $('export').disabled=!studentId;
}
async function record(outcome){
 if(busy||!active())return;
 busy=true;setNotice('');renderPractice();
 const word=currentWord(),at=session.index,id=uid(),data={studentId,wordId:word.id,outcome,createdAt:Date.now(),sessionId:session.id,voided:false};
 $('session-note').textContent=demo?'Saving…':'Saving to your teacher account…';
 try{await save('attempts',id,data);session.steps.push({id,index:at,type:'score'});session.index++;hidden=false;$('session-note').textContent=`${word.text} · ${OUTCOMES[outcome].label} · ${demo?'saved in demo':'saved'}`;}
 catch(e){fail(e);$('session-note').textContent='Result not confirmed. Please try again.';}
 finally{setTimeout(()=>{busy=false;render();},250);}
}
async function undo(){
 if(busy||!session?.steps.length)return;
 busy=true;render();const step=session.steps.at(-1);
 try{if(step.type==='score')await save('attempts',step.id,{voided:true});else session.skipped--;session.steps.pop();session.index=step.index;session.ended=false;hidden=false;$('session-note').textContent='Last action undone. Try this word again.';}
 catch(e){fail(e);}finally{busy=false;render();}
}
function start(){
 if(active()&&!confirm('Start a new list? Results already recorded are saved.'))return;
 session={id:uid(),ids:eligible().map(w=>w.id),index:0,steps:[],skipped:0,ended:false};hidden=false;
 $('session-note').textContent='Ready. Each result is saved before moving on.';render();
 if(matchMedia('(max-width: 700px)').matches)document.querySelector('.practice-main').scrollIntoView({behavior:'smooth',block:'start'});
}
async function login(){
 if(!configured){setNotice('Firebase setup is still in progress. Explore the demo while your project is connected.');return;}
 if(!cloud){setNotice('Connecting to sign-in. Please try again in a moment.');return;}
 try{await cloud.login();setNotice('');}catch(e){if(e.code!=='auth/popup-closed-by-user'&&e.code!=='auth/cancelled-popup-request')fail(e);}
}
$('login').onclick=login;
$('account-button').onclick=async()=>{
 if(busy){setNotice('Wait for the current result to finish saving before signing out.');return;}
 if(demo){demo=false;students=[];attempts=[];studentId='';session=null;render();return;}
 if(user){try{await cloud.logout();}catch(e){fail(e);}}else login();
};
$('demo').onclick=()=>{
 try{const saved=JSON.parse(localStorage.getItem('spelling-studio-demo-v1')||'null');students=saved?.students||[{id:'demo-student',name:'Sample student'}];attempts=saved?.attempts||[];demo=true;session=null;studentId=students[0]?.id||'';storeDemo();setNotice('');render();}catch(e){fail(new Error('Browser storage is unavailable. Allow site storage to use the demo.'));}
};
$('add-student').onclick=()=>{$('student-name').value='';$('student-dialog').showModal();$('student-name').focus();};
$('student-form').onsubmit=async event=>{
 event.preventDefault();const name=$('student-name').value.trim();if(!name||busy)return;
 busy=true;const submit=event.submitter;submit.disabled=true;const id=uid();
 try{await save('students',id,{name,createdAt:Date.now()});studentId=id;session=null;$('student-dialog').close();setNotice('');}catch(e){fail(e);$('student-dialog').close();}finally{busy=false;submit.disabled=false;render();}
};
document.querySelectorAll('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('student').onchange=()=>{studentId=$('student').value;session=null;$('session-note').textContent='';render();};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render();});
document.querySelectorAll('[data-group]').forEach(b=>b.onclick=()=>{filters.group=b.dataset.group;document.querySelectorAll('[data-group]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});render();});
$('filter').onchange=()=>{filters.filter=$('filter').value;render();};$('order').onchange=()=>{filters.order=$('order').value;render();};
$('start').onclick=start;document.querySelectorAll('[data-outcome]').forEach(b=>b.onclick=()=>record(b.dataset.outcome));
$('hide-word').onclick=()=>{hidden=!hidden;renderPractice();};
$('skip').onclick=()=>{if(busy||!active())return;const word=currentWord();session.steps.push({index:session.index,type:'skip'});session.index++;session.skipped++;hidden=false;$('session-note').textContent=`${word.text} skipped · no result recorded`;render();};
$('finish').onclick=()=>{if(!busy){session.ended=true;render();}};$('undo').onclick=undo;
$('search').oninput=renderRecords;$('record-filter').onchange=renderRecords;
$('records').onclick=event=>{const button=event.target.closest('[data-history]');if(!button)return;const word=words.find(w=>w.id===button.dataset.history);$('history-title').textContent=word.text;const history=attempts.filter(a=>a.studentId===studentId&&a.wordId===word.id&&!a.voided).sort((a,b)=>b.createdAt-a.createdAt);$('history-content').innerHTML=history.length?`<ul>${history.map(a=>`<li><span class="result-badge ${a.outcome}">${OUTCOMES[a.outcome].label}</span><small>${date(a.createdAt)}</small></li>`).join('')}</ul>`:'<p>This word has not been practiced yet.</p>';$('history-dialog').showModal();};
$('export').onclick=()=>{
 const rows=[['Student','Word','Vowel groups','Result','Practiced at']];
 for(const a of attempts.filter(a=>a.studentId===studentId&&!a.voided).sort((a,b)=>a.createdAt-b.createdAt)){const w=words.find(w=>w.id===a.wordId);rows.push([students.find(s=>s.id===studentId)?.name,w?.text||a.wordId,w?.groups.join(', ')||'',OUTCOMES[a.outcome].label,new Date(a.createdAt).toISOString()]);}
 const blob=new Blob(['\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='spelling-history.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.addEventListener('keydown',event=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)||document.querySelector('dialog[open]')||view!=='practice')return;const outcome=Object.keys(OUTCOMES)[Number(event.key)-1];if(outcome&&active()){event.preventDefault();record(outcome);}});
window.addEventListener('online',()=>{syncLabel();renderPractice();});window.addEventListener('offline',()=>{syncLabel();renderPractice();});
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
async function boot(){
 try{const response=await fetch('./words.json');if(!response.ok)throw new Error('The spelling list could not load. Please refresh the page.');words=await response.json();render();
  $('setup-message').hidden=configured;
  if(configured)cloud=await connectCloud({
   account:next=>{user=next;demo=false;students=[];attempts=[];studentId='';session=null;loaded=new Set();syncMeta={};render();},
   data:(kind,data)=>{if(kind==='students')students=data.sort((a,b)=>a.createdAt-b.createdAt);else attempts=data;loaded.add(kind);render();},
   sync:(kind,cached,pending)=>{syncMeta[kind]={cached,pending};syncLabel();},
   error:e=>{fail(e);$('sync').textContent='Sync needs attention';$('sync').dataset.state='error';},
  });
 }catch(e){fail(e);$('sync').textContent='Connection unavailable';}
}
boot();
