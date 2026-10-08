const $=s=>document.querySelector(s);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function notify(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').hidden=true,4000);}
const issueId=new URLSearchParams(location.search).get('issue');
const issue=issues.find(i=>i.idIssue===issueId);
let plan=structuredClone(hoPlans()[issueId]||{cenarios:[],historico:[]});
let baseline=JSON.stringify(plan.cenarios);
let pickerTab='catalog';
const selectedCases=new Set();
const expandedCases=new Set();
const inPlan=id=>plan.cenarios.some(s=>s.casoId===id);
function renderSaveState(){const dirty=JSON.stringify(plan.cenarios)!==baseline;$('#hoSaveState').textContent=dirty?'Alterações não salvas':'Tudo salvo';$('#hoSaveState').classList.toggle('ho-save-dirty',dirty);}
function changed(){
 if(plan.aceite){plan.historico=plan.historico||[];plan.historico.push({quando:new Date().toISOString(),texto:'Aceite invalidado por alteração no plano ou nos resultados.'});delete plan.aceite;}
 renderAcceptance();renderSaveState();
}
function save(){
 if(JSON.stringify(plan.cenarios)!==baseline)changed();
 const all=hoPlans();all[issueId]=plan;
 if(!saveTestData(hoPlansKey,all)){notify('Não foi possível salvar. Tente novamente.');return false;}
 baseline=JSON.stringify(plan.cenarios);renderSaveState();return true;
}
function add(casos){
 let count=0;
 for(const c of casos){if(!inPlan(c.id)){plan.cenarios.push(newTestExecution(c));count++;}}
 if(count){changed();render();notify(`${count} cenário(s) adicionado(s). Salve o plano para guardar as alterações.`);}
 return count;
}
function renderAcceptance(){
 $('#hoAcceptance').textContent=plan.aceite?`Aprovada por ${plan.aceite.por} em ${new Date(plan.aceite.quando).toLocaleString('pt-BR')} · ${plan.aceite.nota}`:'Revise os resultados e registre a conclusão da homologação. Todos os cenários precisam estar OK ou N/A.';
 $('#hoAcceptanceBadge').textContent=plan.aceite?'Homologação aprovada':hoComplete(plan)?'Pronto para validar':'Aguardando conclusão';
 $('#hoAcceptanceBadge').className='badge '+(plan.aceite?'green':hoComplete(plan)?'blue':'orange');
 const box=$('#hoHistory');box.replaceChildren();
 for(const h of (plan.historico||[]).slice().reverse())box.append(el('p','',`${new Date(h.quando).toLocaleString('pt-BR')} · ${h.texto}`));
 if(!box.children.length)box.append(el('p','','Nenhum aceite registrado ainda.'));
}
function updateProgress(){
 const statuses=plan.cenarios.map(execStatus),done=statuses.filter(s=>s==='OK'||s==='N/A').length,failed=statuses.filter(s=>s==='Falhou').length;
 $('#hoTotal').textContent=statuses.length;$('#hoDone').textContent=done;$('#hoFailed').textContent=failed;$('#hoPending').textContent=statuses.length-done-failed;
 $('#hoSummary').textContent=statuses.length?`${done} de ${statuses.length} cenários concluídos · Abra um cenário para registrar os resultados por etapa.`:'Selecione cenários do catálogo ou uma trilha para começar a homologação.';
 $('#hoProgress').style.width=`${statuses.length?100*done/statuses.length:0}%`;
}
function render(){
 renderSaveState();renderAcceptance();updateProgress();const box=$('#hoExecutions');box.replaceChildren();
 if(!plan.cenarios.length){
  const empty=el('div','ho-empty');empty.append(el('div','ho-empty-icon','▤'),el('h3','','Monte o plano de homologação'),el('p','','Escolha os cenários que fazem sentido para esta entrega. As sugestões consideram os componentes alterados da issue.'));
  const button=el('button','primary','Selecionar cenários');button.type='button';button.onclick=openPicker;empty.append(button);box.append(empty);
 }
 plan.cenarios.forEach((sc,index)=>{
  const card=el('details','ho-case');card.dataset.execution=sc.id;card.open=expandedCases.has(sc.id);
  card.ontoggle=()=>{if(card.open)expandedCases.add(sc.id);else expandedCases.delete(sc.id);};
  const head=el('summary'),title=el('div','ho-case-title'),status=execStatus(sc),finished=executionStages(sc).filter(s=>['OK','N/A'].includes(sc.etapas[s])).length;
  title.append(el('strong','',sc.nome),el('small','',`Garantia ${sc.tipo.toLowerCase()} · Até ${sc.etapaAlvo} · ${finished}/${executionStages(sc).length} etapas concluídas`));
  head.append(el('span','ho-case-number',String(index+1).padStart(2,'0')),title,el('span','badge '+scenarioStatusBadge[status],status),el('span','ho-chevron','⌄'));
  const body=el('div','ho-case-body'),grid=el('div','ho-stage-grid'),stageHeading=el('div','ho-stage-heading'),fillOK=el('button','secondary ho-fill-ok','✓ Marcar fluxo como OK');
  fillOK.type='button';fillOK.setAttribute('aria-label',`Marcar todas as etapas de ${sc.nome} como OK`);fillOK.title='Marca todas as etapas aplicáveis como OK, substituindo resultados anteriores.';
  function updateScenarioResults(){
   updateProgress();const result=execStatus(sc);head.querySelector('.badge').textContent=result;head.querySelector('.badge').className='badge '+scenarioStatusBadge[result];
   title.querySelector('small').textContent=`Garantia ${sc.tipo.toLowerCase()} · Até ${sc.etapaAlvo} · ${executionStages(sc).filter(s=>['OK','N/A'].includes(sc.etapas[s])).length}/${executionStages(sc).length} etapas concluídas`;
   fillOK.disabled=!executionStages(sc).length||executionStages(sc).every(s=>sc.etapas[s]==='OK');
  }
  fillOK.onclick=()=>{
   for(const stage of executionStages(sc))sc.etapas[stage]='OK';
   for(const select of grid.querySelectorAll('select')){select.value='OK';select.dataset.result='OK';}
   changed();updateScenarioResults();notify('Fluxo marcado como OK. Salve o plano e a execução para guardar as alterações.');
  };
  stageHeading.append(el('h3','','RESULTADOS POR ETAPA'),fillOK);body.append(stageHeading);
  for(const stage of executionStages(sc)){
   const label=el('label','',stage),select=el('select');select.setAttribute('aria-label',`${sc.nome}: ${stage}`);
   for(const [value,text] of [['','Pendente'],['OK','OK'],['Falhou','Falhou'],['N/A','N/A']])select.append(new Option(text,value));
   select.value=sc.etapas[stage]||'';select.dataset.result=select.value;
   select.onchange=()=>{sc.etapas[stage]=select.value;select.dataset.result=select.value;changed();updateScenarioResults();};
   label.append(select);grid.append(label);
  }
  updateScenarioResults();body.append(grid);const meta=el('div','ho-meta');
  for(const [key,labelText,placeholder] of [['resp','Responsável pela execução','Nome de quem executou'],['jira','Jira / evidência','Link ou ID da evidência'],['pedido','Pedido gerado','Número do pedido']]){
   const label=el('label','',labelText),input=el('input');input.value=sc[key]||'';input.maxLength=300;input.placeholder=placeholder;input.oninput=()=>{sc[key]=input.value;changed();};label.append(input);meta.append(label);
  }
  body.append(meta);const footer=el('div','ho-case-footer'),remove=el('button','secondary','Remover do plano');remove.type='button';remove.setAttribute('aria-label',`Remover ${sc.nome} do plano`);
  remove.onclick=()=>{plan.cenarios=plan.cenarios.filter(s=>s.id!==sc.id);expandedCases.delete(sc.id);changed();render();};footer.append(remove);body.append(footer);card.append(head,body);box.append(card);
 });
}
function choiceTable(cases,suggested=false){
 const table=el('table'),head=el('thead'),header=el('tr');
 for(const title of ['','CENÁRIO','MODALIDADE','TESTAR ATÉ']){const th=el('th','',title);th.scope='col';header.append(th);}head.append(header);table.append(head);const body=el('tbody');
 for(const caso of cases){
  const row=el('tr'),checkCell=el('td'),cb=el('input'),name=el('td'),guarantee=el('td'),target=el('td');const included=inPlan(caso.id);
  cb.type='checkbox';cb.value=caso.id;cb.disabled=included;cb.checked=included||selectedCases.has(caso.id);cb.setAttribute('aria-label',`Selecionar ${caso.nome}`);
  row.className=included?'ho-in-plan':cb.checked?'ho-selected':'';
  name.append(el('strong','',caso.nome));
  const reasons=suggestedTests(issue).find(s=>s.caso.id===caso.id)?.componentes||[];
  name.append(el('small','',suggested?`Cobre: ${reasons.join(', ')}`:caso.cobertura||'Sem cobertura definida'));
  if(included)name.append(el('span','badge green','Já no plano'));
  guarantee.append(el('span','badge '+(caso.tipo==='Automática'?'blue':'env'),caso.tipo));target.textContent=caso.etapaAlvo;
  cb.onchange=()=>{
   if(cb.checked)selectedCases.add(caso.id);else selectedCases.delete(caso.id);
   for(const input of document.querySelectorAll('#hoCatalog input[type=checkbox],#hoSuggestions input[type=checkbox]')){
    if(input.value===caso.id&&!input.disabled){input.checked=selectedCases.has(caso.id);input.closest('tr').classList.toggle('ho-selected',input.checked);}
   }
   renderSelection();
  };
  checkCell.append(cb);row.append(checkCell,name,guarantee,target);body.append(row);
 }
 table.append(body);return table;
}
function pickerFilters(){return {term:$('#hoSearch').value,coverage:$('#hoCoverage').value,tipo:$('#hoTipo').value,etapa:$('#hoEtapa').value,dimensoes:Object.fromEntries([...document.querySelectorAll('#hoDimensionFilters select')].map(s=>[s.dataset.dimension,s.value]))};}
function filteredCases(cases){return cases.filter(c=>matchesCaseFilters(c,pickerFilters()));}
function updateFilterCount(){
 const total=pickerTab==='suggested'?suggestedTests(issue).map(s=>s.caso):scenarioCatalog.filter(c=>c.ativo);
 $('#hoFilterCount').textContent=`${filteredCases(total).length} de ${total.length} cenários`;
 const f=pickerFilters();$('#hoClearFilters').disabled=!f.term&&!f.coverage&&!f.tipo&&!f.etapa&&!Object.values(f.dimensoes).some(Boolean);
}
function renderCatalog(){
 const box=$('#hoCatalog');box.replaceChildren();const cases=filteredCases(scenarioCatalog.filter(c=>c.ativo));
 if(cases.length)box.append(choiceTable(cases));else box.append(el('div','ho-empty','Nenhum cenário encontrado. Tente outros filtros.'));
 updateFilterCount();
}
function refreshFilters(){renderCatalog();renderSuggestions();updateFilterCount();}
function clearFilters(){for(const s of document.querySelectorAll('#hoPickerFilters select'))s.value='';$('#hoSearch').value='';refreshFilters();}
function setupDimensionFilters(){
 const box=$('#hoDimensionFilters');
 for(const dim of scenarioDims){
  const label=el('label','',dim.nome==='Tipo'?'Pessoa (PF/PJ)':dim.nome),select=el('select');select.dataset.dimension=dim.nome;select.setAttribute('aria-label',`Filtrar ${dim.nome==='Tipo'?'pessoa':dim.nome.toLowerCase()}`);select.append(new Option('Todos',''));
  const values=[...new Set(scenarioCatalog.filter(c=>c.ativo).map(c=>caseDimensions(c)[dim.nome]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  for(const value of values)select.append(new Option(value,value));if(scenarioCatalog.some(c=>c.ativo&&!caseDimensions(c)[dim.nome]))select.append(new Option('Não informado','__missing__'));
  select.oninput=refreshFilters;label.append(select);box.append(label);
 }
}
function renderSuggestions(){
 const suggestions=suggestedTests(issue),box=$('#hoSuggestions');box.replaceChildren();
 const uncovered=normalizeTestComponents(issue.servicos).filter(c=>!suggestions.some(s=>s.componentes.includes(c)));
 $('#suggestionCount').textContent=suggestions.length;
 $('#hoSuggestionSummary').textContent=uncovered.length?`Sem cobertura cadastrada para: ${uncovered.join(', ')}. Você pode complementar a seleção pelo catálogo.`:'Confira os cenários relacionados e selecione os que se aplicam à entrega.';
 if(suggestions.length){const cases=filteredCases(suggestions.map(s=>s.caso));if(cases.length)box.append(choiceTable(cases,true));else box.append(el('div','ho-empty','Nenhuma sugestão corresponde aos filtros. Limpe os filtros para ver todas.'));}
 else{const empty=el('div','ho-empty');empty.append(el('div','ho-empty-icon','✧'),el('h3','','Ainda não há sugestões para estes componentes'),el('p','','Vincule componentes aos cenários no catálogo para receber indicações. Você já pode escolher os testes manualmente.'));const button=el('button','secondary','Explorar catálogo');button.type='button';button.onclick=()=>setPickerTab('catalog');empty.append(button);box.append(empty);}
}
function renderSelection(){
 const trail=testTrails().find(t=>t.id===$('#hoTrail').value),available=trail?trail.casoIds.map(id=>scenarioCatalog.find(c=>c.id===id&&c.ativo)).filter(c=>c&&!inPlan(c.id)):[];
 const count=pickerTab==='trails'?available.length:selectedCases.size;
 $('#hoSelectedCount').textContent=`${count} cenário${count===1?'':'s'} selecionado${count===1?'':'s'}`;
 $('#addCases').disabled=!selectedCases.size;$('#addSuggested').disabled=!selectedCases.size;$('#applyTrail').disabled=!available.length;
 $('#hoSelectionHint').textContent=pickerTab==='trails'?'Somente cenários ativos que ainda não estão no plano serão adicionados.':'A seleção é mantida ao buscar, filtrar ou trocar de aba.';
}
function renderTrail(){
 const box=$('#hoTrailPreview');box.replaceChildren();const trail=testTrails().find(t=>t.id===$('#hoTrail').value);
 if(!trail){box.append(el('div','ho-empty',testTrails().length?'Escolha uma trilha para conferir os cenários antes de adicionar.':'Nenhuma trilha cadastrada. Crie uma na tela Testes para reutilizar conjuntos de cenários.'));renderSelection();return;}
 const cases=trail.casoIds.map(id=>scenarioCatalog.find(c=>c.id===id&&c.ativo)).filter(Boolean);box.append(el('p','ho-trail-summary',`${cases.length} cenário(s) ativo(s) · ${trail.casoIds.length-cases.length} inativo(s) ou removido(s)`));
 const list=el('ul','ho-trail-list');for(const c of cases){const item=el('li');item.append(el('span','',inPlan(c.id)?'✓':'＋'),el('span','',c.nome));if(inPlan(c.id))item.append(el('span','badge green','Já no plano'));list.append(item);}box.append(list);renderSelection();
}
function setPickerTab(tab){
 pickerTab=tab;$('#hoPickerFilters').hidden=tab==='trails';
 for(const button of document.querySelectorAll('.ho-tabs button')){const active=button.dataset.tab===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
 $('#paneSuggested').hidden=tab!=='suggested';$('#paneCatalog').hidden=tab!=='catalog';$('#paneTrails').hidden=tab!=='trails';
 $('#addSuggested').hidden=tab!=='suggested';$('#addCases').hidden=tab!=='catalog';$('#applyTrail').hidden=tab!=='trails';renderSelection();updateFilterCount();
}
function openPicker(){
 selectedCases.clear();clearFilters();renderTrail();setPickerTab(suggestedTests(issue).length?'suggested':'catalog');$('#hoPicker').showModal();
}
function addSelection(){const cases=[...selectedCases].map(id=>scenarioCatalog.find(c=>c.id===id&&c.ativo)).filter(Boolean);add(cases);selectedCases.clear();$('#hoPicker').close();}
if(!issue){$('#hoTitle').textContent='Issue não encontrada';for(const section of document.querySelectorAll('main > section'))section.hidden=true;$('.ho-context').hidden=true;$('#openPicker').disabled=true;$('#openAvulso').disabled=true;$('#saveHO').disabled=true;}
else{
 $('#hoTitle').textContent=`Homologação · ${issue.idIssue}`;$('#hoDescription').textContent=`${issue.descricao} · ${issue.squad}`;
 $('#hoComponents').replaceChildren(...normalizeTestComponents(issue.servicos).map(c=>el('span','',c)));
 $('#catalogCount').textContent=scenarioCatalog.filter(c=>c.ativo).length;$('#trailCount').textContent=testTrails().length;
 $('#hoCoverage').append(...[...new Set(scenarioCatalog.filter(c=>c.ativo).map(c=>c.cobertura).filter(Boolean))].sort().map(c=>new Option(c,c)));
 setupDimensionFilters();$('#hoEtapa').append(...[...new Set([...testStages,...scenarioCatalog.filter(c=>c.ativo).map(c=>c.etapaAlvo)])].filter(Boolean).map(s=>new Option(s,s)));$('#hoClearFilters').onclick=clearFilters;
 $('#hoTrail').append(new Option('Selecione uma trilha',''),...testTrails().map(t=>new Option(t.nome,t.id)));$('#hoTrail').onchange=renderTrail;
 $('#hoAvulso').elements.alvo.append(...testStages.map(s=>new Option(s,s)));$('#hoAvulso').elements.alvo.value=lastStage();
 $('#openPicker').onclick=openPicker;$('#closePicker').onclick=$('#cancelPicker').onclick=()=>$('#hoPicker').close();
 for(const button of document.querySelectorAll('.ho-tabs button')){button.onclick=()=>setPickerTab(button.dataset.tab);button.onkeydown=e=>{const tabs=[...document.querySelectorAll('.ho-tabs button')];let index=tabs.indexOf(button);if(e.key==='ArrowRight')index=(index+1)%tabs.length;else if(e.key==='ArrowLeft')index=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=tabs.length-1;else return;e.preventDefault();setPickerTab(tabs[index].dataset.tab);tabs[index].focus();};}
 for(const id of ['#hoSearch','#hoCoverage','#hoTipo','#hoEtapa'])$(id).addEventListener('input',refreshFilters);
 $('#addSuggested').onclick=$('#addCases').onclick=addSelection;
 $('#applyTrail').onclick=()=>{const t=testTrails().find(t=>t.id===$('#hoTrail').value);if(!t)return;const cases=t.casoIds.map(id=>scenarioCatalog.find(c=>c.id===id&&c.ativo)).filter(Boolean);add(cases);$('#hoPicker').close();};
 $('#openAvulso').onclick=()=>$('#hoAvulsoDialog').showModal();$('#closeAvulso').onclick=$('#cancelAvulso').onclick=()=>$('#hoAvulsoDialog').close();
 $('#hoAvulso').onsubmit=e=>{e.preventDefault();const f=e.target.elements,nome=f.nome.value.trim();if(!nome||!f.alvo.value)return;const sc=newTestExecution({id:null,nome,tipo:f.tipo.value,etapaAlvo:f.alvo.value});plan.cenarios.push(sc);expandedCases.add(sc.id);changed();e.target.reset();f.alvo.value=lastStage();render();$('#hoAvulsoDialog').close();notify('Cenário avulso adicionado. Salve o plano para guardar as alterações.');};
 $('#saveHO').onclick=()=>{if(save())notify('Plano e execução de homologação salvos.');};
 $('#hoApprove').onsubmit=e=>{e.preventDefault();$('#hoError').textContent='';if(!hoComplete(plan)){$('#hoError').textContent='Conclua os cenários: existem testes pendentes ou falhando.';return;}const por=e.target.elements.por.value.trim(),nota=e.target.elements.nota.value.trim();if(!por||!nota){$('#hoError').textContent='Informe responsável e parecer.';return;}if(!save())return;plan.aceite={por,nota,quando:new Date().toISOString()};plan.historico=plan.historico||[];plan.historico.push({quando:plan.aceite.quando,texto:`Homologação aprovada por ${por}: ${nota}`});if(save()){renderAcceptance();notify('Aceite de homologação registrado.');}};
 window.addEventListener('beforeunload',e=>{if(JSON.stringify(plan.cenarios)!==baseline){e.preventDefault();e.returnValue='';}});render();
}
