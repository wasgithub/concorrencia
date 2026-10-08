// Página Testes: catálogo de casos + etapas do fluxo + dimensões do montador.
// Usa os stores compartilhados de tests-store.js (scenarioCatalog, testStages, scenarioDims).
const $=s=>document.querySelector(s);
function element(tag,className,text){ const el=document.createElement(tag); if(className)el.className=className; if(text!==undefined)el.textContent=text; return el; }
function notify(message){ $('#toast').textContent=message; $('#toast').hidden=false; clearTimeout(notify.timer); notify.timer=setTimeout(()=>$('#toast').hidden=true,4000); }
function tipoBadge(t){ return element('span','badge '+(t==='Automática'?'blue':t==='Manual'?'gray':'env'), t==='Automática'?'Garantia automática':t==='Manual'?'Garantia manual':'Garantia N/A'); }

// ---- Catálogo ---------------------------------------------------------------
function render(){
 const coberturas=[...new Set(scenarioCatalog.map(c=>c.cobertura))].sort();
 $('#statCases').textContent=scenarioCatalog.length;
 $('#statActive').textContent=scenarioCatalog.filter(c=>c.ativo).length;
 $('#statCoverage').textContent=coberturas.length;
 $('#statStages').textContent=testStages.length;
 const covSel=$('#coverageFilter'), keep=covSel.value;
 covSel.replaceChildren(new Option('Todas as coberturas',''),...coberturas.map(c=>new Option(c,c))); covSel.value=keep;
 $('#coverageList').replaceChildren(...[...new Set([...coberturas,...coberturaOptions])].map(c=>{ const o=document.createElement('option'); o.value=c; return o; }));
 const term=$('#caseSearch').value.trim().toLocaleLowerCase('pt-BR');
 const cov=$('#coverageFilter').value, tipo=$('#tipoFilter').value, onlyActive=$('#onlyActive').checked;
 const rows=$('#caseRows'); rows.replaceChildren();
 const filtered=scenarioCatalog.filter(c=>(!onlyActive||c.ativo)&&(!cov||c.cobertura===cov)&&(!tipo||c.tipo===tipo)&&(!term||[c.nome,c.cobertura,c.etapaAlvo,...normalizeTestComponents(c.componentes)].some(v=>(v||'').toLocaleLowerCase('pt-BR').includes(term))));
 for(const caso of filtered){
  const tr=document.createElement('tr'); if(!caso.ativo) tr.className='row-inactive';
  const nameCell=document.createElement('td'); nameCell.className='case-name'; nameCell.textContent=caso.nome; tr.append(nameCell);
  const tc=document.createElement('td'); tc.append(tipoBadge(caso.tipo)); tr.append(tc);
  const alvo=document.createElement('td'); alvo.append(element('span','badge env',caso.etapaAlvo)); tr.append(alvo);
  const cob=document.createElement('td'); cob.append(element('span','badge blue',caso.cobertura)); tr.append(cob);
  const components=document.createElement('td'); components.textContent=normalizeTestComponents(caso.componentes).join(', ')||'Sem vínculo'; tr.append(components);
  const st=document.createElement('td'); st.append(element('span','badge '+(caso.ativo?'green':'gray'), caso.ativo?'Ativo':'Inativo')); tr.append(st);
  const acts=document.createElement('td'); acts.className='agenda-actions';
  const ed=element('button','secondary small','Editar'); ed.type='button'; ed.onclick=()=>openCase(caso); acts.append(ed);
  const tg=element('button','secondary small',caso.ativo?'Desativar':'Ativar'); tg.type='button'; tg.onclick=()=>{ caso.ativo=!caso.ativo; persistScenarioCatalog(); render(); }; acts.append(tg);
  const rm=element('button','secondary small danger','Remover'); rm.type='button'; rm.onclick=()=>{ scenarioCatalog=scenarioCatalog.filter(x=>x.id!==caso.id); persistScenarioCatalog(); render(); notify('Caso removido.'); }; acts.append(rm);
  tr.append(acts); rows.append(tr);
 }
 $('#caseEmpty').hidden=filtered.length>0;
 $('#caseCount').textContent=`${filtered.length} de ${scenarioCatalog.length} casos`;
 renderStages(); renderDims(); renderTrails();
}

