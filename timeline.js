
const $=s=>document.querySelector(s);
const labels={homologacao:'Homologação','homologacao 2':'Homologação 2',efemero:'Efêmero'};
const date=s=>s.split('-').reverse().join('/');
// Changes vivem em store próprio; o Calendário apenas lê o status vinculado.
const changeStatusBadge={'Planejada':'gray','Em aprovação':'orange','Aprovada':'blue','Executada':'green','Rejeitada':'red','Não realizada':'red','Rollback realizado':'red'};
function loadChanges(){ try{ const s=JSON.parse(localStorage.getItem('issueflow.changes.v1')); return Array.isArray(s)?s:[]; }catch{ return []; } }
let changeMap=new Map();
function buildChangeMap(){ const map=new Map(); const final=s=>s==='Rejeitada'||s==='Não realizada'||s==='Rollback realizado'; for(const c of loadChanges()) for(const id of (c.issueIds||[])){ const cur=map.get(id); if(!cur || (final(cur.status)&&!final(c.status))) map.set(id,c); } return map; }
function changeForIssue(id){ return changeMap.get(id)||null; }
const now=new Date();let month=new Date(now.getFullYear(),now.getMonth(),1);
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayIso=iso(now);let calendarStart=iso(month);
function bounds(){return {start:iso(month),end:iso(new Date(month.getFullYear(),month.getMonth()+1,0)),days:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()};}
function pairsInMonth(){const {start,end}=bounds();return issues.flatMap((i,n)=>conflictsFor(i,issues.slice(n+1)).map(c=>({...c,source:i}))).filter(c=>c.inicio<=end&&c.fim>=start);}
function element(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function dayPosition(value){const [y,m,d]=value.split('-').map(Number),[sy,sm,sd]=calendarStart.split('-').map(Number);return (Date.UTC(y,m-1,d)-Date.UTC(sy,sm-1,sd))/86400000;}
function shiftCalendarDays(value,count) {const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+count);return iso(d);}
function concurrentGroups(records) {
 const remaining=new Map(records.map(i=>[i.idIssue,i])),groups=[];
 while(remaining.size) {
  const first=remaining.values().next().value;remaining.delete(first.idIssue);const group=[first],queue=[first];
  while(queue.length) {const item=queue.shift();for(const conflict of conflictsFor(item,records)){const next=remaining.get(conflict.issue.idIssue);if(next){remaining.delete(next.idIssue);group.push(next);queue.push(next);}}}
  group.sort((a,b)=>a.dataInicialHomologacao.localeCompare(b.dataInicialHomologacao)||a.idIssue.localeCompare(b.idIssue));groups.push(group);
 }
 return groups.sort((a,b)=>a[0].dataInicialHomologacao.localeCompare(b[0].dataInicialHomologacao)||a[0].idIssue.localeCompare(b[0].idIssue));
}
function alignmentFor(issue) {
 const direct=conflictsFor(issue,issues);
 const earlier=direct.filter(c=>c.issue.dataInicialHomologacao<issue.dataInicialHomologacao).sort((a,b)=>a.issue.dataInicialHomologacao.localeCompare(b.issue.dataInicialHomologacao)||a.issue.idIssue.localeCompare(b.issue.idIssue));
 if(!earlier.length)return null;
 const progress=earlier.map(c=>{
  const elapsed=dayPosition(issue.dataInicialHomologacao)-dayPosition(c.issue.dataInicialHomologacao);
  const total=dayPosition(c.issue.dataFinalHomologacao)-dayPosition(c.issue.dataInicialHomologacao)+1;
  return {issue:c.issue,elapsed,total,ratio:elapsed/total};
 });
 const mode=progress.some(p=>p.ratio>=.5)?'wait':'align',reference=earlier[0].issue;
 let related=mode==='wait'?direct.map(c=>c.issue):earlier.filter(c=>c.issue.dataInicialHomologacao===reference.dataInicialHomologacao).map(c=>c.issue);
 let start=mode==='wait'?shiftCalendarDays(direct.map(c=>c.issue.dataFinalHomologacao).sort().at(-1),1):reference.dataInicialHomologacao;
 const duration=dayPosition(issue.dataFinalHomologacao)-dayPosition(issue.dataInicialHomologacao)+1;
 let end=shiftCalendarDays(start,duration-1);
 // Avança também por conflitos futuros até encontrar uma janela livre.
 if(mode==='wait') {
  let blockers=conflictsFor({...issue,dataInicialHomologacao:start,dataFinalHomologacao:end},issues);
  while(blockers.length) {
   for(const conflict of blockers)if(!related.some(i=>i.idIssue===conflict.issue.idIssue))related.push(conflict.issue);
   start=shiftCalendarDays(blockers.map(c=>c.issue.dataFinalHomologacao).sort().at(-1),1);
   end=shiftCalendarDays(start,duration-1);
   blockers=conflictsFor({...issue,dataInicialHomologacao:start,dataFinalHomologacao:end},issues);
  }
 }
 const production=addBusinessDays(end,3);
 const proposed={...issue,dataInicialHomologacao:start,dataFinalHomologacao:end,dataProducao:production,dataAberturaChange:subtractDays(production,3)};
 const remainingConflicts=conflictsFor(proposed,issues);
 const newConflicts=remainingConflicts.filter(c=>!direct.some(old=>old.issue.idIssue===c.issue.idIssue));
 return {start,end,duration,production,change:proposed.dataAberturaChange,reference,direct,newConflicts,remainingConflicts,mode,related,progress};
}
function alignmentPartners(issue) {
 return issues.filter(other=>other.idIssue!==issue.idIssue && alignmentFor(other)?.mode==='align' && alignmentFor(other)?.related.some(i=>i.idIssue===issue.idIssue));
}
function planningLabel(plan) {return `${plan.mode==='wait'?'Após':'Junto com'} ${plan.related.map(i=>i.idIssue).join(' + ')}`;}
function planningExplanation(plan) {
 const timing=plan.progress.map(p=>`${p.issue.idIssue}: ${p.elapsed} de ${p.total} dias (${Math.round(p.ratio*100)}%) já transcorridos`).join('; ');
 return plan.mode==='wait'?`Início na metade ou depois de uma homologação concorrente. ${timing}. Aguardar o término e usar a próxima janela livre evita interferir nos testes já realizados. Mantém ${plan.duration} dias corridos.`:`Início antes da metade das homologações concorrentes. ${timing}. Começar junto permite coordenar os componentes antes dos testes. Mantém ${plan.duration} dias corridos; exige acordo entre as squads.`;
}
function orderRelated(records) {
 const edges=records.flatMap((issue,n)=>conflictsFor(issue,records.slice(n+1)).map(c=>[issue.idIssue,c.issue.idIssue]));
 const score=order=>{const positions=new Map(order.map((i,n)=>[i.idIssue,n]));return edges.reduce((sum,[a,b])=>sum+Math.abs(positions.get(a)-positions.get(b)),0);};
 let order=[...records].sort((a,b)=>conflictsFor(b,records).length-conflictsFor(a,records).length||a.dataInicialHomologacao.localeCompare(b.dataInicialHomologacao));
 let improved=true;
 while(improved){improved=false;const base=score(order);let best=base,next=order;
  for(let a=0;a<order.length;a++)for(let b=a+1;b<order.length;b++){const candidate=[...order];[candidate[a],candidate[b]]=[candidate[b],candidate[a]];const value=score(candidate);if(value<best){best=value;next=candidate;}}
  if(best<base){order=next;improved=true;}
 }
 return order;
}
function planningGroups(records) {
 const connected=concurrentGroups(records).filter(g=>g.length>1).map(chain=>({issues:orderRelated(chain),key:chain.map(i=>i.idIssue).sort().join('|'),pairs:chain.reduce((n,i)=>n+conflictsFor(i,chain).length,0)/2})).sort((a,b)=>b.pairs-a.pairs);
 const unrelated=records.filter(i=>!conflictsFor(i,records).length).sort((a,b)=>a.dataInicialHomologacao.localeCompare(b.dataInicialHomologacao));
 if(unrelated.length)connected.push({issues:unrelated,key:'unrelated',pairs:0});
 return connected;
}
function highlightRelations(issue) {
 const ids=new Set([issue.idIssue,...conflictsFor(issue,issues).map(c=>c.issue.idIssue)]);
 for(const row of document.querySelectorAll('.calendar-row')){row.classList.toggle('relation-selected',row.dataset.issue===issue.idIssue);row.classList.toggle('relation-neighbor',row.dataset.issue!==issue.idIssue&&ids.has(row.dataset.issue));row.classList.toggle('relation-muted',!ids.has(row.dataset.issue));}
 $('#relationFocus').hidden=false;$('#relationFocusText').textContent=`${issue.idIssue} e suas concorrências diretas estão destacadas.`;
}
function clearRelations() {for(const row of document.querySelectorAll('.calendar-row'))row.classList.remove('relation-selected','relation-neighbor','relation-muted');$('#relationFocus').hidden=true;}
$('#clearRelations').onclick=clearRelations;
function planningImpact(plan) {return plan.remainingConflicts.length?`O período sugerido ainda concorre com ${plan.remainingConflicts.map(c=>c.issue.idIssue).join(', ')}. Alinhar o início não elimina o compartilhamento de componentes.`:'O período sugerido não tem concorrências de componentes nos registros atuais.';}
function render(){
 changeMap=buildChangeMap();
 let {start,end,days}=bounds();const selectedMonthStart=start;calendarStart=start;const monthPairs=pairsInMonth();
 const homologating=issues.filter(i=>i.dataInicialHomologacao<=end&&i.dataFinalHomologacao>=start);
 $('#monthIssues').textContent=homologating.length;$('#monthConflicts').textContent=monthPairs.length;$('#monthProduction').textContent=issues.filter(i=>i.dataProducao>=start&&i.dataProducao<=end).length;$('#monthSuggestions').textContent=homologating.filter(i=>suggestionFor(i,issues)?.available).length;
 $('#monthTitle').textContent=month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});$('#monthPicker').value=start.slice(0,7);
 const query=$('#timelineSearch').value.trim().toLowerCase();const env=$('#timelineEnvironment').value,squad=$('#timelineSquad').value,component=$('#timelineComponent').value;
 let visible=issues.filter(i=>((i.dataInicialHomologacao<=end&&i.dataFinalHomologacao>=start)||(i.dataProducao>=start&&i.dataProducao<=end))&&(!env||i.ambiente===env)&&(!squad||i.squad===squad)&&(!component||i.servicos.includes(component))&&(!query||[i.idIssue,i.squad,i.descricao,...i.servicos].some(s=>s.toLowerCase().includes(query)))&&(!$('#onlyConflicts').checked||monthPairs.some(p=>p.source.idIssue===i.idIssue||p.issue.idIssue===i.idIssue))).sort((a,b)=>a.dataInicialHomologacao.localeCompare(b.dataInicialHomologacao)||a.idIssue.localeCompare(b.idIssue));
 const fullGroups=planningGroups(issues);let selectedBlock=$('#conflictBlock').value;
 const eligibleGroups=fullGroups.filter(g=>g.issues.some(i=>visible.some(v=>v.idIssue===i.idIssue)));
 const selector=$('#conflictBlock');selector.replaceChildren(new Option('Todos os blocos',''),...eligibleGroups.map((g,n)=>new Option(g.key==='unrelated'?'Sem concorrência':`Bloco ${n+1} · ${g.issues.length} issues · ${g.pairs} relações`,g.key)));
 if(!eligibleGroups.some(g=>g.key===selectedBlock))selectedBlock='';selector.value=selectedBlock;
 if(selectedBlock)visible=visible.filter(i=>fullGroups.find(g=>g.key===selectedBlock).issues.some(other=>other.idIssue===i.idIssue));
 const visibleIds=new Set(visible.map(i=>i.idIssue));
 const displayedGroups=fullGroups.map(group=>group.issues.filter(i=>visibleIds.has(i.idIssue))).filter(group=>group.length);
 visible=displayedGroups.flat();
 start=[selectedMonthStart,...visible.flatMap(i=>[i.dataInicialHomologacao,alignmentFor(i)?.start||i.dataInicialHomologacao])].sort()[0];
 calendarStart=start;days=dayPosition(end)+1;
 $('#displayRange').textContent=`${date(start)} — ${date(end)}`;
 const grid=$('#calendarGrid');grid.replaceChildren();grid.style.setProperty('--days',days);
 const header=element('div','calendar-grid-header');header.append(element('div','issue-column heading-label','ISSUE / AMBIENTE'));const dayHeader=element('div','day-header');
 for(let d=1;d<=days;d++){const dt=new Date(shiftCalendarDays(start,d-1)+'T12:00:00');const weekend=[0,6].includes(dt.getDay());const day=element('div','day-label'+(weekend?' weekend':'')+(iso(dt)<selectedMonthStart?' context-day':'')+(iso(dt)===todayIso?' current-day':''));day.append(element('small','',dt.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')),element('strong','',String(dt.getDate()).padStart(2,'0')));dayHeader.append(day);}const dateArea=element('div','date-area'),monthBand=element('div','month-band');
 let cursor=start;
 while(cursor<=end){const dt=new Date(cursor+'T12:00:00'),last=iso(new Date(dt.getFullYear(),dt.getMonth()+1,0)),segmentEnd=last<end?last:end,count=dayPosition(segmentEnd)-dayPosition(cursor)+1;const label=element('span',cursor<selectedMonthStart?'context-month':'',dt.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}));label.style.width=`${count/days*100}%`;monthBand.append(label);cursor=shiftCalendarDays(segmentEnd,1);}
 dateArea.append(monthBand,dayHeader);header.append(dateArea);grid.append(header);
 let previousGroup=null;
 for(const issue of visible){
 const group=fullGroups.find(g=>g.issues.some(i=>i.idIssue===issue.idIssue));
 if(previousGroup!==group) {
  const divider=element('div','concurrency-group');divider.append(element('strong','',group.key==='unrelated'?'SEM CONCORRÊNCIA':`BLOCO ${eligibleGroups.indexOf(group)+1} · ${group.pairs} RELAÇÕES DIRETAS`),element('span','',`${group.issues.length} issue(s) · ${group.issues.map(i=>i.idIssue).join(', ')}`));grid.append(divider);
 }
 previousGroup=group;
 const row=element('div','calendar-row');row.dataset.issue=issue.idIssue;const issueLabel=element('div','issue-column issue-label');issueLabel.append(element('strong','',issue.idIssue),element('span','',issue.descricao),element('small','',`${issue.squad} · ${labels[issue.ambiente]}`));const detailButton=element('button','issue-detail-button',issue.idIssue);detailButton.type='button';detailButton.onclick=()=>showDetails(issue);issueLabel.children[0].replaceWith(detailButton);const linkedChange=changeForIssue(issue.idIssue);if(linkedChange){const cb=element('small','change-row-badge '+(changeStatusBadge[linkedChange.status]||'gray'),`⇄ ${linkedChange.rdm||'TBD'} · ${linkedChange.status}`);cb.title=`Change ${linkedChange.rdm||'TBD'} · ${linkedChange.status} · subida ${date(linkedChange.dataProducao)}`;issueLabel.append(cb);}row.append(issueLabel);
 const track=element('div','calendar-track');for(let d=1;d<=days;d++){const dt=new Date(shiftCalendarDays(start,d-1)+'T12:00:00');track.append(element('div','day-cell'+([0,6].includes(dt.getDay())?' weekend':'')+(iso(dt)<selectedMonthStart?' context-day':'')+(iso(dt)===todayIso?' today-cell':'')));}
 const alignment=alignmentFor(issue),partners=alignmentPartners(issue);
 if(alignment){
 const caption=element('button','shadow-caption',`Sugestão ${issue.idIssue}: ${date(alignment.start)} → ${date(alignment.end)} · ${planningLabel(alignment)}`);caption.type='button';caption.title=caption.textContent;caption.onclick=()=>showDetails(issue);track.append(caption);
 if(alignment.start<=end && alignment.end>=start){
 const left=Math.max(0,dayPosition(alignment.start)),right=Math.min(days-1,dayPosition(alignment.end));
 const ghost=element('button','alignment-bar shadow-bar '+(issue.ambiente==='efemero'?'ephemeral':issue.ambiente==='homologacao 2'?'second':''));ghost.type='button';ghost.style.left=`${left/days*100}%`;ghost.style.width=`${(right-left+1)/days*100}%`;
 const continued=alignment.start<start;ghost.textContent=right-left+1<4?(continued?'←':''):`${continued?'← ':''}${issue.idIssue}`;if(continued)ghost.className+=' continues-before';
 ghost.title=`${caption.textContent}. ${continued?'Começa no mês anterior. ':''}${planningImpact(alignment)} Datas atuais preservadas.`;ghost.setAttribute('aria-label',ghost.title);ghost.onclick=()=>showDetails(issue);track.append(ghost);
 } else {caption.textContent+=' · fora deste mês';}
 }

 const overlaps=conflictsFor(issue,issues).filter(c=>c.inicio<=end&&c.fim>=start);
 if(overlaps.length){const relations=element('div','row-relations');const focus=element('button','relation-button',`Destacar ${overlaps.length} concorrência(s)`);focus.type='button';focus.onclick=()=>highlightRelations(issue);relations.append(focus);const ids=element('small','',overlaps.map(c=>c.issue.idIssue).join(' · '));ids.title=ids.textContent;relations.append(ids);issueLabel.append(relations);}

 if(issue.dataInicialHomologacao<=end&&issue.dataFinalHomologacao>=start){const left=Math.max(0,dayPosition(issue.dataInicialHomologacao)),right=Math.min(days-1,dayPosition(issue.dataFinalHomologacao));const bar=element('button','homologation-bar '+(issue.ambiente==='efemero'?'ephemeral':issue.ambiente==='homologacao 2'?'second':''));bar.type='button';bar.style.left=`${left/days*100}%`;bar.style.width=`${(right-left+1)/days*100}%`;bar.title=`${issue.idIssue}: homologação ${date(issue.dataInicialHomologacao)} a ${date(issue.dataFinalHomologacao)}${overlaps.length?' · Há componentes concorrentes':''}`;bar.setAttribute('aria-label',bar.title);bar.onclick=()=>showDetails(issue);
 for(const c of overlaps){const a=Math.max(left,dayPosition(c.inicio)),b=Math.min(right,dayPosition(c.fim));const segment=element('span','overlap-segment');segment.style.left=`${(a-left)/(right-left+1)*100}%`;segment.style.width=`${(b-a+1)/(right-left+1)*100}%`;bar.append(segment);}const continuesBefore=issue.dataInicialHomologacao<start,continuesAfter=issue.dataFinalHomologacao>end;if(continuesBefore)bar.className+=' continues-before';if(continuesAfter)bar.className+=' continues-after';bar.append(element('span','bar-label',`${continuesBefore?'← ':''}${overlaps.length?'⚠ ':''}${issue.idIssue}${continuesAfter?' →':''}`));track.append(bar);}

 if(issue.dataProducao>=start&&issue.dataProducao<=end){const production=element('button','production-marker','◆');production.type='button';production.style.left=`${(dayPosition(issue.dataProducao)+.5)/days*100}%`;production.title=`${issue.idIssue} · Produção: ${date(issue.dataProducao)}`;production.setAttribute('aria-label',production.title);production.onclick=()=>showDetails(issue);track.append(production);}row.append(track);grid.append(row);}
 clearRelations();$('#calendarEmpty').hidden=!!visible.length;$('#timelineCount').textContent=`${visible.length} issues exibidas · ${days} dias`;
 const list=$('#periodConflicts');list.replaceChildren();const filteredPairs=monthPairs.filter(p=>visible.some(i=>i.idIssue===p.source.idIssue||i.idIssue===p.issue.idIssue));
 for(const pair of filteredPairs){
 const card=element('article','period-card');card.append(element('span','badge red','Concorrência atual'),element('strong','pair-title',`${pair.source.idIssue} ↔ ${pair.issue.idIssue}`));
 const services=element('div','conflict-services');for(const service of pair.servicos)services.append(element('span','badge env',`${service} · ${componentType(service)}`));card.append(services);
 card.append(element('p','conflict-period',`Dias compartilhados: ${date(pair.inicio<start?start:pair.inicio)} a ${date(pair.fim>end?end:pair.fim)}`),element('small','',`${labels[pair.source.ambiente]} / ${labels[pair.issue.ambiente]}`));
 const backend=pair.servicos.some(s=>componentType(s)==='Backend');card.append(element('p','conflict-explanation',backend?'Há backend compartilhado. Mover entre Homologação e Homologação 2 não isola esse componente.':'O frontend disputa o mesmo ambiente. Avalie a disponibilidade de Homologação 2 nos detalhes.'));
 const actions=element('div','pair-actions');for(const issue of [pair.source,pair.issue]){const button=element('button','secondary',`Ver ${issue.idIssue}`);button.type='button';button.onclick=()=>showDetails(issue);actions.append(button);}card.append(actions);list.append(card);
 }
 if(!filteredPairs.length)list.append(element('p','no-period-conflicts','Nenhuma concorrência no período para as issues exibidas.'));
 renderPlanning(visible);
}
function renderPlanning(visible) {
 const container=$('#planningSuggestions');container.replaceChildren();
 for(const issue of visible) {
  const alignment=alignmentFor(issue),environment=suggestionFor(issue,issues);
  if(!alignment && !environment)continue;
  const card=element('article','planning-card');card.append(element('strong','planning-title',issue.idIssue),element('p','planning-description',issue.descricao));
  if(environment?.available){card.append(element('span','badge blue','Alternativa de ambiente'),element('p','planning-action',`${labels[issue.ambiente]} → Homologação 2`),element('p','planning-explanation',`Apenas ${issue.servicos[0]} (frontend). Livre em Homologação 2 de ${date(issue.dataInicialHomologacao)} a ${date(issue.dataFinalHomologacao)}. Mantém as datas e evita a disputa desse frontend.`));}
  if(environment && !environment.available){card.append(element('p','planning-warning',environment.message));}
  if(alignment){card.append(element('span','badge gray','Alternativa de início'),element('p','planning-action',planningLabel(alignment)));
   const comparison=element('div','planning-comparison');for(const [label,start,end] of [['Atual',issue.dataInicialHomologacao,issue.dataFinalHomologacao],['Sugerido',alignment.start,alignment.end]]){const item=element('div');item.append(element('small','',label),element('strong','',`${date(start)} → ${date(end)}`));comparison.append(item);}card.append(comparison);
   card.append(element('p','planning-explanation',planningExplanation(alignment)),element('p','planning-warning',planningImpact(alignment)));
   if(alignment.newConflicts.length)card.append(element('p','planning-warning',`O intervalo sugerido também encontraria: ${alignment.newConflicts.map(c=>c.issue.idIssue).join(', ')}.`));
  }
  const button=element('button','secondary','Ver componentes e avaliar');button.type='button';button.onclick=()=>showDetails(issue);card.append(button);container.append(card);
 }
 if(!container.children.length)container.append(element('p','no-period-conflicts','Nenhuma sugestão de início ou ambiente para as issues exibidas.'));

}
function showDetails(issue){
 $('#detailTitle').textContent=issue.idIssue;$('#detailDescription').textContent=`${issue.descricao} · ${issue.squad} · ${labels[issue.ambiente]}`;
 const dates=$('#detailDates');dates.replaceChildren();for(const [label,value] of [['Início homologação',issue.dataInicialHomologacao],['Fim homologação',issue.dataFinalHomologacao],['Abertura CHANGE/GMUD',issue.dataAberturaChange],['◆ Produção',issue.dataProducao]]){const item=element('div');item.append(element('small','',label),element('strong','',date(value)));dates.append(item);}
 const linked=changeForIssue(issue.idIssue);if(linked){const item=element('div');item.append(element('small','','Change / RDM'));const cb=element('strong');cb.textContent=`${linked.rdm||'TBD'} · ${linked.status}${linked.reprogramacoes?' (↻×'+linked.reprogramacoes+')':''}`;item.append(cb);dates.append(item);}
 const alignment=alignmentFor(issue),alignmentBox=$('#detailAlignment');alignmentBox.replaceChildren();const partners=alignmentPartners(issue);alignmentBox.hidden=!alignment&&!partners.length;
 if(partners.length){alignmentBox.append(element('strong','','Pode ser referência de início conjunto'),element('p','',`${partners.map(i=>i.idIssue).join(', ')} poderiam começar em ${date(issue.dataInicialHomologacao)} com esta issue, pelos componentes diretamente concorrentes. Datas cadastradas preservadas.`));}
 if(alignment){alignmentBox.append(element('strong','',planningLabel(alignment)),element('p','',`Atual: ${date(issue.dataInicialHomologacao)} a ${date(issue.dataFinalHomologacao)} → Sugerido: ${date(alignment.start)} a ${date(alignment.end)}.`),element('p','',planningExplanation(alignment)),element('p','',`CHANGE/GMUD: ${date(alignment.change)} · Produção: ${date(alignment.production)}.`),element('small','',planningImpact(alignment)));}

 const suggestion=suggestionFor(issue,issues),box=$('#detailSuggestion');box.replaceChildren();box.hidden=!suggestion;if(suggestion){box.className='suggestion-box'+(suggestion.available?'':' blocked');box.append(element('p','',suggestion.message));if(suggestion.available){const use=element('button','secondary','Utilizar Homologação 2');use.type='button';use.onclick=()=>{if(!suggestionFor(issue,issues)?.available)return;issue.ambiente='homologacao 2';let saved=true;try{localStorage.setItem(storageKey,JSON.stringify(issues));}catch{saved=false;}render();showDetails(issue);$('#toast').textContent=saved?'Ambiente atualizado. Concorrências recalculadas.':'Ambiente atualizado nesta sessão.';$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,4000);};box.append(use);}}
 const componentList=$('#detailComponents');componentList.replaceChildren();const conflicts=conflictsFor(issue,issues);
 for(const component of issue.servicos){const shared=conflicts.filter(c=>c.servicos.includes(component));const card=element('article','component-detail'+(shared.length?' shared':''));const title=element('div','component-detail-heading');title.append(element('strong','',`${component} · ${componentType(component)}`),element('span','badge '+(shared.length?'red':'green'),shared.length?'Concorrente':'Sem concorrência'));card.append(title);for(const conflict of shared){card.append(element('p','',`${conflict.issue.idIssue} · ${conflict.issue.squad} · ${labels[conflict.issue.ambiente]}`),element('small','',`Período compartilhado: ${date(conflict.inicio)} a ${date(conflict.fim)}`));}componentList.append(card);}if(!issue.servicos.length)componentList.append(element('p','','Componentes não informados.'));
 if(!$('#timelineDetails').open)$('#timelineDetails').showModal();
}
$('#previous').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);render();};$('#next').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);render();};$('#today').onclick=()=>{const current=new Date();month=new Date(current.getFullYear(),current.getMonth(),1);render();};$('#monthPicker').onchange=e=>{if(!e.target.value)return;const [y,m]=e.target.value.split('-').map(Number);month=new Date(y,m-1,1);render();};
for(const s of ['#timelineSearch','#timelineEnvironment','#timelineSquad','#timelineComponent','#onlyConflicts','#conflictBlock'])$(s).addEventListener('input',render);
for(const squad of [...new Set(issues.map(i=>i.squad))].sort())$('#timelineSquad').append(new Option(squad,squad));for(const component of [...new Set(issues.flatMap(i=>i.servicos))].sort())$('#timelineComponent').append(new Option(component,component));
$('#closeDetails').onclick=$('#dismissDetails').onclick=()=>$('#timelineDetails').close();
render();
