const tabs=[...document.querySelectorAll('nav button.tab')],secs=[...document.querySelectorAll('section')];
let cur=0;
function go(i,ev){
  if(i===cur||i<0||i>3)return;
  cur=i;
  tabs.forEach((t,k)=>t.classList.toggle('on',k===i));
  secs.forEach((s,k)=>{s.classList.toggle('on',k===i);if(k===i){s.scrollTop=0;s.classList.remove('scrolled')}});
  const r=ev?ev.currentTarget.getBoundingClientRect():null;
  ripple(r?r.left+r.width/2:W/2,r?r.top+r.height/2:H/2,1);
  ripple(W/2,H/2,1.6,.12);
}
tabs.forEach((t,i)=>t.onclick=e=>go(i,e));
secs.forEach(sc=>sc.addEventListener('scroll',()=>sc.classList.toggle('scrolled',sc.scrollTop>4),{passive:true}));
addEventListener('keydown',e=>{if(e.key==='ArrowRight')go(cur+1);if(e.key==='ArrowLeft')go(cur-1)});

/* dots wave (optimizado: dibujo por lotes, 30 fps, 15 en reposo) */
const c=document.getElementById('bg'),x=c.getContext('2d');
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const G=9,NB=28;
let W,H,dpr,mx=-999,my=-999,sx=-999,sy=-999,rip=[],lastAct=0,last=0;
let cols,rows,N,pX,pY,ib,order,sinC,cosR;
const cnt=new Uint32Array(NB+1),pos=new Uint32Array(NB+1),fills=[],half=[];
for(let b=0;b<NB;b++){const v=(b+.5)/NB,q=v*v;fills.push(`rgb(${7+q*70|0},${4+q*36|0},${16+q*125|0})`);half.push((.35+v)*.886)}
function size(){
  dpr=Math.min(devicePixelRatio||1,1.5);W=innerWidth;H=innerHeight;
  c.width=W*dpr|0;c.height=H*dpr|0;x.setTransform(dpr,0,0,dpr,0,0);
  cols=Math.ceil(W/G);rows=Math.ceil(H/G);N=cols*rows;
  pX=new Float32Array(N);pY=new Float32Array(N);ib=new Uint8Array(N);order=new Uint32Array(N);
  sinC=new Float32Array(cols);cosR=new Float32Array(rows);
}
size();
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(size,120)});
const act=()=>{lastAct=performance.now()};
addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;act()});
addEventListener('touchmove',e=>{mx=e.touches[0].clientX;my=e.touches[0].clientY;act()},{passive:true});
addEventListener('click',e=>ripple(e.clientX,e.clientY,.5));
function ripple(px,py,amp=1,delay=0){rip.push({x:px,y:py,t:performance.now()+delay*1000,a:amp});act()}
function frame(now){
  requestAnimationFrame(frame);
  const idle=!rip.length&&now-lastAct>2500;
  const gap=1000/(reduce?8:idle?15:30);
  if(now-last<gap-2)return;
  const dt=Math.min((now-last)/1000,.2);last=now;
  const t=now/1000;
  if(mx<-900){sx=W/2;sy=H/2}else{const k=1-Math.pow(.88,dt*60);sx+=(mx-sx)*k;sy+=(my-sy)*k}
  rip=rip.filter(r=>now-r.t<3500);
  const R=[];for(const r of rip){const age=(now-r.t)/1000;if(age>=0)R.push(r.x,r.y,age*900,Math.exp(-age*.8)*r.a)}
  const nr=R.length;
  for(let i=0;i<cols;i++)sinC[i]=Math.sin((G/2+i*G)*.012+t*.6);
  for(let j=0;j<rows;j++)cosR[j]=Math.cos((G/2+j*G)*.015-t*.5);
  cnt.fill(0);
  let n=0;
  for(let j=0;j<rows;j++){
    const py=G/2+j*G,cr=cosR[j]*.5,dy=py-sy;
    for(let i=0;i<cols;i++){
      const px=G/2+i*G,dx=px-sx,d=Math.sqrt(dx*dx+dy*dy);
      let w=sinC[i]*cr+Math.sin(d*.028-t*2.2)*Math.exp(-d/260)*1.1,ox=0,oy=0;
      for(let q=0;q<nr;q+=4){
        const rx=px-R[q],ry=py-R[q+1],rd=Math.sqrt(rx*rx+ry*ry),kk=rd-R[q+2];
        if(kk*kk<160000){const f=Math.exp(-kk*kk/26000)*R[q+3];w+=f*1.8;if(rd>0){ox+=rx/rd*f*6;oy+=ry/rd*f*6}}
      }
      let v=(w+.8)/2.6;v=v<0?0:v>1?1:v;
      const b=Math.min(NB-1,v*NB|0);
      ib[n]=b;cnt[b]++;
      pX[n]=px+ox+dx/(d+1)*w*1.2;pY[n]=py+oy+dy/(d+1)*w*1.2;n++;
    }
  }
  pos[0]=0;for(let b=0;b<NB;b++)pos[b+1]=pos[b]+cnt[b];
  const fillp=pos.slice();
  for(let k=0;k<N;k++)order[fillp[ib[k]]++]=k;
  x.clearRect(0,0,W,H);
  for(let b=0;b<NB;b++){
    if(pos[b]===pos[b+1])continue;
    const hh=half[b],s2=hh*2;
    x.fillStyle=fills[b];x.beginPath();
    for(let m=pos[b];m<pos[b+1];m++){const k=order[m];x.rect(pX[k]-hh,pY[k]-hh,s2,s2)}
    x.fill();
  }
}
requestAnimationFrame(frame);

/* grain: una sola textura; el movimiento lo hace CSS (transform) */
{
  const g=document.createElement('canvas');g.width=g.height=300;
  const gx=g.getContext('2d'),im=gx.createImageData(300,300),d=im.data;
  for(let i=0;i<d.length;i+=4){const v=Math.random()*255;d[i]=v*.5;d[i+1]=v*.25;d[i+2]=v;d[i+3]=255}
  gx.putImageData(im,0,0);
  document.getElementById('grain').style.backgroundImage=`url(${g.toDataURL()})`;
}

/* idioma: lang/en.js se carga solo al pulsar el botón */
const langBtn=document.getElementById('lang'),i18n=[...document.querySelectorAll('[data-i18n]')],titleEs=document.title;
i18n.forEach(el=>el._es=el.innerHTML);
let lang='es';
function applyLang(l){
  const d=l==='es'?null:window.LANG[l];
  i18n.forEach(el=>{const v=d?d[el.dataset.i18n]:undefined;el.innerHTML=v!==undefined?v:el._es});
  document.title=(d&&d.title)||titleEs;document.documentElement.lang=l;lang=l;
  langBtn.textContent=l==='es'?'ES':'EN';
  try{localStorage.setItem('lang',l)}catch(e){}
  ripple(W/2,H/2,1);
}
function setLang(l){
  if(l==='es'||(window.LANG&&LANG[l]))return applyLang(l);
  const sc=document.createElement('script');sc.src='lang/'+l+'.js';
  sc.onload=()=>window.LANG&&LANG[l]&&applyLang(l);
  sc.onerror=()=>console.warn('Falta lang/'+l+'.js');
  document.head.appendChild(sc);
}
langBtn.onclick=()=>setLang(lang==='es'?'en':'es');
/* idioma inicial: preferencia guardada > idioma del navegador > español */
let sv=null;try{sv=localStorage.getItem('lang')}catch(e){}
const ini=sv||((navigator.language||'es').toLowerCase().startsWith('en')?'en':'es');
if(ini!=='es')setLang(ini);
