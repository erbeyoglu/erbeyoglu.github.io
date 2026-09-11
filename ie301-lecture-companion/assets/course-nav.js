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
      if(toolsView)item('In-class interactions');
      else {
        const menu=document.createElement('section');menu.id='week-study-menu';
        const hasGuided=Boolean(guided[week]);
        const card=(href,title,detail,tag,recommended=false)=>`<a class="week-study-card${recommended?' recommended':''}" href="${href}"><span class="learning-eyebrow">${tag}</span><strong>${title}</strong><span>${detail}</span><b aria-hidden="true">→</b></a>`;
        menu.innerHTML='<h2>This week’s activities</h2><p class="week-study-route">Start with the pre-class thinking warm-up. If a guided activity is available, use it to build a complete model. The in-class interactions let you revisit examples from the lecture.</p><div class="week-study-grid">'+
          card('polls.html?week='+week,'Pre-class thinking warm-up','Start with three short questions; three harder challenges are optional.','Start here',true)+
          (hasGuided?card('guided.html?activity='+guided[week],'Guided modeling activity','Build a new model with hints, then try a changed assumption.','Next · Build a model'):'')+
          card(file+'?tools=1','In-class interactions','Revisit the graphs, simulations and examples used during the lecture.','Optional · From class')+'</div>';
        document.querySelector('main').prepend(menu);
      }
    } else if(file==='polls.html')item(activeWeek?'Pre-class thinking warm-up':'Pre-class warm-up library');
    else if(file==='guided.html')item(activity?'Guided modeling':'Guided activity library');
    else if(file==='aitutor.html')item('AI Modeling Tutor');
    document.querySelector('header.site .sub')?.replaceChildren(trail);
  });
})();
