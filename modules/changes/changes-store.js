// Painel de Changes (RDM). Uma change é um CONTÊINER de subida: reúne issues de
// qualquer squad, numa única janela. A change é dona da data — ao vincular, as
// issues adotam a data da change (write-back). Ciclo operacional (aprovação,
// reprogramação, rejeição, execução) com histórico, e calendário de freeze.
const $ = (s) => document.querySelector(s);
const labels = {
  homologacao: "Homologação",
  efemero: "Efêmero",
  "homologacao 2": "Homologação 2",
};
const date = (value) => (value ? value.split("-").reverse().join("/") : "—");
const statusOptions = [
  "Planejada",
  "Em aprovação",
  "Aprovada",
  "Executada",
  "Rejeitada",
  "Não realizada",
  "Rollback realizado",
];
const statusBadge = {
  Planejada: "gray",
  "Em aprovação": "orange",
  Aprovada: "blue",
  Executada: "green",
  Rejeitada: "red",
  "Não realizada": "red",
  "Rollback realizado": "red",
};
const motivos = [
  "Comitê de Mudança",
  "Gerência",
  "Bug encontrado",
  "Freeze",
  "Outro",
];
const histLabel = {
  criada: "Criada",
  editada: "Editada",
  aprovada: "Subida aprovada",
  reprogramada: "Reprogramada",
  rejeitada: "Rejeitada",
  executada: "Executada",
  nao_realizada: "Não realizada",
  pipeline_solicitada: "Execução solicitada",
  pipeline_iniciada: "Pipeline iniciada",
  pipeline_finalizada: "Resultado da subida",
  validacao_iniciada: "Validação iniciada",
  validacao_concluida: "Validação concluída",
  encerrada: "GMUD encerrada",
  teste_prod: "Teste de produção",
  rollback: "Rollback realizado",
};
const histBadge = {
  criada: "gray",
  editada: "gray",
  aprovada: "green",
  reprogramada: "orange",
  rejeitada: "red",
  executada: "green",
  nao_realizada: "red",
  teste_prod: "blue",
  rollback: "red",
};

