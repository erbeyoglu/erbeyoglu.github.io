/* Weekly self-study: Course -> Week -> Activity. The shared tutor belongs to Course.
   QR/host views stay focused on the instructor's current activity. */
(() => {
  'use strict';
  if(window.IE301_RELEASES?.blocked)return;
  const params=new URLSearchParams(location.search), file=location.pathname.split('/').pop();
  if(['host','session','class','embed','view'].some(key=>params.has(key)))return;
  const validWeek=w=>/^week(01|02|03|04|05|07|08|09|10|11|13|14)$/.test(w || '');
  const weekly=/^week\d\d\.html$/.test(file);
  const week=weekly?file.slice(0,-5):params.get('week');
  const guided={week07:'machine',week08:'energy',week09:'reservations',week11:'lending',week13:'support',week14:'charging'};
  const toolsView=weekly && (params.get('tools')==='1' || !!location.hash);
  if(weekly && !toolsView)document.documentElement.classList.add('week-hub');
  document.documentElement.classList.add('course-study');
  document.addEventListener('DOMContentLoaded',()=>{
    const trail=document.createElement('nav');trail.className='course-trail';trail.setAttribute('aria-label','Location');
    const item=(label,href)=>{
      if(trail.children.length) {
        const separator=document.createElement('span');separator.className='course-trail-separator';
        separator.textContent='/';separator.setAttribute('aria-hidden','true');trail.appendChild(separator);
      }
      const node=document.createElement(href?'a':'span');node.textContent=label;
      if(href)node.href=href;else node.setAttribute('aria-current','page');
      trail.appendChild(node);
    };
    item('Course','../ie301-lecture-companion.html');
    const activity=window.GUIDED?.find(a=>a.id===params.get('activity'));
    const activeWeek=file==='aitutor.html'?null:(validWeek(week)?week:activity?.week);
    if(activeWeek)item('Week '+Number(activeWeek.slice(4)),weekly&&!toolsView?null:activeWeek+'.html');
    if(weekly) {
      if(toolsView)item('Lecture tools');
      else {
        const menu=document.createElement('section');menu.id='week-study-menu';
        const hasGuided=Boolean(guided[week]);
        const card=(href,title,detail,tag,recommended=false)=>`<a class="week-study-card${recommended?' recommended':''}" href="${href}"><span class="learning-eyebrow">${tag}</span><strong>${title}</strong><span>${detail}</span><b aria-hidden="true">→</b></a>`;
        menu.innerHTML='<h2>Study this week</h2><p class="week-study-route">Follow the cards in order. Begin by making the modeling decisions yourself; use the lecture tools when you want to revisit an idea.</p><div class="week-study-grid">'+
          card('polls.html?week='+week,'Practice questions','Make one modeling choice at a time, then compare the reasoning.','1 · Start here',true)+
          (hasGuided?card('guided.html?activity='+guided[week],'Guided modeling','Build a new model with hints, then try a changed assumption.','2 · Build a new model'):'')+
          card(file+'?tools=1','Lecture tools','Explore the graphs, simulations and examples from the lecture.',(hasGuided?'3':'2')+' · Explore as needed')+'</div>';
        document.querySelector('main').prepend(menu);
      }
    } else if(file==='polls.html')item(activeWeek?'Practice questions':'Practice library');
    else if(file==='guided.html')item(activity?'Guided modeling':'Guided activity library');
    else if(file==='aitutor.html')item('AI Modeling Tutor');
    document.querySelector('header.site .sub')?.replaceChildren(trail);
  });
})();
