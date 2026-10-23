/* CALVO 2027 layer (cosmetic only; never touches calculator logic) */
(function(){'use strict';
var root=document.documentElement,mob=matchMedia('(max-width:820px),(pointer:coarse)').matches,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function add(c,h){var d=document.createElement('div');d.className=c;if(h)d.innerHTML=h;return d}
/* atmosphere */
document.body.appendChild(add('f-aurora','<i></i><i></i><i></i>'));root.appendChild(add('f-grain'));
var hero=document.querySelector('#tab-home .p-hero>div');
if(hero&&!hero.querySelector('.f-chip'))hero.insertBefore(add('f-chip','Calvo 2027 &middot; AI online'),hero.firstChild).className='f-chip';
/* light follows cursor on tiles; tilt + glow on the logo */
var brand=document.getElementById('topbarBrand'),mark=brand&&brand.querySelector('.topbar-mark');
addEventListener('pointermove',function(e){var t=e.target.closest&&e.target.closest('.home-big');
 if(t){var r=t.getBoundingClientRect();t.style.setProperty('--mx',e.clientX-r.left+'px');t.style.setProperty('--my',e.clientY-r.top+'px')}
 if(mark){var b=mark.getBoundingClientRect(),dx=(e.clientX-b.left-b.width/2),dy=(e.clientY-b.top-b.height/2),d=Math.hypot(dx,dy);
  if(d<140){var k=1-d/140;mark.style.transform='rotateY('+dx/6*k+'deg) rotateX('+-dy/6*k+'deg) scale('+(1+.18*k)+')'}else mark.style.transform=''}},{passive:true});
document.querySelectorAll('.p-btn').forEach(function(b){b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect();b.style.transform='translate('+(e.clientX-r.left-r.width/2)/9+'px,'+(e.clientY-r.top-r.height/2)/6+'px)'});b.addEventListener('pointerleave',function(){b.style.transform=''})});
/* cinematic logo intro: symbols are pulled into the logo, then it detonates */
function intro(){
 var s=add('f-splash'+(mob?' f-mob':'')),cv=document.createElement('canvas'),core=add('f-core'),i=0;
 core.innerHTML='<div class="f-logo"><i>=x</i></div><div class="f-word"></div><div class="f-tag">Calculate the future</div><div class="f-bar"><b></b></div>';
 'CALVO'.split('').forEach(function(c){var sp=document.createElement('span');sp.textContent=c;sp.style.animationDelay=(1.05+i++*.09)+'s';core.querySelector('.f-word').appendChild(sp)});
 s.appendChild(cv);s.appendChild(core);s.appendChild(add('f-skip','TAP TO SKIP'));root.appendChild(s);root.classList.remove('f-pre');
 var old=document.body.style.overflow;document.body.style.overflow='hidden';
 var x=cv.getContext('2d'),W,H,dpr=mob?1:Math.min(devicePixelRatio||1,2),G='+-\u00D7\u00F7=\u221A\u03C0\u222B\u03A3\u03B8\u221E%x\u00B2\u0394'.split(''),P=[],t0=performance.now(),boom=false,done=false,go=false;
 function rs(){W=cv.width=innerWidth*dpr;H=cv.height=innerHeight*dpr}rs();
 for(var n=0;n<(mob?26:110);n++){var a=Math.random()*6.283,r=Math.max(W,H)*(.55+Math.random()*.5);P.push({x:W/2+Math.cos(a)*r,y:H/2+Math.sin(a)*r,g:G[n%G.length],s:(14+Math.random()*22)*dpr,v:0,a:a,h:Math.random()});var q=P[P.length-1],c=document.createElement('canvas'),k=c.getContext('2d');c.width=c.height=Math.ceil(q.s*1.5);k.font='700 '+q.s+'px JetBrains Mono,monospace';k.textBaseline='top';k.fillStyle=q.h>.6?'#ffb066':q.h>.3?'#fff':'#ff8a1f';k.fillText(q.g,2,2);q.c=c}
 function start(){if(go||done)return;go=true;s.classList.add('go');t0=performance.now()}
 function arm(){requestAnimationFrame(function(){requestAnimationFrame(start)})}
 start(); /* play immediately: no waiting for the page to finish loading */
 function end(){if(done)return;done=true;s.classList.add('out');setTimeout(function(){s.remove();document.body.style.overflow=old},950)}
 s.addEventListener('click',end);addEventListener('keydown',end,{once:true});
 var shock=0;
 (function f(now){if(done)return;if(!go){requestAnimationFrame(f);return}var t=Math.max(0,(now-t0)/1000);x.clearRect(0,0,W,H);
  if(t>1.55&&!boom){boom=true;P.forEach(function(p){var a=Math.atan2(p.y-H/2,p.x-W/2);p.vx=Math.cos(a)*(6+Math.random()*14)*dpr;p.vy=Math.sin(a)*(6+Math.random()*14)*dpr;p.x=W/2+Math.cos(a)*40*dpr;p.y=H/2+Math.sin(a)*40*dpr})}
  if(boom){shock+=(Math.max(W,H)-shock)*.07}
  P.forEach(function(p){if(!boom){p.v+=.05*dpr;var dx=W/2-p.x,dy=H/2-p.y,d=Math.hypot(dx,dy)||1;p.x+=dx/d*p.v*(d/(Math.max(W,H)*.35)+.35)*3;p.y+=dy/d*p.v*(d/(Math.max(W,H)*.35)+.35)*3;x.globalAlpha=Math.min(.8,t/1.2)}
   else{p.x+=p.vx;p.y+=p.vy;p.vx*=.96;p.vy*=.96;x.globalAlpha=Math.max(0,.9-(t-1.55)*.9)}
   x.drawImage(p.c,p.x,p.y)});
  if(boom&&!mob){x.globalAlpha=Math.max(0,.7-shock/Math.max(W,H));x.strokeStyle='#ff9a3a';x.lineWidth=3*dpr;x.beginPath();x.arc(W/2,H/2,shock,0,6.283);x.stroke()}
  if(t>2.5)end();else requestAnimationFrame(f)})(t0);
}
var seen=false;try{seen=!!sessionStorage.getItem('calvoIntro')||window.name.indexOf('calvoIntro')>-1}catch(e){}
if(!reduce&&!seen){try{sessionStorage.setItem('calvoIntro','1');window.name+=' calvoIntro'}catch(e){}intro()}
root.classList.remove('f-pre');
if(brand)brand.addEventListener('dblclick',function(){if(!document.querySelector('.f-splash'))intro()});
})();
