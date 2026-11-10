/* LAVIA — independent, accessible UI behaviors. No backend or automatic booking. */
(() => {
  'use strict';
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ico = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  $('#year').textContent = String(new Date().getFullYear());

  // Animate once upon entering viewport. Content remains visible without JS.
  if (!reduced && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const entrance = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('in'); observer.unobserve(entry.target);
      }
    }, { rootMargin:'0px 0px -35px 0px', threshold:0.06 });
    $$('.reveal').forEach(el => entrance.observe(el));
  }

  // Scroll response: nav, progress, contextual active link.
  const nav = $('#nav'), progress = $('#scrollProgress');
  let tick = false;
  function updateScroll() {
    tick = false;
    nav.classList.toggle('scrolled', scrollY > 35);
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${Math.min(100, Math.max(0, max > 0 ? (scrollY/max)*100 : 0))}%`;
  }
  updateScroll();
  addEventListener('scroll', () => { if (!tick) { tick=true; requestAnimationFrame(updateScroll); } }, {passive:true});
  addEventListener('resize', updateScroll, {passive:true});
  if ('IntersectionObserver' in window) {
    const navItems = $$('.nav-item');
    const observer = new IntersectionObserver((entries) => {
      const best = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (best) navItems.forEach(a => a.classList.toggle('active', a.hash === `#${best.target.id}`));
    }, {rootMargin:'-25% 0px -57% 0px',threshold:0});
    ['home','moments','services','packages','offers','gallery'].forEach(id => { const s=$(`#${id}`); if(s) observer.observe(s); });
  }

  // Mobile navigation with outside click and Escape.
  const mobileToggle=$('#mobileToggle'), mobilePanel=$('#mobilePanel');
  let menuOpen=false, menuTimer;
  function setMenu(open) {
    clearTimeout(menuTimer); menuOpen=open;
    mobileToggle.setAttribute('aria-expanded',String(open));
    mobileToggle.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');
    mobileToggle.querySelector('use').setAttribute('href', open?'#i-close':'#i-menu');
    if(open){mobilePanel.hidden=false;requestAnimationFrame(()=>mobilePanel.classList.add('open'));}
    else {mobilePanel.classList.remove('open');menuTimer=setTimeout(()=>{if(!menuOpen)mobilePanel.hidden=true},reduced?0:290);}
  }
  mobileToggle.addEventListener('click',()=>setMenu(!menuOpen));
  $$('#mobilePanel a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('click',e=>{if(menuOpen&&!e.composedPath().includes(nav))setMenu(false)});
  addEventListener('resize',()=>{if(innerWidth>900&&menuOpen)setMenu(false)});

  // Service catalog: all 120 source-provided services remain in HTML for SEO and no-JS reading.
  const cards=$$('.catalog-card');
  const entries=new Map(cards.map(card=>[card.dataset.cat, {
    title: card.dataset.title,
    names: $$('.service-pick',card).map(btn=>btn.dataset.service),
    card,
  }]));
  const panels=cards.map(card=>({card,button:$('.catalog-head',card),panel:$('.catalog-panel',card)}));
  const animations=new WeakMap();
  function setCardOpen(card,open,animate=true) {
    const button=$('.catalog-head',card), panel=$('.catalog-panel',card);
    if (!button||!panel) return;
    const running=animations.get(panel); if(running)running.cancel();
    const previouslyOpen=button.getAttribute('aria-expanded')==='true';
    if(previouslyOpen===open && panel.hidden===!open) return;
    button.setAttribute('aria-expanded',String(open)); card.classList.toggle('open',open);
    if(open){
      panel.hidden=false;
      if(animate&&!reduced && panel.animate){
        const height=panel.scrollHeight;
        const anim=panel.animate([{height:'0px',opacity:0},{height:`${height}px`,opacity:1}], {duration:400,easing:'cubic-bezier(.22,1,.36,1)'});
        animations.set(panel,anim);
        anim.onfinish=()=>{panel.style.height=''; animations.delete(panel)};
      }
    }else if(animate&&!reduced&&panel.animate){
      const height=panel.getBoundingClientRect().height || panel.scrollHeight;
      const anim=panel.animate([{height:`${height}px`,opacity:1},{height:'0px',opacity:0}],{duration:260,easing:'ease-in'});
      animations.set(panel,anim);
      anim.onfinish=()=>{if(button.getAttribute('aria-expanded')==='false')panel.hidden=true; animations.delete(panel)};
    }else{panel.hidden=true;}
  }
  panels.forEach(({card,button})=>button.addEventListener('click',()=>setCardOpen(card,button.getAttribute('aria-expanded')!=='true')));

  // Diacritic/hamza tolerant Arabic search; collapse/expand affected sections.
  const search=$('#serviceSearch'),clearSearch=$('#clearSearch'),results=$('#serviceResults'),emptyServices=$('#emptyServices');
  function norm(str){return String(str).normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').trim().toLowerCase()}
  function filterCatalog(){
    const term=norm(search.value); let visibleCards=0, visibleServices=0;
    cards.forEach(card=>{
      const headMatch=norm(card.dataset.title).includes(term);
      const links=$$('.service-pick',card);
      let matches=0;
      links.forEach(link=>{const show=!term||headMatch||norm(link.dataset.service).includes(term);link.parentElement.hidden=!show;if(show)matches++});
      const show=!term||headMatch||matches>0;card.hidden=!show;
      if(show){visibleCards++;visibleServices+=matches;card.classList.add('in')}
      if(term)setCardOpen(card,show,false);
      else setCardOpen(card,false,false);
    });
    clearSearch.hidden=!term;emptyServices.hidden=visibleCards>0;
    results.textContent=term?`تم العثور على ${visibleServices} خدمة في ${visibleCards} قسم`:'8 أقسام للعناية والجمال';
  }
  search.addEventListener('input',filterCatalog);
  clearSearch.addEventListener('click',()=>{search.value='';filterCatalog();search.focus()});

  // Booking dropdown: one source of truth is each service card's list.
  const categorySelect=$('#bookingCategory'),serviceSelect=$('#bookingService');
  const packages=$$('.bundle-card h3').map(el=>el.textContent.trim());
  const offers=$$('.offer-card h3').map(el=>el.textContent.trim());
  function updateServiceSelect(prefer=''){
    const category=categorySelect.value;
    serviceSelect.replaceChildren();
    const fallback=document.createElement('option');fallback.value='';fallback.textContent=category?'اختاري الخدمة':'اختاري القسم أولًا';serviceSelect.append(fallback);
    const opts=category==='package'?packages:category==='offer'?offers:entries.get(category)?.names||[];
    opts.forEach(name=>{const opt=document.createElement('option');opt.value=name;opt.textContent=name;serviceSelect.append(opt)});
    serviceSelect.disabled=opts.length===0;
    if(prefer&&opts.includes(prefer))serviceSelect.value=prefer;
  }
  categorySelect.addEventListener('change',()=>updateServiceSelect());
  function selectBooking(category,service){
    categorySelect.value=category;
    updateServiceSelect(service);
    if(serviceSelect.value!==service){
      // A service was renamed or removed: keep the category and invite a manual selection.
      serviceSelect.value='';
    }
  }
  $$('.service-pick').forEach(button=>button.addEventListener('click',()=>{
    selectBooking(button.dataset.category,button.dataset.service);
    $('#booking').scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
    notify(`تم اختيار «${button.dataset.service}»`);
  }));
  $$('[data-request]').forEach(a=>a.addEventListener('click',()=>{
    selectBooking(a.dataset.kind==='باقة'?'package':'offer',a.dataset.request);
  }));
  // Spotlight cards jump directly to the chosen section, opening it too.
  $$('.moment-card').forEach(a=>a.addEventListener('click',()=>{
    const card=document.querySelector(a.getAttribute('href'));
    if(card){if(search.value){search.value='';filterCatalog()}setCardOpen(card,true,false)}
  }));

  // Form: client-side request preparation, never pretend a remote booking exists.
  const bookingForm=$('#bookingForm'),dateInput=$('#bookingDate'),nameInput=$('#customerName'),phoneInput=$('#customerPhone'),timeInput=$('#bookingTime'),notesInput=$('#bookingNotes'),errorBox=$('#formError');
  const latinDigits=(str)=>String(str).replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776));
  function localDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  dateInput.min=localDate(new Date());
  let copiedMessage='';
  function showError(msg,field){errorBox.textContent=msg;errorBox.hidden=false;if(field){field.setAttribute('aria-invalid','true');field.focus()}}
  function clearError(){errorBox.textContent='';errorBox.hidden=true;$$('[aria-invalid]',bookingForm).forEach(el=>el.removeAttribute('aria-invalid'))}
  bookingForm.addEventListener('input',clearError);bookingForm.addEventListener('change',clearError);
  const modal=$('#bookingModal'),backdrop=$('#modalBackdrop'),closeButton=$('#closeModal');
  let lastFocus=null, modalOpen=false,hiddenTimer;
  function openModal(){
    clearTimeout(hiddenTimer);lastFocus=document.activeElement;modalOpen=true;backdrop.hidden=false;modal.inert=false;modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
    requestAnimationFrame(()=>{backdrop.classList.add('open');modal.classList.add('open');closeButton.focus({preventScroll:true})});
  }
  function closeModal(){
    if(!modalOpen)return;modalOpen=false;modal.inert=true;modal.setAttribute('aria-hidden','true');modal.classList.remove('open');backdrop.classList.remove('open');document.body.classList.remove('modal-open');
    hiddenTimer=setTimeout(()=>{if(!modalOpen)backdrop.hidden=true},reduced?0:320);
    if(lastFocus&&document.contains(lastFocus))lastFocus.focus({preventScroll:true});
  }
  closeButton.addEventListener('click',closeModal);backdrop.addEventListener('click',closeModal);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(modalOpen)closeModal();else if(menuOpen)setMenu(false)}
    if(e.key!=='Tab'||!modalOpen)return;
    const els=$$('button:not(:disabled),a[href],input:not(:disabled)',modal).filter(el=>!el.hidden&&el.getClientRects().length);
    if(!els.length)return;
    if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus()}
    else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus()}
  });
  bookingForm.addEventListener('submit',e=>{
    e.preventDefault();clearError();
    if(!bookingForm.reportValidity())return;
    const name=nameInput.value.trim(),phone=latinDigits(phoneInput.value).replace(/[\s()\-]/g,''),category=categorySelect.selectedOptions[0]?.textContent||'',service=serviceSelect.value,date=dateInput.value,time=timeInput.value,notes=notesInput.value.trim();
    if(name.length<2)return showError('يرجى كتابة اسمكِ الكامل، بحرفين على الأقل.',nameInput);
    if(!/^(?:\+966|966|0)?5\d{8}$/.test(phone))return showError('يرجى إدخال رقم جوال سعودي صحيح، مثل 05XXXXXXXX.',phoneInput);
    if(!service)return showError('يرجى تحديد الخدمة أو الباقة المطلوبة.',serviceSelect);
    const selected=new Date(`${date}T${time}:00`);
    if(Number.isNaN(selected.getTime())||selected.getTime()<=Date.now())return showError('يرجى اختيار موعد في المستقبل.',dateInput);
    const niceDate=new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(selected);
    const rows=[['الاسم',name],['الجوال',phone],['القسم',category],['الخدمة أو الباقة',service],['التاريخ',niceDate],['الوقت المفضل',time]];
    if(notes)rows.push(['ملاحظات',notes]);
    copiedMessage='طلب استفسار عن موعد لدى لافيا\n\n'+rows.map(([k,v])=>`${k}: ${v}`).join('\n')+'\n\nيرجى تأكيد توفر الموعد والسعر.';
    const summary=$('#modalSummary');summary.replaceChildren();
    rows.forEach(([label,value])=>{
      const row=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');
      b.textContent=label;span.textContent=value;row.append(b,span);summary.append(row);
    });
    openModal();
  });
  async function copyText(value){
    if(navigator.clipboard&&isSecureContext){try{await navigator.clipboard.writeText(value);return true}catch(_){}}
    const input=document.createElement('textarea');input.value=value;input.style.cssText='position:fixed;left:-9999px;opacity:0';document.body.append(input);input.select();let result=false;try{result=document.execCommand('copy')}catch(_){}input.remove();return result;
  }
  let toastTimer;function notify(text){const toast=$('#toast');toast.textContent=text;toast.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000)}
  $('#copyBooking').addEventListener('click',async()=>notify(await copyText(copiedMessage)?'تم نسخ تفاصيل الموعد بنجاح':'تعذر نسخ التفاصيل في هذا المتصفح'));
})();
