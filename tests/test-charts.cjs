/* Dependency-free DOM harness: checks real application chart/navigation code.
   This verifies behavior and SVG structure, not browser layout or appearance. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor(tag='div') {
    this.tagName=tag; this.attrs={}; this.dataset={}; this.children=[];
    this.style={}; this.listeners={}; this.clientWidth=480; this.clientHeight=290;
    this.textContent=''; this.offsetWidth=200; this.offsetHeight=35;
    const classes=new Set();
    this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,v)=>{if(v===undefined)v=!classes.has(c);v?classes.add(c):classes.delete(c);}};
  }
  setAttribute(k,v){this.attrs[k]=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
  getAttribute(k){return this.attrs[k];}
  removeAttribute(k){delete this.attrs[k];}
  appendChild(n){this.children.push(n);n.parent=this;return n;}
  append(...ns){ns.forEach(n=>this.appendChild(n));}
  replaceChildren(...ns){this.children=[];this.append(...ns);}
  addEventListener(k,f){this.listeners[k]=f;}
  getBoundingClientRect(){return{x:10,y:10,width:50,height:20};}
  closest(selector){let n=this;while(n){if(selector==='[data-input]'&&n.dataset.input)return n;if(selector==='[data-tip]'&&n.dataset.tip)return n;n=n.parent;}return null;}
}
const ids={},events={},handlers={},inputs=[];
const make=id=>{const n=new Element();n.id=id;ids[id]=n;return n;};
const pages=['overview','explore','customers','scenario','reports'].map(p=>make('page-'+p));
const nav=pages.map((p,i)=>{let n=new Element('button');n.dataset.page=p.id.slice(5);n.label=['Overview','Sales explorer','Customer insights','Scenario lab','Report center'][i];return n;});
['breadcrumb-page','theme-toggle','view_mode','chart-tooltip','app-status'].forEach(make);
const brand=new Element('a'),main=new Element();
const doc={
  createElementNS:(_,tag)=>new Element(tag),createElement:tag=>new Element(tag),
  createTextNode:text=>({textContent:text}),getElementById:id=>ids[id],
  documentElement:new Element('html'),body:new Element('body'),
  addEventListener:(event,fn)=>events[event]=fn,
  querySelectorAll:s=>s==='.page'?pages:s==='[data-page]'?nav:[],
  querySelector:s=>s==='.brand'?brand:s==='.main-shell'?main:{textContent:nav.find(n=>s.includes(`"${n.dataset.page}"`))?.label}
};
const storage=new Map();
const Shiny={addCustomMessageHandler:(name,fn)=>handlers[name]=fn,setInputValue:(name,value)=>inputs.push({name,value})};
const context={document:doc,Shiny,window:{Shiny,innerWidth:1200,innerHeight:900},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},ResizeObserver:class{observe(){}},requestAnimationFrame:f=>{f();return 1;},cancelAnimationFrame:()=>{},console};
vm.runInNewContext(fs.readFileSync('www/app.js','utf8'),context);
events.DOMContentLoaded();events['shiny:connected']();
assert(inputs.some(x=>x.name==='ui_ready'));
const charts={
  'revenue-chart':{type:'line',labels:['Jan','Feb','Mar'],series:[{name:'Revenue',values:[300,500,400]},{name:'Profit',values:[100,200,120]}],money:true},
  'category-chart':{type:'bars',labels:['Beauty','Apparel'],values:[300,200],money:true,click:'category_click'},
  'channel-chart':{type:'donut',labels:['Online','Retail'],values:[300,200],money:true},
  'weekday-chart':{type:'heatmap',cols:['Jan','Feb'],rows:['Mon','Tue'],values:[[0,0,10],[0,1,20],[1,0,5]],suffix:' orders'},
  'cohort-chart':{type:'heatmap',cols:['M0','M1'],rows:['2025-01','2025-02'],values:[[0,0,100],[1,0,20],[0,1,100]],percentage:true,suffix:'%'},
  'customer-chart':{type:'scatter',points:[{x:2,y:120,label:'C-001',segment:'Returning'},{x:8,y:900,label:'C-002',segment:'Champions'}]}
};
Object.keys(charts).forEach(make);
function descendants(n){return[n,...(n.children||[]).flatMap(descendants)];}
handlers.charts(charts);
for(const id of Object.keys(charts)){
  assert.equal(ids[id].children[0].tagName,'svg',id+' renders SVG');
  const tree=descendants(ids[id]);
  assert(tree.some(n=>n.dataset?.tip),id+' has interactive data marks');
  assert(!tree.some(n=>Object.values(n.attrs||{}).some(v=>String(v).includes('NaN'))),id+' has finite geometry');
}
const hit=descendants(ids['category-chart']).find(n=>n.dataset?.input);
events.click({target:hit});assert.equal(inputs.at(-1).name,'category_click');assert.equal(inputs.at(-1).value,'Beauty');
events.keydown({key:'Enter',target:hit,preventDefault(){}});assert.equal(inputs.at(-1).value,'Beauty');
handlers.navigate('customers');assert(pages[2].classList.contains('active'));assert.equal(ids['breadcrumb-page'].textContent,'Customer insights');
handlers.navigate('invalid');assert(pages[2].classList.contains('active'));
ids['theme-toggle'].listeners.click();assert.equal(doc.documentElement.dataset.theme,'dark');assert.equal(storage.get('meridian-theme'),'dark');
ids['view_mode'].listeners.change({target:{value:'presentation'}});assert.equal(doc.body.dataset.view,'presentation');
for(const type of ['line','bars','donut','heatmap','scatter']){
  handlers.charts({'category-chart':{type,labels:[],values:[],series:[],points:[]}});
  assert(descendants(ids['category-chart']).some(n=>n.textContent==='No data in this selection'),type+' empty state');
}
handlers.charts({'category-chart':{type:'line',labels:'Jan',series:[{name:'Revenue',values:100}],money:true}});
assert(descendants(ids['category-chart']).some(n=>n.dataset?.tip?.includes('$100')));
handlers.charts({'channel-chart':{type:'donut',labels:'Online',values:100,money:true}});
assert(descendants(ids['channel-chart']).some(n=>n.tagName==='circle'));
console.log('Chart SVG, tooltips, keyboard drill-down, navigation, theme, modes, single-value serialization, and empty-state checks passed.');
