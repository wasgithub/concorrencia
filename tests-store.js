// Store compartilhado do módulo de Testes (catálogo de casos, dimensões do
// montador e etapas do fluxo). Carregado após issues-store.js nas páginas
// changes.html e testes.html — mantém os mesmos dados entre elas.
// Sem dependência de DOM: cada página fornece seus próprios helpers de UI.

// ---- Etapas do fluxo (ordenadas, editáveis) --------------------------------
const testStagesKey='issueflow.teststages.v1';
let testStages;
{ let s=null; try{ s=localStorage.getItem(testStagesKey); }catch{}
 if(s===null){ testStages=['Simulação','Criação de Pedido','Etapas Time Line','Análise Documental Flex','ServiceNow ON','Tipo de garantia','Emissão de Contrato','Assinatura e Registro','Liberação de Crédito','Desembolso']; persistTestStages(); }
 else { try{ const p=JSON.parse(s); testStages=Array.isArray(p)&&p.length?p:[]; }catch{ testStages=[]; } } }
function persistTestStages(){ try{ localStorage.setItem(testStagesKey,JSON.stringify(testStages)); return true; }catch{ return false; } }
function lastStage(){ return testStages[testStages.length-1]; }
function stageIndex(name){ return testStages.indexOf(name); }
function stagesUpTo(etapaAlvo){ const i=stageIndex(etapaAlvo); return i<0?testStages.slice():testStages.slice(0,i+1); }

// ---- Dimensões do montador (geram o nome do fluxo) -------------------------
const scenarioDimsKey='issueflow.scenariodims.v1';
let scenarioDims;
{ let s=null; try{ s=localStorage.getItem(scenarioDimsKey); }catch{}
 if(s===null){ scenarioDims=[
  {nome:'Perfil', opcoes:['Assessor','Cliente','Especialista','Assessor E-Finance']},
  {nome:'Tipo', opcoes:['PF','PJ']},
  {nome:'Linha', opcoes:['CPR','CPR-PJ','CPR GC','CPR-Máquinas','Custeio Agrícola','Custeio Pecuário']},
  {nome:'Garantia', opcoes:['Alienação','Aval','Clean','Guarda-Chuva','Hipoteca','Penhor Agrícola','Penhor Mercantil','Penhor Pecuário','Máquinas & Equipamentos']},
  {nome:'Variação', opcoes:['Sem Cotação','Com Cotação Agrolink','Desembolso antecipado','Cancelamento','Industrializado','Múltiplas com imóveis','Compartilhado regressivo']},
 ]; persistScenarioDims(); }
 else { try{ const p=JSON.parse(s); scenarioDims=Array.isArray(p)?p:[]; }catch{ scenarioDims=[]; } } }
function persistScenarioDims(){ try{ localStorage.setItem(scenarioDimsKey,JSON.stringify(scenarioDims)); return true; }catch{ return false; } }
function composeScenarioName(sel){ return scenarioDims.map(d=>sel[d.nome]).filter(Boolean).join(' - '); }

// ---- Catálogo de casos (reutilizável) --------------------------------------
const scenarioCatalogKey='issueflow.scenariocatalog.v1';
const coberturaOptions=['Regressivo padrão','Novos fluxos','Pós-venda','Smoke'];
// Tipo de garantia do cenário (automática/manual), independente da execução do teste.
const scenarioTipoOptions=['Automática','Manual','N/A'];
const scenarioStatusOptions=['Pendente','Em execução','OK','Falhou','N/A'];
const scenarioStatusBadge={'Pendente':'gray','Em execução':'blue','OK':'green','Falhou':'red','N/A':'env'};
let scenarioCatalog;
{ let s=null; try{ s=localStorage.getItem(scenarioCatalogKey); }catch{}
 if(s===null){ scenarioCatalog=seedCatalog(); persistScenarioCatalog(); }
 else { try{ const p=JSON.parse(s); scenarioCatalog=Array.isArray(p)?p:[]; }catch{ scenarioCatalog=[]; } } }
