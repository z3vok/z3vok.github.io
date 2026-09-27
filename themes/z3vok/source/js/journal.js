(() => {
  'use strict';
  const $=s=>document.querySelector(s);
  const toggle=$('.theme-toggle');
  const setLabel=()=>toggle?.setAttribute('aria-label',document.documentElement.dataset.theme==='dark'?'Switch to light mode':'Switch to dark mode');
  setLabel();
  toggle?.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('z3vok-theme',theme)}catch(e){}setLabel()});
  const dialog=$('#search-dialog'), input=$('#global-search'), results=$('#search-results');
  let indexPromise;
  const loadIndex=()=>indexPromise ||= fetch('/search-index.json').then(r=>{if(!r.ok)throw Error();return r.json()});
  const openSearch=()=>{dialog.showModal();input.focus();loadIndex().catch(()=>{results.textContent='Search is unavailable. Please browse the writing archive.';indexPromise=null})};
  $('.search-trigger')?.addEventListener('click',openSearch);
  $('.search-close')?.addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
  document.addEventListener('keydown',e=>{const editing=/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);if((e.key.toLowerCase()==='k'&&(e.metaKey||e.ctrlKey))||(e.key==='/'&&!editing)){e.preventDefault();if(!dialog.open)openSearch()}});
  const text=(tag,value,cls)=>{const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;return el};
  let queryVersion=0;
  input?.addEventListener('input',async()=>{const version=++queryVersion;const query=input.value.trim().toLocaleLowerCase();results.replaceChildren();if(!query){results.append(text('p','Search by topic, technology or keyword.','search-hint'));return}try{const index=await loadIndex();if(version!==queryVersion)return;const terms=query.split(/\s+/);const matches=index.map(p=>{const head=[p.title,p.originalTitle,p.topic,p.summary].join(' ').toLocaleLowerCase();const all=head+' '+p.text.toLocaleLowerCase();return {p,score:terms.every(t=>all.includes(t))?terms.reduce((n,t)=>n+(head.includes(t)?5:1),0):0}}).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,20);if(!matches.length){results.append(text('p','No matching articles. Try PHP, Redis, CTF or agent security.','search-hint'));return}for(const {p} of matches){const a=document.createElement('a');a.href=p.url;a.className='search-result';a.append(text('small',p.topic+' / '+p.date+' / '+(p.lang==='en'?'English':'Chinese')),text('strong',p.title),text('p',p.summary));results.append(a)}}catch(e){results.append(text('p','Search is unavailable. Please browse the writing archive.','search-hint'));indexPromise=null}});
  const rows=[...document.querySelectorAll('.archive-row')],filters=[...document.querySelectorAll('.filter')];
  let topic='all';
  const filterArticles=()=>{const query=$('#archive-search')?.value.trim().toLocaleLowerCase()||'';const language=$('#archive-language')?.value||'all';let count=0;for(const row of rows){row.hidden=!( (topic==='all'||row.dataset.topic===topic)&&(language==='all'||row.dataset.lang===language)&&query.split(/\s+/).every(t=>row.dataset.search.includes(t)) );if(!row.hidden)count++}if($('#archive-count'))$('#archive-count').textContent=count+(count===1?' article':' articles');if($('.empty-state'))$('.empty-state').hidden=count>0};
  filters.forEach(b=>b.addEventListener('click',()=>{topic=b.dataset.filter;filters.forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});filterArticles()}));
  $('#archive-search')?.addEventListener('input',filterArticles);
  $('#archive-language')?.addEventListener('change',filterArticles);
  $('#reset-filters')?.addEventListener('click',()=>{$('#archive-search').value='';$('#archive-language').value='all';filters[0].click();$('#archive-search').focus()});
  document.querySelectorAll('.prose figure.highlight,.prose > pre').forEach(block=>{const button=text('button','Copy','code-copy');button.type='button';button.lang='en';button.setAttribute('aria-label','Copy code');const source=block.querySelector('td.code pre,code')||block;const code=source.textContent;button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);button.textContent='Copied';setTimeout(()=>button.textContent='Copy',1600)}catch(e){button.textContent='Select to copy';const range=document.createRange();range.selectNodeContents(source);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range)}});block.prepend(button)});
  if($('#article-body')){const progress=$('.reading-progress'), article=$('#article-body');const update=()=>{const top=article.getBoundingClientRect().top+window.scrollY;const end=top+article.offsetHeight-window.innerHeight*.6;progress.style.width=Math.max(0,Math.min(100,(window.scrollY-top+130)/(end-top)*100))+'%'};window.addEventListener('scroll',update,{passive:true});update();const links=[...document.querySelectorAll('.toc-link')];const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)links.forEach(a=>{try{a.classList.toggle('active',decodeURIComponent(a.hash.slice(1))===e.target.id)}catch{}})})},{rootMargin:'-100px 0px -65% 0px'});article.querySelectorAll('h1[id],h2[id],h3[id]').forEach(h=>observer.observe(h))}
})();