// ---- Modal de caso ----------------------------------------------------------
let editingCaseId=null;
function openCase(caso){
 editingCaseId=caso?caso.id:null;
 $('#caseEyebrow').textContent=caso?'EDITAR CASO':'NOVO CASO';
 const f=$('#caseForm'), el=f.elements; delete f.dataset.nomeEdited;
 el.tipo.replaceChildren(...scenarioTipoOptions.map(o=>new Option(o,o)));
 el.etapaAlvo.replaceChildren(...testStages.map(s=>new Option(s,s)));
 el.nome.value=caso?.nome||''; el.tipo.value=caso?.tipo||'Automática'; el.etapaAlvo.value=caso?.etapaAlvo||lastStage(); el.cobertura.value=caso?.cobertura||'Regressivo padrão'; el.ativo.checked=caso?caso.ativo:true;
 el.componentes.value=normalizeTestComponents(caso?.componentes).join(', ');
 const components=normalizeTestComponents([...issues.flatMap(i=>i.servicos),...scenarioCatalog.flatMap(c=>normalizeTestComponents(c.componentes))]).sort(); $('#testComponentList').replaceChildren(...components.map(c=>new Option(c,c)));
 if(caso) f.dataset.nomeEdited='1';
 renderCaseBuilder(caso); $('#caseError').textContent=''; $('#caseDialog').showModal();
}
function renderCaseBuilder(caso){
 const box=$('#caseBuilder');box.replaceChildren();const f=$('#caseForm');const sel=caseDimensions(caso||{nome:''});f.scenarioDimensions=sel;
 for(const d of scenarioDims){
  const label=element('label','',d.nome==='Tipo'?'Pessoa (PF/PJ)':d.nome),select=element('select');select.append(new Option('Não informado',''));
  const options=[...new Set([...d.opcoes,...(sel[d.nome]?[sel[d.nome]]:[])])];for(const o of options)select.append(new Option(o,o));select.value=sel[d.nome]||'';
  select.onchange=()=>{sel[d.nome]=select.value;const name=composeScenarioName(sel);if(name){f.elements.nome.value=name;delete f.dataset.nomeEdited;}};label.append(select);box.append(label);
 }
}
$('#caseForm').addEventListener('input',e=>{ if(e.target.name==='nome') $('#caseForm').dataset.nomeEdited='1'; });
$('#caseForm').onsubmit=e=>{
 e.preventDefault(); const el=e.target.elements; const nome=el.nome.value.trim();
 if(!nome){ $('#caseError').textContent='Informe o nome do fluxo (monte pelas dimensões ou digite).'; return; }
 const rec={nome, dimensoes:{...e.target.scenarioDimensions}, componentes:normalizeTestComponents(el.componentes.value), tipo:el.tipo.value, etapaAlvo:el.etapaAlvo.value, cobertura:el.cobertura.value.trim()||'Regressivo padrão', ativo:el.ativo.checked};
 if(editingCaseId){ const c=scenarioCatalog.find(x=>x.id===editingCaseId); if(c) Object.assign(c,rec); }
 else scenarioCatalog.push({id:nextCatalogId(), ...rec});
 persistScenarioCatalog(); $('#caseDialog').close(); render(); notify('Caso salvo no catálogo.');
};
$('#cancelCase').onclick=$('#closeCase').onclick=()=>$('#caseDialog').close();
$('#newCase').onclick=()=>openCase(null);

// ---- Etapas do fluxo --------------------------------------------------------
function renderStages(){
 const box=$('#stagesList'); box.replaceChildren();
 testStages.forEach((stg,i)=>{
  const row=element('div','stage-item');
  row.append(element('span','stage-order',String(i+1)), element('span','stage-name-full',stg));
  const acts=element('div','stage-acts');
  const up=element('button','secondary small','↑'); up.type='button'; up.disabled=i===0; up.onclick=()=>{ [testStages[i-1],testStages[i]]=[testStages[i],testStages[i-1]]; persistTestStages(); render(); };
  const down=element('button','secondary small','↓'); down.type='button'; down.disabled=i===testStages.length-1; down.onclick=()=>{ [testStages[i+1],testStages[i]]=[testStages[i],testStages[i+1]]; persistTestStages(); render(); };
  const rm=element('button','secondary small danger','×'); rm.type='button'; rm.title='Remover etapa'; rm.onclick=()=>{ testStages.splice(i,1); persistTestStages(); render(); };
  acts.append(up,down,rm); row.append(acts); box.append(row);
 });
}
$('#stageAddForm').onsubmit=e=>{ e.preventDefault(); const inp=$('#stageAddForm').elements.nome; const v=inp.value.trim(); if(v && !testStages.includes(v)){ testStages.push(v); persistTestStages(); inp.value=''; render(); } };

