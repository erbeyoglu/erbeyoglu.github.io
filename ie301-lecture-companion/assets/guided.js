(() => {
  'use strict';
  const $=id=>document.getElementById(id), app=$('guided-app');
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const selected=new URLSearchParams(location.search).get('activity');
  const activity=GUIDED.find(a=>a.id===selected);
  const number=text=>{
    const s=String(text).trim();
    if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))return Number(s);
    const f=s.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\/\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
    return f && +f[2]!==0 ? +f[1]/+f[2] : NaN;
  };
  if(!activity) {
    app.innerHTML=`<section class="widget"><div class="learning-eyebrow">Self-study · six activities</div><h2>From a story to your own model</h2><p>Allow about 20–25 minutes per activity. Start with your own formulation, use hints when needed, and finish with a changed assumption. Your drafts stay in this browser. No AI account is needed.</p>${selected ? '<p class="learning-error">That activity was not found. Choose one below.</p>' : ''}</section>
      <div class="cards">${GUIDED.map(a=>`<a class="card" href="guided.html?activity=${a.id}"><div class="wk">WEEK ${Number(a.week.slice(4))}</div><h3>${escape(a.title)}</h3><p>${escape(a.family)}</p><p>${escape(a.intro)}</p></a>`).join('')}</div>`;
    return;
  }
  const key='ie301-guided-v1:'+activity.id;
  let state={index:0,draft:'',steps:{},twist:'',twistAttempted:false,twistRevealed:false},storageWorks=true;
  try {const old=JSON.parse(localStorage.getItem(key)||'null');if(old && old.steps && typeof old.steps==='object')state={...state,...old};} catch {storageWorks=false;}
  state.index=Math.max(0,Math.min(activity.steps.length,Number(state.index)||0));
  function persist(){try{localStorage.setItem(key,JSON.stringify(state));}catch{storageWorks=false;const n=$('storage-note');if(n)n.textContent='Browser storage is unavailable. Download your work before leaving.';}}
  function stepState(step){return state.steps[step.id] ||= {note:'',choice:null,values:[],attempts:0,hint:false,revealed:false,correct:false,showChoices:activity.support==='guided'};}
  function reviewed(s){return !!(s?.correct||s?.revealed);}
  function count(){return activity.steps.filter(s=>reviewed(state.steps[s.id])).length;}
  function render() {
    const done=count(),atEnd=state.index===activity.steps.length;
    app.innerHTML=`<section class="widget"><div class="learning-eyebrow">Week ${Number(activity.week.slice(4))} · ${escape(activity.family)}</div><h2>${escape(activity.title)}</h2><p class="learning-context">${escape(activity.intro)}</p>
      <details id="story" ${state.index===0?'open':''}><summary>Problem statement and data</summary>${activity.story}</details>
      <details><summary>Your first model draft</summary><p>Write here or on paper before looking at checkpoints. These notes are saved but are not automatically graded.</p><label for="initial-draft">My initial formulation</label><textarea id="initial-draft">${escape(state.draft)}</textarea></details>
      <p id="storage-note" class="learning-muted">${storageWorks?'Progress and notes are saved in this browser. No answers are sent to a server.':'Browser storage is unavailable. Download your work before leaving.'}</p>
      <progress class="learning-progress" max="${activity.steps.length}" value="${done}" aria-label="Reviewed components"></progress><p>${done} of ${activity.steps.length} components checked or reviewed</p>
      <nav class="learning-step-nav" aria-label="Model components">${activity.steps.map((s,i)=>`<button data-step="${i}" ${i===state.index?'aria-current="step"':''}>${reviewed(state.steps[s.id])?'✓ ':''}${i+1}</button>`).join('')}<button data-step="${activity.steps.length}" ${atEnd?'aria-current="step"':''}>Your complete model</button></nav></section>
      <section class="widget" id="guided-step"></section>
      <div class="learning-actions no-print"><button id="guided-download">Download my work</button><button id="guided-restart">Start over</button></div>`;
    $('initial-draft').oninput=e=>{state.draft=e.target.value;persist();};
    app.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{state.index=Number(b.dataset.step);persist();render();$('guided-step').scrollIntoView({block:'start'});});
    $('guided-restart').onclick=()=>{if(confirm('Clear this activity’s saved draft and progress on this browser?')){state={index:0,draft:'',steps:{},twist:'',twistAttempted:false,twistRevealed:false};persist();render();}};
    $('guided-download').onclick=download;
    if(atEnd)renderEnd();else renderStep();
  }
  function renderStep() {
    const step=activity.steps[state.index], s=stepState(step);
    $('guided-step').innerHTML=`<h2>${escape(step.title)}</h2><p>${escape(step.prompt)}</p>
      <label for="component-note">Your formulation or reasoning <span class="learning-muted">(or write on paper)</span></label><textarea id="component-note">${escape(s.note)}</textarea>
      <div class="learning-actions"><button id="guided-hint">${s.hint?'Hide hint':'A hint, please'}</button>${!step.fields ? `<button id="guided-choices">${s.showChoices?'Hide checkpoint choices':'Show checkpoint choices'}</button>`:''}</div>
      <p class="learning-notice" id="guided-hint-text" ${s.hint?'':'hidden'}>${escape(step.hint)}</p>
      <div id="guided-answer-area">${step.fields ? `<div class="learning-matrix" style="--cols:${step.cols}">${step.fields.map((f,i)=>`<label>${escape(f.label)}<input data-field="${i}" aria-label="${escape(f.label)}" inputmode="decimal" type="text" value="${escape(s.values[i]??'')}" autocomplete="off"></label>`).join('')}</div><p class="learning-muted">Decimals or fractions are accepted. Numerical tolerance: 0.00001.</p>` : `<div class="learning-choices" ${s.showChoices?'':'hidden'}>${step.options.map((o,i)=>`<button class="learning-choice" data-option="${i}" aria-pressed="${s.choice===i}"><span class="learning-letter">${String.fromCharCode(65+i)}</span><span>${escape(o)}</span></button>`).join('')}</div>`}</div>
      <div class="learning-actions"><button id="guided-check" class="primary">Check this step</button><button id="guided-reveal">Compare with a worked step</button><button id="guided-next" ${reviewed(s)?'':'disabled'}>Next component →</button></div>
      <div id="guided-feedback" class="learning-feedback" role="status" aria-live="polite" ${s.attempts || s.revealed?'':'hidden'}></div>`;
    $('component-note').oninput=e=>{s.note=e.target.value;persist();};
    $('guided-hint').onclick=()=>{s.hint=!s.hint;persist();renderStep();};
    if($('guided-choices'))$('guided-choices').onclick=()=>{s.showChoices=!s.showChoices;persist();renderStep();};
    document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{s.choice=Number(b.dataset.option);s.correct=false;persist();renderStep();});
    document.querySelectorAll('[data-field]').forEach(input=>input.oninput=()=>{s.values[Number(input.dataset.field)]=input.value;s.correct=false;persist();$('guided-next').disabled=!reviewed(s);});
    $('guided-check').onclick=()=>{
      s.attempts++;
      if(step.fields)s.correct=step.fields.every((f,i)=>Number.isFinite(number(s.values[i])) && Math.abs(number(s.values[i])-f.value)<=1e-5);
      else s.correct=s.choice===step.answer;
      persist();render();
    };
    $('guided-reveal').onclick=()=>{
      if(!s.attempts && !s.hint){s.hint=true;persist();renderStep();$('guided-feedback').hidden=false;$('guided-feedback').textContent='Try the hint, then compare with the worked step when you are ready.';return;}
      s.revealed=true;persist();render();
    };
    $('guided-next').onclick=()=>{state.index++;persist();render();$('guided-step').scrollIntoView({block:'start'});};
    if(s.attempts || s.revealed) {
      let feedback='';
      if(s.correct)feedback='<strong>✓ This checkpoint is correct.</strong> ';
      else if(s.revealed)feedback='<strong>Worked step reviewed.</strong> Compare it with your own reasoning. ';
      else if(step.fields){const missing=step.fields.filter((f,i)=>!Number.isFinite(number(s.values[i])) || Math.abs(number(s.values[i])-f.value)>1e-5).map(f=>f.label);feedback='<strong>Check these entries:</strong> '+escape(missing.join(', '))+'. '+escape(step.hint);}
      else feedback=s.choice===null ? 'Choose a checkpoint answer, or use the hint to begin.' : escape(step.explain[s.choice]);
      if(s.correct || s.revealed)feedback+='<p class="learning-summary">'+escape(step.model)+'</p>';
      $('guided-feedback').innerHTML=feedback;
    }
  }
  function renderEnd() {
    const complete=count()===activity.steps.length;
    const notes=activity.steps.map(step=>({step,s:stepState(step)}));
    $('guided-step').innerHTML=`<h2>Your complete formulation</h2><p>Assemble your model in one place, using the notes below or a sheet of paper. Check the meaning of every state/function, the event order, and the boundary.</p>
      <details><summary>Your component notes</summary>${notes.map(({step,s})=>`<h3>${escape(step.title)}</h3><p class="learning-summary">${escape(s.note||'No written note saved for this component.')}</p><p class="learning-muted">${s.correct?'Checkpoint answered correctly':s.revealed?'Worked step reviewed':'Not yet checked'}</p>`).join('')}</details>
      ${complete ? `<details id="complete-model"><summary>Compare with a complete reference model</summary><p class="learning-summary">${escape(activity.model)}</p><p>Other consistent formulations can be valid. Compare assumptions, timing and the question answered, rather than notation alone.</p></details>` : '<p class="learning-notice">Check or review the remaining components to unlock the complete comparison model.</p>'}
      <h3>Now change one assumption</h3><p>${escape(activity.twist)}</p><label for="twist-draft">My revised model</label><textarea id="twist-draft">${escape(state.twist)}</textarea>
      <p><label><input type="checkbox" id="twist-attempted" ${state.twistAttempted?'checked':''}> I have made my own attempt here or on paper.</label></p>
      <button id="twist-compare" class="primary" ${complete && state.twistAttempted?'':'disabled'}>Compare the changed model</button>
      <div class="learning-feedback" id="twist-answer" ${state.twistRevealed && complete?'':'hidden'}>${escape(activity.twistAnswer)}</div>
      <p class="learning-muted">Your written formulation is not automatically marked. A checked choice or a reviewed solution is practice; try the variation without help to assess what you can produce yourself.</p>`;
    $('twist-draft').oninput=e=>{state.twist=e.target.value;persist();};
    $('twist-attempted').onchange=e=>{state.twistAttempted=e.target.checked;persist();$('twist-compare').disabled=!complete || !state.twistAttempted;};
    $('twist-compare').onclick=()=>{state.twistRevealed=true;persist();$('twist-answer').hidden=false;};
  }
  function download() {
    const parts=[activity.title,activity.family,'MY INITIAL FORMULATION',state.draft];
    for(const step of activity.steps){const s=stepState(step);parts.push('\n'+step.title,'My note: '+s.note,'Checkpoint: '+(s.correct?'correct':s.revealed?'worked step reviewed':'not checked'));if(reviewed(s))parts.push('Reference step: '+step.model);}
    if(count()===activity.steps.length)parts.push('\nCOMPLETE COMPARISON MODEL',activity.model);
    parts.push('\nCHANGED ASSUMPTION',activity.twist,'My response: '+state.twist);
    if(state.twistRevealed)parts.push('Comparison: '+activity.twistAnswer);
    const url=URL.createObjectURL(new Blob([parts.join('\n')],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='ie301-'+activity.id+'-my-model.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  render();
})();
