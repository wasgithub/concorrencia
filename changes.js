// Painel de Changes (RDM). Uma change é um CONTÊINER de subida: reúne issues de
// qualquer squad, numa única janela. A change é dona da data — ao vincular, as
// issues adotam a data da change (write-back). Ciclo operacional (aprovação,
// reprogramação, rejeição, execução) com histórico, e calendário de freeze.
const $ = s => document.querySelector(s);
const labels = {homologacao:'Homologação',efemero:'Efêmero','homologacao 2':'Homologação 2'};
const date = value => value ? value.split('-').reverse().join('/') : '—';
const statusOptions = ['Planejada','Em aprovação','Aprovada','Executada','Rejeitada','Não realizada','Rollback realizado'];
const statusBadge = {'Planejada':'gray','Em aprovação':'orange','Aprovada':'blue','Executada':'green','Rejeitada':'red','Não realizada':'red','Rollback realizado':'red'};
const motivos = ['Comitê de Mudança','Gerência','Bug encontrado','Freeze','Outro'];
const histLabel = {criada:'Criada',editada:'Editada',aprovada:'Subida aprovada',reprogramada:'Reprogramada',rejeitada:'Rejeitada',executada:'Executada',nao_realizada:'Não realizada',pipeline_solicitada:'Execução solicitada',pipeline_iniciada:'Pipeline iniciada',pipeline_finalizada:'Resultado da subida',validacao_iniciada:'Validação iniciada',validacao_concluida:'Validação concluída',encerrada:'GMUD encerrada',teste_prod:'Teste de produção',rollback:'Rollback realizado'};
const histBadge = {criada:'gray',editada:'gray',aprovada:'green',reprogramada:'orange',rejeitada:'red',executada:'green',nao_realizada:'red',teste_prod:'blue',rollback:'red'};

