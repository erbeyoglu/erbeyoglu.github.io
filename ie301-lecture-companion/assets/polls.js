/* Polls share the classroom RTDB but have a separate session lifecycle.
   Immutable timestamped votes let closure keep the latest on-time vote per
   browser even when an earlier request finishes after voting closes. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const isHost = params.get('host') === '1';
  if (isHost) document.body.classList.add('poll-host');
  const week = MODELING.weeks.includes(params.get('week')) ? params.get('week') : MODELING.weeks[0];
  const DB = (window.CLASSROOM_DB || '').replace(/\/$/, '');
  const $ = id => document.getElementById(id);
  const escape = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const save = (k,v) => { try { localStorage.setItem(k,v); } catch {} };
  const uuid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), v => v.toString(16).padStart(2,'0')).join('');
  const device = read('ie301-poll-device') || uuid();
  save('ie301-poll-device', device);
  const hostKey = 'ie301-poll-host:' + week;
  let code = (params.get('session') || '').toUpperCase();
  if (code && !/^[A-Z0-9]{4,8}$/.test(code)) code = 'INVALID';
  let meta = null, snapshot = null, votes = {}, selected = params.get('q');
  let selectionPinned = !!MODELING.get(selected), hostRestored = false;
  if (!MODELING.get(selected) || MODELING.get(selected).week !== week) selected = MODELING.forWeek(week)[0].id;
  let choice = null, savedChoice = null, busy = false, ready = false, offline = false;
  let renderKey = '', generation = 0, practiceRevealed = false, timer;
  const serverTime = () => ({'.sv':'timestamp'});
  const path = suffix => '/sessions/' + code + '/poll/' + suffix;

  async function request(url, method = 'GET', value, headers = {}) {
    if (!DB) throw new Error('Live voting is not configured. Use the practice view.');
    const ctrl = new AbortController(), timeout = setTimeout(() => ctrl.abort(), 8000);
    try {
      const response = await fetch(DB + url + '.json', {method, signal:ctrl.signal,
        headers: {...(method !== 'GET' ? {'Content-Type':'application/json'} : {}), ...headers},
        ...(value === undefined ? {} : {body:JSON.stringify(value)})});
      if (!response.ok) throw new Error(response.status === 412 ? 'This session code is already in use. Try again.' : 'Cannot reach the classroom database. Check your connection and retry.');
      return {data:await response.json(), etag:response.headers.get('ETag')};
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Connection timed out. Your last confirmed answer is kept.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  const get = async suffix => (await request(path(suffix))).data;
  const put = async (suffix, value) => (await request(path(suffix),'PUT',value)).data;
  function status(message, bad = false) {
    $('poll-connection').textContent = message;
    $('poll-connection').className = bad ? 'learning-error' : 'learning-muted';
  }
  function currentQuestion() { return MODELING.get(meta?.questionId || selected); }
  function aggregate(tree, q, cutoff = Infinity) {
    const counts = Array(q.options.length + 1).fill(0), choices = {};
    for (const [id, events] of Object.entries(tree || {})) {
      const valid = Object.entries(events || {}).filter(([,v]) => v && Number.isInteger(v.choice) &&
        v.choice >= 0 && v.choice <= q.options.length && Number.isFinite(v.at) && v.at <= cutoff);
      valid.sort((a,b) => a[1].at - b[1].at || (a[1].order || 0) - (b[1].order || 0) || a[0].localeCompare(b[0]));
      if (valid.length) { const v = valid[valid.length-1][1]; choices[id]=v.choice; counts[v.choice]++; }
    }
    return {counts,choices,total:Object.keys(choices).length};
  }
  const labels = q => [...q.options, 'Not sure yet'];
  function questionHTML(q, answerButtons) {
    return `<div class="learning-eyebrow">Week ${Number(q.week.slice(4))} · ${q.optional ? 'Reserve' : 'Core'} checkpoint</div>
      <h2>${escape(q.title)}</h2><p class="learning-context">${escape(q.context)}</p>
      <p><strong>${escape(q.prompt)}</strong></p><div class="learning-choices">` +
      labels(q).map((label,i) => answerButtons
        ? `<button class="learning-choice" data-choice="${i}" aria-pressed="false"><span class="learning-letter">${i < q.options.length ? String.fromCharCode(65+i) : '?'}</span><span>${escape(label)}</span></button>`
        : `<div class="learning-choice"><span class="learning-letter">${i < q.options.length ? String.fromCharCode(65+i) : '?'}</span><span>${escape(label)}</span></div>`).join('') + '</div>';
  }
  function explanations(q) {
    return `<h3>Answer: ${String.fromCharCode(65+q.answer)}</h3><p><strong>${escape(q.options[q.answer])}</strong></p>
      <ol class="learning-explanations" type="A">${q.explanations.map((e,i) => `<li>${i===q.answer ? '<b>Correct.</b> ' : ''}${escape(e)}</li>`).join('')}</ol>`;
  }
  function showResults(q, snap) {
    $('poll-results').hidden = false;
    const table = snap ? `<h2>Class responses · ${snap.total}</h2><table class="learning-results"><thead><tr><th>Choice</th><th>Responses</th><th>Share</th></tr></thead><tbody>${labels(q).map((label,i) => {
      const n=snap.counts[i] || 0, percent=snap.total ? Math.round(100*n/snap.total) : 0;
      return `<tr class="${i===q.answer ? 'correct' : ''}"><td>${i===q.answer ? '✓ ' : ''}${escape(label)}<div class="bar" style="--share:${percent}%"></div></td><td>${n}</td><td>${percent}%</td></tr>`;
    }).join('')}</tbody></table>` : '';
    const own = snap?.choices?.[device];
    const ownText = !isHost && snap ? `<p class="learning-notice">${own === undefined ? 'No answer from this browser was included before voting closed.' : 'Your recorded answer: '+escape(labels(q)[own])}</p>` : '';
    $('poll-results').innerHTML = table + ownText + explanations(q);
  }
  function choose(index) {
    choice=index;
    document.querySelectorAll('[data-choice]').forEach(b => b.setAttribute('aria-pressed',String(Number(b.dataset.choice)===index)));
    const btn=$('poll-submit'); if (btn) btn.disabled = busy;
  }
  function bindChoices() {
    document.querySelectorAll('[data-choice]').forEach(b => b.onclick=() => choose(Number(b.dataset.choice)));
  }
  function selectorHTML() {
    return `<label for="poll-select">Question</label><select id="poll-select">${MODELING.forWeek(week).map(q => `<option value="${q.id}">${q.optional?'Reserve · ':''}${escape(q.title)}</option>`).join('')}</select>`;
  }
  function setupHost() {
    const toggle=document.createElement('button');toggle.id='poll-panel-toggle';toggle.textContent='Hide QR panel';toggle.setAttribute('aria-expanded','true');
    document.querySelector('.learning-header').appendChild(toggle);
    toggle.onclick=()=>{const hidden=document.body.classList.toggle('poll-panel-hidden');toggle.textContent=hidden?'Show QR panel':'Hide QR panel';toggle.setAttribute('aria-expanded',String(!hidden));};
    $('poll-controls').innerHTML = `<div class="learning-eyebrow">Instructor · Week ${Number(week.slice(4))}</div><div id="poll-join" hidden></div><p id="poll-host-count" role="status" aria-live="polite"></p>
      <button id="poll-start" class="primary">Start lesson session</button>
      <details id="poll-settings"><summary>Session &amp; question controls</summary>${selectorHTML()}
      <div class="learning-actions"><button id="poll-next">Next core question</button><button id="poll-end" hidden>End session</button><button id="poll-local">Practice / offline explanation</button></div>
      <button id="poll-history-load">Review past rounds</button><div id="poll-history"></div></details>
      <dialog id="poll-qr-dialog" class="learning-qr-dialog"><button id="poll-qr-dismiss">Back to question</button><h2 id="poll-big-code"></h2><div id="poll-big-qr"></div><p>Scan once. Keep the page open for this lesson.</p></dialog>`;
    const voting=document.createElement('div');voting.id='poll-voting-controls';voting.className='learning-actions';
    voting.innerHTML='<button id="poll-open" class="primary">Open voting</button><button id="poll-close">Close voting</button><button id="poll-reveal">Reveal results</button><button id="poll-wait">Continue to lesson</button>';
    $('poll-app').insertBefore(voting,$('poll-question'));
    $('poll-qr-dismiss').onclick=()=>$('poll-qr-dialog').close();
    $('poll-select').value=selected;
    $('poll-select').onchange=() => {selected=$('poll-select').value; selectionPinned=true; if (!meta || ['waiting','ended'].includes(meta.phase)) renderQuestion(true);};
    $('poll-start').onclick=() => action(startSession);
    $('poll-open').onclick=() => action(openQuestion);
    $('poll-close').onclick=() => action(closeQuestion);
    $('poll-reveal').onclick=() => action(async()=>{await ensureSnapshot(); await changeMeta({phase:'revealed'});});
    $('poll-wait').onclick=() => action(async()=>{
      if (meta?.phase==='open') await closeQuestion();
      if (meta?.phase==='closed') await ensureSnapshot();
      if (meta && meta.phase!=='ended') await changeMeta({phase:'waiting'});
      parent.postMessage({type:'ie301-poll-continue'}, '*');
    });
    $('poll-end').onclick=() => action(async()=>{if(meta.phase==='open')await closeQuestion(); await changeMeta({phase:'ended'}); save(hostKey,'');});
    $('poll-next').onclick=() => action(async()=>{ const all=MODELING.forWeek(week).filter(q=>!q.optional), i=all.findIndex(q=>q.id===selected); selected=all[(i+1)%all.length].id; $('poll-select').value=selected; if(meta && ['closed','revealed'].includes(meta.phase)){await ensureSnapshot();await changeMeta({phase:'waiting'});} });
    $('poll-history-load').onclick=() => action(async()=>{
      const rounds=await get('rounds');
      const past=Object.values(rounds||{}).map(r=>r.snapshot).filter(s=>s && MODELING.get(s.questionId)).sort((a,b)=>a.closedAt-b.closedAt);
      $('poll-history').innerHTML=past.length ? past.map((s,i)=>{const q=MODELING.get(s.questionId);return `<details><summary>Round ${i+1} · ${escape(q.title)} · ${s.total} responses</summary><p>${s.counts.map((n,j)=>(j<q.options.length?String.fromCharCode(65+j):'?')+': '+n).join(' · ')}</p><p>Answer: ${String.fromCharCode(65+q.answer)}</p></details>`;}).join('') : '<p>No closed rounds yet.</p>';
    });
    $('poll-local').onclick=() => { const url = new URL(location.href); url.search='?week='+week+'&q='+selected; window.open(url.href,'_blank','noopener'); };
    renderHost();
  }
  function renderHost() {
    if (!isHost || !$('poll-start')) return;
    const active=meta && meta.phase!=='ended';
    $('poll-start').hidden=!!active; $('poll-start').disabled=busy || !DB;
    $('poll-end').hidden=!active; $('poll-end').disabled=busy || offline;
    $('poll-open').disabled=busy || offline || !active || meta.phase==='open';
    $('poll-close').disabled=busy || offline || meta?.phase!=='open';
    $('poll-reveal').disabled=busy || offline || meta?.phase!=='closed';
    $('poll-wait').disabled=busy || offline || !active;
    $('poll-select').disabled=busy || meta?.phase==='open';
    $('poll-next').disabled=busy || meta?.phase==='open';
    $('poll-history-load').disabled=busy || offline || !meta || meta.phase==='open';
    $('poll-history').hidden=meta?.phase==='open';
    const join=$('poll-join'); join.hidden=!active;
    if (active && join.dataset.code!==code) {
      const base=window.CLASSROOM_PUBLIC_BASE || new URL('.',location.href).href;
      const url=base.replace(/\/?$/,'/')+'polls.html?session='+code;
      const qr=qrcode(0,'M');qr.addData(url);qr.make();
      join.innerHTML=`<div class="learning-qr"><button id="poll-qr-enlarge" aria-label="Show large QR code">${qr.createSvgTag({cellSize:4,margin:16})}</button><div><div class="learning-code">${code}</div><p>Scan once for this lesson. Tap the QR to enlarge.</p><a class="learning-url" href="${escape(url)}" target="_blank" rel="noopener">Open student join page</a></div></div>`;
      $('poll-qr-enlarge').onclick=()=>{$('poll-big-code').textContent=code;$('poll-big-qr').innerHTML=qr.createSvgTag({cellSize:8,margin:32});$('poll-qr-dialog').showModal();};
      join.dataset.code=code;
    }
    const q=currentQuestion();
    $('poll-host-count').textContent=meta?.phase==='open' ? aggregate(votes,q).total+' browsers have submitted · choices stay hidden until reveal' : active ? 'Session '+code+' · '+meta.phase : 'Start a session for live voting, or open the offline practice view.';
  }
  function renderQuestion(force=false) {
    const q=currentQuestion();
    const phase=meta?.phase || 'preview';
    document.body.classList.toggle('poll-revealed', phase==='revealed');
    const key=[phase,q?.id,meta?.roundId].join(':');
    if (!force && key===renderKey) return;
    renderKey=key; $('poll-results').hidden=true;
    if (!isHost && meta && ['waiting','ended'].includes(phase)) {
      $('poll-question').hidden=false;
      $('poll-question').innerHTML=phase==='ended' ? '<h2>This lesson session has ended.</h2><p>Scan your instructor’s QR for the next lesson.</p>' : '<h2>You’re connected.</h2><p>Keep this page open. The next question will appear here when your instructor opens it.</p>';
      return;
    }
    if(!q) { $('poll-question').hidden=true; return; }
    $('poll-question').hidden=false;
    if (isHost) {
      const display=phase==='waiting' || phase==='ended' ? MODELING.get(selected) : q;
      $('poll-question').innerHTML=questionHTML(display,false);
      if(phase==='revealed' && snapshot)showResults(q,snapshot);
      return;
    }
    const open=phase==='open';
    choice=null; savedChoice=null;
    $('poll-question').innerHTML=questionHTML(q,open) + (open
      ? '<button id="poll-submit" class="primary" disabled>Submit choice</button><p id="poll-feedback" role="status" aria-live="polite"></p>'
      : '<p class="learning-notice">Voting is closed. Waiting for your instructor to reveal the explanation.</p>');
    if(open) {
      const cached=read('ie301-vote:'+code+':'+meta.roundId);
      if(cached!==null && Number.isInteger(+cached) && +cached>=0 && +cached<=q.options.length){savedChoice=+cached; choose(savedChoice); $('poll-feedback').textContent='Last confirmed answer on this browser is selected. You may change it while voting is open.';}
      bindChoices(); $('poll-submit').onclick=submit;
    }
    if(phase==='revealed' && snapshot)showResults(q,snapshot);
  }
  async function changeMeta(patch) {
    const next={...meta,...patch,revision:(meta.revision||0)+1,updatedAt:serverTime()};
    await put('meta',next); meta=await get('meta'); renderHost(); renderQuestion(true);
  }
  async function startSession() {
    generation++;
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for(let tries=0;tries<6;tries++) {
      code=Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>alphabet[v%32]).join('');
      const url='/sessions/'+code;
      const existing=await request(url,'GET',undefined,{'X-Firebase-ETag':'true'});
      if(existing.data)continue;
      const initial={version:1,week,phase:'waiting',revision:1,updatedAt:serverTime()};
      await request(url,'PUT',{poll:{meta:initial}},{'if-match':existing.etag || 'null_etag'});
      meta=await get('meta'); votes={}; snapshot=null; save(hostKey,code); ready=true;
      status('Session started. Students can join while you continue teaching.'); return;
    }
    throw new Error('Could not reserve a session code. Try again.');
  }
  async function openQuestion() {
    if(!MODELING.get(selected) || MODELING.get(selected).week!==week)throw new Error('Choose a question from this week.');
    votes={};snapshot=null;
    await changeMeta({phase:'open',questionId:selected,roundId:uuid(),closedAt:null});
  }
  async function ensureSnapshot() {
    if(!meta?.roundId || !['closed','revealed'].includes(meta.phase))return;
    snapshot=await get('rounds/'+meta.roundId+'/snapshot');
    if(!snapshot) {
      const tree=await get('rounds/'+meta.roundId+'/answers');
      snapshot={...aggregate(tree,MODELING.get(meta.questionId),meta.closedAt),questionId:meta.questionId,roundId:meta.roundId,closedAt:meta.closedAt};
      await put('rounds/'+meta.roundId+'/snapshot',snapshot);
    }
  }
  async function closeQuestion() {
    await changeMeta({phase:'closed',closedAt:serverTime()});
    await ensureSnapshot();
  }
  async function action(fn) {
    if(busy)return;generation++;busy=true;renderHost();
    try { await fn(); offline=false; status(meta?.phase==='ended' ? 'Session ended.' : 'Connected · session '+code); }
    catch(error){offline=true;status(error.message,true);}
    finally {busy=false;renderHost();renderQuestion(true);}
  }
  async function submit() {
    if(busy || choice===null || meta?.phase!=='open' || offline)return;
    const round=meta.roundId, qid=meta.questionId, value=choice; busy=true;$('poll-submit').disabled=true;
    try {
      const latest=await get('meta');
      if(latest?.phase!=='open' || latest.roundId!==round || latest.questionId!==qid)throw new Error('Voting has closed or the next question has started. This choice was not submitted.');
      const orderKey='ie301-vote-order:'+code+':'+round;
      const order=(Number(read(orderKey))||0)+1;save(orderKey,String(order));
      await put('rounds/'+round+'/answers/'+device+'/'+uuid(),{choice:value,at:serverTime(),order});
      save('ie301-vote:'+code+':'+round,String(value)); savedChoice=value;
      if($('poll-feedback'))$('poll-feedback').textContent='Answer recorded. You may change it until voting closes.';
      status('Connected · session '+code);
    } catch(error) {status(error.message,true);if($('poll-feedback'))$('poll-feedback').textContent='Not confirmed. Check the connection before retrying.';}
    finally {busy=false;if($('poll-submit'))$('poll-submit').disabled=offline || choice===null;}
  }
  async function refresh() {
    if(!code || !ready || busy)return;
    const token=generation, session=code;
    try {
      const incoming=await get('meta');
      if(token!==generation || session!==code || busy)return;
      if(!incoming || incoming.version!==1 || !MODELING.weeks.includes(incoming.week))throw new Error('This session code was not found. Check the code with your instructor.');
      if(isHost && incoming.week!==week)throw new Error('The saved session belongs to another week.');
      if(incoming.questionId && !MODELING.get(incoming.questionId))throw new Error('This question is unavailable. Reload after your instructor checks the course version.');
      let nextVotes={},nextSnapshot=null;
      if(isHost && incoming.phase==='open')nextVotes=await get('rounds/'+incoming.roundId+'/answers') || {};
      if(incoming.phase==='revealed')nextSnapshot=await get('rounds/'+incoming.roundId+'/snapshot');
      if(token!==generation || session!==code || busy)return;
      if(meta && (incoming.revision||0)<(meta.revision||0))return;
      if(isHost && !hostRestored) {
        if(!selectionPinned && incoming.questionId){selected=incoming.questionId;$('poll-select').value=selected;}
        hostRestored=true;
      }
      const hadSnapshot=!!snapshot;meta=incoming;votes=nextVotes;snapshot=nextSnapshot;offline=false;
      status('Connected · session '+code+' · Week '+Number(meta.week.slice(4)));
      renderHost();renderQuestion(!hadSnapshot && !!snapshot);
      if($('poll-submit'))$('poll-submit').disabled=choice===null;
    } catch(error){offline=true;status(error.message+' Retrying…',true);renderHost();if($('poll-submit'))$('poll-submit').disabled=true;}
  }
  function schedule() {clearTimeout(timer);timer=setTimeout(async()=>{await refresh();schedule();},2000);}
  function setupPractice() {
    $('poll-controls').innerHTML=`<h2>Practice a modeling checkpoint</h2><p class="learning-muted">Choose before opening the explanation. These are self-study questions.</p><p><a href="${week}.html">← Week ${Number(week.slice(4))} activities</a></p>
      <label for="poll-week">Week</label><select id="poll-week">${MODELING.weeks.map(w=>`<option value="${w}">Week ${Number(w.slice(4))}</option>`).join('')}</select>${selectorHTML()}`;
    $('poll-week').value=week;$('poll-select').value=selected;
    $('poll-week').onchange=()=>{location.search='?week='+$('poll-week').value;};
    $('poll-select').onchange=()=>{selected=$('poll-select').value;practiceRevealed=false;renderPractice();};
    renderPractice();status('Practice mode · works offline');
  }
  function renderPractice() {
    const q=MODELING.get(selected);choice=null;
    $('poll-question').hidden=false;$('poll-results').hidden=true;
    $('poll-question').innerHTML=questionHTML(q,true)+'<button id="poll-submit" class="primary" disabled>Compare with the explanation</button>';
    bindChoices();$('poll-submit').onclick=()=>{practiceRevealed=true;showResults(q,null);};
  }
  window.addEventListener('message',event=>{
    if(isHost && event.source===parent && event.data?.type==='ie301-poll-return') {
      if(meta && meta.phase!=='ended' && !offline) $('poll-wait').click();
      else parent.postMessage({type:'ie301-poll-continue'}, '*');
      return;
    }
    if(!isHost || event.source!==parent || event.data?.type!=='ie301-poll-select')return;
    const q=MODELING.get(event.data.id);if(!q || q.week!==week)return;
    if(meta?.phase==='open' && q.id!==meta.questionId){status('Close the current vote before opening another checkpoint.');return;}
    selected=q.id;selectionPinned=true;if($('poll-select'))$('poll-select').value=selected;
    // The instructor opens voting explicitly; entering a slide never starts a timer.
    if(meta && ['closed','revealed'].includes(meta.phase) && meta.questionId!==selected)action(()=>changeMeta({phase:'waiting'}));
    else renderQuestion(true);
  });
  if(isHost) {
    setupHost();const cached=read(hostKey);
    if(cached && /^[A-Z0-9]{4,8}$/.test(cached)){code=cached;ready=true;refresh();}
    else status(DB ? 'Ready to start this week’s lesson.' : 'Live voting is not configured. Offline practice is available.',!DB);
  } else if(code) {
    document.body.classList.add('poll-live');
    $('poll-controls').innerHTML='<p>Keep this page open. To switch lessons, scan the QR on your instructor’s screen.</p>';
    ready=true;status('Joining session '+code+'…');refresh();
  } else setupPractice();
  schedule();
  window.addEventListener('online',()=>refresh());
  window.POLL_TEST = {aggregate}; // Pure aggregation also used by the regression checks.
})();
