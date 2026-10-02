const $ = s => document.querySelector(s);
const labels = {homologacao:'Homologação',efemero:'Efêmero','homologacao 2':'Homologação 2'};
const date = value => value ? value.split('-').reverse().join('/') : '—';
function status(issue) { const today = new Date(); const now = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`; return issue.dataProducao <= now ? 'Em produção' : issue.dataInicialHomologacao > now ? 'Planejada' : issue.dataFinalHomologacao < now ? 'Aguardando produção' : 'Em homologação'; }
function cell(tr, value, className) { const td = document.createElement('td'); td.textContent=value; if(className) td.className=className; tr.append(td); return td; }
function render() {
 const squads = [...new Set(issues.map(i=>i.squad))].sort(); const selected = $('#squadFilter').value;
 $('#squadFilter').replaceChildren(new Option('Todas as squads',''),...squads.map(s=>new Option(s,s))); $('#squadFilter').value=selected;
 $('#total').textContent=issues.length; $('#homologating').textContent=issues.filter(i=>{const d=new Date();const today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return i.dataInicialHomologacao<=today && i.dataFinalHomologacao>=today;}).length; $('#planned').textContent=issues.filter(i=>status(i)==='Planejada').length; $('#production').textContent=issues.filter(i=>status(i)==='Em produção').length;
 renderConflicts();
 const term = $('#search').value.trim().toLocaleLowerCase('pt-BR');
 const filtered = issues.filter(i => (!term || [i.squad,i.idIssue,i.descricao,...i.servicos].some(v=>v.toLocaleLowerCase('pt-BR').includes(term))) && (!$('#conflictFilter').checked || conflictsFor(i,issues).length>0) && (!selected || i.squad===selected) && (!$('#environmentFilter').value || i.ambiente===$('#environmentFilter').value));
 $('#rows').replaceChildren();
 for(const issue of filtered) { const tr = document.createElement('tr'); const idcell=cell(tr,issue.idIssue,'issue-id'); const sub=document.createElement('small'); sub.textContent=issue.squad; idcell.append(sub); cell(tr,issue.descricao,'description'); const servicesCell=cell(tr,'','services-cell'); const viewButton=document.createElement('button'); viewButton.type='button'; viewButton.className='secondary component-button'; viewButton.textContent=`Ver componentes (${issue.servicos.length})`; viewButton.setAttribute('aria-label',`Ver componentes de ${issue.idIssue}`); viewButton.onclick=()=>showComponents(issue); servicesCell.append(viewButton); const concurrencyCell=cell(tr,''); const conflicts=conflictsFor(issue,issues); if(conflicts.length) tr.classList.add('has-conflict'); const concurrencyBadge=document.createElement(conflicts.length?'button':'span'); if(conflicts.length) { concurrencyBadge.type='button'; concurrencyBadge.onclick=()=>showComponents(issue); concurrencyBadge.setAttribute('aria-label',`Ver concorrências de ${issue.idIssue}`); } concurrencyBadge.className='badge '+(conflicts.length?'red':'green'); concurrencyBadge.textContent=conflicts.length?`⚠ ${conflicts.length} concorrência(s)`:'Sem concorrência'; concurrencyCell.append(concurrencyBadge); if(conflicts.length) {const details=document.createElement('small');details.className='conflict-ids';details.textContent=[...new Set(conflicts.flatMap(c=>c.servicos))].join(', ');concurrencyCell.append(details);} const env=cell(tr,''); const badge=document.createElement('span'); badge.className='badge env'; badge.textContent=labels[issue.ambiente]; env.append(badge); const recommendation=suggestionFor(issue,issues); if(recommendation) { const hint=document.createElement('button');hint.type='button';hint.className='environment-hint '+(recommendation.available?'available':'unavailable');hint.textContent=recommendation.available?'↗ Sugerido: Homologação 2':'Homologação 2 ocupado';hint.title=recommendation.message;hint.onclick=()=>showComponents(issue);env.append(hint); } cell(tr,date(issue.dataInicialHomologacao)); cell(tr,date(issue.dataFinalHomologacao)); cell(tr,date(issue.dataAberturaChange)); cell(tr,date(issue.dataProducao)); const sc=cell(tr,''); const sb=document.createElement('span'); const st=status(issue); sb.className='badge '+({'Em produção':'green','Em homologação':'blue','Planejada':'gray','Aguardando produção':'orange'}[st]); sb.textContent=st; sc.append(sb); $('#rows').append(tr); }
 $('#empty').hidden=filtered.length!==0; $('#count').textContent=`${filtered.length} de ${issues.length} issues`;
}
function showComponents(issue) {
 const conflicts=conflictsFor(issue,issues);
 $('#componentsTitle').textContent=`Componentes · ${issue.idIssue}`;
 $('#componentsSummary').textContent=`${issue.squad} · ${labels[issue.ambiente]} · Homologação: ${date(issue.dataInicialHomologacao)} a ${date(issue.dataFinalHomologacao)}`;
 const alert=$('#componentsAlert');
 alert.className='component-alert '+(conflicts.length?'warning':'clear');
 alert.textContent=conflicts.length?`⚠ Atenção: componentes concorrentes com ${conflicts.length} issue(s) no mesmo período de homologação.`:'✓ Nenhum componente concorrente no período de homologação.';
 $('#componentDetails').replaceChildren();
 for(const service of issue.servicos) {
  const shared=conflicts.filter(c=>c.servicos.includes(service));
  const card=document.createElement('article');card.className='component-detail '+(shared.length?'shared':'');
  const heading=document.createElement('div');heading.className='component-detail-heading';
  const name=document.createElement('strong');name.textContent=`${service} · ${componentType(service)}`;
  const badge=document.createElement('span');badge.className='badge '+(shared.length?'red':'green');badge.textContent=shared.length?'Concorrente':'Sem concorrência';
  heading.append(name,badge);card.append(heading);
  for(const conflict of shared) {
   const description=document.createElement('p');description.textContent=`${conflict.issue.idIssue} · ${conflict.issue.squad} · ${labels[conflict.issue.ambiente]}`;
   const period=document.createElement('small');period.textContent=`Período compartilhado: ${date(conflict.inicio)} a ${date(conflict.fim)}`;
   card.append(description,period);
  }
  $('#componentDetails').append(card);
 }
 if(!issue.servicos.length) { $('#componentsAlert').textContent='Componentes ainda não informados para este registro.'; }
 renderSuggestion(issue,$('#componentSuggestion'),true);
 $('#componentsDialog').showModal();
}
$('#closeComponents').onclick=$('#dismissComponents').onclick=()=>$('#componentsDialog').close();
function renderConflicts() {
 const pairs=issues.flatMap((issue,index)=>conflictsFor(issue,issues.slice(index+1)).map(c=>({...c,source:issue})));
 $('#conflictCount').textContent=pairs.length;
 $('#conflictList').replaceChildren();
 $('#conflictEmpty').hidden=pairs.length>0;
 for(const pair of pairs) {
  const card=document.createElement('article');card.className='conflict-card';
  const title=document.createElement('strong');title.textContent=`${pair.source.idIssue} ↔ ${pair.issue.idIssue}`;
  const services=document.createElement('p');services.textContent=pair.servicos.join(' · ');
  const period=document.createElement('small');period.textContent=`${date(pair.inicio)} a ${date(pair.fim)} · ${labels[pair.source.ambiente]} / ${labels[pair.issue.ambiente]}`;
  card.append(title,services,period);$('#conflictList').append(card);
 }
}
function renderSuggestion(issue, container, canApply) {
 container.replaceChildren(); const suggestion=suggestionFor(issue,issues); container.hidden=!suggestion;
 if(!suggestion) return;
 container.className='suggestion-box '+(suggestion.available?'':'blocked');
 const text=document.createElement('p');text.textContent=suggestion.message;container.append(text);
 if(suggestion.available && canApply) {
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Utilizar Homologação 2';
  button.onclick=()=>{
   const latest=suggestionFor(issue,issues); if(!latest?.available) return;
   issue.ambiente='homologacao 2'; let persisted=true;
   try { localStorage.setItem(storageKey,JSON.stringify(issues)); } catch { persisted=false; }
   render();showComponentsWithoutReopening(issue);notify(persisted?'Ambiente atualizado para Homologação 2.':'Ambiente atualizado nesta sessão.');
  };container.append(button);
 }
}
function showComponentsWithoutReopening(issue) { $('#componentsDialog').close();showComponents(issue); }
function updateFormSuggestion() {
 const form=$('#form');const draft=Object.fromEntries(new FormData(form));
 draft.servicos=[...new Set(draft.servicos.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean))];
 if(!draft.dataInicialHomologacao || !draft.dataFinalHomologacao || draft.dataInicialHomologacao>draft.dataFinalHomologacao || !draft.ambiente) { $('#formSuggestion').hidden=true; return; }
 renderSuggestion(draft,$('#formSuggestion'),false);
 const suggestion=suggestionFor(draft,issues);
 if(suggestion?.available) { const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Selecionar Homologação 2';button.onclick=()=>{form.elements.ambiente.value='homologacao 2';updateFormSuggestion();};$('#formSuggestion').append(button); }
}
$('#form').addEventListener('input',updateFormSuggestion);
function notify(message) { $('#toast').textContent=message; $('#toast').hidden=false; clearTimeout(notify.timer); notify.timer=setTimeout(()=>$('#toast').hidden=true,4000); }
$('#newIssue').onclick=()=>{ $('#form').reset(); $('#formSuggestion').hidden=true; $('#formError').textContent=''; $('#dialog').showModal(); };
$('#cancel').onclick=$('#close').onclick=()=>$('#dialog').close();
$('#form').onsubmit=e=>{ e.preventDefault(); const issue=Object.fromEntries(new FormData(e.target)); Object.keys(issue).forEach(k=>issue[k]=issue[k].trim()); issue.idIssue=issue.idIssue.toUpperCase();
 if(Object.values(issue).some(v=>!v)) { $('#formError').textContent='Preencha todos os campos.'; return; }
 if(issues.some(i=>i.idIssue.toUpperCase()===issue.idIssue)) { $('#formError').textContent='Já existe uma issue com este ID.'; return; }
 if(issue.dataFinalHomologacao<issue.dataInicialHomologacao) { $('#formError').textContent='O fim da homologação deve ser igual ou posterior ao início.'; return; }
 if(issue.dataProducao<=issue.dataFinalHomologacao) { $('#formError').textContent='A produção deve ocorrer depois do fim da homologação.'; return; }
 if(issue.dataAberturaChange>issue.dataProducao) { $('#formError').textContent='A abertura da CHANGE/GMUD deve ocorrer até a data de produção.'; return; }
 issue.servicos=[...new Map(issue.servicos.split(',').map(s=>s.trim()).filter(Boolean).map(s=>[s.toLocaleLowerCase('pt-BR'),s])).values()];
 if(issue.servicos.length<1 || issue.servicos.length>4) { $('#formError').textContent='Informe de 1 a 4 serviços/componentes distintos, separados por vírgula.'; return; }
 const hasConflicts=conflictsFor(issue,issues).length>0;
 issues.unshift(issue); let persisted=true; try { localStorage.setItem(storageKey,JSON.stringify(issues)); } catch { persisted=false; } $('#dialog').close(); render(); notify(persisted?(hasConflicts?'Issue cadastrada. Atenção: há concorrência de serviços na homologação.':'Issue cadastrada com sucesso.'):'Issue cadastrada nesta sessão. O navegador não permitiu salvar localmente.'); };
['#search','#squadFilter','#environmentFilter','#conflictFilter'].forEach(s=>$(s).addEventListener('input',render));
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify(issues,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='issues.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('JSON exportado com os registros atuais.');};
render();

$('#form').elements.dataFinalHomologacao.addEventListener('input',()=>{
 const form=$('#form');if(!form.elements.dataFinalHomologacao.value)return;
 form.elements.dataProducao.value=addBusinessDays(form.elements.dataFinalHomologacao.value,3);
 form.elements.dataAberturaChange.value=subtractDays(form.elements.dataProducao.value,3);
 updateFormSuggestion();
});
$('#form').elements.dataProducao.addEventListener('input',()=>{
 const form=$('#form');if(form.elements.dataProducao.value)form.elements.dataAberturaChange.value=subtractDays(form.elements.dataProducao.value,3);
});
