const $=s=>document.querySelector(s);
function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
function notify(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').hidden=true,4000);}
function stamp(){const d=new Date(),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;}
const displayDate=s=>s?s.slice(0,10).split('-').reverse().join('/')+(s.includes(' ')?' '+s.split(' ')[1]:''):'—';
let group='active',current=null,revision='',draft=[],events=[],baseline='';
function dirty(){return JSON.stringify(draft)!==baseline;}
function writable(){return !!current&&poValidationReady(current);}
function counts(list){const done=list.filter(s=>['OK','N/A'].includes(execStatus(s))).length,failed=list.filter(s=>execStatus(s)==='Falhou').length;return {done,failed,total:list.length};}
function setGroup(value){group=value;for(const button of document.querySelectorAll('.po-tabs button')){const active=button.dataset.group===group;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active)$('#poCards').setAttribute('aria-labelledby',button.id);}renderCards();}
function renderCards(){
 const all=productionChanges(),term=$('#poSearch').value.trim().toLocaleLowerCase('pt-BR'),owner=$('#poOwner').value;
 $('#poWaiting').textContent=all.filter(c=>productionState(c).group==='waiting').length;$('#poReady').textContent=all.filter(c=>productionState(c).group==='validate').length;$('#poFinished').textContent=all.filter(c=>productionState(c).group==='finished').length;$('#poFailed').textContent=all.filter(c=>productionState(c).group==='validate'&&(c.cenarios||[]).some(s=>execStatus(s)==='Falhou')).length;
 const people=[...new Set(all.map(c=>c.po).filter(Boolean))].sort();$('#poOwner').replaceChildren(new Option('Todos os POs',''),...people.map(p=>new Option(p,p)));$('#poOwner').value=owner;
 const today=new Date(),dateISO=d=>{const offset=d.getTimezoneOffset();return new Date(d.getTime()-offset*60000).toISOString().slice(0,10);},end=new Date(today);end.setDate(end.getDate()+6);
 const list=all.filter(c=>(group==='active'?productionState(c).group!=='finished':productionState(c).group===group)&&(!owner||c.po===owner)&&(!term||[c.rdm,c.equipe,c.smeTl,c.po,...(c.issueIds||[])].filter(Boolean).some(v=>v.toLocaleLowerCase('pt-BR').includes(term)))&&($('#poDate').value==='all'||($('#poDate').value==='today'?c.dataProducao===dateISO(today):c.dataProducao>=dateISO(today)&&c.dataProducao<=dateISO(end)))).sort((a,b)=>(a.dataProducao||'').localeCompare(b.dataProducao||''));
 const box=$('#poCards');box.replaceChildren();
 for(const change of list){
  const state=productionState(change),progress=counts(change.cenarios||[]),card=el('article','po-card'),head=el('div','po-card-head'),title=el('div');title.append(el('strong','',change.rdm||'GMUD sem número'),el('small','',change.equipe||'Equipe não informada'));head.append(title,el('span','badge '+state.color,state.label));card.append(head);
  const meta=el('div','po-card-meta');for(const [label,value]of [['Subida',`${displayDate(change.dataProducao)} ${change.horario||''}`],['TL',change.smeTl||'Não informado'],['PO',change.po||'Não informado'],['Issues',(change.issueIds||[]).join(', ')||'—']]){const item=el('div');item.append(el('small','',label),el('span','',value));meta.append(item);}card.append(meta);
  const progressBox=el('div','po-card-progress',`${progress.done}/${progress.total} cenários concluídos${progress.failed?' · '+progress.failed+' com falha':''}`),track=el('div','po-progress-track'),fill=el('div');fill.style.width=`${progress.total?100*progress.done/progress.total:0}%`;track.append(fill);progressBox.append(track);card.append(progressBox);
  if(!progress.total&&state.group!=='finished')card.append(el('p','po-card-note','O TL ainda precisa definir os cenários de produção.'));
  const actions=el('div','po-card-actions'),link=el('a','','Ver change ↗');link.href='changes.html?change='+encodeURIComponent(change.id);const button=el('button',state.group==='validate'&&progress.total?'primary':'secondary',state.group==='validate'&&progress.total?(change.validacaoIniciada?'Continuar validação':'Iniciar validação'):'Consultar GMUD');button.type='button';button.onclick=()=>openValidation(change.id);actions.append(link,button);card.append(actions);box.append(card);
 }
 if(!list.length){const empty=el('div','po-empty',all.length?'Nenhuma GMUD corresponde a esta situação e aos filtros.':'Nenhuma GMUD cadastrada. Cadastre e prepare a subida na tela Changes / RDM.');box.append(empty);}
}
function updateHeader(){
 const progress=counts(draft);$('#poProgress').textContent=`${progress.done}/${progress.total} cenários concluídos${progress.failed?' · '+progress.failed+' com falha':''}`;$('#poSavedState').textContent=dirty()?'Alterações não salvas':'Tudo salvo';$('#poSave').disabled=!writable();$('#poFinish').disabled=!writable()||!hoComplete({cenarios:draft});
 const state=productionState(current);$('#poNotice').classList.toggle('failure',progress.failed>0||state.color==='red');$('#poNotice').textContent=!writable()?(current.aceiteProducao?`Validação concluída por ${current.aceiteProducao.por} em ${displayDate(current.aceiteProducao.quando)}.`:state.label+'. Esta GMUD está disponível somente para consulta.'):(progress.failed?'Há falha na validação. Salve o motivo e acione o TL para decisão técnica. O PO não registra rollback nesta tela.':'Subida confirmada. Valide os cenários definidos pelo TL e salve o andamento ou conclua a validação.');
}
function recordStep(sc,stage,value){
 const old=sc.etapas[stage]||'';if(old===value)return;events.push({tipo:'teste_prod',quando:stamp(),cenarioId:sc.id,cenario:sc.nome,etapa:stage,de:old||'Pendente',para:value||'Pendente',motivo:sc.motivosEtapas?.[stage]||''});sc.etapas[stage]=value;delete sc.resultadoProducao;$('#poError').textContent='';
}
function renderScenarios(){
 const box=$('#poScenarios'),scroll=box.scrollTop;box.replaceChildren();updateHeader();
 if(!draft.length)box.append(el('div','po-empty','Nenhum cenário foi definido pelo TL para esta GMUD.'));
 for(const sc of draft){
  const card=el('article','po-scenario'+(execStatus(sc)==='Falhou'?' failed':'')),head=el('div','po-scenario-head'),title=el('div');title.append(el('strong','',sc.nome),el('small','',`Garantia ${sc.tipo.toLowerCase()}${sc.sourceIssueId?' · Issue '+sc.sourceIssueId:''} · ${executionStages(sc).length} etapas do fluxo`));head.append(title,el('span','badge '+scenarioStatusBadge[execStatus(sc)],execStatus(sc)));card.append(head);
  const controls=el('div','po-scenario-controls'),allOK=el('button','secondary','✓ Marcar fluxo como OK');allOK.type='button';allOK.classList.add('po-all-ok');allOK.disabled=!writable()||executionStages(sc).every(stage=>sc.etapas[stage]==='OK');allOK.onclick=()=>{for(const stage of executionStages(sc))recordStep(sc,stage,'OK');renderScenarios();};controls.append(allOK);card.append(controls);
  if(['Falhou','Em execução'].includes(sc.resultadoProducao))card.append(el('p','po-card-note',`Resultado anterior do cenário: ${sc.resultadoProducao}. Identifique a etapa correspondente.`));
  const grid=el('div','po-stage-grid');
  for(const stage of executionStages(sc)){
   const field=el('div','po-stage-field'),label=el('label','',stage),select=el('select');for(const [value,text]of [['','Pendente'],['OK','OK'],['Falhou','Falhou'],['N/A','N/A']])select.append(new Option(text,value));select.value=sc.etapas[stage]||'';select.dataset.result=select.value;select.disabled=!writable();select.setAttribute('aria-label',`${sc.nome}: ${stage}`);select.onchange=()=>{recordStep(sc,stage,select.value);renderScenarios();};label.append(select);field.append(label);
   if(sc.etapas[stage]==='Falhou'||events.some(e=>e.cenarioId===sc.id&&e.etapa===stage&&e.para==='Falhou')){
    const reasonLabel=el('label','po-reason','Motivo da falha'),reason=el('textarea');reason.maxLength=1000;reason.rows=2;reason.value=sc.motivosEtapas[stage]||'';reason.disabled=!writable();reason.setAttribute('aria-label',`Motivo: ${sc.nome}: ${stage}`);reason.placeholder='Descreva o problema nesta etapa';reason.oninput=()=>{sc.motivosEtapas[stage]=reason.value;const matching=events.filter(e=>e.cenarioId===sc.id&&e.etapa===stage&&e.para==='Falhou');for(const e of matching)if(!e.motivo?.trim()||e===matching.at(-1))e.motivo=reason.value;$('#poError').textContent='';updateHeader();};reasonLabel.append(reason);field.append(reasonLabel);
   }
   grid.append(field);
  }
  card.append(grid);box.append(card);
 }
 box.scrollTop=scroll;
}
function renderHistory(){const box=$('#poHistory');box.replaceChildren();for(const ev of (current.historico||[]).slice().reverse())box.append(el('p','',`${displayDate(ev.quando)} · ${ev.por||'Responsável não informado'} · ${ev.nota||ev.tipo}${ev.motivo?' · '+ev.motivo:''}`));if(!box.children.length)box.append(el('p','','Nenhum registro ainda.'));}
function openValidation(id){
 current=productionChanges().find(c=>c.id===id);if(!current)return notify('GMUD não encontrada.');revision=productionRevision(current);draft=structuredClone(current.cenarios||[]);events=[];
 for(const sc of draft){sc.etapas=sc.etapas||{};sc.motivosEtapas=sc.motivosEtapas||{};if(['OK','N/A'].includes(sc.resultadoProducao)){for(const stage of executionStages(sc))sc.etapas[stage]=sc.resultadoProducao;delete sc.resultadoProducao;}}
 baseline=JSON.stringify(draft);$('#poTitle').textContent=current.rdm||'GMUD sem número';$('#poSub').textContent=`${current.equipe||''} · Subida ${displayDate(current.pipeline?.finalizadaEm||current.dataProducao)} · TL: ${current.smeTl||'não informado'}`;$('#poPerson').value=current.aceiteProducao?.por||current.po||'';$('#poPerson').disabled=!writable();$('#poError').textContent='';renderScenarios();renderHistory();$('#poDialog').showModal();
}
function saveValidation(finish){
 $('#poError').textContent='';const person=$('#poPerson').value.trim();if(!person){$('#poError').textContent='Informe o PO responsável pela validação.';return;}
 for(const sc of draft)for(const stage of executionStages(sc))if(sc.etapas[stage]==='Falhou'&&!sc.motivosEtapas[stage]?.trim()){$('#poError').textContent=`Informe o motivo da falha em ${sc.nome} · ${stage}.`;return;}
 for(const event of events)if(event.para==='Falhou'&&!event.motivo?.trim()){$('#poError').textContent=`Informe o motivo da falha registrada em ${event.cenario} · ${event.etapa}.`;return;}
 const result=updateProductionChange(current.id,revision,change=>{
  if(!poValidationReady(change))return 'A validação só pode ser alterada após a confirmação da subida e antes do aceite final.';
  if(finish&&!hoComplete({cenarios:draft}))return 'Conclua todos os cenários com OK ou N/A antes de finalizar.';
  change.historico=change.historico||[];
  if(!change.validacaoIniciada){change.validacaoIniciada={por:person,quando:stamp()};change.historico.push({tipo:'validacao_iniciada',quando:stamp(),por:person,nota:'Validação de produção iniciada pelo PO.'});}
  for(const event of events)change.historico.push({...event,por:person,nota:`${event.cenario} · ${event.etapa}: ${event.de} → ${event.para}`});
  for(const sc of draft){const previous=(change.cenarios||[]).find(s=>s.id===sc.id);for(const [stage,reason]of Object.entries(sc.motivosEtapas))if(reason!==previous?.motivosEtapas?.[stage]&&!events.some(e=>e.cenarioId===sc.id&&e.etapa===stage&&e.para==='Falhou'))change.historico.push({tipo:'teste_prod',quando:stamp(),por:person,cenarioId:sc.id,etapa:stage,motivo:reason,nota:`Motivo atualizado · ${sc.nome} · ${stage}`});}
  change.cenarios=structuredClone(draft);change.po=change.po||person;
  if(finish){change.aceiteProducao={por:person,quando:stamp()};change.historico.push({tipo:'validacao_concluida',quando:stamp(),por:person,nota:'Todos os cenários de produção concluídos com OK ou N/A.'});}
 });
 if(!result.ok){$('#poError').textContent=result.error;return;}
 current=result.change;revision=productionRevision(current);events=[];baseline=JSON.stringify(draft);renderCards();renderHistory();renderScenarios();$('#poPerson').disabled=!writable();notify(finish?'Validação concluída. A GMUD pode ser encerrada pelo TL.':'Andamento salvo.');
}
$('#poSave').onclick=()=>saveValidation(false);$('#poFinish').onclick=()=>saveValidation(true);
$('#poClose').onclick=()=>{if(dirty()){$('#poError').textContent='Há alterações não salvas. Salve o andamento antes de fechar ou use Descartar alterações.';if(!$('#poDiscard')){const button=el('button','secondary','Descartar alterações');button.id='poDiscard';button.type='button';button.onclick=()=>{baseline=JSON.stringify(draft);$('#poDialog').close();button.remove();};$('#poError').append(button);}return;}$('#poDialog').close();};
$('#poDialog').addEventListener('cancel',e=>{if(dirty()){e.preventDefault();$('#poClose').click();}});
$('#poDialog').addEventListener('close',()=>{const params=new URLSearchParams(location.search);params.delete('change');history.replaceState(null,'',location.pathname+(params.size?'?'+params:''));$('#poDiscard')?.remove();});
for(const id of ['#poSearch','#poOwner','#poDate'])$(id).addEventListener('input',renderCards);$('#poRefresh').onclick=renderCards;
for(const button of document.querySelectorAll('.po-tabs button')){button.onclick=()=>setGroup(button.dataset.group);button.onkeydown=e=>{const tabs=[...document.querySelectorAll('.po-tabs button')];let i=tabs.indexOf(button);if(e.key==='ArrowRight')i=(i+1)%tabs.length;else if(e.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;else return;e.preventDefault();setGroup(tabs[i].dataset.group);tabs[i].focus();};}
window.addEventListener('storage',e=>{if(e.key===productionChangesKey){renderCards();if($('#poDialog').open){const latest=productionChanges().find(c=>c.id===current.id);if(!latest||productionRevision(latest)!==revision)$('#poError').textContent='Esta GMUD foi alterada em outra tela. Feche e abra novamente antes de continuar.';}}});
window.addEventListener('beforeunload',e=>{if($('#poDialog').open&&dirty()){e.preventDefault();e.returnValue='';}});
renderCards();const requested=new URLSearchParams(location.search).get('change');if(requested)openValidation(requested);