// ---- Dimensões do montador --------------------------------------------------
function renderDims(){
 const body=$('#dimsBody'); body.replaceChildren();
 scenarioDims.forEach((d,di)=>{
  const sec=element('section','dim-card');
  const head=element('div','dim-head'); head.append(element('strong','',d.nome));
  const del=element('button','secondary small danger','Remover'); del.type='button'; del.onclick=()=>{ scenarioDims.splice(di,1); persistScenarioDims(); render(); }; head.append(del);
  sec.append(head);
  const chips=element('div','dim-chips');
  d.opcoes.forEach((o,oi)=>{ const chip=element('span','dim-chip',o); const x=element('button','chip-x','×'); x.type='button'; x.onclick=()=>{ d.opcoes.splice(oi,1); persistScenarioDims(); render(); }; chip.append(x); chips.append(chip); });
  sec.append(chips);
  const addForm=element('form','dim-add'); const inp=element('input'); inp.placeholder='Nova opção'; inp.maxLength=60; const btn=element('button','secondary small','Adicionar'); btn.type='submit'; addForm.append(inp,btn);
  addForm.onsubmit=ev=>{ ev.preventDefault(); const v=inp.value.trim(); if(v && !d.opcoes.includes(v)){ d.opcoes.push(v); persistScenarioDims(); render(); } };
  sec.append(addForm); body.append(sec);
 });
}
$('#dimAddForm').onsubmit=e=>{ e.preventDefault(); const inp=$('#dimAddForm').elements.nome; const v=inp.value.trim(); if(v && !scenarioDims.some(d=>d.nome===v)){ scenarioDims.push({nome:v,opcoes:[]}); persistScenarioDims(); inp.value=''; render(); } };

['#caseSearch','#coverageFilter','#tipoFilter','#onlyActive'].forEach(s=>$(s).addEventListener('input',render));


let editingTrailId=null;
function renderTrails(){
 const box=$('#trailList'); box.replaceChildren();
 for(const trail of testTrails()){
  const row=element('div','stage-item'); row.append(element('strong','',trail.nome),element('span','',`${trail.casoIds.length} cenários`));
  const edit=element('button','secondary','Editar'); edit.type='button'; edit.onclick=()=>{ editingTrailId=trail.id; $('#trailForm').elements.nome.value=trail.nome; renderTrailCases(trail.casoIds); };
  const remove=element('button','secondary danger','Remover'); remove.type='button'; remove.onclick=()=>{ if(!saveTestData(testTrailsKey,testTrails().filter(t=>t.id!==trail.id))) return notify('Não foi possível salvar.'); if(editingTrailId===trail.id) resetTrail(); renderTrails(); }; row.append(edit,remove); box.append(row);
 }
 if(!box.children.length) box.append(element('p','','Nenhuma trilha cadastrada. Selecione cenários abaixo para criar uma.'));
 const selected=[...$('#trailCases').querySelectorAll('input:checked')].map(c=>c.value); renderTrailCases(selected);
}
function renderTrailCases(ids=[]){ const box=$('#trailCases'); box.replaceChildren(); for(const caso of scenarioCatalog.filter(c=>c.ativo||ids.includes(c.id))){ const label=element('label','issue-check'); const cb=element('input'); cb.type='checkbox'; cb.value=caso.id; cb.checked=ids.includes(caso.id); const info=element('span','issue-check-info'); info.append(element('strong','',caso.nome),element('small','','Testar até: '+caso.etapaAlvo)); label.append(cb,info); box.append(label); } }
function resetTrail(){ editingTrailId=null; $('#trailForm').reset(); $('#trailError').textContent=''; renderTrailCases(); }
$('#cancelTrail').onclick=resetTrail;
$('#trailForm').onsubmit=e=>{ e.preventDefault(); const nome=e.target.elements.nome.value.trim(), casoIds=[...$('#trailCases').querySelectorAll('input:checked')].map(c=>c.value); if(!nome||!casoIds.length){ $('#trailError').textContent='Informe o nome e selecione pelo menos um cenário.'; return; } const trails=testTrails(), item={id:editingTrailId||'trail-'+Date.now(),nome,casoIds}; const i=trails.findIndex(t=>t.id===editingTrailId); if(i<0) trails.push(item); else trails[i]=item; if(!saveTestData(testTrailsKey,trails)) return notify('Não foi possível salvar.'); resetTrail(); renderTrails(); notify('Trilha salva.'); };
render();