function pad(n){ return String(n).padStart(2,'0'); }
function iso(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function todayIso(){ return iso(new Date()); }
function addDaysIso(baseIso, n){ const d=new Date(baseIso+'T12:00:00'); d.setDate(d.getDate()+n); return iso(d); }
function nowStamp(){ const d=new Date(); return `${iso(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtStamp(s){ if(!s) return '—'; const [d,t]=s.split(' '); return `${date(d)}${t?' '+t:''}`; }

function element(tag, className, text){ const el=document.createElement(tag); if(className)el.className=className; if(text!==undefined)el.textContent=text; return el; }
function notify(message){ $('#toast').textContent=message; $('#toast').hidden=false; clearTimeout(notify.timer); notify.timer=setTimeout(()=>$('#toast').hidden=true,4000); }

// ---- Derivações de issues ---------------------------------------------------
function summarize(list){
 return {
  inicioHom: list.map(i=>i.dataInicialHomologacao).sort()[0] || '',
  fimHom: list.map(i=>i.dataFinalHomologacao).sort().at(-1) || '',
  componentes: [...new Set(list.flatMap(i=>i.servicos))],
  temConcorrencia: list.some(i=>conflictsFor(i,issues).length>0),
 };
}
function issuesByIds(ids){ return (ids||[]).map(id=>issues.find(i=>i.idIssue===id)).filter(Boolean); }
function squadsOf(change){ return [...new Set(issuesByIds(change.issueIds).map(i=>i.squad))]; }
function motivoFor(list){ return list.map(i=>`${i.idIssue} | ${i.descricao} | COMP.: ${i.servicos.join(', ')}`).join('\n'); }
function consumo(inicio, fim){
 if(!inicio || !fim) return '';
 const [h1,m1]=inicio.split(':').map(Number), [h2,m2]=fim.split(':').map(Number);
 let mins=(h2*60+m2)-(h1*60+m1); if(mins<0) mins+=1440;
 return `${Math.floor(mins/60)}:${pad(mins%60)}`;
}
function periodMatch(dataProd, view){
 const t=todayIso();
 if(view==='hoje') return dataProd===t;
 if(view==='amanha') return dataProd===addDaysIso(t,1);
 if(view==='semana') return dataProd>=t && dataProd<=addDaysIso(t,6);
 return true;
}

// ---- Checklist de implantação (modelo editável + respostas por change) ------
const checklistKey = 'issueflow.checklist.v1';
let checklist;
let clstored=null; try{ clstored=localStorage.getItem(checklistKey); }catch{ clstored=null; }
if(clstored===null){ checklist=null; }
else { try{ const s=JSON.parse(clstored); checklist=Array.isArray(s)?s:[]; }catch{ checklist=[]; } }
function persistChecklist(){ try{ localStorage.setItem(checklistKey, JSON.stringify(checklist)); return true; }catch{ return false; } }
function seedChecklist(){
 const def={
  'Geral':[['Gera indisponibilidade?','bool'],['Quantos componentes mainframe?','numero'],['Quantos componentes IBM Cloud?','numero'],['Quantos componentes TI Híbrida?','numero'],['Quantos componentes Github/Runs?','numero'],['Quantos scripts precisarão ser executados?','numero'],['Outros componentes?','texto'],['Subida validada pelo QA e PO da squad?','bool'],['Verificado os impactos da subida?','bool'],['As evidências estão no Xray/Jira?','bool'],['Adicionado o link dos testes funcionais e regressivos (XRAY) na CHG?','bool'],['Preencheu a aba de changes?','bool'],['Existem alterações de gateway?','bool'],['Foi verificado se a policy de produção está correta?','bool'],['Existem alterações de ServiceNow?','bool'],['Existem alterações de VALID?','bool'],['Existem alterações de GCC?','bool'],['Existem alterações de GRAN?','bool'],['Existem alterações de CLIM?','bool'],['Existem alterações de DOCG?','bool'],['Existem alterações de workflow Brain?','bool'],['Foi parametrizado o workflow Brain?','bool']],
  'Híbrida':[['Informado na change as versões de implantação?','bool'],['Informado na change as versões de rollback?','bool'],['Os serviços estão no passo GMUD?','bool'],['Verificado se existe apontamento nos laudos Fortify?','bool'],['Anexado os Laudos Fortify?','bool'],["Existem mais de 5 componentes (contando MS's e CFG's)? Se tiver, criar release train",'bool'],['Criado a release train, adicionada tag da change e colocado em passo GMUD?','bool'],['Obteve o link correto do release train para informar na change?','bool'],["Foram alterados CFG's?",'bool'],["CFG's estão com a URL de Produção?",'bool'],["CFG's estão em passo GMUD?",'bool'],['Foram alterados Secrets?','bool'],['Se alterado Secrets, adicionado na tarefa da change?','bool'],['Houve criação/alteração de JKS, inclusão/alteração de certificados?','bool'],['Foi acionado o Grupo 24 para criação/alteração de JKS?','bool'],['Foram envolvidos os Grupos responsáveis por servidores para inclusão de certificados?','bool']],
  'Scripts':[['Realizado o teste nos ambientes?','bool'],['Verificou se o validation está ativo?','bool'],['Montado os scripts no template de SR?','bool']],
  'Plataforma':[['Informado na change as versões de implantação (image tag)?','bool'],['Informado na change as versões de rollback?','bool'],['Informado o link da pipeline? (CI-PR ou IMAGE-PROMOTION – PR)','bool'],['Verificado no repositório do gitlab se o link informado da pipeline está correto?','bool'],['Informado o link do Fortify?','bool'],['Verificado se existe apontamento nos laudos Fortify?','bool'],['Anexado os Laudos Fortify?','bool'],["Verificar se existe ENV's para adicionar em PR? (comparar HO com PR)",'bool'],['Passado para o responsável adicionar em PR e especificado na change?','bool'],['Foi criada rota nova no gateway?','bool']],
  'Github':[['Foram informadas as RUNS para cada componente listado?','bool'],['Foram informados os componentes para implantação?','bool'],['Foram informadas as RUNS de rollback para componentes listados como rollback?','bool'],['Foram informados os componentes de rollback?','bool'],['Foram validadas as versões das RUNs que serão executadas no ambiente produtivo?','bool'],['Foram validadas as versões das RUNs que serão executadas no ambiente produtivo em caso de rollback?','bool']],
  'Testes & validação':[['Os cenários de teste que serão executados após a implantação foram alinhados com os gestores?','bool'],['Liste os cenários de teste que serão executados após a implantação.','texto'],['Observação','texto'],['Diffs validadas com o tech lead','bool'],['Componentes listados no Release Train informados no corpo da TASK da Change?','bool'],['Double Check nas variáveis de CI-PR ou IMAGE-PROMOTION – PR?','bool'],['Algum cenário foi testado com parâmetros diferentes do esperado em produção? Qual impacto? (ex: datas de início/fim, quantidade de itens)','texto'],['Algum cenário testado com configurações de ambiente diferentes do esperado em produção? (ex: comunicações externas desligadas, inputs manuais em base, cruzamento de ambiente)','texto'],['Foi avaliado se está sendo levado algum componente/campo de base que só existe em homologação e não faz parte da implantação? (ex: CNPJ Alfa)','texto']],
 };
 let n=0; const out=[];
 for(const [categoria,items] of Object.entries(def)) for(const [texto,tipo] of items){ n++; out.push({id:'ck-'+String(n).padStart(3,'0'), categoria, texto, tipo, obrigatorio:true, ativo:true}); }
 return out;
}
if(checklist===null){ checklist=seedChecklist(); persistChecklist(); }
function checklistItems(){ return checklist.filter(i=>i.ativo); }
function isAnswered(v){ return v!==undefined && String(v).trim()!==''; }
function checklistStatus(change){
 const req=checklistItems().filter(i=>i.obrigatorio); const ans=change.checklist||{};
 const done=req.filter(i=>isAnswered(ans[i.id])).length;
 const naoCount=checklistItems().filter(i=>i.tipo==='bool' && ans[i.id]==='Não').length;
 return {total:req.length, done, pending:req.length-done, naoCount, complete: req.length? done===req.length : true};
}
function seedChecklistAnswers(mode){
 const items=checklistItems(); const ans={};
 const n = mode==='full'? items.length : Math.ceil(items.length*0.55);
 items.slice(0,n).forEach((it,idx)=>{
  if(it.tipo==='numero') ans[it.id]=String([0,1,2,0,1][idx%5]);
  else if(it.tipo==='texto') ans[it.id]='Validado conforme processo da squad.';
  else ans[it.id]= idx%9===0?'Não':(idx%4===0?'N/A':'Sim');
 });
 return ans;
}

// Catálogo de casos, dimensões, etapas e helpers vêm de tests-store.js (compartilhado).
// Resumo de execução por change, derivado do status por etapa (execStatus).
function scenarioSummary(change){
 const list=change.cenarios||[];
 const st=list.map(execStatus);
 const ok=st.filter(s=>s==='OK').length, falhou=st.filter(s=>s==='Falhou').length, na=st.filter(s=>s==='N/A').length, exe=st.filter(s=>s==='Em execução').length;
 return {total:list.length, ok, falhou, na, exe, pend:list.length-ok-falhou-na-exe, complete:list.length>0 && (ok+na)===list.length};
}

// ---- Store de changes -------------------------------------------------------
const changesKey = 'issueflow.changes.v1';
let changes;
let stored=null; try{ stored=localStorage.getItem(changesKey); }catch{ stored=null; }
if(stored===null){ changes=null; }
else { try{ const saved=JSON.parse(stored); changes=Array.isArray(saved)?saved:[]; }catch{ changes=[]; } }
function changesAreFresh(){try{if(localStorage.getItem(changesKey)!==stored){notify('As changes foram atualizadas em outra tela. Atualize a página antes de salvar.');return false;}return true;}catch{return false;}}
function persist(){try{if(!changesAreFresh())return false;const value=JSON.stringify(changes);localStorage.setItem(changesKey,value);stored=value;return true;}catch{return false;}}

// Invariante: cada issue pertence a no máximo UMA change ativa (não rejeitada/não realizada).
function isFinal(s){ return s==='Rejeitada' || s==='Não realizada' || s==='Rollback realizado'; }
function activeChangeOf(issueId, exceptId){ return changes.find(c=>c.id!==exceptId && !isFinal(c.status) && (c.issueIds||[]).includes(issueId)); }
function availableIssues(exceptId){ return issues.filter(i=>!activeChangeOf(i.idIssue, exceptId)); }
function changeForIssue(issueId){ const a=activeChangeOf(issueId,null); if(a) return a; return changes.find(c=>(c.issueIds||[]).includes(issueId))||null; }

// Seeds de demonstração (issues reais; inclui uma change cross-squad).
function seedChanges(){
 const mk=(ids, extra)=>{
  const list=ids.map(id=>issues.find(i=>i.idIssue===id)).filter(Boolean);
  if(list.length!==ids.length) return null;
  const dp=list.map(i=>i.dataProducao).sort().at(-1); const s=summarize(list);
  return {
   id:'chg-'+ids[0].toLowerCase(), equipe:list[0].squad, dataProducao:dp, dataAberturaChange:subtractDays(dp,3),
   inicioHom:s.inicioHom, fimHom:s.fimHom, componentes:s.componentes, issueIds:list.map(i=>i.idIssue),
   rdm:'', horario:'19:00', inicioPrevisto:'', finalPrevisto:'', consumo:'',
   smeTl:'', po:'', flex:'Não', on:'Não', justificativaOn:'',
   status:'Em aprovação', observacao:'', motivo:motivoFor(list),
   reprogramacoes:0, aprovadaPor:'', aprovadaEm:'', historico:[{quando:'2026-10-05 09:00',tipo:'criada'}],
   ...extra,
  };
 };
 const out=[];
 const c1=mk(['ISS-1047'],{ rdm:'CHG1048771', smeTl:'Mavi', po:'A definir', observacao:'Validação de biometria na janela noturna.' });
 const c2=mk(['ISS-1043'],{ rdm:'CHG1050120', smeTl:'Edigley Ramos', po:'Monique Salim', flex:'Sim', on:'Sim',
  justificativaOn:'Correção de incidente no serviço de limites; change validada junto ao time de fatura.',
  inicioPrevisto:'20:30', finalPrevisto:'00:30', consumo:consumo('20:30','00:30'),
  status:'Aprovada', aprovadaPor:'Giancarlo', aprovadaEm:'2026-10-06 10:30',
  historico:[{quando:'2026-10-05 09:00',tipo:'criada'},{quando:'2026-10-06 10:30',tipo:'aprovada',por:'Giancarlo'}] });
 // Cross-squad: Investimentos (owner) + Crédito, mesma subida 21/10.
 const c3=mk(['ISS-1046','ISS-1054','ISS-1057'],{ equipe:'Investimentos', rdm:'CHG1053297', smeTl:'Eduardo Augusto', po:'Bruna Magyar', flex:'Sim', on:'Sim',
  justificativaOn:'Validar regressivos dos componentes migrados para Azure. Change conjunta Investimentos + Crédito pelos componentes compartilhados (api-clientes/api-contas).',
  inicioPrevisto:'19:30', finalPrevisto:'23:30', consumo:consumo('19:30','23:30'),
  status:'Em aprovação', reprogramacoes:1,
  observacao:'Subida conjunta de duas squads na mesma janela. Pontos de atenção monitorados pelo time.',
  historico:[{quando:'2026-10-02 14:00',tipo:'criada'},
   {quando:'2026-10-05 16:20',tipo:'reprogramada',de:'2026-10-16',para:'2026-10-21',motivo:'Bug encontrado',por:'Eduardo Augusto',nota:'Regressivo apontou falha; nova janela acordada entre as squads.'}] });
 const c4=mk(['ISS-1055'],{ rdm:'CHG1051480', smeTl:'Carla Nunes', po:'Rafael Prado',
  inicioPrevisto:'19:00', finalPrevisto:'21:00', consumo:consumo('19:00','21:00'),
  status:'Executada', aprovadaPor:'Patrícia Lemos', aprovadaEm:'2026-10-09 11:00',
  observacao:'Ajuste de mensagens de cadastro. Subida tranquila na janela.',
  historico:[{quando:'2026-10-07 10:00',tipo:'criada'},{quando:'2026-10-09 11:00',tipo:'aprovada',por:'Patrícia Lemos'},
   {quando:'2026-10-12 19:40',tipo:'executada',nota:'Subiu sem incidentes; validação pós-deploy OK.'}] });
 const c5=mk(['ISS-1053','ISS-1061'],{ rdm:'TBD', smeTl:'Edigley Ramos', po:'Monique Salim', status:'Rejeitada',
  observacao:'Desbloqueio de cartão + validação de fatura em ambiente isolado.',
  historico:[{quando:'2026-10-08 09:30',tipo:'criada'},
   {quando:'2026-10-11 15:10',tipo:'rejeitada',motivo:'Comitê de Mudança',por:'Comitê de Mudança',nota:'Faltou plano de rollback aprovado. Reprogramar após ajuste.'}] });
 for(const c of [c1,c2,c3,c4,c5]) if(c) out.push(c);
 // Checklists: Aprovada/Executada completos; os demais parciais (para demonstrar o aviso).
 const clModes={'chg-iss-1043':'full','chg-iss-1055':'full'};
 for(const c of out) c.checklist=seedChecklistAnswers(clModes[c.id]||'partial');
 // Execuções de teste (demo) em duas changes — marcadas por etapa.
 const ex=(nome,tipo,etapaAlvo,fill,extra)=>{
  const e={id:'ex-demo-'+Math.random().toString(36).slice(2,8), casoId:null, nome, tipo, etapaAlvo, resp:(extra&&extra.resp)||'', jira:(extra&&extra.jira)||'', pedido:(extra&&extra.pedido)||'', validadoHO:!!(extra&&extra.ho), etapas:{}};
  const ap=stagesUpTo(etapaAlvo);
  if(fill==='ok'){ for(const s of ap) e.etapas[s]='OK'; }
  else if(fill==='partial'){ for(const s of ap.slice(0,Math.ceil(ap.length/2))) e.etapas[s]='OK'; }
  else if(fill==='fail'){for(const s of ap.slice(0,-1))e.etapas[s]='OK';if(ap.length){const stage=ap[ap.length-1];e.etapas[stage]='Falhou';e.motivosEtapas={[stage]:'Exemplo de falha na validação do pedido. Conferir evidência no Jira.'};}}
  return e;
 };
 const c3o=out.find(c=>c.id==='chg-iss-1046');
 if(c3o){ c3o.cenariosLink='AGROFIN-12169'; c3o.cenarios=[
  ex('Especialista - CPR - PJ - Alienação - Sem Cotação - Agrícola','Automática','Desembolso','ok',{resp:'Nat',jira:'AGROFIN-12421',pedido:'423940',ho:true}),
  ex('Especialista - CPR - PJ - Hipoteca - Agrícola - Com Cotação Agrolink','Automática','Desembolso','ok',{resp:'Poli',jira:'AGROFIN-12421',pedido:'423944',ho:true}),
  ex('Cliente - Custeio - Penhor Agrícola - Cancelamento','Manual','Criação de Pedido','fail',{resp:'Bianca',jira:'AGROFIN-12484'}),
  ex('Assessor - CPR - PF - Hipoteca - Pecuário','Automática','Desembolso','',{resp:'Adriano'}),
  ex('Especialista - Custeio - PF - Aval - Pecuário','Automática','Desembolso','partial',{resp:'Vinicius'}),
 ]; }
 const c2o=out.find(c=>c.id==='chg-iss-1043');
 if(c2o){ c2o.cenariosLink=''; c2o.cenarios=[
  ex('Cliente - CPR - PF - Aval - Agrícola','Automática','Desembolso','ok',{resp:'Leonardo',ho:true}),
  ex('Assessor - Custeio - PF - Alienação - Pecuário','Automática','Simulação','ok',{resp:'Adriano'}),
 ]; }
 return out;
}
if(changes===null){ changes=seedChanges(); persist(); }

// ---- Store de freeze --------------------------------------------------------
const freezesKey = 'issueflow.freezes.v1';
let freezes;
let fstored=null; try{ fstored=localStorage.getItem(freezesKey); }catch{ fstored=null; }
if(fstored===null){ freezes=null; }
else { try{ const saved=JSON.parse(fstored); freezes=Array.isArray(saved)?saved:[]; }catch{ freezes=[]; } }
function persistFreezes(){ try{ localStorage.setItem(freezesKey, JSON.stringify(freezes)); return true; }catch{ return false; } }
function seedFreezes(){
 return [
  {id:'fz-snow', nome:'Freeze ServiceNow', dataInicio:'2026-10-08', dataFim:'2026-10-08', escopo:'componentes', termos:['servicenow'], descricao:'Janela de manutenção do ServiceNow. Componentes integrados ao ServiceNow não podem subir.'},
  {id:'fz-pix', nome:'Freeze Pix (estabilidade)', dataInicio:'2026-10-13', dataFim:'2026-10-14', escopo:'componentes', termos:['pix'], descricao:'Período de estabilização do Pix. Componentes de Pix bloqueados para subida.'},
 ];
}
if(freezes===null){ freezes=seedFreezes(); persistFreezes(); }
function freezesFor(dataProd, componentes){
 return freezes.filter(f=> dataProd>=f.dataInicio && dataProd<=f.dataFim &&
  (f.escopo==='total' || (componentes||[]).some(c=>(f.termos||[]).some(t=>c.toLocaleLowerCase('pt-BR').includes(t.toLocaleLowerCase('pt-BR'))))));
}
function freezeNames(dataProd, componentes){ return freezesFor(dataProd,componentes).map(f=>f.nome); }

// ---- Ciclo de vida ----------------------------------------------------------
function logHistory(change, ev){ (change.historico = change.historico || []).push({quando:nowStamp(), ...ev}); }
function commit(change, toast){if(!persist()){notify('Não foi possível salvar. Atualize a página para carregar as changes atuais.');return false;}render(); if($('#quickActionDialog').open) $('#quickActionDialog').close(); if($('#detailDialog').open) showDetail(change); notify(toast); }
function persistIssues(){ try{ localStorage.setItem(storageKey, JSON.stringify(issues)); return true; }catch{ return false; } }
// A change é dona da janela: grava data de subida + abertura nas issues vinculadas.
function applyDatesToIssues(change){
 for(const id of change.issueIds){ const iss=issues.find(i=>i.idIssue===id); if(iss){ iss.dataProducao=change.dataProducao; iss.dataAberturaChange=change.dataAberturaChange; } }
 persistIssues();
}
function requireOpen(change){if(change?.encerramento){notify('GMUD encerrada: disponível apenas para consulta.');return false;}return true;}
function resetApproval(change,nota){if(change.status==='Aprovada'){change.status='Em aprovação';delete change.aprovadaPor;delete change.aprovadaEm;delete change.hoRevisionAprovada;logHistory(change,{tipo:'editada',nota:nota+' Nova aprovação necessária.'});}}
function aprovar(change, {por, checklistIncompleto, checklistInfo}){
 if(!requireOpen(change)||productionPrerequisites(change).length)return;
 change.hoRevisionAprovada=productionHORevision(change);change.status='Aprovada'; change.aprovadaPor=por; change.aprovadaEm=nowStamp();
 const nota = checklistIncompleto ? `Aprovada com checklist incompleto (${checklistInfo}).` : undefined;
 logHistory(change,{tipo:'aprovada',por,nota});
 commit(change, checklistIncompleto ? `Change aprovada com checklist INCOMPLETO (${checklistInfo}).` : `Subida aprovada por ${por}.`);
}
function reprogramar(change, {novaData,novoHorario,motivo,por,nota}){
 if(!requireOpen(change))return;
 invalidateProductionAcceptance(change);
 if(change.pipeline||['Executada','Rollback realizado'].includes(change.status)){logHistory(change,{tipo:'teste_prod',nota:'Resultados preservados antes da reprogramação. A próxima subida terá validação pendente.',testes:structuredClone(change.cenarios||[])});for(const sc of change.cenarios||[]){sc.etapas={};sc.motivosEtapas={};delete sc.resultadoProducao;}delete change.validacaoIniciada;}
 delete change.pipeline;delete change.encerramento;const de=change.dataProducao; change.dataProducao=novaData; if(novoHorario) change.horario=novoHorario;
 change.dataAberturaChange=subtractDays(novaData,3);
 change.reprogramacoes=(change.reprogramacoes||0)+1; change.status='Em aprovação';
 applyDatesToIssues(change);
 logHistory(change,{tipo:'reprogramada',de,para:novaData,motivo,por,nota}); commit(change,`Change reprogramada para ${date(novaData)}. Issues vinculadas atualizadas.`);
}
function rejeitar(change, {motivo,por,nota}){ if(!requireOpen(change))return;change.status='Rejeitada'; logHistory(change,{tipo:'rejeitada',motivo,por,nota}); commit(change,'Change rejeitada. Issues liberadas para nova change.'); }
function executar(change, {nota}){ change.status='Executada'; logHistory(change,{tipo:'executada',nota}); commit(change,'Change marcada como executada.'); }
function naoRealizar(change, {motivo,por,nota}){ if(!requireOpen(change))return;change.status='Não realizada'; logHistory(change,{tipo:'nao_realizada',motivo,por,nota}); commit(change,'Change marcada como não realizada.'); }
function removeChange(change){ if(!requireOpen(change))return;changes=changes.filter(c=>c.id!==change.id); const ok=persist(); render(); notify(ok?'Change excluída. Issues liberadas.':'Change excluída nesta sessão.'); }

// ---- Composição (criar / vincular / editar) ---------------------------------
let composeEditingId=null, composeSelected=new Set();
function composeIssues(){ return issues.filter(i=>composeSelected.has(i.idIssue)); }
function openCompose({editing=null, presetDate=null, presetIssueIds=null, presetOwner=null}={}){
 if(editing&&!requireOpen(editing))return;
 composeEditingId = editing ? editing.id : null;
 composeSelected = new Set(editing ? (editing.issueIds||[]).filter(id=>issues.some(i=>i.idIssue===id)) : (presetIssueIds||[]));
 const f=$('#changeForm'), el=f.elements; delete f.dataset.motivoEdited;
 el.equipe.replaceChildren(...[...new Set(issues.map(i=>i.squad))].sort().map(sq=>new Option(sq,sq)));
 const sel=composeIssues();
 el.equipe.value = editing ? editing.equipe : (presetOwner || sel[0]?.squad || issues[0].squad);
 el.dataProducao.value = editing ? editing.dataProducao : (presetDate || sel.map(i=>i.dataProducao).sort().at(-1) || todayIso());
 const b = editing || {};
 el.rdm.value=b.rdm||''; el.horario.value=b.horario||'19:00';
 el.inicioPrevisto.value=b.inicioPrevisto||''; el.finalPrevisto.value=b.finalPrevisto||'';
 el.smeTl.value=b.smeTl||''; el.po.value=b.po||'';el.timeExecutor.value=b.timeExecutor||b.pipeline?.time||'';
 el.flex.value=b.flex||'Não'; el.on.value=b.on||'Não';
 el.justificativaOn.value=b.justificativaOn||''; el.observacao.value=b.observacao||'';
 el.motivo.value = b.motivo || motivoFor(sel);
 $('#pickerSearch').value='';
 $('#changeEyebrow').textContent = editing?'EDITAR / VINCULAR ISSUES':'NOVA CHANGE';
 $('#changeTitle').textContent = editing?(editing.rdm||'RDM sem número'):'Cadastrar RDM';
 $('#changeError').textContent='';
 renderPicker(); renderComposeSummary(); updateConsumo();
 $('#changeDialog').showModal();
}
function renderPicker(){
 const term=$('#pickerSearch').value.trim().toLocaleLowerCase('pt-BR');
 const avail=availableIssues(composeEditingId)
  .filter(i=>!term||[i.idIssue,i.squad,i.descricao,...i.servicos].some(v=>v.toLocaleLowerCase('pt-BR').includes(term)))
  .sort((a,b)=>a.dataProducao.localeCompare(b.dataProducao)||a.squad.localeCompare(b.squad)||a.idIssue.localeCompare(b.idIssue));
 const picker=$('#issuePicker'); picker.replaceChildren();
 picker.append(element('p','picker-caption',`${composeSelected.size} selecionada(s) · ${avail.length} disponível(is) para vincular`));
 for(const issue of avail){
  const row=element('label','issue-check'+(composeSelected.has(issue.idIssue)?' on':''));
  const cb=element('input'); cb.type='checkbox'; cb.checked=composeSelected.has(issue.idIssue);
  cb.onchange=()=>{ cb.checked?composeSelected.add(issue.idIssue):composeSelected.delete(issue.idIssue); if(!$('#changeForm').dataset.motivoEdited) $('#changeForm').elements.motivo.value=motivoFor(composeIssues()); renderPicker(); renderComposeSummary(); };
  const info=element('div','issue-check-info');
  info.append(element('strong','',issue.idIssue),element('span','',issue.descricao),element('small','',`${issue.squad} · sobe ${date(issue.dataProducao)} · ${issue.servicos.join(', ')}`));
  if(conflictsFor(issue,issues).length) info.append(element('span','badge red','Concorrência'));
  row.append(cb,info); picker.append(row);
 }
 if(!avail.length) picker.append(element('p','muted-note','Nenhuma issue disponível com esse filtro (as demais já estão em outra change ativa).'));
}
function renderComposeSummary(){
 const list=composeIssues(); const s=summarize(list);
 const data=$('#changeForm').elements.dataProducao.value;
 const squads=[...new Set(list.map(i=>i.squad))];
 const box=$('#autoSummary'); box.replaceChildren();
 const pairs=[
  ['Squads envolvidas', squads.join(', ')||'—'],
  ['Data da subida', data?date(data):'—'],
  ['Abertura RDM (−3 corridos)', data?date(subtractDays(data,3)):'—'],
  ['Janela de homologação', s.inicioHom?`${date(s.inicioHom)} → ${date(s.fimHom)}`:'—'],
  ['Componentes', s.componentes.join(', ')||'—'],
 ];
 for(const [l,v] of pairs){ const it=element('div'); it.append(element('small','',l),element('strong','',v)); box.append(it); }
 const fz=data?freezeNames(data,s.componentes):[];
 if(fz.length) box.append(element('p','auto-summary-warning',`⛔ Em freeze nesta data: ${fz.join(', ')}. Avalie outra data de subida.`));
 if(s.temConcorrencia) box.append(element('p','auto-summary-warning','⚠ Há issues com concorrência de componentes na homologação.'));
}
function updateConsumo(){ const el=$('#changeForm').elements; $('#consumoValue').textContent=consumo(el.inicioPrevisto.value,el.finalPrevisto.value)||'—'; }

// ---- Modal de detalhe + ações -----------------------------------------------
function actBtn(label, cls, onclick){ const b=element('button',cls,label); b.type='button'; b.onclick=onclick; return b; }
function actionForm(fields, onConfirm, confirmLabel){
 const box=element('div','action-form'); const inputs={};
 for(const f of fields){
  const label=element('label','',f.label); let input;
  if(f.type==='select'){ input=element('select'); for(const o of f.options) input.append(new Option(o,o)); if(f.value)input.value=f.value; }
  else if(f.type==='textarea'){ input=element('textarea'); input.rows=2; if(f.placeholder)input.placeholder=f.placeholder; }
  else { input=element('input'); input.type=f.type||'text'; if(f.value)input.value=f.value; if(f.placeholder)input.placeholder=f.placeholder; }
  label.append(input); box.append(label); inputs[f.name]=input;
 }
 const err=element('p','action-error');
 const confirm=element('button','primary',confirmLabel||'Confirmar'); confirm.type='button';
 confirm.onclick=()=>{if(!changesAreFresh()){err.textContent='Atualize a página: houve alteração em outra tela.';return;} const vals={}; for(const k in inputs){ const v=inputs[k].value; vals[k]=typeof v==='string'?v.trim():v; } const msg=onConfirm(vals); if(msg) err.textContent=msg; };
 box.append(confirm, err); return box;
}
const actionBuilders = {
 aprovar: change => {
  const st=checklistStatus(change);
  const form=actionForm([{name:'por',label:'Gerente responsável',placeholder:'Quem autoriza a subida'}],
   v=>{ if(!v.por) return 'Informe quem aprovou.';
    const problems=productionPrerequisites(change);if(problems.length)return problems.join(' ');
    if((!st.complete||st.naoCount) && !(form.querySelector('.ack-incomplete input')?.checked)) return `Checklist com ${st.pending} pendentes e ${st.naoCount} itens de atenção. Revise ou marque “Aprovar mesmo assim”.`;
    aprovar(change,{por:v.por, checklistIncompleto:!st.complete||st.naoCount>0, checklistInfo:`${st.done}/${st.total}`}); return null;
   }, 'Confirmar aprovação da subida');
  const readiness=element('div','approval-readiness');const plans=hoPlans(),accepted=(change.issueIds||[]).filter(id=>plans[id]?.aceite&&hoComplete(plans[id])).length;readiness.append(element('p','',`Homologação: ${accepted}/${(change.issueIds||[]).length} issues com aceite. Checklist: ${st.done}/${st.total} respondidos · ${st.pending} pendentes · ${st.naoCount} itens de atenção. Testes de PROD: ${(change.cenarios||[]).length}.`));for(const problem of productionPrerequisites(change))readiness.append(element('p','action-error',problem));form.insertBefore(readiness,form.firstChild);
  if(!st.complete||st.naoCount){
   const warn=element('div','ack-incomplete');
   const open=element('button','link-btn','Abrir checklist'); open.type='button'; open.onclick=()=>{ $('#detailDialog').close(); $('#quickActionDialog').close(); openChecklist(change); };
   const lbl=element('label','ack-line'); const cb=element('input'); cb.type='checkbox';
   lbl.append(cb, document.createTextNode(` ⚠ Checklist: ${st.pending} pendentes e ${st.naoCount} itens de atenção. Aprovar mesmo assim (fica registrado no histórico).`));
   warn.append(lbl, open); form.insertBefore(warn, form.querySelector('.primary'));
  }
  return form;
 },
 reprogramar: change => actionForm(
  [{name:'novaData',label:'Nova data de subida',type:'date',value:change.dataProducao},
   {name:'novoHorario',label:'Novo horário',type:'time',value:change.horario||'19:00'},
   {name:'motivo',label:'Motivo',type:'select',options:motivos,value:'Bug encontrado'},
   {name:'por',label:'Responsável',placeholder:'Quem solicitou'},
   {name:'nota',label:'Observação (opcional)',type:'textarea',placeholder:'Detalhe o motivo'}],
  v=>{ if(!v.novaData||!v.por||!v.motivo) return 'Informe data, responsável e motivo.'; reprogramar(change,v); return null; }, '↻ Reprogramar'),
 rejeitar: change => actionForm(
  [{name:'motivo',label:'Motivo',type:'select',options:motivos,value:'Comitê de Mudança'},
   {name:'por',label:'Responsável',placeholder:'Quem rejeitou'},
   {name:'nota',label:'Observação (opcional)',type:'textarea'}],
  v=>{ rejeitar(change,v); return null; }, '✗ Rejeitar'),
 executar: change => actionForm([{name:'nota',label:'Observação (opcional)',type:'textarea',placeholder:'Pontos de atenção na execução'}],
  v=>{ executar(change,v); return null; }, '✓ Confirmar execução'),
 naoRealizar: change => actionForm(
  [{name:'motivo',label:'Motivo',type:'select',options:motivos,value:'Bug encontrado'},
   {name:'por',label:'Responsável',placeholder:'Quem registrou'},
   {name:'nota',label:'Observação (opcional)',type:'textarea'}],
  v=>{ naoRealizar(change,v); return null; }, '✗ Registrar não realizada'),
};
function openQuickAction(change,key){
 $('#quickActionTitle').textContent=change.rdm||'GMUD sem número';
 const explanation={aprovar:'Autoriza a implantação desta GMUD em produção. Não confirma que a subida já ocorreu.',reprogramar:'Altera a data ou o horário da subida e devolve a GMUD para aprovação. O motivo fica no histórico.',rejeitar:'Registra que a subida não foi autorizada. Informe o motivo da decisão.',confirmarSubida:'Confirma que a implantação já foi realizada e libera os cenários para o PO validar em PROD.',encerrarGmud:'Encerra a GMUD após a subida e a validação dos testes pelo PO.'};
 $('#quickActionSub').textContent=`${change.equipe} · Subida ${date(change.dataProducao)} ${change.horario||''}. ${explanation[key]||''}`;
 $('#quickActionBody').replaceChildren(actionBuilders[key](change));
 $('#quickActionDialog').showModal();
}
$('#closeQuickAction').onclick=()=>$('#quickActionDialog').close();
function renderDetailActions(change, autoAction){
 const box=$('#detailActions'); box.replaceChildren();if(change.encerramento){box.append(element('p','muted-note','GMUD encerrada. Dados preservados para consulta.'));return;}
 const buttons=element('div','action-buttons'); const slot=element('div','action-slot');
 const open=key=>slot.replaceChildren(actionBuilders[key](change));
 const st=change.status; const approvalPhase=st==='Planejada'||st==='Em aprovação';
 if(approvalPhase) buttons.append(actBtn('✓ Aprovar subida','primary',()=>open('aprovar')));
 if(st==='Aprovada'){
  buttons.append(actBtn('✓ Subida realizada','primary',()=>open('confirmarSubida')));
  buttons.append(actBtn('✗ Não realizada','secondary',()=>open('naoRealizar')));
 }
 if(st==='Executada'&&change.aceiteProducao&&!change.encerramento)buttons.append(actBtn('Encerrar GMUD','primary',()=>open('encerrarGmud')));
 if(st==='Executada'||st==='Aprovada')buttons.append(actBtn('Registrar rollback','secondary danger',()=>{openScenarios(change);openRollback();}));
 buttons.append(actBtn('↻ Reprogramar','secondary',()=>open('reprogramar')));
 if(approvalPhase||st==='Aprovada') buttons.append(actBtn('✗ Rejeitar','secondary danger',()=>open('rejeitar')));
 buttons.append(actBtn('✎ Editar / vincular issues','secondary',()=>{ $('#detailDialog').close(); openCompose({editing:change}); }));
 buttons.append(actBtn('🗑 Excluir','secondary danger',()=>{ $('#detailDialog').close(); removeChange(change); }));
 box.append(buttons, slot);
 if(autoAction && actionBuilders[autoAction]) open(autoAction);
}
function renderHistory(change){
 const box=$('#detailHistory'); box.replaceChildren();
 const evs=(change.historico||[]).slice().reverse();
 if(!evs.length){ box.append(element('p','muted-note','Sem histórico registrado.')); return; }
 for(const ev of evs){
  const item=element('div','history-item'); const head=element('div','history-head');
  head.append(element('span','badge '+(histBadge[ev.tipo]||'gray'), histLabel[ev.tipo]||ev.tipo), element('small','',fmtStamp(ev.quando)));
  item.append(head);
  if(ev.tipo==='reprogramada') item.append(element('p','',`De ${date(ev.de)} para ${date(ev.para)}`));
  if(ev.motivo) item.append(element('p','',`Motivo: ${ev.motivo}`));
  if(ev.por) item.append(element('p','',`Responsável: ${ev.por}`));
  if(ev.nota) item.append(element('p','history-note',ev.nota));
  if(ev.testes){const snapshot=element('details','rollback-snapshot');snapshot.append(element('summary','',ev.tipo==='rollback'?'Ver resultados preservados no rollback':'Ver resultados preservados'));for(const sc of ev.testes){const entry=element('div','rollback-snapshot-case');entry.append(element('strong','',sc.nome));for(const stage of executionStages(sc))entry.append(element('p','',`${stage}: ${sc.etapas?.[stage]||'Pendente'}${sc.motivosEtapas?.[stage]?' · '+sc.motivosEtapas[stage]:''}`));snapshot.append(entry);}item.append(snapshot);}

  box.append(item);
 }
}
function showDetail(change, autoAction){
 $('#detailTitle').textContent=change.rdm||'RDM sem número';
 const squads=squadsOf(change); const reprog=change.reprogramacoes?` · ↻ ×${change.reprogramacoes}`:'';
 $('#detailSub').textContent=`Abre: ${change.equipe} · Subida ${date(change.dataProducao)} ${change.horario||''} · ${change.status}${reprog}`;
 const fz=freezesFor(change.dataProducao, change.componentes);
 const fbox=$('#detailFreeze'); fbox.replaceChildren(); fbox.hidden=!fz.length;
 for(const f of fz){ const period=f.dataInicio===f.dataFim?date(f.dataInicio):`${date(f.dataInicio)}–${date(f.dataFim)}`;
  fbox.append(element('p','',`⛔ Em freeze: ${f.nome} (${period}). ${f.escopo==='total'?'Nenhuma subida permitida no período.':'Bloqueia componentes: '+f.termos.join(', ')+'.'} Reprograme a subida.`)); }
 const sbox=$('#detailSummary'); sbox.replaceChildren();
 const pairs=[
  ['Time responsável',change.equipe],['Squads envolvidas',squads.join(', ')||'—'],
  ['Subida',`${date(change.dataProducao)} ${change.horario||''}`],['Abertura RDM',date(change.dataAberturaChange)],
  ['Janela homologação',change.inicioHom?`${date(change.inicioHom)} → ${date(change.fimHom)}`:'—'],['Consumo',change.consumo||'—'],
  ['SME/TL',change.smeTl||'—'],['PO',change.po||'—'],['Time executor',change.timeExecutor||change.pipeline?.time||'—'],['Subida',change.status==='Executada'?'Realizada':change.pipeline?.resultado==='Falhou'?'Falha registrada':'Aguardando confirmação do TL'],['FLEX / ON',`${change.flex} / ${change.on}`],['Issues',change.issueIds.join(', ')],
 ];
 for(const [l,v] of pairs){ const it=element('div'); it.append(element('small','',l),element('strong','',v)); sbox.append(it); }
 if(change.justificativaOn){ const j=element('div','detail-wide'); j.append(element('small','','Justificativa ON'),element('p','',change.justificativaOn)); sbox.append(j); }
 if(change.motivo){ const m=element('div','detail-wide'); m.append(element('small','','Motivo / Justificativa'),element('pre','detail-motivo',change.motivo)); sbox.append(m); }
 renderDetailChecklist(change);
 renderDetailScenarios(change);
 renderDetailActions(change, autoAction);
 renderHistory(change);
 if(!$('#detailDialog').open) $('#detailDialog').showModal();
}
function renderDetailScenarios(change){
 const box=$('#detailScenarios'); box.replaceChildren();
 const s=scenarioSummary(change);
 const line=element('div','ck-detail-line');
 if(!s.total){ line.append(element('span','muted-note','Nenhum cenário de teste definido.')); }
 else {
  line.append(element('span','badge '+(s.complete?'green':(s.falhou?'red':'orange')), s.complete?'✓ Todos validados':`${s.ok}/${s.total} OK`));
  if(s.falhou) line.append(element('span','badge red',`✗ ${s.falhou} falhou`));
  if(s.pend) line.append(element('span','badge orange',`${s.pend} pendente(s)`));
  if(change.cenariosLink) line.append(element('span','ck-hint',`Evidências: ${change.cenariosLink}`));
 }
 const btn=element('button','secondary', s.total?'Abrir cenários de teste':'Definir cenários de teste'); btn.type='button'; btn.onclick=()=>openScenarios(change);
 box.append(line, btn); renderProductionAcceptance(box,change);
}
function renderDetailChecklist(change){
 const box=$('#detailChecklist'); box.replaceChildren();
 const s=checklistStatus(change);
 const bar=element('div','progress'); const fill=element('div','progress-fill '+(s.complete?'ok':'warn')); fill.style.width=`${s.total?Math.round(s.done/s.total*100):100}%`; bar.append(fill);
 const line=element('div','ck-detail-line');
 line.append(element('span','badge '+(s.complete&&!s.naoCount?'green':'orange'), s.complete?'Checklist respondido':`Checklist ${s.done}/${s.total}`));
 if(s.naoCount) line.append(element('span','badge orange',`⚠ ${s.naoCount} item(ns) "Não"`));
 if(!s.complete) line.append(element('span','ck-hint',`${s.pending} item(ns) pendente(s)`));
 const btn=element('button','secondary','Preencher / revisar checklist'); btn.type='button'; btn.onclick=()=>openChecklist(change);
 box.append(bar, line, btn);
}

// ---- Backlog de sugestões (por data, cross-squad) ---------------------------
function suggestionGroups(){
 const map=new Map();
 for(const i of availableIssues(null)){ if(!map.has(i.dataProducao)) map.set(i.dataProducao,[]); map.get(i.dataProducao).push(i); }
 return [...map.entries()].map(([d,list])=>({dataProducao:d, issues:list, ...summarize(list)})).sort((a,b)=>a.dataProducao.localeCompare(b.dataProducao));
}

// ---- Freeze: lista e formulário ---------------------------------------------
let editingFreezeId=null;
function impactOf(f){
 const inRange=d=>d>=f.dataInicio&&d<=f.dataFim;
 const match=comp=> f.escopo==='total' || (comp||[]).some(c=>(f.termos||[]).some(t=>c.toLocaleLowerCase('pt-BR').includes(t.toLocaleLowerCase('pt-BR'))));
 const ch=changes.filter(c=>inRange(c.dataProducao)&&match(c.componentes)).length;
 const grp=suggestionGroups().filter(g=>inRange(g.dataProducao)&&match(g.componentes)).length;
 return ch+grp;
}
function renderFreezes(){
 const list=$('#freezeList'); list.replaceChildren();
 for(const f of [...freezes].sort((a,b)=>a.dataInicio.localeCompare(b.dataInicio))){
  const card=element('article','freeze-card');
  const head=element('div','freeze-head'); head.append(element('strong','',f.nome), element('span','badge '+(f.escopo==='total'?'red':'orange'), f.escopo==='total'?'Total':'Componentes')); card.append(head);
  card.append(element('p','freeze-period', f.dataInicio===f.dataFim?date(f.dataInicio):`${date(f.dataInicio)} – ${date(f.dataFim)}`));
  if(f.escopo!=='total') card.append(element('p','freeze-terms','Bloqueia componentes com: '+(f.termos||[]).join(', ')));
  if(f.descricao) card.append(element('p','freeze-desc',f.descricao));
  const n=impactOf(f); card.append(element('p','freeze-impact', n?`Impacta ${n} subida(s) cadastrada(s)/sugerida(s).`:'Sem subidas no período.'));
  const actions=element('div','freeze-actions');
  actions.append(actBtn('Editar','secondary',()=>openFreeze(f)), actBtn('Excluir','secondary danger',()=>removeFreeze(f)));
  card.append(actions); list.append(card);
 }
 $('#freezeEmpty').hidden=freezes.length>0;
}
function openFreeze(f){
 editingFreezeId=f?f.id:null;
 $('#freezeEyebrow').textContent=f?'EDITAR FREEZE':'NOVO FREEZE';
 const el=$('#freezeForm').elements;
 el.nome.value=f?.nome||''; el.dataInicio.value=f?.dataInicio||''; el.dataFim.value=f?.dataFim||'';
 el.escopo.value=f?.escopo||'componentes'; el.termos.value=(f?.termos||[]).join(', '); el.descricao.value=f?.descricao||'';
 $('#freezeError').textContent=''; toggleTermos(); $('#freezeDialog').showModal();
}
function toggleTermos(){ $('#termosField').hidden = $('#freezeForm').elements.escopo.value==='total'; }
function removeFreeze(f){ freezes=freezes.filter(x=>x.id!==f.id); const ok=persistFreezes(); render(); notify(ok?'Freeze excluído.':'Freeze excluído nesta sessão.'); }

// ---- Render da página -------------------------------------------------------
let agendaView='todas';
function render(){
 const groups=suggestionGroups();
 $('#statWeek').textContent=changes.filter(c=>periodMatch(c.dataProducao,'semana')).length;
 $('#statApproval').textContent=changes.filter(c=>c.status==='Em aprovação'||c.status==='Planejada').length;
 $('#statFreeze').textContent=changes.filter(c=>freezesFor(c.dataProducao,c.componentes).length).length;
 $('#statPending').textContent=availableIssues(null).length;
 $('#suggestionBadge').textContent=groups.length;

 for(const b of document.querySelectorAll('#agendaViews button')) b.classList.toggle('active', b.dataset.view===agendaView);
 const term=$('#agendaSearch').value.trim().toLocaleLowerCase('pt-BR');
 const statusFilter=$('#agendaStatus').value;
 const rows=$('#agendaRows'); rows.replaceChildren();
 const filtered=changes
  .filter(c=>periodMatch(c.dataProducao,agendaView) && (!statusFilter||c.status===statusFilter)
   && (!term||[c.rdm,c.equipe,c.status,c.motivo,...squadsOf(c),...c.issueIds].some(v=>(v||'').toLocaleLowerCase('pt-BR').includes(term))))
  .sort((a,b)=>a.dataProducao.localeCompare(b.dataProducao)||a.equipe.localeCompare(b.equipe));
 for(const change of filtered){
  const squads=squadsOf(change);
  const tr=document.createElement('tr');
  const rdmCell=document.createElement('td'); rdmCell.className='change-rdm'; rdmCell.append(element('strong','',change.rdm||'TBD'), element('small','',squads.join(' + ')||change.equipe)); tr.append(rdmCell);
  const subida=document.createElement('td'); subida.append(element('strong','',date(change.dataProducao)), element('small','',`${change.horario||'—'} · abertura ${date(change.dataAberturaChange)}`)); tr.append(subida);
  const issuesCell=document.createElement('td'); issuesCell.className='change-issues-cell';
  const ib=element('button','secondary component-button',`${change.issueIds.length} issue(s)`); ib.type='button'; ib.onclick=()=>showDetail(change); issuesCell.append(ib);
  issuesCell.append(element('small','change-issue-ids',change.issueIds.join(', '))); tr.append(issuesCell);
  const st=document.createElement('td'); st.append(element('span','badge '+(statusBadge[change.status]||'gray'),change.status)); if(change.reprogramacoes) st.append(element('small','reprog-note',`↻ reprogramada ×${change.reprogramacoes}`)); tr.append(st);
  const sit=document.createElement('td');
  const fz=freezeNames(change.dataProducao,change.componentes);
  if(fz.length) for(const n of fz) sit.append(element('span','badge red','⛔ '+n));
  const conc=issuesByIds(change.issueIds).some(i=>conflictsFor(i,issues).length); if(conc) sit.append(element('span','badge orange','⚠ Concorrência'));
  if(squads.length>1) sit.append(element('span','badge blue','Cross-squad'));
  if(!fz.length && !conc && squads.length<=1) sit.append(element('span','badge green','OK'));
  const cl=checklistStatus(change);
  const readiness=element('div','change-readiness');
  readiness.append(actBtn(`Checklist ${cl.done}/${cl.total}${cl.naoCount?' · '+cl.naoCount+' atenção':cl.complete?' ✓':''}`,'secondary small'+(cl.complete&&!cl.naoCount?'':' ck-pending'),()=>openChecklist(change)));
  const tests=scenarioSummary(change);
  readiness.append(actBtn(tests.total?`Testes de PROD ${tests.ok}/${tests.total}${tests.falhou?' · '+tests.falhou+' com falha':''}`:'Definir testes de PROD','secondary small',()=>openScenarios(change)));
  sit.append(readiness);tr.append(sit);
  const actions=document.createElement('td'); actions.className='agenda-actions';
  if(change.status==='Planejada'||change.status==='Em aprovação') actions.append(actBtn('Aprovar subida','primary small',()=>openQuickAction(change,'aprovar')));
  if(change.status==='Aprovada') actions.append(actBtn('✓ Subida realizada','primary small',()=>openQuickAction(change,'confirmarSubida')));
  if(change.status==='Executada'){
   if(tests.falhou&&!change.encerramento)actions.append(actBtn('Registrar rollback','secondary small danger',()=>{openScenarios(change);openRollback();}));
   if(change.aceiteProducao&&!change.encerramento)actions.append(actBtn('Encerrar GMUD','primary small',()=>openQuickAction(change,'encerrarGmud')));
   const link=element('a','secondary small',change.aceiteProducao?'Ver validação de PROD':'Validar em PROD');link.href='producao.html?change='+encodeURIComponent(change.id);actions.append(link);
  }
  const next=change.encerramento?'GMUD encerrada':change.aceiteProducao?'Validação concluída pelo PO':change.status==='Executada'?'Próximo passo: validação do PO':change.status==='Aprovada'?'Próximo passo: TL confirma a subida':['Planejada','Em aprovação'].includes(change.status)?'Próximo passo: revisar e aprovar':'';
  if(next)actions.append(element('small','change-next',next));
  const management=element('div','change-management');
  if(!change.encerramento){const edit=actBtn('Editar GMUD','secondary small',()=>openCompose({editing:change}));edit.title='Alterar dados e issues vinculadas';management.append(edit);}
  if(!change.encerramento){const reschedule=actBtn('Reprogramar subida','secondary small',()=>openQuickAction(change,'reprogramar'));reschedule.title='Mudar a data ou o horário e solicitar nova aprovação';management.append(reschedule);}
  if(['Planejada','Em aprovação','Aprovada'].includes(change.status)){const reject=actBtn('Rejeitar subida','secondary small danger',()=>openQuickAction(change,'rejeitar'));reject.title='Não autorizar a subida e registrar o motivo';management.append(reject);}
  management.append(actBtn('Resumo e histórico','secondary small',()=>showDetail(change)));
  actions.append(management);tr.append(actions);
  rows.append(tr);
 }
 $('#agendaEmpty').hidden=filtered.length>0;
 const viewLabel={hoje:'hoje',amanha:'amanhã',semana:'esta semana',todas:'todas as datas'}[agendaView];
 $('#agendaCount').textContent=`${filtered.length} change(s) · ${viewLabel}`;

 const sugList=$('#suggestionList'); sugList.replaceChildren();
 const onlyConcurrency=$('#onlyConcurrency').checked;
 const shown=groups.filter(g=>!onlyConcurrency||g.temConcorrencia);
 for(const group of shown){
  const fz=freezeNames(group.dataProducao,group.componentes);
  const squads=[...new Set(group.issues.map(i=>i.squad))];
  const card=element('article','change-suggestion'+(group.temConcorrencia||fz.length?' has-warning':''));
  const head=element('div','change-suggestion-head'); head.append(element('strong','',`Subida ${date(group.dataProducao)}`), element('span','badge env',`${group.issues.length} issue(s)`)); card.append(head);
  card.append(element('p','change-suggestion-meta',`Squads: ${squads.join(', ')} · Abertura ${date(subtractDays(group.dataProducao,3))} · Homologação ${date(group.inicioHom)} → ${date(group.fimHom)}`));
  const ul=element('ul','change-issue-list');
  for(const issue of group.issues){ const li=element('li'); li.append(element('strong','',issue.idIssue),element('span','',` ${issue.descricao} · ${issue.squad}`)); if(conflictsFor(issue,issues).length) li.append(element('span','badge red','⚠')); ul.append(li); }
  card.append(ul);
  if(fz.length) card.append(element('p','change-suggestion-warning',`⛔ Em freeze: ${fz.join(', ')}.`));
  if(squads.length>1) card.append(element('p','change-suggestion-meta','Pode virar uma change cross-squad (múltiplos times na mesma subida).'));
  const action=element('button','primary','＋ Cadastrar change'); action.type='button'; action.onclick=()=>openCompose({presetDate:group.dataProducao, presetIssueIds:group.issues.map(i=>i.idIssue), presetOwner:squads[0]}); card.append(action);
  sugList.append(card);
 }
 $('#suggestionEmpty').hidden=shown.length>0;
 renderFreezes();
}

// ---- Submit do formulário de change -----------------------------------------
$('#changeForm').addEventListener('input',e=>{ if(e.target.name==='motivo') $('#changeForm').dataset.motivoEdited='1'; if(e.target.name==='dataProducao'||e.target.name==='equipe') renderComposeSummary(); updateConsumo(); });
$('#pickerSearch').addEventListener('input',renderPicker);
$('#changeForm').onsubmit=e=>{
 e.preventDefault();
 if(!changesAreFresh()){$('#changeError').textContent='Atualize a página: houve alteração em outra tela.';return;}
 const list=composeIssues();
 if(!list.length){ $('#changeError').textContent='Selecione ao menos uma issue para a change.'; return; }
 const el=e.target.elements; const dataProducao=el.dataProducao.value;
 if(!dataProducao){ $('#changeError').textContent='Informe a data da subida.'; return; }
 const s=summarize(list);
 const record={
  id: composeEditingId || `chg-${Date.now()}`, equipe:el.equipe.value, dataProducao, dataAberturaChange:subtractDays(dataProducao,3),
  inicioHom:s.inicioHom, fimHom:s.fimHom, componentes:s.componentes, issueIds:list.map(i=>i.idIssue),
  rdm:el.rdm.value.trim(), horario:el.horario.value, inicioPrevisto:el.inicioPrevisto.value, finalPrevisto:el.finalPrevisto.value, consumo:consumo(el.inicioPrevisto.value,el.finalPrevisto.value),
  smeTl:el.smeTl.value.trim(), po:el.po.value.trim(), timeExecutor:el.timeExecutor.value.trim(), flex:el.flex.value, on:el.on.value, justificativaOn:el.justificativaOn.value.trim(), observacao:el.observacao.value.trim(), motivo:el.motivo.value.trim(),
 };
 if(record.on==='Sim' && !record.justificativaOn){ $('#changeError').textContent='Informe a justificativa de participação do ON.'; return; }
 if(composeEditingId){
  const idx=changes.findIndex(c=>c.id===composeEditingId); const prev=changes[idx];if(!requireOpen(prev))return;
  Object.assign(record,{validacaoIniciada:prev.validacaoIniciada,pipeline:prev.pipeline,encerramento:prev.encerramento,checklist:prev.checklist,cenarios:prev.cenarios,cenariosLink:prev.cenariosLink,aceiteProducao:prev.aceiteProducao,hoRevisionAprovada:prev.hoRevisionAprovada});
  record.status=prev.status; record.reprogramacoes=prev.reprogramacoes||0; record.aprovadaPor=prev.aprovadaPor||''; record.aprovadaEm=prev.aprovadaEm||''; record.historico=prev.historico||[];
  const scopeChanged=record.dataProducao!==prev.dataProducao||record.horario!==prev.horario||JSON.stringify(record.issueIds)!==JSON.stringify(prev.issueIds);
  if(scopeChanged){resetApproval(record,'Janela ou issues alteradas.');invalidateProductionAcceptance(record);if(prev.pipeline||['Executada','Rollback realizado'].includes(prev.status)){logHistory(record,{tipo:'teste_prod',nota:'Plano e resultados preservados antes de alterar a janela ou as issues da subida.',testes:structuredClone(prev.cenarios||[])});record.cenarios=(prev.cenarios||[]).map(sc=>({...structuredClone(sc),etapas:{},motivosEtapas:{},resultadoProducao:undefined}));delete record.pipeline;delete record.validacaoIniciada;record.status='Em aprovação';}}

  logHistory(record,{tipo:'editada'}); changes[idx]=record;
 } else { record.status='Em aprovação'; record.reprogramacoes=0; record.aprovadaPor=''; record.aprovadaEm=''; record.historico=[]; logHistory(record,{tipo:'criada'}); changes.unshift(record); }
 applyDatesToIssues(record); // vincular = issues adotam a data da change
 persist(); $('#changeDialog').close(); delete $('#changeForm').dataset.motivoEdited; render();
 notify(composeEditingId?'Change atualizada. Issues vinculadas alinhadas à data da change.':'Change cadastrada e issues vinculadas.');
};
$('#cancelChange').onclick=$('#closeChange').onclick=()=>{ delete $('#changeForm').dataset.motivoEdited; $('#changeDialog').close(); };
$('#newChange').onclick=()=>openCompose({});
$('#closeDetail').onclick=$('#dismissDetail').onclick=()=>$('#detailDialog').close();

// ---- Submit do formulário de freeze -----------------------------------------
$('#freezeForm').elements.escopo.addEventListener('change',toggleTermos);
$('#freezeForm').onsubmit=e=>{
 e.preventDefault(); const el=e.target.elements;
 const nome=el.nome.value.trim(), di=el.dataInicio.value, df=el.dataFim.value||el.dataInicio.value, escopo=el.escopo.value;
 const termos=el.termos.value.split(',').map(s=>s.trim()).filter(Boolean);
 if(!nome){ $('#freezeError').textContent='Informe o nome do freeze.'; return; }
 if(!di){ $('#freezeError').textContent='Informe a data inicial.'; return; }
 if(df<di){ $('#freezeError').textContent='A data final deve ser igual ou posterior à inicial.'; return; }
 if(escopo==='componentes' && !termos.length){ $('#freezeError').textContent='Informe ao menos um termo de componente ou escolha freeze total.'; return; }
 const rec={ id: editingFreezeId||`fz-${Date.now()}`, nome, dataInicio:di, dataFim:df, escopo, termos:escopo==='total'?[]:termos, descricao:el.descricao.value.trim() };
 if(editingFreezeId){ const i=freezes.findIndex(x=>x.id===editingFreezeId); freezes[i]=rec; } else freezes.unshift(rec);
 const ok=persistFreezes(); $('#freezeDialog').close(); render(); notify(ok?'Freeze salvo.':'Freeze salvo nesta sessão.');
};
$('#cancelFreeze').onclick=$('#closeFreeze').onclick=()=>$('#freezeDialog').close();
$('#newFreeze').onclick=()=>openFreeze(null);

// ---- Checklist: preenchimento por change ------------------------------------
let checklistChangeId=null, checklistDraft={};
function checklistProgress(draft){
 const req=checklistItems().filter(i=>i.obrigatorio);
 const done=req.filter(i=>isAnswered(draft[i.id])).length;
 const nao=checklistItems().filter(i=>i.tipo==='bool' && draft[i.id]==='Não').length;
 return {total:req.length, done, pending:req.length-done, nao, complete: req.length? done===req.length : true};
}
function openChecklist(change){
 checklistChangeId=change.id; checklistDraft={...(change.checklist||{})};
 $('#checklistTitle').textContent=`Checklist · ${change.rdm||'RDM sem número'}`;
 $('#saveChecklist').hidden=!!change.encerramento;$('#manageTemplate').hidden=!!change.encerramento;
 $('#checklistSub').textContent=`${change.equipe} · Subida ${date(change.dataProducao)}`;
 renderChecklistForm();if(change.encerramento)for(const control of $('#checklistBody').querySelectorAll('input,button,select,textarea'))control.disabled=true; $('#checklistDialog').showModal();
}
function renderChecklistForm(){
 const p=checklistProgress(checklistDraft);
 const pct=p.total?Math.round(p.done/p.total*100):100;
 $('#checklistProgressText').textContent=`${p.done}/${p.total} · ${pct}%${p.nao?` · ${p.nao} "Não"`:''}${p.complete?' · respondidos ✓':''}`;
 const fill=$('#checklistBar'); fill.style.width=`${pct}%`; fill.className='progress-fill '+(p.complete&&!p.nao?'ok':'warn');
 const onlyPending = $('#checklistOnlyPending') && $('#checklistOnlyPending').checked;
 const body=$('#checklistBody'); body.replaceChildren();
 for(const cat of [...new Set(checklistItems().map(i=>i.categoria))]){
  const all=checklistItems().filter(i=>i.categoria===cat);
  const doneC=all.filter(i=>isAnswered(checklistDraft[i.id])).length;
  const items = onlyPending ? all.filter(i=>!isAnswered(checklistDraft[i.id])) : all;
  if(!items.length) continue;
  const card=element('section','ck-card');
  const head=element('div','ck-card-head');
  head.append(element('span','ck-card-name',cat));
  head.append(element('span','ck-card-prog'+(doneC===all.length?' done':''), doneC===all.length?'✓ respondidos':`${doneC}/${all.length}`));
  card.append(head);
  for(const it of items){
   const val=checklistDraft[it.id]; const answered=isAnswered(val);
   const state = val==='Não' ? 'nao' : (answered ? 'done' : 'pending');
   const row=element('div','ck-row '+state);
   row.append(element('span','ck-ind'));
   row.append(element('div','ck-q',it.texto));
   const ctrl=element('div','ck-ctrl');
   if(it.tipo==='bool'){
    const seg=element('div','ck-seg');
    for(const opt of ['Sim','Não','N/A']){
     const sel=val===opt; const cls=opt==='Não'?'nao':opt==='Sim'?'sim':'na';
     const b=element('button','ck-opt '+cls+(sel?' sel':''),opt); b.type='button';
     b.onclick=()=>{ checklistDraft[it.id]= sel?undefined:opt; renderChecklistForm(); }; seg.append(b);
    }
    ctrl.append(seg);
   } else if(it.tipo==='numero'){ const inp=element('input','ck-input'); inp.type='number'; inp.min='0'; inp.placeholder='0'; inp.value=val||''; inp.oninput=()=>{ checklistDraft[it.id]=inp.value; }; inp.onchange=renderChecklistForm; ctrl.append(inp); }
   else { const inp=element('input','ck-input'); inp.type='text'; inp.placeholder='Resposta'; inp.value=val||''; inp.oninput=()=>{ checklistDraft[it.id]=inp.value; }; inp.onchange=renderChecklistForm; ctrl.append(inp); }
   row.append(ctrl); card.append(row);
  }
  body.append(card);
 }
 if(changes.find(c=>c.id===checklistChangeId)?.encerramento)for(const control of body.querySelectorAll('input,button,select,textarea'))control.disabled=true;
 if(!body.children.length) body.append(element('p','ck-empty','🎉 Nenhum item pendente. Confira os itens de atenção com resposta Não.'));
}
$('#checklistOnlyPending').addEventListener('change',renderChecklistForm);
$('#saveChecklist').onclick=()=>{ const change=changes.find(c=>c.id===checklistChangeId); if(!change||!requireOpen(change)||!changesAreFresh()) return;if(JSON.stringify(change.checklist)!==JSON.stringify(checklistDraft))resetApproval(change,'Checklist alterado.'); change.checklist={...checklistDraft}; persist(); render(); $('#checklistDialog').close(); if($('#detailDialog').open) showDetail(change); notify('Checklist salvo.'); };
$('#closeChecklist').onclick=$('#dismissChecklist').onclick=()=>$('#checklistDialog').close();
$('#manageTemplate').onclick=()=>openTemplate();

// ---- Checklist: editor do modelo --------------------------------------------
let editingTemplateId=null;
function openTemplate(){ fillTemplateForm(null); renderTemplateEditor(); $('#templateDialog').showModal(); }
function fillTemplateForm(it){
 const el=$('#templateForm').elements;
 el.categoria.value=it?.categoria||''; el.texto.value=it?.texto||''; el.tipo.value=it?.tipo||'bool'; el.obrigatorio.checked=it?it.obrigatorio:true;
 $('#tplSubmit').textContent=it?'Salvar item':'＋ Adicionar item'; editingTemplateId=it?it.id:null;
}
function renderTemplateEditor(){
 $('#tplCats').replaceChildren(...[...new Set(checklist.map(i=>i.categoria))].map(c=>{ const o=document.createElement('option'); o.value=c; return o; }));
 const body=$('#templateBody'); body.replaceChildren();
 body.append(element('p','muted-note',`${checklistItems().length} item(ns) ativo(s) de ${checklist.length} no modelo.`));
 for(const cat of [...new Set(checklist.map(i=>i.categoria))]){
  const sec=element('section','ck-cat'); sec.append(element('h4','ck-cat-title',cat));
  for(const it of checklist.filter(i=>i.categoria===cat)){
   const row=element('div','tpl-row'+(it.ativo?'':' inactive'));
   const q=element('div','tpl-q',it.texto); q.append(element('small','',` · ${it.tipo}${it.obrigatorio?' · obrigatório':' · opcional'}${it.ativo?'':' · DESATIVADO'}`));
   const acts=element('div','tpl-acts');
   const tg=element('button','secondary small',it.ativo?'Desativar':'Ativar'); tg.type='button'; tg.onclick=()=>{ it.ativo=!it.ativo; persistChecklist(); renderTemplateEditor(); render(); };
   const ed=element('button','secondary small','Editar'); ed.type='button'; ed.onclick=()=>fillTemplateForm(it);
   const rm=element('button','secondary small danger','Remover'); rm.type='button'; rm.onclick=()=>{ checklist=checklist.filter(x=>x.id!==it.id); persistChecklist(); if(editingTemplateId===it.id) fillTemplateForm(null); renderTemplateEditor(); render(); };
   acts.append(tg,ed,rm); row.append(q,acts); sec.append(row);
  }
  body.append(sec);
 }
}
$('#templateForm').onsubmit=e=>{
 e.preventDefault(); const el=e.target.elements;
 const categoria=el.categoria.value.trim()||'Geral', texto=el.texto.value.trim(), tipo=el.tipo.value, obrigatorio=el.obrigatorio.checked;
 if(!texto){ $('#tplError').textContent='Informe o texto do item.'; return; }
 $('#tplError').textContent='';
 if(editingTemplateId){ const it=checklist.find(x=>x.id===editingTemplateId); if(it) Object.assign(it,{categoria,texto,tipo,obrigatorio}); }
 else { const n=checklist.reduce((m,i)=>Math.max(m, parseInt((i.id.split('-')[1]||'0'),10)),0)+1; checklist.push({id:'ck-'+String(n).padStart(3,'0'),categoria,texto,tipo,obrigatorio,ativo:true}); }
 persistChecklist(); fillTemplateForm(null); renderTemplateEditor(); render();
 if($('#checklistDialog').open) renderChecklistForm();
 notify('Modelo de checklist atualizado.');
};
$('#closeTemplate').onclick=$('#dismissTemplate').onclick=()=>$('#templateDialog').close();

// ---- Cenários de teste: execução por change (por etapa) ---------------------
const stageShortMap={'Simulação':'Sim.','Criação de Pedido':'Pedido','Etapas Time Line':'Timeline','Análise Documental Flex':'Doc Flex','ServiceNow ON':'SNow','Tipo de garantia':'Garantia','Emissão de Contrato':'Contrato','Assinatura e Registro':'Registro','Liberação de Crédito':'Crédito','Desembolso':'Desemb.'};
function stageShort(s){ return stageShortMap[s]||s.split(' ')[0]; }
function tipoBadge(t){ return element('span','badge '+(t==='Automática'?'blue':t==='Manual'?'gray':'env'), t==='Automática'?'Garantia automática':t==='Manual'?'Garantia manual':'Garantia N/A'); }
let scenarioChangeId=null, scenarioDraft=[],productionEvents=[];
function openScenarios(change){
 scenarioChangeId=change.id;productionEvents=[];$('#scenarioError').textContent='';$('#openRollback').disabled=!['Aprovada','Executada'].includes(change.status);
 scenarioDraft=structuredClone(change.cenarios||[]);
 for(const sc of scenarioDraft){
  sc.etapas=sc.etapas||{};sc.motivosEtapas=sc.motivosEtapas||{};
  if(sc.sourceExecutionId&&['OK','N/A'].includes(sc.resultadoProducao)){for(const stage of executionStages(sc))sc.etapas[stage]=sc.resultadoProducao;delete sc.resultadoProducao;}
 }
 const locked=!!change.encerramento||change.status==='Executada';$('#saveScenario').hidden=locked;$('#scenarioDialog .scenario-toolbar').hidden=locked;$('#scenarioLink').closest('label').hidden=true;$('#openRollback').hidden=!!change.encerramento;
 $('#scenarioTitle').textContent=`Testes de PROD · ${change.rdm||'RDM sem número'}`;
 $('#scenarioSub').textContent=`${change.equipe} · Subida ${date(change.dataProducao)} · ${squadsOf(change).join(' + ')}`;
 $('#scenarioLink').value=change.cenariosLink||'';
 $('#scenarioBuilder').hidden=true; $('#scenarioImport').hidden=true;
 renderScenarioBuilder(); renderScenarioList();
 $('#scenarioDialog').showModal();
}
function renderScenarioList(){
 const sts=scenarioDraft.map(execStatus);
 const ok=sts.filter(s=>s==='OK').length, falhou=sts.filter(s=>s==='Falhou').length, na=sts.filter(s=>s==='N/A').length, exe=sts.filter(s=>s==='Em execução').length, pend=scenarioDraft.length-ok-falhou-na-exe;
 const sum=$('#scenarioSummary'); sum.replaceChildren();
 sum.append(element('span','badge '+(scenarioDraft.length && ok+na===scenarioDraft.length?'green':(falhou?'red':'orange')), `${ok}/${scenarioDraft.length} OK`));
 if(falhou) sum.append(element('span','badge red',`✗ ${falhou} falhou`));
 if(exe) sum.append(element('span','badge blue',`${exe} em execução`));
 if(pend) sum.append(element('span','badge orange',`${pend} pendente(s)`));
 const list=$('#scenarioList'),scrollTop=list.scrollTop; list.replaceChildren();
 if(!scenarioDraft.length){ list.append(element('p','muted-note','Nenhum caso. Use “Selecionar do catálogo” ou “Montar avulso”.')); return; }
 scenarioDraft.forEach((sc,idx)=>{
  const status=execStatus(sc);
  const row=element('div','scenario-row'+(status==='Falhou'?' failed':status==='OK'?' ok':''));
  const main=element('div','sc-main');
  const head=element('div','sc-head');
  head.append(tipoBadge(sc.tipo), element('span','sc-name',sc.nome), element('span','badge '+(scenarioStatusBadge[status]||'gray'), status));
  main.append(head);
  if(sc.sourceIssueId){ const origin=element('a','ck-hint',`Origem homologada: ${sc.sourceIssueId}`);origin.href='homologacao.html?issue='+encodeURIComponent(sc.sourceIssueId);origin.target='_blank';origin.rel='noopener';main.append(origin); }
  main.append(element('p','prod-flow-origin',`${executionStages(sc).length} etapas: ${executionStages(sc).join(' → ')}`));
  const change=changes.find(c=>c.id===scenarioChangeId),locked=!!change?.encerramento||change?.status==='Executada';
  if(!sc.sourceExecutionId){const ho=element('label','sc-ho'),cb=element('input');cb.type='checkbox';cb.checked=!!sc.validadoHO;cb.disabled=locked;cb.onchange=()=>sc.validadoHO=cb.checked;ho.append(cb,document.createTextNode(' Cenário validado em HO'));main.append(ho);}
  const link=element('a','ck-hint','Executar ou consultar resultados na Validação de PROD ↗');link.href='producao.html?change='+encodeURIComponent(scenarioChangeId);main.append(link);
  const side=element('div','sc-side');
  const rm=element('button','icon-button','×'); rm.type='button'; rm.title='Remover caso';rm.disabled=locked; rm.onclick=()=>{ scenarioDraft.splice(idx,1); renderScenarioList(); }; side.append(rm);
  row.append(main, side); list.append(row);
 });
 list.scrollTop=scrollTop;
}
function renderScenarioBuilder(){
 const box=$('#scenarioBuilder'); box.replaceChildren();
 const sel={};
 const grid=element('div','builder-grid');
 const preview=element('div','builder-preview','—');
 const update=()=>{ preview.textContent=composeScenarioName(sel)||'Selecione as dimensões…'; };
 for(const d of scenarioDims){ const label=element('label','',d.nome); const s=element('select'); s.append(new Option('—','')); for(const o of d.opcoes) s.append(new Option(o,o)); s.onchange=()=>{ sel[d.nome]=s.value; update(); }; label.append(s); grid.append(label); }
 const tipoLabel=element('label','','Tipo de garantia'); const tipoSel=element('select'); for(const o of scenarioTipoOptions) tipoSel.append(new Option(o,o)); tipoLabel.append(tipoSel); grid.append(tipoLabel);
 const alvoLabel=element('label','','Testar até'); const alvoSel=element('select'); for(const s of testStages) alvoSel.append(new Option(s,s)); alvoSel.value=lastStage(); alvoLabel.append(alvoSel); grid.append(alvoLabel);
 box.append(grid);
 const foot=element('div','builder-foot');
 foot.append(element('span','builder-preview-label','Fluxo: '), preview);
 const saveLbl=element('label','builder-save'); const saveCb=element('input'); saveCb.type='checkbox'; saveLbl.append(saveCb, document.createTextNode(' Salvar no catálogo'));
 const add=element('button','primary','＋ Adicionar caso'); add.type='button';
 add.onclick=()=>{ const nome=composeScenarioName(sel); if(!nome) return; const tipo=tipoSel.value, etapaAlvo=alvoSel.value;
  if(saveCb.checked && !scenarioCatalog.some(c=>c.nome===nome)){ scenarioCatalog.push({id:nextCatalogId(), nome, tipo, etapaAlvo, dimensoes:{...sel}, cobertura:'Regressivo padrão', ativo:true}); persistScenarioCatalog(); }
  scenarioDraft.push(newTestExecution({id:null,nome,tipo,etapaAlvo})); renderScenarioList(); };
 foot.append(saveLbl, add); box.append(foot);
 update();
}
function renderScenarioCatalog(){
 const box=$('#scenarioImport'); box.replaceChildren();
 const existing=new Set(scenarioDraft.map(s=>s.nome));
 const search=element('input','picker-search-inline'); search.type='search'; search.placeholder='Filtrar casos do catálogo...'; box.append(search);
 const listBox=element('div','import-list'); box.append(listBox);
 const checks=[];
 const draw=()=>{ listBox.replaceChildren(); checks.length=0; const term=search.value.trim().toLocaleLowerCase('pt-BR');
  const cats=scenarioCatalog.filter(c=>c.ativo && (!term||c.nome.toLocaleLowerCase('pt-BR').includes(term)||(c.cobertura||'').toLocaleLowerCase('pt-BR').includes(term)));
  for(const cob of [...new Set(cats.map(c=>c.cobertura))]){
   listBox.append(element('p','picker-caption',cob));
   for(const cat of cats.filter(c=>c.cobertura===cob)){
    const already=existing.has(cat.nome);
    const rowl=element('label','issue-check'+(already?' on':'')); const cb=element('input'); cb.type='checkbox'; cb.disabled=already; cb.checked=already; cb.dataset.id=cat.id; checks.push(cb);
    const info=element('div','issue-check-info'); info.append(element('strong','',cat.nome), element('small','',`${cat.tipo} · testar até ${cat.etapaAlvo}${already?' · já incluído':''}`));
    rowl.append(cb,info); listBox.append(rowl);
   }
  }
  if(!cats.length) listBox.append(element('p','muted-note','Nenhum caso no catálogo com esse filtro.'));
 };
 search.oninput=draw; draw();
 const foot=element('div','builder-foot');
 const all=element('button','secondary','Selecionar todos'); all.type='button'; all.onclick=()=>{ for(const cb of checks) if(!cb.disabled) cb.checked=true; };
 const imp=element('button','primary','↓ Adicionar selecionados'); imp.type='button';
 imp.onclick=()=>{ for(const cb of checks){ if(cb.checked && !cb.disabled){ const cat=scenarioCatalog.find(c=>c.id===cb.dataset.id); if(cat) scenarioDraft.push(newTestExecution(cat)); } } renderScenarioList(); renderScenarioCatalog(); };
 foot.append(all, imp); box.append(foot);
}
function syncScenarioChecklist(change){
 const item=checklistItems().find(i=>i.texto.toLocaleLowerCase('pt-BR').startsWith('liste os cenários'));
 if(!item) return; const s=scenarioSummary(change); if(!s.total) return;
 change.checklist=change.checklist||{};
 if(!isAnswered(change.checklist[item.id])) change.checklist[item.id]=`${s.total} cenários · ${s.ok} OK${s.falhou?` · ${s.falhou} falhou`:''}`;
}
$('#toggleBuilder').onclick=()=>{ const b=$('#scenarioBuilder'); b.hidden=!b.hidden; if(!b.hidden){ $('#scenarioImport').hidden=true; renderScenarioBuilder(); } };
$('#toggleImport').onclick=()=>{ const b=$('#scenarioImport'); b.hidden=!b.hidden; if(!b.hidden){ $('#scenarioBuilder').hidden=true; renderScenarioCatalog(); } };
$('#manageDims').onclick=()=>openDims();
function recordProductionStep(sc,stage,value){
 const previous=sc.etapas[stage]||'';if(previous===value)return;
 productionEvents.push({quando:nowStamp(),tipo:'teste_prod',cenarioId:sc.id,cenario:sc.nome,etapa:stage,de:previous||'Pendente',para:value||'Pendente',motivo:sc.motivosEtapas?.[stage]||'',por:sc.resp||''});
 sc.etapas[stage]=value;delete sc.resultadoProducao;
}
function saveProductionDraft(change){
 $('#scenarioError').textContent='';if(change.encerramento||change.status==='Executada'){$('#scenarioError').textContent='Plano disponível apenas para consulta após a subida. Execute os testes na Validação de PROD.';return false;}if(!changesAreFresh()){$('#scenarioError').textContent='Atualize a página: as changes foram alteradas em outra tela.';return false;}
 for(const event of productionEvents)if(event.para==='Falhou'&&!event.motivo?.trim()){$('#scenarioError').textContent=`Informe o motivo da falha registrada em ${event.cenario} · ${event.etapa}.`;return false;}
 for(const sc of scenarioDraft)for(const stage of executionStages(sc))if(sc.etapas[stage]==='Falhou'&&!sc.motivosEtapas?.[stage]?.trim()){$('#scenarioError').textContent=`Informe o motivo da falha em ${sc.nome} · ${stage}.`;return false;}
 if(JSON.stringify(change.cenarios||[])!==JSON.stringify(scenarioDraft)||(change.cenariosLink||'')!==$('#scenarioLink').value.trim())invalidateProductionAcceptance(change);
 if(JSON.stringify(change.cenarios||[])!==JSON.stringify(scenarioDraft))logHistory(change,{tipo:'teste_prod',nota:'Plano e resultados de produção atualizados.',testes:structuredClone(scenarioDraft)});
 for(const event of productionEvents){const sc=scenarioDraft.find(s=>s.id===event.cenarioId);logHistory(change,{...event,por:sc?.resp||event.por,nota:`${event.cenario} · ${event.etapa}: ${event.de} → ${event.para}`});}
 // Alterações nos motivos também ficam no histórico ao corrigir uma falha já salva.
 for(const sc of scenarioDraft){const old=(change.cenarios||[]).find(s=>s.id===sc.id);for(const [stage,reason]of Object.entries(sc.motivosEtapas||{}))if(reason!==old?.motivosEtapas?.[stage]&&!productionEvents.some(e=>e.cenarioId===sc.id&&e.etapa===stage&&e.para==='Falhou'))logHistory(change,{tipo:'teste_prod',cenarioId:sc.id,cenario:sc.nome,etapa:stage,motivo:reason,por:sc.resp,nota:`Motivo atualizado · ${sc.nome} · ${stage}`});}
 if(JSON.stringify(change.cenarios||[])!==JSON.stringify(scenarioDraft))resetApproval(change,'Plano de produção alterado.');
 change.cenarios=structuredClone(scenarioDraft);change.cenariosLink=$('#scenarioLink').value.trim();syncScenarioChecklist(change);
 if(!persist()){$('#scenarioError').textContent='Não foi possível salvar no navegador.';return false;}
 productionEvents=[];return true;
}
$('#saveScenario').onclick=()=>{const change=changes.find(c=>c.id===scenarioChangeId);if(!change||!saveProductionDraft(change))return;render();$('#scenarioDialog').close();if($('#detailDialog').open)showDetail(change);notify('Resultados de produção e histórico salvos.');};
$('#closeScenario').onclick=$('#dismissScenario').onclick=()=>$('#scenarioDialog').close();

// ---- Cenários: editor de dimensões ------------------------------------------
function openDims(){ renderDims(); $('#dimsDialog').showModal(); }
function renderDims(){
 const body=$('#dimsBody'); body.replaceChildren();
 scenarioDims.forEach((d,di)=>{
  const sec=element('section','dim-card');
  const head=element('div','dim-head'); head.append(element('strong','',d.nome));
  const del=element('button','secondary small danger','Remover'); del.type='button'; del.onclick=()=>{ scenarioDims.splice(di,1); persistScenarioDims(); renderDims(); }; head.append(del);
  sec.append(head);
  const chips=element('div','dim-chips');
  d.opcoes.forEach((o,oi)=>{ const chip=element('span','dim-chip',o); const x=element('button','chip-x','×'); x.type='button'; x.onclick=()=>{ d.opcoes.splice(oi,1); persistScenarioDims(); renderDims(); }; chip.append(x); chips.append(chip); });
  sec.append(chips);
  const addForm=element('form','dim-add'); const inp=element('input'); inp.placeholder='Nova opção'; inp.maxLength=60; const btn=element('button','secondary small','Adicionar'); btn.type='submit'; addForm.append(inp,btn);
  addForm.onsubmit=e=>{ e.preventDefault(); const v=inp.value.trim(); if(v && !d.opcoes.includes(v)){ d.opcoes.push(v); persistScenarioDims(); renderDims(); } };
  sec.append(addForm); body.append(sec);
 });
}
$('#dimAddForm').onsubmit=e=>{ e.preventDefault(); const inp=$('#dimAddForm').elements.nome; const v=inp.value.trim(); if(v && !scenarioDims.some(d=>d.nome===v)){ scenarioDims.push({nome:v,opcoes:[]}); persistScenarioDims(); inp.value=''; renderDims(); } };
$('#closeDims').onclick=$('#dismissDims').onclick=()=>{ $('#dimsDialog').close(); if($('#scenarioDialog').open){ renderScenarioBuilder(); } };

// ---- Toggles e filtros ------------------------------------------------------
for(const b of document.querySelectorAll('#agendaViews button')) b.onclick=()=>{ agendaView=b.dataset.view; render(); };
for(const option of statusOptions) $('#agendaStatus').append(new Option(option,option));
['#agendaSearch','#agendaStatus','#onlyConcurrency'].forEach(s=>$(s).addEventListener('input',render));
render();

// Seleção explícita para PROD, sem navegar para fora da change.
const productionSelection=new Set();
function productionCandidates(){
 const change=changes.find(c=>c.id===scenarioChangeId),plans=hoPlans();
 return (change?.issueIds||[]).map(id=>({id,plan:plans[id]}));
}
function productionKey(id,sc){return JSON.stringify([id,sc.id]);}
function productionEligibility(id,plan,sc){
 if(scenarioDraft.some(s=>s.sourceIssueId===id&&s.sourceExecutionId===sc.id))return 'Já no plano de PROD';
 if(!plan?.aceite)return 'Aguardando aceite de HO pelo PM/PO';
 if(!hoComplete(plan))return 'Homologação da issue ainda incompleta';
 if(execStatus(sc)!=='OK')return 'Cenário sem resultado OK em HO';
 return '';
}
function updateProductionSelection(){
 $('#productionSelectionCount').textContent=`${productionSelection.size} cenário${productionSelection.size===1?'':'s'} selecionado${productionSelection.size===1?'':'s'} para PROD`;
 $('#addProductionSelection').disabled=!productionSelection.size;
}
function renderHOImport(){
 const box=$('#scenarioHO');box.replaceChildren();const term=$('#productionSearch').value.trim().toLocaleLowerCase('pt-BR'),filter=$('#productionIssueFilter').value;
 let shown=0;
 for(const {id,plan} of productionCandidates()){
  if(filter&&filter!==id)continue;
  const cases=(plan?.cenarios||[]).filter(sc=>!term||[id,sc.nome].some(s=>s.toLocaleLowerCase('pt-BR').includes(term)));
  if(term&&!cases.length)continue;
  shown++;
  const section=element('section','production-issue'),head=element('div','production-issue-heading'),title=element('div');title.append(element('strong','',id),element('small','',plan?.aceite?`Aceite de HO: ${plan.aceite.por}`:'Sem aceite de homologação'));
  const link=element('a','production-consult','Consultar HO ↗');link.href='homologacao.html?issue='+encodeURIComponent(id);link.target='_blank';link.rel='noopener';link.setAttribute('aria-label',`Consultar homologação de ${id} em outra aba`);head.append(title,link);section.append(head);
  if(!cases.length)section.append(element('p','production-empty','Nenhum cenário vinculado à homologação desta issue. Monte o plano em HO e registre o aceite do PM/PO para disponibilizar a seleção.'));
  for(const sc of cases){
   const reason=productionEligibility(id,plan,sc),row=element('label','production-choice'+(reason?' unavailable':'')),cb=element('input'),info=element('div','production-choice-info'),status=element('span','badge '+(reason?'env':'green'),reason||'Disponível para PROD');cb.type='checkbox';cb.value=productionKey(id,sc);cb.disabled=!!reason;cb.checked=reason==='Já no plano de PROD'||productionSelection.has(cb.value);cb.setAttribute('aria-label',`Selecionar para PROD: ${id} · ${sc.nome}`);
   info.append(element('strong','',sc.nome),element('small','',`Garantia ${sc.tipo.toLowerCase()} · Testar até ${sc.etapaAlvo} · HO: ${execStatus(sc)}`),status);
   row.classList.toggle('selected',cb.checked&&!cb.disabled);cb.onchange=()=>{if(cb.checked)productionSelection.add(cb.value);else productionSelection.delete(cb.value);row.classList.toggle('selected',cb.checked);updateProductionSelection();};row.append(cb,info);section.append(row);
  }
  box.append(section);
 }
 if(!shown)box.append(element('p','production-empty','Nenhum cenário encontrado para os filtros informados.'));
 updateProductionSelection();
}
$('#toggleHO').onclick=()=>{
 productionSelection.clear();$('#productionSearch').value='';$('#productionIssueFilter').replaceChildren(new Option('Todas as issues',''),...productionCandidates().map(({id})=>new Option(id,id)));renderHOImport();$('#productionPicker').showModal();
};
$('#productionSearch').oninput=$('#productionIssueFilter').oninput=renderHOImport;
$('#closeProductionPicker').onclick=$('#cancelProductionPicker').onclick=()=>$('#productionPicker').close();
$('#addProductionSelection').onclick=()=>{
 let added=0;
 // Reconfere elegibilidade no momento da confirmação.
 for(const {id,plan} of productionCandidates())for(const sc of plan?.cenarios||[]){if(productionSelection.has(productionKey(id,sc))&&!productionEligibility(id,plan,sc)){scenarioDraft.push(productionFromHO(id,sc));added++;}}
 if(!added){productionSelection.clear();renderHOImport();return;}
 renderScenarioList();$('#productionPicker').close();notify(`${added} cenário(s) adicionado(s) ao plano de PROD. Clique em Salvar cenários para confirmar.`);
};
function invalidateProductionAcceptance(change){delete change.encerramento;if(change.aceiteProducao){ delete change.aceiteProducao;logHistory(change,{tipo:'editada',nota:'Aceite de produção invalidado por alteração no plano, resultados ou janela.'}); } }
function renderProductionAcceptance(box,change){
 box.append(element('p','muted-note','O PO executa os cenários e conclui a validação na tela de Validação de PROD, após a confirmação da subida.'));
 if(change.aceiteProducao)box.append(element('p','badge green',`Produção validada por ${change.aceiteProducao.por} · ${fmtStamp(change.aceiteProducao.quando)}`));
 if(change.encerramento)box.append(element('p','badge green',`GMUD encerrada por ${change.encerramento.por} · ${fmtStamp(change.encerramento.quando)}`));
 const link=element('a','secondary','Abrir validação de PROD');link.href='producao.html?change='+encodeURIComponent(change.id);link.style.display='inline-block';link.style.marginTop='12px';box.append(link);
}

function openRollback(){
 const change=changes.find(c=>c.id===scenarioChangeId);if(!change||change.encerramento||!['Aprovada','Executada'].includes(change.status)){notify('O rollback pode ser registrado para uma change aprovada ou executada.');return;}
 const form=$('#rollbackForm');form.reset();$('#rollbackError').textContent='';const options=new Map();
 for(const sc of scenarioDraft)for(const stage of executionStages(sc))if(sc.etapas[stage]==='Falhou')options.set(JSON.stringify([sc.id,stage]),`${sc.nome} · ${stage}`);
 for(const event of [...(change.historico||[]),...productionEvents])if(event.tipo==='teste_prod'&&event.para==='Falhou'&&event.cenarioId)options.set(JSON.stringify([event.cenarioId,event.etapa]),`${event.cenario} · ${event.etapa}`);
 form.elements.origem.replaceChildren(new Option('Selecione a origem do problema',''),...Array.from(options,([value,text])=>new Option(text,value)),new Option('Outra ocorrência em produção','outra'));
 if(options.size===1)form.elements.origem.value=options.keys().next().value;
 $('#rollbackDialog').showModal();
}
$('#openRollback').onclick=openRollback;
$('#closeRollback').onclick=$('#cancelRollback').onclick=()=>$('#rollbackDialog').close();
$('#rollbackForm').onsubmit=e=>{
 e.preventDefault();const change=changes.find(c=>c.id===scenarioChangeId),fields=e.target.elements,por=fields.por.value.trim(),motivo=fields.motivo.value.trim();
 if(!change||!['Aprovada','Executada'].includes(change.status)){$('#rollbackError').textContent='Esta change não está em uma fase que permite registrar rollback.';return;}
 if(!por||!motivo||!fields.origem.value){$('#rollbackError').textContent='Informe a origem, responsável e motivo do rollback.';return;}
 if(!requireOpen(change)||!changesAreFresh()){$('#rollbackError').textContent='Atualize a página antes de registrar o rollback.';return;}
 const origem=fields.origem.selectedOptions[0].textContent;
 invalidateProductionAcceptance(change);change.status='Rollback realizado';
 logHistory(change,{tipo:'rollback',por,motivo,nota:`Origem: ${origem}`,testes:structuredClone(change.cenarios||[])});
 if(!persist()){$('#rollbackError').textContent='Não foi possível salvar o registro no navegador.';return;}
 $('#rollbackDialog').close();$('#scenarioDialog').close();render();showDetail(change);notify('Rollback registrado. Testes, etapas e motivos preservados no histórico.');
};

// Confirmação manual da subida pelo TL; preserva registros técnicos anteriores.
actionBuilders.confirmarSubida=change=>actionForm([
 {name:'por',label:'TL responsável pela confirmação',value:change.smeTl||''},
 {name:'nota',label:'Observação (opcional)',type:'textarea',placeholder:'Pontos de atenção na subida'}],v=>{
 if(change.encerramento||change.status!=='Aprovada')return 'A GMUD precisa estar aprovada e aberta.';
 if(change.hoRevisionAprovada&&change.hoRevisionAprovada!==productionHORevision(change)){resetApproval(change,'Homologação alterada após a aprovação.');commit(change,'Homologação alterada. Revise e aprove novamente a GMUD.');return null;}
 const problems=productionPrerequisites(change);if(problems.length)return problems.join(' ');
 if(!v.por)return 'Informe o TL responsável pela confirmação.';
 change.pipeline={...change.pipeline,resultado:'Sucesso',finalizadaEm:nowStamp(),finalizadaPor:v.por};
 change.status='Executada';
 logHistory(change,{tipo:'executada',por:v.por,nota:'Subida realizada, confirmada pelo TL. Liberada para validação do PO.'+(v.nota?' '+v.nota:'')});
 commit(change,'Subida confirmada. Testes liberados para o PO.');return null;
},'Confirmar subida realizada');
actionBuilders.encerrarGmud=change=>actionForm([{name:'por',label:'TL responsável pelo encerramento',value:change.smeTl||''}],v=>{
 if(change.encerramento||change.status!=='Executada'||!change.aceiteProducao)return 'Aguarde a validação de produção pelo PO.';if(!v.por)return 'Informe o responsável pelo encerramento.';
 change.encerramento={por:v.por,quando:nowStamp()};logHistory(change,{tipo:'encerrada',por:v.por,nota:'GMUD encerrada após subida e validação de produção.'});commit(change,'GMUD encerrada.');return null;
},'Confirmar encerramento da GMUD');

// Atualizações do PO aparecem na agenda quando nenhuma edição está aberta.
window.addEventListener('storage',event=>{if(event.key!==productionChangesKey)return;if(document.querySelector('dialog[open]')){notify('Esta GMUD pode ter sido atualizada em outra tela. Reabra os detalhes antes de alterar.');return;}changes=productionChanges();stored=localStorage.getItem(changesKey);render();});
const requestedChangeId=new URLSearchParams(window.location.search).get('change');if(requestedChangeId){const requested=changes.find(c=>c.id===requestedChangeId);if(requested)showDetail(requested);}