// Backfill de campos novos em catálogos antigos.
let catalogMigrated=false;
for(const c of scenarioCatalog){ if(!c.etapaAlvo){ c.etapaAlvo=lastStage(); catalogMigrated=true; } if(!c.cobertura){ c.cobertura='Regressivo padrão'; catalogMigrated=true; } if(c.ativo===undefined){ c.ativo=true; catalogMigrated=true; } }
if(catalogMigrated) persistScenarioCatalog();
function persistScenarioCatalog(){ try{ localStorage.setItem(scenarioCatalogKey,JSON.stringify(scenarioCatalog)); return true; }catch{ return false; } }
function nextCatalogId(){ const n=scenarioCatalog.reduce((m,c)=>Math.max(m, parseInt((String(c.id).split('-')[1]||'0'),10)),0)+1; return 'cat-'+String(n).padStart(3,'0'); }
function seedCatalog(){
 // [tipo, nome, etapaAlvo?]. Sem etapaAlvo = Desembolso (fluxo completo).
 const rows=[
  ['Automática','Assessor - CPR - Alienação - Sem Cotação - Agrícola'],
  ['Automática','Assessor - CPR - Máquinas e Equip - E-Finance - Desembolso antecipado'],
  ['Automática','Assessor - CPR - PF - Hipoteca - Pecuário'],
  ['Automática','Assessor - Custeio - PF - Alienação - Pecuário'],
  ['Automática','Cliente - CPR - PF - Aval - Agrícola'],
  ['Manual','Cliente - Custeio - Penhor Agrícola - Cancelamento','Criação de Pedido'],
  ['Automática','Especialista - CPR - PF - Clean - Agrícola - Sem Cotação'],
  ['Manual','Especialista - CPR - PF - Penhor Pecuário - Desembolso antecipado'],
  ['Automática','Especialista - CPR - PJ - Alienação - Sem Cotação - Agrícola'],
  ['Automática','Especialista - CPR - PJ - Hipoteca - Agrícola - Com Cotação Agrolink'],
  ['Manual','Especialista - CPR - PJ - Penhor Agrícola (Mercantil) - Insumos'],
  ['Manual','Especialista - CPR GC - PF - Pecuário'],
  ['Manual','Especialista - CPR GC - PJ - Industrializado - Sem Cotação Agrolink'],
  ['Automática','Especialista - Custeio - PF - Aval - Pecuário'],
  ['Automática','Especialista - Custeio - PF - Hipoteca - Agrícola'],
  ['Manual','Especialista - Custeio GC - Pecuário'],
  ['Manual','Especialista - CPR - PJ - Múltiplas com imóveis - Novas atividades - Sem Cotação Agrolink'],
  ['Manual','Pós vendas - CPR - Simulação','Simulação'],
 ];
 return rows.map((r,i)=>({id:'cat-'+String(i+1).padStart(3,'0'), tipo:r[0], nome:r[1], etapaAlvo:r[2]||'Desembolso', cobertura:'Regressivo padrão', ativo:true}));
}

