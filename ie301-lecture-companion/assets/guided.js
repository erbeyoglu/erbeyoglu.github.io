/* guided.html: without ?activity the library of released activities; with
   ?activity=<id> it loads that activity's own module, assets/guided-<id>.js + .css
   (built on assets/guided-kit.js), and hands it the page. Metadata and step ids
   come from assets/guided-data.js. */
(() => {
  'use strict';
  if(window.IE301_RELEASES?.blocked)return;
  const app=document.getElementById('guided-app');
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const selected=new URLSearchParams(location.search).get('activity');
  const activity=GUIDED.find(a=>a.id===selected);
  if(!activity) {
    const releases=window.IE301_RELEASES;
    const available=GUIDED.filter(a=>!releases || releases.isBypass() || releases.isOpen(a.week));
    app.innerHTML=`<section class="widget"><div class="learning-eyebrow">Self-study · six activities</div><h2>From a story to your own model</h2><p>Allow about 25 minutes per activity. Each one starts with numbers you play with, then a picture, then the calculation, and only then the model's names and formula. It ends with one changed rule. Your progress stays in this browser. No AI account is needed.</p>${selected ? '<p class="learning-error">That activity was not found. Choose one below.</p>' : ''}</section>
      <div class="cards">${available.map(a=>`<a class="card" href="guided.html?activity=${a.id}"><div class="wk">WEEK ${Number(a.week.slice(4))}</div><h3>${escape(a.title)}</h3><p>${escape(a.family)}</p><p>${escape(a.intro)}</p></a>`).join('')}</div>`;
    return;
  }
  // Anonymous progress counts for the instructor (assets/usage.js): which step
  // actions happened and how far a student got, never what they wrote.
  const track=(action,max)=>document.dispatchEvent(new CustomEvent('ie301:usage',{detail:{event:'guided:'+activity.id+':'+action,max}}));
  // Load only the activity that was opened.
  const css=document.createElement('link');css.rel='stylesheet';css.href='assets/guided-'+activity.id+'.css';document.head.appendChild(css);
  const js=document.createElement('script');js.src='assets/guided-'+activity.id+'.js';
  js.onload=()=>window.GUIDED_CUSTOM[activity.id](app,{activity,track});
  js.onerror=()=>{app.innerHTML='<section class="widget"><p class="learning-error">This activity could not load. Please check your connection and reload the page.</p></section>';};
  document.body.appendChild(js);
})();
