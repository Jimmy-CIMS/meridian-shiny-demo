/* Meridian charts: dependency-free, responsive SVG with Shiny integration. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const palette = ['#d5633e', '#327b68', '#c39a4e', '#7893aa'];
  const state = { charts: {}, page: 'overview', registered: false };
  const array = x => x == null ? [] : Array.isArray(x) ? x : [x];
  const compact = (v, money=false) => (money ? '$' : '') + (Math.abs(v)>=1e6 ? (v/1e6).toFixed(1)+'M' : Math.abs(v)>=1000 ? (v/1000).toFixed(1)+'k' : Math.round(v).toLocaleString('en-US'));
  const exact = (v,money=false) => (money ? '$' : '') + Number(v).toLocaleString('en-US',{maximumFractionDigits:money?2:0});
  function svgNode(tag,attrs={},text) {
    const n=document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));
    if(text!=null)n.textContent=String(text);
    return n;
  }
  function add(svg,tag,attrs,text){const n=svgNode(tag,attrs,text);svg.appendChild(n);return n;}
  function label(svg,x,y,text,attrs={}) { return add(svg,'text',{x,y,fill:'var(--muted)','font-size':11,'font-family':'inherit',...attrs},text); }
  function interactive(n,tip,click,value) {
    n.setAttribute('data-tip',tip);n.setAttribute('tabindex','0');
    n.setAttribute('aria-label',tip);
    if(click){n.setAttribute('data-input',click);n.setAttribute('data-value',value);n.setAttribute('role','button');n.style.cursor='pointer';}
  }
  function legend(root,items) {
    const el=document.createElement('div');el.className='chart-legend';
    items.forEach((item,i)=>{const s=document.createElement('span');const dot=document.createElement('i');dot.style.background=palette[i%palette.length];s.append(dot,document.createTextNode(item));el.append(s);});root.append(el);
  }
  function render(id,d) {
    const root=document.getElementById(id);if(!root||!root.clientWidth)return;
    const width=Math.max(root.clientWidth,240),height=root.clientHeight;
    root.replaceChildren();
    const svg=svgNode('svg',{viewBox:`0 0 ${width} ${height-30}`,width:'100%',height:height-30,role:'group','aria-label':root.getAttribute('aria-label')});root.append(svg);
    const w=width,h=height-30;
    const labels=array(d.labels),values=array(d.values);
    let empty=false;
    if(d.type==='line')empty=!array(d.series).some(s=>array(s.values).some(v=>v>0));
    else if(d.type==='scatter')empty=!array(d.points).length;
    else if(d.type==='heatmap')empty=!values.length;
    else empty=!values.some(v=>v>0);
    if(empty){label(svg,w/2,h/2-6,'No data in this selection',{'text-anchor':'middle','font-size':14});label(svg,w/2,h/2+18,'Expand your dates or reset your filters.',{'text-anchor':'middle'});return;}
    if(d.type==='line') {
      const series=array(d.series),names=series.map(s=>s.name);const months=array(d.labels);
      const max=Math.max(...series.flatMap(s=>array(s.values)),1)*1.16;
      const pad={l:57,r:18,t:14,b:26},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
      const x=i=>pad.l+(months.length===1?pw/2:i*pw/(months.length-1));const y=v=>pad.t+ph-(v/max)*ph;
      for(let i=0;i<=4;i++){const v=max*i/4,yy=y(v);add(svg,'line',{x1:pad.l,x2:w-pad.r,y1:yy,y2:yy,stroke:'var(--grid)','stroke-dasharray':i?'3 5':'none'});label(svg,pad.l-12,yy+4,compact(v,d.money),{'text-anchor':'end'});}
      months.forEach((m,i)=>{if(w>470||i%2===0||i===months.length-1)label(svg,x(i),h-4,m,{'text-anchor':'middle'});});
      series.forEach((s,si)=>{const vals=array(s.values);const points=vals.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
        if(si===0)add(svg,'polygon',{points:`${x(0)},${y(0)} ${points} ${x(vals.length-1)},${y(0)}`,fill:palette[si],'fill-opacity':.08});
        add(svg,'polyline',{points,fill:'none',stroke:palette[si],'stroke-width':2.8,'stroke-linecap':'round','stroke-linejoin':'round','stroke-dasharray':si===1?'5 4':'none'});
        vals.forEach((v,i)=>{const c=add(svg,'circle',{cx:x(i),cy:y(v),r:4,fill:'var(--surface)',stroke:palette[si],'stroke-width':2});interactive(c,`${months[i]} · ${s.name}: ${exact(v,d.money)}`);});
      });legend(root,names);
    } else if(d.type==='bars') {
      const max=Math.max(...values,1),row=(h-8)/labels.length;
      labels.forEach((name,i)=>{
        const yy=i*row+8;label(svg,0,yy+11,name,{'font-size':12,fill:'var(--text)'});label(svg,w,yy+11,compact(values[i],d.money),{'text-anchor':'end','font-size':12,fill:'var(--text)'});
        add(svg,'rect',{x:0,y:yy+23,width:w,height:10,rx:3,fill:'var(--track)'});
        const r=add(svg,'rect',{x:0,y:yy+23,width:Math.max(2,w*values[i]/max),height:10,rx:3,fill:palette[i%palette.length]});interactive(r,`${name}: ${exact(values[i],d.money)}`,d.click,name);
        if(d.click){const hit=add(svg,'rect',{x:0,y:yy-1,width:w,height:row-4,fill:'transparent'});interactive(hit,`${name}: ${exact(values[i],d.money)} · Select to explore`,d.click,name);r.removeAttribute('tabindex');}
      });
    } else if(d.type==='donut') {
      const total=values.reduce((a,b)=>a+b,0),cx=w/2,cy=Math.min(h*.42,90),r=Math.min(w*.23,64),sw=19;let start=-Math.PI/2;
      values.forEach((v,i)=>{if(v<=0)return;const angle=v/total*Math.PI*2,end=start+angle-.025;
        if(angle>Math.PI*1.999){const c=add(svg,'circle',{cx,cy,r,fill:'none',stroke:palette[i],'stroke-width':sw});interactive(c,`${labels[i]}: ${exact(v,d.money)} (100%)`);}
        else {const x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end);const p=add(svg,'path',{d:`M${x1} ${y1} A${r} ${r} 0 ${angle>Math.PI?1:0} 1 ${x2} ${y2}`,fill:'none',stroke:palette[i%palette.length],'stroke-width':sw});interactive(p,`${labels[i]}: ${exact(v,d.money)} (${(100*v/total).toFixed(1)}%)`);}start+=angle;
      });label(svg,cx,cy+2,compact(total,d.money),{'text-anchor':'middle','font-size':23,'font-weight':650,fill:'var(--text)'});label(svg,cx,cy+21,d.money?'total revenue':'customers',{'text-anchor':'middle','font-size':10});
      const gap=19,base=Math.max(cy+r+23,h-labels.length*gap+3);
      labels.forEach((l,i)=>{add(svg,'circle',{cx:8,cy:base+i*gap-4,r:3.5,fill:palette[i%palette.length]});label(svg,19,base+i*gap,l,{'font-size':11,fill:'var(--text)'});label(svg,w-1,base+i*gap,`${(100*values[i]/total).toFixed(0)}%`,{'text-anchor':'end'});});
    } else if(d.type==='heatmap') {
      const cols=array(d.cols),rows=array(d.rows),left=d.percentage?75:37,top=10,cw=(w-left-8)/Math.max(cols.length,1),ch=(h-top-26)/Math.max(rows.length,1),max=d.percentage?100:Math.max(...values.map(v=>v[2]),1);
      rows.forEach((r,i)=>label(svg,left-10,top+i*ch+ch/2+4,r,{'text-anchor':'end','font-size':10}));
      cols.forEach((c,i)=>{if(w>480||i%2===0)label(svg,left+i*cw+cw/2,h-4,c,{'text-anchor':'middle','font-size':10});});
      values.forEach(v=>{const [x,y,val]=v;const opacity=.08+.92*val/max;const r=add(svg,'rect',{x:left+x*cw+2,y:top+y*ch+2,width:Math.max(cw-4,1),height:Math.max(ch-4,1),rx:3,fill:'#327b68','fill-opacity':opacity});interactive(r,`${rows[y]} · ${cols[x]}: ${val}${d.suffix||''}`);
        if(d.percentage&&cw>30&&ch>14)label(svg,left+x*cw+cw/2,top+y*ch+ch/2+3,`${val}%`,{'text-anchor':'middle','font-size':9,fill:val>45?'#f8faf4':'var(--text)','pointer-events':'none'});
      });legend(root,[d.percentage?'Lighter = lower retention':'Lighter = fewer orders','Darker = higher activity']);
    } else if(d.type==='scatter') {
      const points=array(d.points),left=56,bottom=35,pw=w-left-15,ph=h-bottom-10,maxX=Math.max(...points.map(p=>p.x),1)+1,maxY=Math.max(...points.map(p=>p.y),1)*1.1;
      for(let i=0;i<=4;i++){let y=10+ph-ph*i/4;add(svg,'line',{x1:left,x2:w-10,y1:y,y2:y,stroke:'var(--grid)','stroke-dasharray':'3 5'});label(svg,left-8,y+4,compact(maxY*i/4,true),{'text-anchor':'end'});}
      const segments=['New','Returning','Loyal','Champions'];
      points.forEach(p=>{const n=add(svg,'circle',{cx:left+(p.x/maxX)*pw,cy:10+ph-(p.y/maxY)*ph,r:4.5,fill:palette[segments.indexOf(p.segment)],'fill-opacity':.58,stroke:'var(--surface)','stroke-width':.6});interactive(n,`${p.label} · ${p.segment}: ${p.x} orders, ${exact(p.y,true)} spent`);});
      for(let i=0;i<=4;i++)label(svg,left+pw*i/4,h-18,Math.round(maxX*i/4),{'text-anchor':'middle'});
      label(svg,left+pw/2,h-2,'Orders per customer · first 350 customers by ID',{'text-anchor':'middle','font-size':10});legend(root,segments);
    }
  }
  function redraw(){Object.entries(state.charts).forEach(([id,d])=>render(id,d));}
  function navigate(page){
    if(!document.getElementById('page-'+page))return;
    state.page=page;
    document.querySelectorAll('.page').forEach(n=>n.classList.toggle('active',n.id==='page-'+page));
    document.querySelectorAll('[data-page]').forEach(n=>{n.classList.toggle('active',n.dataset.page===page);if(n.dataset.page===page)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
    const active=document.querySelector(`[data-page="${page}"] span`);document.getElementById('breadcrumb-page').textContent=active.textContent;
    document.getElementById('app-status').textContent=active.textContent+' selected';
    requestAnimationFrame(redraw);
    if(window.Shiny)Shiny.setInputValue('active_page',page,{priority:'event'});
  }
  function setupShiny(){
    if(!window.Shiny||state.registered)return;
    state.registered=true;
    Shiny.addCustomMessageHandler('charts',charts=>{state.charts=charts;redraw();});
    Shiny.addCustomMessageHandler('navigate',navigate);
  }
  function ready(){setupShiny();if(window.Shiny)Shiny.setInputValue('ui_ready',Date.now(),{priority:'event'});}
  document.addEventListener('DOMContentLoaded',()=>{
    setupShiny();
    document.querySelectorAll('[data-page]').forEach(n=>n.addEventListener('click',()=>navigate(n.dataset.page)));
    document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();navigate('overview');});
    const themeButton=document.getElementById('theme-toggle');
    function setTheme(dark){document.documentElement.dataset.theme=dark?'dark':'light';themeButton.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');themeButton.setAttribute('aria-pressed',String(dark));}
    try{setTheme(localStorage.getItem('meridian-theme')==='dark');}catch(e){setTheme(false);}
    themeButton.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';setTheme(dark);try{localStorage.setItem('meridian-theme',dark?'dark':'light');}catch(e){}redraw();});
    document.getElementById('view_mode').addEventListener('change',e=>{document.body.dataset.view=e.target.value;requestAnimationFrame(redraw);});
    let resizeFrame;new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(redraw);}).observe(document.querySelector('.main-shell'));
    const tooltip=document.getElementById('chart-tooltip');
    function show(e,n){tooltip.textContent=n.dataset.tip;tooltip.classList.add('visible');const box=n.getBoundingClientRect();const x=e.clientX||box.x+box.width/2,y=e.clientY||box.y;tooltip.style.left=Math.max(8,Math.min(x+14,window.innerWidth-tooltip.offsetWidth-12))+'px';tooltip.style.top=Math.max(8,Math.min(y+14,window.innerHeight-tooltip.offsetHeight-12))+'px';}
    const hide=()=>tooltip.classList.remove('visible');
    document.addEventListener('pointermove',e=>{const n=e.target.closest('[data-tip]');if(n)show(e,n);else hide();});
    document.addEventListener('focusin',e=>{if(e.target.dataset.tip)show(e,e.target);});document.addEventListener('focusout',hide);
    function activate(n){if(n&&n.dataset.input&&window.Shiny){Shiny.setInputValue(n.dataset.input,n.dataset.value,{priority:'event'});hide();}}
    document.addEventListener('click',e=>activate(e.target.closest('[data-input]')));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if((e.key==='Enter'||e.key===' ')&&e.target.dataset.input){e.preventDefault();activate(e.target);}});
    if(window.jQuery){jQuery(document).on('shiny:connected',ready);jQuery(document).on('shiny:disconnected',()=>{document.getElementById('app-status').textContent='Connection interrupted. Reconnecting…';});}
    // Initial binding is completed by Shiny after DOM readiness.
    document.addEventListener('shiny:connected',ready);
  });
})();
