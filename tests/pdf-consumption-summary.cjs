const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const main=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('function calculate()'));
const start=main.indexOf('  function updateConsumptionSummary('),end=main.indexOf('  function payback(',start);
const helper=main.slice(start,end);
function setup({quantity=5.5,unit='t',months=12,price=.35,mode='tariff'}={}){
 const nodes={sourceUsage:{value:quantity},sourceUnit:{value:unit},periodMonths:{value:months},solidPrice:{value:price},gasKwhM3:{value:10.69}};
 const c=vm.createContext({costMode:mode,$:id=>nodes[id]??(nodes[id]={textContent:''}),num:(x,d=0)=>new Intl.NumberFormat('sk-SK',{maximumFractionDigits:d}).format(x),eur:(x,d)=>new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',maximumFractionDigits:d}).format(x),val:(id,f=0)=>Number(nodes[id]?.value??f),clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),annualRawQuantityKg:()=>quantity*12/months*(unit==='t'?1000:1)});
 vm.runInContext(helper,c);return {c,nodes};
}
test('pellet input 5.5 tonnes and 350 EUR/tonne appears above annual costs',()=>{
 const {c,nodes}=setup();c.updateConsumptionSummary('pellet',25300,{total:1925,fixed:0},22264/3.5,.14415);
 assert.match(nodes.sourceUsageSummary.textContent,/5,5 t\/rok/);assert.match(nodes.sourcePriceSummary.textContent,/350.*\/t/);
 assert.match(nodes.hpUsageSummary.textContent,/6\s361 kWh\/rok/);assert.match(nodes.hpPriceSummary.textContent,/0,1442.*\/kWh/);
});
test('kilograms and shorter periods display annual tonnes',()=>{
 const {c,nodes}=setup({quantity:2750,unit:'kg',months:6});c.updateConsumptionSummary('pellet',25300,{total:1925,fixed:0},6361,.16);
 assert.match(nodes.sourceUsageSummary.textContent,/5,5 t\/rok/);
});
test('bill mode shows actual effective fuel price instead of hidden tariff input',()=>{
 const {c,nodes}=setup({mode:'bill',price:.99});c.updateConsumptionSummary('pellet',25300,{total:1925,fixed:0},6361,.16);
 assert.match(nodes.sourcePriceSummary.textContent,/350.*z vyúčtovania/);
});
test('wood units and zero consumption are safe',()=>{
 const {c,nodes}=setup({quantity:0,mode:'bill'});c.updateConsumptionSummary('wood',0,{total:0,fixed:0},0,.16);
 assert.match(nodes.sourceUsageSummary.textContent,/dreva: 0 t\/rok/);assert.ok(!nodes.sourcePriceSummary.textContent.includes('NaN'));
});
test('gas m3 uses the input conversion and the actual price per kWh',()=>{
 const {c,nodes}=setup({unit:'m3'});c.updateConsumptionSummary('gas',10690,{total:1000,fixed:100,rate:.07},3000,.16);
 assert.match(nodes.sourceUsageSummary.textContent,/1\s000 m³\/rok/);assert.match(nodes.sourcePriceSummary.textContent,/0,07.*\/kWh/);
});
test('all inline JavaScript compiles',()=>{for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1])});