function pad(n) {
  return String(n).padStart(2, "0");
}
function iso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayIso() {
  return iso(new Date());
}
function addDaysIso(baseIso, n) {
  const d = new Date(baseIso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
}
function nowStamp() {
  const d = new Date();
  return `${iso(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtStamp(s) {
  if (!s) return "—";
  const [d, t] = s.split(" ");
  return `${date(d)}${t ? " " + t : ""}`;
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($("#toast").hidden = true), 4000);
}

// ---- Derivações de issues ---------------------------------------------------
function summarize(list) {
  return {
    inicioHom: list.map((i) => i.dataInicialHomologacao).sort()[0] || "",
    fimHom:
      list
        .map((i) => i.dataFinalHomologacao)
        .sort()
        .at(-1) || "",
    componentes: [...new Set(list.flatMap((i) => i.servicos))],
    temConcorrencia: list.some((i) => conflictsFor(i, issues).length > 0),
  };
}
function issuesByIds(ids) {
  return (ids || [])
    .map((id) => issues.find((i) => i.idIssue === id))
    .filter(Boolean);
}
function squadsOf(change) {
  return [...new Set(issuesByIds(change.issueIds).map((i) => i.squad))];
}
function motivoFor(list) {
  return list
    .map(
      (i) => `${i.idIssue} | ${i.descricao} | COMP.: ${i.servicos.join(", ")}`,
    )
    .join("\n");
}
function consumo(inicio, fim) {
  if (!inicio || !fim) return "";
  const [h1, m1] = inicio.split(":").map(Number),
    [h2, m2] = fim.split(":").map(Number);
  let mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins < 0) mins += 1440;
  return `${Math.floor(mins / 60)}:${pad(mins % 60)}`;
}
function periodMatch(dataProd, view) {
  const t = todayIso();
  if (view === "hoje") return dataProd === t;
  if (view === "amanha") return dataProd === addDaysIso(t, 1);
  if (view === "semana") return dataProd >= t && dataProd <= addDaysIso(t, 6);
  return true;
}

// ---- Checklist de implantação (modelo editável + respostas por change) ------
const checklistKey = "issueflow.checklist.v1";
let checklist;
let clstored = null;
try {
  clstored = localStorage.getItem(checklistKey);
} catch {
  clstored = null;
}
if (clstored === null) {
  checklist = null;
} else {
  try {
    const s = JSON.parse(clstored);
    checklist = Array.isArray(s) ? s : [];
  } catch {
    checklist = [];
  }
}
function persistChecklist() {
  try {
    localStorage.setItem(checklistKey, JSON.stringify(checklist));
    return true;
  } catch {
    return false;
  }
}
function seedChecklist() {
  const def = {
    Geral: [
      ["Gera indisponibilidade?", "bool"],
      ["Quantos componentes mainframe?", "numero"],
      ["Quantos componentes IBM Cloud?", "numero"],
      ["Quantos componentes TI Híbrida?", "numero"],
      ["Quantos componentes Github/Runs?", "numero"],
      ["Quantos scripts precisarão ser executados?", "numero"],
      ["Outros componentes?", "texto"],
      ["Subida validada pelo QA e PO da squad?", "bool"],
      ["Verificado os impactos da subida?", "bool"],
      ["As evidências estão no Xray/Jira?", "bool"],
      [
        "Adicionado o link dos testes funcionais e regressivos (XRAY) na CHG?",
        "bool",
      ],
      ["Preencheu a aba de changes?", "bool"],
      ["Existem alterações de gateway?", "bool"],
      ["Foi verificado se a policy de produção está correta?", "bool"],
      ["Existem alterações de ServiceNow?", "bool"],
      ["Existem alterações de VALID?", "bool"],
      ["Existem alterações de GCC?", "bool"],
      ["Existem alterações de GRAN?", "bool"],
      ["Existem alterações de CLIM?", "bool"],
      ["Existem alterações de DOCG?", "bool"],
      ["Existem alterações de workflow Brain?", "bool"],
      ["Foi parametrizado o workflow Brain?", "bool"],
    ],
    Híbrida: [
      ["Informado na change as versões de implantação?", "bool"],
      ["Informado na change as versões de rollback?", "bool"],
      ["Os serviços estão no passo GMUD?", "bool"],
      ["Verificado se existe apontamento nos laudos Fortify?", "bool"],
      ["Anexado os Laudos Fortify?", "bool"],
      [
        "Existem mais de 5 componentes (contando MS's e CFG's)? Se tiver, criar release train",
        "bool",
      ],
      [
        "Criado a release train, adicionada tag da change e colocado em passo GMUD?",
        "bool",
      ],
      [
        "Obteve o link correto do release train para informar na change?",
        "bool",
      ],
      ["Foram alterados CFG's?", "bool"],
      ["CFG's estão com a URL de Produção?", "bool"],
      ["CFG's estão em passo GMUD?", "bool"],
      ["Foram alterados Secrets?", "bool"],
      ["Se alterado Secrets, adicionado na tarefa da change?", "bool"],
      [
        "Houve criação/alteração de JKS, inclusão/alteração de certificados?",
        "bool",
      ],
      ["Foi acionado o Grupo 24 para criação/alteração de JKS?", "bool"],
      [
        "Foram envolvidos os Grupos responsáveis por servidores para inclusão de certificados?",
        "bool",
      ],
    ],
    Scripts: [
      ["Realizado o teste nos ambientes?", "bool"],
      ["Verificou se o validation está ativo?", "bool"],
      ["Montado os scripts no template de SR?", "bool"],
    ],
    Plataforma: [
      ["Informado na change as versões de implantação (image tag)?", "bool"],
      ["Informado na change as versões de rollback?", "bool"],
      ["Informado o link da pipeline? (CI-PR ou IMAGE-PROMOTION – PR)", "bool"],
      [
        "Verificado no repositório do gitlab se o link informado da pipeline está correto?",
        "bool",
      ],
      ["Informado o link do Fortify?", "bool"],
      ["Verificado se existe apontamento nos laudos Fortify?", "bool"],
      ["Anexado os Laudos Fortify?", "bool"],
      [
        "Verificar se existe ENV's para adicionar em PR? (comparar HO com PR)",
        "bool",
      ],
      [
        "Passado para o responsável adicionar em PR e especificado na change?",
        "bool",
      ],
      ["Foi criada rota nova no gateway?", "bool"],
    ],
    Github: [
      ["Foram informadas as RUNS para cada componente listado?", "bool"],
      ["Foram informados os componentes para implantação?", "bool"],
      [
        "Foram informadas as RUNS de rollback para componentes listados como rollback?",
        "bool",
      ],
      ["Foram informados os componentes de rollback?", "bool"],
      [
        "Foram validadas as versões das RUNs que serão executadas no ambiente produtivo?",
        "bool",
      ],
      [
        "Foram validadas as versões das RUNs que serão executadas no ambiente produtivo em caso de rollback?",
        "bool",
      ],
    ],
    "Testes & validação": [
      [
        "Os cenários de teste que serão executados após a implantação foram alinhados com os gestores?",
        "bool",
      ],
      [
        "Liste os cenários de teste que serão executados após a implantação.",
        "texto",
      ],
      ["Observação", "texto"],
      ["Diffs validadas com o tech lead", "bool"],
      [
        "Componentes listados no Release Train informados no corpo da TASK da Change?",
        "bool",
      ],
      ["Double Check nas variáveis de CI-PR ou IMAGE-PROMOTION – PR?", "bool"],
      [
        "Algum cenário foi testado com parâmetros diferentes do esperado em produção? Qual impacto? (ex: datas de início/fim, quantidade de itens)",
        "texto",
      ],
      [
        "Algum cenário testado com configurações de ambiente diferentes do esperado em produção? (ex: comunicações externas desligadas, inputs manuais em base, cruzamento de ambiente)",
        "texto",
      ],
      [
        "Foi avaliado se está sendo levado algum componente/campo de base que só existe em homologação e não faz parte da implantação? (ex: CNPJ Alfa)",
        "texto",
      ],
    ],
  };
  let n = 0;
  const out = [];
  for (const [categoria, items] of Object.entries(def))
    for (const [texto, tipo] of items) {
      n++;
      out.push({
        id: "ck-" + String(n).padStart(3, "0"),
        categoria,
        texto,
        tipo,
        obrigatorio: true,
        ativo: true,
      });
    }
  return out;
}
if (checklist === null) {
  checklist = seedChecklist();
  persistChecklist();
}
function checklistItems() {
  return checklist.filter((i) => i.ativo);
}
function isAnswered(v) {
  return v !== undefined && String(v).trim() !== "";
}
function checklistStatus(change) {
  const req = checklistItems().filter((i) => i.obrigatorio);
  const ans = change.checklist || {};
  const done = req.filter((i) => isAnswered(ans[i.id])).length;
  const naoCount = checklistItems().filter(
    (i) => i.tipo === "bool" && ans[i.id] === "Não",
  ).length;
  return {
    total: req.length,
    done,
    pending: req.length - done,
    naoCount,
    complete: req.length ? done === req.length : true,
  };
}
function seedChecklistAnswers(mode) {
  const items = checklistItems();
  const ans = {};
  const n = mode === "full" ? items.length : Math.ceil(items.length * 0.55);
  items.slice(0, n).forEach((it, idx) => {
    if (it.tipo === "numero") ans[it.id] = String([0, 1, 2, 0, 1][idx % 5]);
    else if (it.tipo === "texto")
      ans[it.id] = "Validado conforme processo da squad.";
    else ans[it.id] = idx % 9 === 0 ? "Não" : idx % 4 === 0 ? "N/A" : "Sim";
  });
  return ans;
}

// Catálogo de casos, dimensões, etapas e helpers vêm do módulo de catálogo e de shared/testing.
// Resumo de execução por change, derivado do status por etapa (execStatus).
function scenarioSummary(change) {
  const list = change.cenarios || [];
  const st = list.map(execStatus);
  const ok = st.filter((s) => s === "OK").length,
    falhou = st.filter((s) => s === "Falhou").length,
    na = st.filter((s) => s === "N/A").length,
    exe = st.filter((s) => s === "Em execução").length;
  return {
    total: list.length,
    ok,
    falhou,
    na,
    exe,
    pend: list.length - ok - falhou - na - exe,
    complete: list.length > 0 && ok + na === list.length,
  };
}

// ---- Store de changes -------------------------------------------------------
const changesKey = "issueflow.changes.v1";
let changes;
let stored = null;
try {
  stored = localStorage.getItem(changesKey);
} catch {
  stored = null;
}
if (stored === null) {
  changes = null;
} else {
  try {
    const saved = JSON.parse(stored);
    changes = Array.isArray(saved) ? saved : [];
  } catch {
    changes = [];
  }
}
function changesAreFresh() {
  try {
    if (localStorage.getItem(changesKey) !== stored) {
      notify(
        "As changes foram atualizadas em outra tela. Atualize a página antes de salvar.",
      );
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
function persist() {
  try {
    if (!changesAreFresh()) return false;
    const value = JSON.stringify(changes);
    localStorage.setItem(changesKey, value);
    stored = value;
    return true;
  } catch {
    return false;
  }
}

// Invariante: cada issue pertence a no máximo UMA change ativa (não rejeitada/não realizada).
function isFinal(s) {
  return (
    s === "Rejeitada" || s === "Não realizada" || s === "Rollback realizado"
  );
}
function activeChangeOf(issueId, exceptId) {
  return changes.find(
    (c) =>
      c.id !== exceptId &&
      !isFinal(c.status) &&
      (c.issueIds || []).includes(issueId),
  );
}
function availableIssues(exceptId) {
  return issues.filter((i) => !activeChangeOf(i.idIssue, exceptId));
}
function changeForIssue(issueId) {
  const a = activeChangeOf(issueId, null);
  if (a) return a;
  return changes.find((c) => (c.issueIds || []).includes(issueId)) || null;
}

// Seeds de demonstração (issues reais; inclui uma change cross-squad).
function seedChanges() {
  const mk = (ids, extra) => {
    const list = ids
      .map((id) => issues.find((i) => i.idIssue === id))
      .filter(Boolean);
    if (list.length !== ids.length) return null;
    const dp = list
      .map((i) => i.dataProducao)
      .sort()
      .at(-1);
    const s = summarize(list);
    return {
      id: "chg-" + ids[0].toLowerCase(),
      equipe: list[0].squad,
      dataProducao: dp,
      dataAberturaChange: subtractDays(dp, 3),
      inicioHom: s.inicioHom,
      fimHom: s.fimHom,
      componentes: s.componentes,
      issueIds: list.map((i) => i.idIssue),
      rdm: "",
      horario: "19:00",
      inicioPrevisto: "",
      finalPrevisto: "",
      consumo: "",
      smeTl: "",
      po: "",
      flex: "Não",
      on: "Não",
      justificativaOn: "",
      status: "Em aprovação",
      observacao: "",
      motivo: motivoFor(list),
      reprogramacoes: 0,
      aprovadaPor: "",
      aprovadaEm: "",
      historico: [{ quando: "2026-10-05 09:00", tipo: "criada" }],
      ...extra,
    };
  };
  const out = [];
  const c1 = mk(["ISS-1047"], {
    rdm: "CHG1048771",
    smeTl: "Mavi",
    po: "A definir",
    observacao: "Validação de biometria na janela noturna.",
  });
  const c2 = mk(["ISS-1043"], {
    rdm: "CHG1050120",
    smeTl: "Edigley Ramos",
    po: "Monique Salim",
    flex: "Sim",
    on: "Sim",
    justificativaOn:
      "Correção de incidente no serviço de limites; change validada junto ao time de fatura.",
    inicioPrevisto: "20:30",
    finalPrevisto: "00:30",
    consumo: consumo("20:30", "00:30"),
    status: "Aprovada",
    aprovadaPor: "Giancarlo",
    aprovadaEm: "2026-10-06 10:30",
    historico: [
      { quando: "2026-10-05 09:00", tipo: "criada" },
      { quando: "2026-10-06 10:30", tipo: "aprovada", por: "Giancarlo" },
    ],
  });
  // Cross-squad: Investimentos (owner) + Crédito, mesma subida 21/10.
  const c3 = mk(["ISS-1046", "ISS-1054", "ISS-1057"], {
    equipe: "Investimentos",
    rdm: "CHG1053297",
    smeTl: "Eduardo Augusto",
    po: "Bruna Magyar",
    flex: "Sim",
    on: "Sim",
    justificativaOn:
      "Validar regressivos dos componentes migrados para Azure. Change conjunta Investimentos + Crédito pelos componentes compartilhados (api-clientes/api-contas).",
    inicioPrevisto: "19:30",
    finalPrevisto: "23:30",
    consumo: consumo("19:30", "23:30"),
    status: "Em aprovação",
    reprogramacoes: 1,
    observacao:
      "Subida conjunta de duas squads na mesma janela. Pontos de atenção monitorados pelo time.",
    historico: [
      { quando: "2026-10-02 14:00", tipo: "criada" },
      {
        quando: "2026-10-05 16:20",
        tipo: "reprogramada",
        de: "2026-10-16",
        para: "2026-10-21",
        motivo: "Bug encontrado",
        por: "Eduardo Augusto",
        nota: "Regressivo apontou falha; nova janela acordada entre as squads.",
      },
    ],
  });
  const c4 = mk(["ISS-1055"], {
    rdm: "CHG1051480",
    smeTl: "Carla Nunes",
    po: "Rafael Prado",
    inicioPrevisto: "19:00",
    finalPrevisto: "21:00",
    consumo: consumo("19:00", "21:00"),
    status: "Executada",
    aprovadaPor: "Patrícia Lemos",
    aprovadaEm: "2026-10-09 11:00",
    observacao: "Ajuste de mensagens de cadastro. Subida tranquila na janela.",
    historico: [
      { quando: "2026-10-07 10:00", tipo: "criada" },
      { quando: "2026-10-09 11:00", tipo: "aprovada", por: "Patrícia Lemos" },
      {
        quando: "2026-10-12 19:40",
        tipo: "executada",
        nota: "Subiu sem incidentes; validação pós-deploy OK.",
      },
    ],
  });
  const c5 = mk(["ISS-1053", "ISS-1061"], {
    rdm: "TBD",
    smeTl: "Edigley Ramos",
    po: "Monique Salim",
    status: "Rejeitada",
    observacao:
      "Desbloqueio de cartão + validação de fatura em ambiente isolado.",
    historico: [
      { quando: "2026-10-08 09:30", tipo: "criada" },
      {
        quando: "2026-10-11 15:10",
        tipo: "rejeitada",
        motivo: "Comitê de Mudança",
        por: "Comitê de Mudança",
        nota: "Faltou plano de rollback aprovado. Reprogramar após ajuste.",
      },
    ],
  });
  for (const c of [c1, c2, c3, c4, c5]) if (c) out.push(c);
  // Checklists: Aprovada/Executada completos; os demais parciais (para demonstrar o aviso).
  const clModes = { "chg-iss-1043": "full", "chg-iss-1055": "full" };
  for (const c of out)
    c.checklist = seedChecklistAnswers(clModes[c.id] || "partial");
  // Execuções de teste (demo) em duas changes — marcadas por etapa.
  const ex = (nome, tipo, etapaAlvo, fill, extra) => {
    const e = {
      id: "ex-demo-" + Math.random().toString(36).slice(2, 8),
      casoId: null,
      nome,
      tipo,
      etapaAlvo,
      resp: (extra && extra.resp) || "",
      jira: (extra && extra.jira) || "",
      pedido: (extra && extra.pedido) || "",
      validadoHO: !!(extra && extra.ho),
      etapas: {},
    };
    const ap = stagesUpTo(etapaAlvo);
    if (fill === "ok") {
      for (const s of ap) e.etapas[s] = "OK";
    } else if (fill === "partial") {
      for (const s of ap.slice(0, Math.ceil(ap.length / 2))) e.etapas[s] = "OK";
    } else if (fill === "fail") {
      for (const s of ap.slice(0, -1)) e.etapas[s] = "OK";
      if (ap.length) {
        const stage = ap[ap.length - 1];
        e.etapas[stage] = "Falhou";
        e.motivosEtapas = {
          [stage]:
            "Exemplo de falha na validação do pedido. Conferir evidência no Jira.",
        };
      }
    }
    return e;
  };
  const c3o = out.find((c) => c.id === "chg-iss-1046");
  if (c3o) {
    c3o.cenariosLink = "AGROFIN-12169";
    c3o.cenarios = [
      ex(
        "Especialista - CPR - PJ - Alienação - Sem Cotação - Agrícola",
        "Automática",
        "Desembolso",
        "ok",
        { resp: "Nat", jira: "AGROFIN-12421", pedido: "423940", ho: true },
      ),
      ex(
        "Especialista - CPR - PJ - Hipoteca - Agrícola - Com Cotação Agrolink",
        "Automática",
        "Desembolso",
        "ok",
        { resp: "Poli", jira: "AGROFIN-12421", pedido: "423944", ho: true },
      ),
      ex(
        "Cliente - Custeio - Penhor Agrícola - Cancelamento",
        "Manual",
        "Criação de Pedido",
        "fail",
        { resp: "Bianca", jira: "AGROFIN-12484" },
      ),
      ex(
        "Assessor - CPR - PF - Hipoteca - Pecuário",
        "Automática",
        "Desembolso",
        "",
        { resp: "Adriano" },
      ),
      ex(
        "Especialista - Custeio - PF - Aval - Pecuário",
        "Automática",
        "Desembolso",
        "partial",
        { resp: "Vinicius" },
      ),
    ];
  }
  const c2o = out.find((c) => c.id === "chg-iss-1043");
  if (c2o) {
    c2o.cenariosLink = "";
    c2o.cenarios = [
      ex(
        "Cliente - CPR - PF - Aval - Agrícola",
        "Automática",
        "Desembolso",
        "ok",
        { resp: "Leonardo", ho: true },
      ),
      ex(
        "Assessor - Custeio - PF - Alienação - Pecuário",
        "Automática",
        "Simulação",
        "ok",
        { resp: "Adriano" },
      ),
    ];
  }
  return out;
}
if (changes === null) {
  changes = localStorage.getItem("issueflow.demo.workflowSeeds.v1") === "false" ? [] : seedChanges();
  persist();
}

// ---- Store de freeze --------------------------------------------------------
const freezesKey = "issueflow.freezes.v1";
let freezes;
let fstored = null;
try {
  fstored = localStorage.getItem(freezesKey);
} catch {
  fstored = null;
}
if (fstored === null) {
  freezes = null;
} else {
  try {
    const saved = JSON.parse(fstored);
    freezes = Array.isArray(saved) ? saved : [];
  } catch {
    freezes = [];
  }
}
function persistFreezes() {
  try {
    localStorage.setItem(freezesKey, JSON.stringify(freezes));
    return true;
  } catch {
    return false;
  }
}
function seedFreezes() {
  return [
    {
      id: "fz-snow",
      nome: "Freeze ServiceNow",
      dataInicio: "2026-10-08",
      dataFim: "2026-10-08",
      escopo: "componentes",
      termos: ["servicenow"],
      descricao:
        "Janela de manutenção do ServiceNow. Componentes integrados ao ServiceNow não podem subir.",
    },
    {
      id: "fz-pix",
      nome: "Freeze Pix (estabilidade)",
      dataInicio: "2026-10-13",
      dataFim: "2026-10-14",
      escopo: "componentes",
      termos: ["pix"],
      descricao:
        "Período de estabilização do Pix. Componentes de Pix bloqueados para subida.",
    },
  ];
}
if (freezes === null) {
  freezes = localStorage.getItem("issueflow.demo.workflowSeeds.v1") === "false" ? [] : seedFreezes();
  persistFreezes();
}
function freezesFor(dataProd, componentes) {
  return freezes.filter(
    (f) =>
      dataProd >= f.dataInicio &&
      dataProd <= f.dataFim &&
      (f.escopo === "total" ||
        (componentes || []).some((c) =>
          (f.termos || []).some((t) =>
            c.toLocaleLowerCase("pt-BR").includes(t.toLocaleLowerCase("pt-BR")),
          ),
        )),
  );
}
function freezeNames(dataProd, componentes) {
  return freezesFor(dataProd, componentes).map((f) => f.nome);
}
