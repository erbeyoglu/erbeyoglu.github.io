/* Classroom participation and the lesson-session activity bridge.
   Standalone class URLs keep the original per-widget session layout. A
   lesson URL uses the poll controller's single session and activity rounds. */
window.CLASSROOM = (() => {
  'use strict';
  const DB=(window.CLASSROOM_DB||'').replace(/\/$/,'');
  const params=new URLSearchParams(location.search);
  const joinCode=(params.get('class')||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const focusId=params.get('w'), lessonMode=params.get('lesson')==='1', lessonRound=params.get('round')||'';
  const isHost=params.has('embed')||params.has('host');
  const isLessonHost=lessonMode&&isHost&&params.has('embed')&&parent!==window;
  const isLessonStudent=lessonMode&&!!joinCode&&!!focusId&&!!lessonRound&&!isHost;
  const week=(location.pathname.match(/(week\d\d)\.html$/i)||[,''])[1].toLowerCase();
  let lessonState=null, lessonPanel=null, boardTimer=null, boardKey='', lessonMessage='';
  const pendingCommands=new Map();
  const lsGet=k=>{try{return localStorage.getItem(k);}catch{return null;}};
  const lsSet=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uuid=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),v=>v.toString(16).padStart(2,'0')).join('');
  const serverTime=()=>({'.sv':'timestamp'});
  const pageKey=id=>location.pathname.split('/').pop().replace('.html','')+':'+id;
  const activityKey=w=>week+':'+w.id+(params.get('mode')?':'+params.get('mode'):'');
  const publicBase=()=>(window.CLASSROOM_PUBLIC_BASE||new URL('.',location.href).href).replace(/\/?$/,'/');
  const sessionUrl=(code,id)=>publicBase()+location.pathname.split('/').pop()+'?class='+code+'&w='+encodeURIComponent(id);
  const lessonPollUrl=code=>publicBase()+'polls.html?session='+encodeURIComponent(code);
  function betterOf(dir,a,b){if(a===null||a===undefined||isNaN(a))return b;if(b===null||b===undefined||isNaN(b))return a;return dir==='max'?Math.max(a,b):Math.min(a,b);}
  async function request(path,options={}){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
    try { const r=await fetch(DB+path+'.json',{...options,signal:controller.signal});if(!r.ok)throw new Error('db '+(options.method||'read')+' failed');return r.json(); }
    catch(error){if(error.name==='AbortError')throw new Error('Connection timed out. Please retry.');throw error;}
    finally{clearTimeout(timeout);}
  }
  const dbGet=path=>request(path);
  const dbPost=(path,value)=>request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
  function renderBoard(host,data,w,cutoff=Infinity){
    const rows=Object.values(data||{}).filter(q=>typeof q?.v==='number'&&isFinite(q.v)&&(cutoff===Infinity||(Number.isFinite(q.at)&&q.at<=cutoff)));
    rows.sort((a,b)=>w.dir==='max'?b.v-a.v:a.v-b.v);
    if(!rows.length){host.innerHTML='<span style="color:var(--muted)">waiting for the first submission…</span>';return;}
    host.innerHTML='<table class="attempts lb"><thead><tr><th>#</th><th>name</th><th>'+esc(w.label)+'</th></tr></thead><tbody>'+rows.slice(0,10).map((q,i)=>'<tr'+(i===0?' class="best"':'')+'><td>'+(i+1)+(i===0?' 🏆':'')+'</td><td>'+esc(String(q.n||'anon').slice(0,18))+'</td><td><b>'+q.v.toFixed(w.digits)+'</b></td></tr>').join('')+'</tbody></table><span style="color:var(--muted);font-size:0.85rem">'+rows.length+' submission(s)</span>';
  }
  function addQR(target,url){
    const qr=qrcode(0,'M');qr.addData(url);qr.make();const button=document.createElement('button');
    button.className='activity-qr-enlarge';button.setAttribute('aria-label','Enlarge activity QR');button.innerHTML=qr.createSvgTag({cellSize:4,margin:16});target.replaceChildren(button);
    button.onclick=()=>{let dialog=document.getElementById('activity-qr-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='activity-qr-dialog';dialog.innerHTML='<button>Back to activity</button><div></div><p>Scan to open the lesson.</p>';dialog.querySelector('button').onclick=()=>dialog.close();document.body.appendChild(dialog);}dialog.querySelector('div').innerHTML=qr.createSvgTag({cellSize:8,margin:32});dialog.showModal();};
  }
  /* The old, independent class-session flow is intentionally retained. */
  function instructorUI(box,w){
    box.classList.add('classroom-host');const btn=document.createElement('button');btn.textContent='Start class session 📱';box.appendChild(btn);let timer=null;
    btn.onclick=()=>{if(timer){clearInterval(timer);timer=null;btn.textContent='Start class session 📱';box.querySelectorAll('.class-live').forEach(x=>x.remove());return;}const code=Array.from({length:4},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');const live=document.createElement('div');live.className='class-live';const url=sessionUrl(code,w.id);live.innerHTML='<div class="qr"></div><p><b>Session '+code+'</b></p><p>Scan, try the activity, then submit your result.</p><a href="'+esc(url)+'" target="_blank" rel="noopener">Open student activity</a><div class="lb">waiting for the first submission…</div>';box.appendChild(live);addQR(live.querySelector('.qr'),url);btn.textContent='End session';const poll=async()=>{try{renderBoard(live.querySelector('.lb'),await dbGet('/sessions/'+code+'/'+w.id),w);}catch{live.querySelector('.lb').innerHTML='<span style="color:var(--critical)">cannot reach the classroom database</span>';}};poll();timer=setInterval(poll,3000);};
  }
  function classBar(w){if(document.querySelector('.class-bar'))return;const bar=document.createElement('div');bar.className='class-bar';const title=(document.getElementById(w.id)?.querySelector('h2')?.childNodes[0]?.textContent||'').trim();bar.innerHTML='<span class="code">CLASS '+esc(joinCode)+'</span>'+(title?'<span class="what">'+esc(title)+'</span>':'');document.body.insertBefore(bar,document.body.firstChild);}
  function stripAnswerKeys(scope){scope.querySelectorAll('button').forEach(b=>{if(/^\s*(reveal|show the answer|show answer|solution)/i.test(b.textContent||''))b.classList.add('answer-key');});}
  function updateBest(w,v){const key='best:'+pageKey(w.id),prev=parseFloat(lsGet(key)),best=betterOf(w.dir,isNaN(prev)?null:prev,v);lsSet(key,String(best));const el=document.getElementById('cl-best-'+w.id);if(el)el.textContent=best.toFixed(w.digits);}
  function fitStudentDock(dock) {
    const resize = () => document.body.style.setProperty('--class-dock-height', dock.getBoundingClientRect().height + 'px');
    new ResizeObserver(resize).observe(dock);
    resize();
  }
  function normalStudentUI(box,w){
    const name0=(lsGet('classroom-name')||'').replace(/"/g,''),bestPrev=parseFloat(lsGet('best:'+pageKey(w.id)));box.remove();classBar(w);const dock=document.createElement('div');dock.className='class-dock';dock.innerHTML='<div class="row"><input type="text" id="cl-name-'+w.id+'" placeholder="your name" maxlength="18" autocomplete="name" enterkeyhint="send" value="'+esc(name0)+'"><button class="primary send" id="cl-sub-'+w.id+'">Submit to class</button></div><div class="meta"><span>your best: <b id="cl-best-'+w.id+'">'+(isNaN(bestPrev)?'—':bestPrev.toFixed(w.digits))+'</b></span><span class="fb" id="cl-fb-'+w.id+'">Not sent yet. Choose your settings, then tap Submit to class.</span></div>';document.body.appendChild(dock);fitStudentDock(dock);const fb=dock.querySelector('#cl-fb-'+w.id),nameEl=dock.querySelector('#cl-name-'+w.id),btn=dock.querySelector('#cl-sub-'+w.id);const say=(m,k)=>{fb.textContent=m;fb.className='fb'+(k?' '+k:'');};const submit=async()=>{const name=nameEl.value.trim()||'anon';lsSet('classroom-name',name);const v=w.get();if(!Number.isFinite(v)){say(w.invalidMessage||'no valid attempt yet — play the activity first','err');return;}btn.disabled=true;say('sending…');try{await dbPost('/sessions/'+joinCode+'/'+w.id,{n:name,v:+v.toFixed(w.digits)});say('Sent to class: '+v.toFixed(w.digits)+' ✓','ok');btn.textContent='Submit to class again';updateBest(w,v);}catch{say('could not send — check your connection','err');}finally{btn.disabled=false;}};btn.onclick=submit;nameEl.addEventListener('keydown',e=>{if(e.key==='Enter')submit();});
  }
  function lessonMatches(meta,w,round=lessonRound){const a=meta?.activity;return meta?.phase==='activity'&&meta.roundId===round&&a?.key===activityKey(w)&&a?.roundId===round&&a.week===week&&a.id===w.id;}
  function lessonRoundMatches(roundMeta,w){return roundMeta?.activityKey===activityKey(w)&&roundMeta?.week===week&&roundMeta?.widgetId===w.id&&roundMeta?.phase==='open';}
  function mountLessonStudent(box,w){
    box.remove();classBar(w);stripAnswerKeys(document);const section=document.getElementById(w.id);let notice=document.getElementById('class-lesson-status-'+w.id),dock=null,offline=true,current=false,pollTimer;
    if(!notice){notice=document.createElement('p');notice.id='class-lesson-status-'+w.id;notice.className='status info';section?.prepend(notice);}const setNotice=(text,bad=false)=>{notice.textContent=text;notice.className='status '+(bad?'bad':'info');notice.hidden=text==='This activity is open.';};
    const ensureDock=()=>{
      if(dock)return;
      const name0=(lsGet('classroom-name')||'').replace(/"/g,''),bestPrev=parseFloat(lsGet('best:'+pageKey(w.id)));
      dock=document.createElement('div');dock.className='class-dock';
      dock.innerHTML='<div class="row"><input type="text" id="cl-name-'+w.id+'" placeholder="your name" maxlength="18" autocomplete="name" enterkeyhint="send" value="'+esc(name0)+'"><button class="primary send" id="cl-sub-'+w.id+'" disabled>Submit to class</button></div><div class="meta"><span>your best: <b id="cl-best-'+w.id+'">'+(isNaN(bestPrev)?'—':bestPrev.toFixed(w.digits))+'</b></span><span class="fb" id="cl-fb-'+w.id+'">Checking whether this activity is open…</span></div>';
      document.body.appendChild(dock);fitStudentDock(dock);
      const nameEl=dock.querySelector('#cl-name-'+w.id),btn=dock.querySelector('#cl-sub-'+w.id),fb=dock.querySelector('#cl-fb-'+w.id);
      let submitting=false;
      const say=(m,k)=>{fb.textContent=m;fb.className='fb'+(k?' '+k:'');};
      const setEnabled=()=>{btn.disabled=offline||!current||submitting;};
      const submit=async()=>{
        if(offline||!current||submitting)return;
        const name=nameEl.value.trim()||'anon',value=w.get();lsSet('classroom-name',name);
        if(!Number.isFinite(value)){say(w.invalidMessage||'no valid attempt yet — play the activity first','err');return;}
        submitting=true;setEnabled();say('checking the current lesson activity…');
        try{
          const before=await dbGet('/sessions/'+joinCode+'/poll/meta'),roundMeta=await dbGet('/sessions/'+joinCode+'/activityRounds/'+lessonRound+'/meta');
          if(!lessonMatches(before,w)||!lessonRoundMatches(roundMeta,w))throw new Error('This activity is closed or has been replaced.');
          await dbPost('/sessions/'+joinCode+'/activityRounds/'+lessonRound+'/answers',{n:name,v:+value.toFixed(w.digits),at:serverTime()});
          const after=await dbGet('/sessions/'+joinCode+'/poll/meta'),afterRound=await dbGet('/sessions/'+joinCode+'/activityRounds/'+lessonRound+'/meta');
          if(!lessonMatches(after,w)||!lessonRoundMatches(afterRound,w))throw new Error('Your score was not confirmed because this activity closed.');
          say('Sent to class: '+value.toFixed(w.digits)+' ✓','ok');btn.textContent='Submit to class again';updateBest(w,value);
        }catch(error){say(error.message||'could not send — check your connection','err');}
        finally{submitting=false;setEnabled();}
      };
      btn.onclick=submit;nameEl.addEventListener('keydown',e=>{if(e.key==='Enter')submit();});
      dock._lessonSet=({isCurrent,isOffline,scored})=>{current=isCurrent;offline=isOffline;if(!scored){dock.remove();dock=null;return;}setEnabled();if(fb.textContent==='Checking whether this activity is open…')say('Not sent yet. Choose your settings, then tap Submit to class.');};
    };
    const refresh=async()=>{try{const meta=await dbGet('/sessions/'+joinCode+'/poll/meta'),matches=lessonMatches(meta,w),scored=matches&&meta.activity?.scored===true;if(matches){const roundMeta=await dbGet('/sessions/'+joinCode+'/activityRounds/'+lessonRound+'/meta');current=lessonRoundMatches(roundMeta,w);offline=false;if(scored)ensureDock();if(dock?._lessonSet)dock._lessonSet({isCurrent:current,isOffline:false,scored});setNotice(current?'This activity is open.':'This activity is closed.');}else{current=false;offline=false;if(dock?._lessonSet)dock._lessonSet({isCurrent:false,isOffline:false,scored:true});setNotice(meta?.phase==='ended'?'This lesson session has ended.':'Waiting for your instructor to open this activity.');}}catch{offline=true;current=false;if(dock?._lessonSet)dock._lessonSet({isCurrent:false,isOffline:true,scored:true});setNotice('Cannot reach the classroom session. Submission is disabled until it reconnects.',true);}pollTimer=setTimeout(refresh,2000);};refresh();window.addEventListener('online',()=>{clearTimeout(pollTimer);refresh();},{once:true});
  }
  function lessonPanelFor(w){
    if(lessonPanel)return lessonPanel;const section=document.getElementById(w.id);if(!section)return null;const panel=document.createElement('aside');panel.className='classroom classroom-host lesson-classroom';panel.innerHTML='<strong>Lesson activity</strong><div class="lesson-controls"><button class="primary" data-lesson-command="start">Start lesson session</button><button data-lesson-command="open-activity">Open activity</button><button data-lesson-command="close-activity">Close activity</button></div><div class="qr"></div><p class="lesson-join"></p><p class="lesson-status" role="status" aria-live="polite"></p><div class="lb lesson-board"></div>';section.prepend(panel);lessonPanel={panel,w};panel.querySelectorAll('[data-lesson-command]').forEach(btn=>btn.onclick=()=>sendLessonCommand(btn.dataset.lessonCommand,w));if(!document.getElementById('activity-panel-toggle')){const toggle=document.createElement('button');toggle.id='activity-panel-toggle';toggle.textContent='Hide QR panel';toggle.setAttribute('aria-expanded','true');toggle.onclick=()=>{const hidden=document.documentElement.classList.toggle('activity-panel-hidden');toggle.textContent=hidden?'Show QR panel':'Hide QR panel';toggle.setAttribute('aria-expanded',String(!hidden));window.dispatchEvent(new Event('resize'));};document.body.appendChild(toggle);}parent.postMessage({type:'ie301-lesson-ready'},'*');renderLessonPanel();return lessonPanel;
  }
  function sendLessonCommand(command,w){
    if(parent===window)return;
    const requestId=uuid();
    const timer=setTimeout(()=>{
      if(!pendingCommands.has(requestId))return;
      pendingCommands.delete(requestId);lessonMessage='No command confirmation arrived. Check the connection and try again.';renderLessonPanel();
    },12000);
    pendingCommands.set(requestId,{command,w,timer});lessonMessage='Sending '+command.replace('-',' ')+'…';renderLessonPanel();
    parent.postMessage({type:'ie301-lesson-command',command,activityKey:activityKey(w),requestId},'*');
  }
  function boardState(w){const meta=lessonState?.meta,a=meta?.activity;if(!lessonState?.code||meta?.phase==='ended'||!a||a.scored!==true||a.key!==activityKey(w)||!a.roundId)return null;return {code:lessonState.code,round:a.roundId,phase:meta.phase};}
  async function refreshLessonBoard(){if(!lessonPanel)return;const target=boardState(lessonPanel.w),host=lessonPanel.panel.querySelector('.lesson-board'),key=target?target.code+':'+target.round+':'+target.phase:'';if(!target){boardKey='';host.textContent='';return;}try{const [roundMeta,answers]=await Promise.all([dbGet('/sessions/'+target.code+'/activityRounds/'+target.round+'/meta'),dbGet('/sessions/'+target.code+'/activityRounds/'+target.round+'/answers')]);if(key!==boardKey)return;renderBoard(host,answers,lessonPanel.w,roundMeta?.phase==='closed'?Number(roundMeta.closedAt):Infinity);}catch{if(key===boardKey)host.innerHTML='<span style="color:var(--critical)">cannot reach the classroom database</span>';}}
  function scheduleLessonBoard(){clearTimeout(boardTimer);refreshLessonBoard();boardTimer=setTimeout(scheduleLessonBoard,2500);}
  function renderLessonPanel(){
    if(!lessonPanel)return;
    const {panel,w}=lessonPanel,state=lessonState||{},meta=state.meta||{};
    const ended=meta.phase==='ended',active=meta.phase&&!ended,matching=meta.activity?.key===activityKey(w),busy=!!state.busy||pendingCommands.size>0,offline=!!state.offline;
    const button=name=>panel.querySelector('[data-lesson-command="'+name+'"]');
    button('start').hidden=!!state.code&&!ended;button('start').disabled=busy||offline;
    button('open-activity').hidden=!state.code||ended||(matching&&meta.phase==='activity');button('open-activity').disabled=busy||offline||!state.code||ended||(matching&&meta.phase==='activity');
    button('close-activity').hidden=!(matching&&meta.phase==='activity');button('close-activity').disabled=busy||offline;

    const qr=panel.querySelector('.qr'),join=panel.querySelector('.lesson-join');
    if(state.code&&!ended){const url=lessonPollUrl(state.code);if(qr.dataset.url!==url){addQR(qr,url);qr.dataset.url=url;}join.innerHTML='<b>Session '+esc(state.code)+'</b><br><a href="'+esc(url)+'" target="_blank" rel="noopener">Open student join page</a>';}
    else{qr.replaceChildren();delete qr.dataset.url;join.textContent='Start one lesson session, then keep this QR visible for late arrivals.';}
    panel.querySelector('.lesson-status').textContent=lessonMessage||(ended?'This lesson session has ended. Start a new lesson session for the next class.':state.message||(offline?'Connection unavailable.':matching?(meta.phase==='activity'?'Activity is open.':'Activity closed.'):(state.code?'Choose Open activity when you are ready.':'Start the lesson session to create a join code.')));
    boardKey=(boardState(w)?.code+':'+boardState(w)?.round+':'+boardState(w)?.phase)||'';if(!matching||meta.activity?.scored!==true||ended)panel.querySelector('.lesson-board').textContent='';
  }
  window.addEventListener('message',event=>{if(event.source!==parent||parent===window)return;const data=event.data||{};if(data.type==='ie301-lesson-state'&&isLessonHost){lessonState={code:data.code||'',meta:data.meta||null,busy:!!data.busy,offline:!!data.offline,message:data.message||''};lessonMessage='';renderLessonPanel();scheduleLessonBoard();}if(data.type==='ie301-lesson-command-result'&&isLessonHost&&data.requestId&&pendingCommands.has(data.requestId)){const pending=pendingCommands.get(data.requestId);clearTimeout(pending.timer);pendingCommands.delete(data.requestId);lessonMessage=data.ok?(data.message||'Updated.'):(data.message||'The lesson command could not be completed.');renderLessonPanel();}});
  function register(sectionId,w){
    w.id=w.id||sectionId;w.digits=w.digits===undefined?2:w.digits;const section=document.getElementById(sectionId);if(!section)return;const enabled=DB!=='';
    if(lessonMode){if(isLessonHost&&params.get('embed')===sectionId)lessonPanelFor(w);else if(isLessonStudent&&focusId===w.id&&enabled)mountLessonStudent(document.createElement('div'),w);return;}
    if(!joinCode&&!isHost)return;if(isHost&&params.get('embed')&&params.get('embed')!==sectionId)return;if(!enabled&&!joinCode)return;if(joinCode&&focusId&&focusId!==w.id)return;const box=document.createElement('div');box.className='classroom';const bestPrev=parseFloat(lsGet('best:'+pageKey(w.id)));box.innerHTML=joinCode?'<span class="readout">your device best: <b id="cl-best-'+w.id+'">'+(isNaN(bestPrev)?'—':bestPrev.toFixed(w.digits))+'</b></span> ':'<strong>Class activity</strong><p>Show the QR while you explain the task.</p>';section.prepend(box);if(!enabled){box.innerHTML+='<span style="color:var(--muted)">classroom mode is not configured on this site</span>';return;}if(joinCode){stripAnswerKeys(document);normalStudentUI(box,w);}else instructorUI(box,w);
  }
  /* Most explorers are intentionally unscored and do not call register().
     Defer this fallback so a scored widget can supply its real scoreboard
     metadata first, while every lesson embed still receives one host panel. */
  const mountLessonFallback=()=>{
    if(lessonPanel)return;
    const id=params.get('embed'),section=document.getElementById(id);
    if(section)lessonPanelFor({id,label:'score',dir:'max',digits:2});
  };
  if(isLessonHost){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountLessonFallback,{once:true});
    else mountLessonFallback();
  }
  if(isLessonStudent) {
    document.documentElement.classList.add('lesson-student');
    const prepareActivity = () => {
      const section = document.getElementById(focusId);
      if (!section) return;
      const instructions = section.querySelector(':scope > .howto');
      if (instructions) {
        const details = document.createElement('details');
        details.className = 'activity-instructions';
        const summary = document.createElement('summary');
        summary.textContent = 'Task instructions';
        instructions.before(details);
        details.append(summary, instructions);
      }
      section.querySelectorAll('.controls .group').forEach(group => {
        if (group.querySelectorAll('input[type="range"]').length === 1 && group.children.length === 3 && group.querySelector('label') && group.querySelector('.readout')) group.classList.add('compact-slider');
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepareActivity, {once:true});
    else prepareActivity();
  }
  return {register,updateBest};
})();