// ---- Execução (por change) --------------------------------------------------
// Cria uma execução (snapshot) a partir de um caso do catálogo.
function execFromCaso(caso){
 return {id:'ex-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6), casoId:caso.id, nome:caso.nome, tipo:caso.tipo, etapaAlvo:caso.etapaAlvo||lastStage(), resp:'', jira:'', pedido:'', validadoHO:false, etapas:{}};
}
// Status geral DERIVADO das etapas até a etapa alvo (demais etapas = N/A).
function execStatus(exec){
 if(exec.sourceExecutionId&&!Object.values(exec.etapas||{}).some(Boolean)&&scenarioStatusOptions.includes(exec.resultadoProducao))return exec.resultadoProducao;
 const applic=executionStages(exec);
 if(!applic.length) return 'Pendente';
 const vals=applic.map(s=>(exec.etapas||{})[s]);
 if(vals.some(v=>v==='Falhou')) return 'Falhou';
 const done=vals.filter(v=>v==='OK'||v==='N/A').length;
 if(done===applic.length) return vals.every(v=>v==='N/A') ? 'N/A' : 'OK';
 if(done>0) return 'Em execução';
 return 'Pendente';
}

// Planos de HO e trilhas: snapshots preservam etapas e resultados históricos.
function readTestData(key, fallback){ try{ const value=JSON.parse(localStorage.getItem(key)); return value && typeof value==='object'?value:fallback; }catch{ return fallback; } }
function saveTestData(key,value){ try{ localStorage.setItem(key,JSON.stringify(value)); return true; }catch{ return false; } }
const hoPlansKey='issueflow.hoplans.v1', testTrailsKey='issueflow.testtrails.v1';
function hoPlans(){ const p=readTestData(hoPlansKey,{}); return Array.isArray(p)?{}:p; }
function testTrails(){ const t=readTestData(testTrailsKey,[]); return Array.isArray(t)?t:[]; }
function executionStages(exec){ return Array.isArray(exec.fluxo)?exec.fluxo:stagesUpTo(exec.etapaAlvo); }
function newTestExecution(caso){ return {...execFromCaso(caso),fluxo:stagesUpTo(caso.etapaAlvo),cobertura:caso.cobertura||'',dimensoes:caseDimensions(caso),componentes:normalizeTestComponents(caso.componentes)}; }
function hoComplete(plan){ return !!plan?.cenarios?.length && plan.cenarios.every(s=>['OK','N/A'].includes(execStatus(s))); }
function productionFromHO(issueId,exec){ return {...newTestExecution(exec),fluxo:[...executionStages(exec)],sourceIssueId:issueId,sourceExecutionId:exec.id,validadoHO:true}; }

// Relações explícitas: basta um componente em comum para sugerir o cenário.
function normalizeTestComponents(values){
 const parts=Array.isArray(values)?values:typeof values==='string'?values.split(','):[];
 return [...new Map(parts.filter(v=>typeof v==='string').map(v=>v.trim()).filter(Boolean).map(v=>[v.toLocaleLowerCase('pt-BR'),v])).values()];
}
function suggestedTests(issue,catalog=scenarioCatalog){
 const changed=normalizeTestComponents(issue.servicos);
 return catalog.filter(c=>c.ativo).map(caso=>({caso,componentes:changed.filter(component=>normalizeTestComponents(caso.componentes).some(c=>c.toLocaleLowerCase('pt-BR')===component.toLocaleLowerCase('pt-BR')))})).filter(s=>s.componentes.length).sort((a,b)=>b.componentes.length-a.componentes.length||a.caso.nome.localeCompare(b.caso.nome,'pt-BR'));
}

// Casos antigos usam segmentos do nome; novos casos guardam as dimensões explícitas.
function caseDimensions(caso){
 const result={}, explicit=caso.dimensoes||{};
 const parts=(caso.nome||'').split(/\s+-\s+/).map(s=>s.trim());
 const norm=s=>s.toLocaleLowerCase('pt-BR');
 for(const dim of scenarioDims){
  if(Object.prototype.hasOwnProperty.call(explicit,dim.nome)){result[dim.nome]=explicit[dim.nome];continue;}
  const match=dim.opcoes.find(option=>parts.some(p=>norm(p)===norm(option)));
  if(match)result[dim.nome]=match;
  else if(dim.nome==='Linha'){const line=parts.find(p=>/^(CPR|Custeio)(?:\b|-)/i.test(p));if(line)result[dim.nome]=line;}
 }
 return result;
}
function matchesCaseFilters(caso,filters={}){
 const term=(filters.term||'').trim().toLocaleLowerCase('pt-BR');
 if(term&&![caso.nome,caso.cobertura||'',...normalizeTestComponents(caso.componentes)].some(v=>v.toLocaleLowerCase('pt-BR').includes(term)))return false;
 if(filters.coverage&&caso.cobertura!==filters.coverage)return false;
 if(filters.tipo&&caso.tipo!==filters.tipo)return false;
 if(filters.etapa&&caso.etapaAlvo!==filters.etapa)return false;
 const dims=caseDimensions(caso);
 return Object.entries(filters.dimensoes||{}).every(([name,value])=>!value||(value==='__missing__'?!dims[name]:dims[name]===value));
}
