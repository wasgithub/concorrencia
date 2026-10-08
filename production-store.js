// Estado compartilhado da validação: a pipeline e o aceite de negócio são independentes.
const productionChangesKey='issueflow.changes.v1';
function productionChanges(){const list=readTestData(productionChangesKey,[]);return Array.isArray(list)?list:[];}
function productionState(change){
 if(change.status==='Rollback realizado')return {group:'finished',label:'Rollback realizado',color:'red'};
 if(['Rejeitada','Não realizada'].includes(change.status))return {group:'finished',label:change.status,color:'env'};
 if(change.encerramento)return {group:'finished',label:'GMUD encerrada',color:'green'};
 if(change.status!=='Executada')return {group:'waiting',label:change.pipeline?.resultado==='Falhou'?'Falha na subida':'Aguardando subida',color:change.pipeline?.resultado==='Falhou'?'red':'orange'};
 if(change.aceiteProducao)return {group:'finished',label:'Produção validada',color:'green'};
 if((change.cenarios||[]).some(s=>execStatus(s)==='Falhou'))return {group:'validate',label:'Com falha · decisão técnica pendente',color:'red'};
 if(!(change.cenarios||[]).length)return {group:'validate',label:'Aguardando plano de testes do TL',color:'orange'};
 if((change.cenarios||[]).some(s=>executionStages(s).some(stage=>(s.etapas||{})[stage])))return {group:'validate',label:'Validação em andamento',color:'blue'};
 return {group:'validate',label:'Pronta para validar',color:'blue'};
}
function productionRevision(change){return JSON.stringify([change.status,change.pipeline,change.cenarios,change.aceiteProducao,change.encerramento]);}
function updateProductionChange(id,revision,mutate){
 const list=productionChanges(),index=list.findIndex(c=>c.id===id);if(index<0)return {ok:false,error:'Esta GMUD não está mais disponível. Atualize a lista.'};
 const change=list[index];if(productionRevision(change)!==revision)return {ok:false,error:'Esta GMUD foi alterada em outra tela. Feche e abra novamente para carregar a versão atual.'};
 const error=mutate(change);if(error)return {ok:false,error};
 if(!saveTestData(productionChangesKey,list))return {ok:false,error:'Não foi possível salvar no navegador. Tente novamente.'};
 return {ok:true,change};
}
function poValidationReady(change){return change.status==='Executada'&&!change.encerramento&&!change.aceiteProducao;}

function productionPrerequisites(change){
 const plans=hoPlans(),problems=[];
 for(const id of change.issueIds||[]){const plan=plans[id];if(!plan?.aceite||!hoComplete(plan))problems.push(`Issue ${id}: homologação sem aceite válido.`);}
 if(!(change.cenarios||[]).length)problems.push('Selecione pelo menos um cenário de produção.');
 for(const sc of change.cenarios||[]){
  if(sc.sourceExecutionId){const plan=plans[sc.sourceIssueId],origin=plan?.cenarios?.find(s=>s.id===sc.sourceExecutionId);
   if(!(change.issueIds||[]).includes(sc.sourceIssueId)||!origin||execStatus(origin)!=='OK'||JSON.stringify([origin.nome,origin.tipo,executionStages(origin),caseDimensions(origin),normalizeTestComponents(origin.componentes)])!==JSON.stringify([sc.nome,sc.tipo,executionStages(sc),caseDimensions(sc),normalizeTestComponents(sc.componentes)]))problems.push(`Cenário ${sc.nome}: origem de HO alterada. Remova e selecione novamente.`);
  }else if(!sc.validadoHO)problems.push(`Cenário ${sc.nome}: confirme a validação em HO ou selecione da homologação.`);
 }
 return problems;
}
function productionHORevision(change){const plans=hoPlans();return JSON.stringify((change.issueIds||[]).map(id=>[id,plans[id]?.aceite,plans[id]?.cenarios]));}
