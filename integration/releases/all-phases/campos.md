# Campos e collections de todas as fases

Fonte canônica: `integration/mongodb/collections.json`. Campos em inglês/camelCase, collections com prefixo delivery_. ObjectId e Date são BSON; API serializa como string hexadecimal e ISO 8601. IDs de usuários/equipes/workspace reutilizam o hospedeiro e exigem adaptação de tipo antes da migration.

## Campos comuns

`_id:ObjectId`, `workspaceId:string`, `schemaVersion:int=1`, `version:int/long`, `createdAt/updatedAt:Date`, `createdBy/updatedBy:{userId,displayName}`. Todos obrigatórios e controlados pelo servidor. O cliente envia expectedVersion, não sobrescreve version nem os campos de auditoria.

## Mapeamento operacional da interface

| Tela/local | Campo BSON / regra |
| --- | --- |
| Issue idIssue / descricao / squad / servicos / ambiente | externalId / title / teamId+teamName / components / environment; homologacao→ho, homologacao 2→ho2, efemero→ephemeral |
| Datas da issue | hoStartDate, hoEndDate, plannedProductionDate, plannedChangeOpenDate; YYYY-MM-DD válidos; janela da GMUD vinculada é a fonte da projeção |
| Plano HO / cenarios | executions[]; nome→name; tipo→guaranteeType; fluxo→steps; etapaAlvo→última etapa; usar IDs estáveis no backend |
| Resultado etapa / motivosEtapas | steps[].result pending/ok/failed/not_applicable; failureReason obrigatório e não branco para failed |
| HO resp / pedido / jira | assignedTo (usuário existente, sem nome como identidade) / orderReference / testReference; links manuais, sem upload |
| HO aceite | acceptance.actor/at/note/revision; evento ho.accepted guarda prova imutável da revisão |
| GMUD rdm / issueIds / equipe / smeTl / po | rdm / featureIds / teamId / tl / po; tl/po são identidades do hospedeiro |
| timeExecutor / observacao / motivo | executorTeamId+executorTeamName / notes / reason; resolver time pelo catálogo existente |
| dataProducao / inicioPrevisto / finalPrevisto / horario | window.date/startAt/endAt/timeZone e changeTime; Horário CHG é label HH:mm distinto da janela UTC |
| dataAberturaChange | plannedOpenDate na GMUD; plannedChangeOpenDate na feature é projeção. Política de antecedência deve ser configurada no servidor |
| flex / on / justificativaOn | participation.flex / participation.on / participation.onJustification; Sim/Não→boolean; ON=true exige justificativa |
| Consumo | Calculado de window.endAt-startAt; não persistir segunda duração divergente |
| Checklist | checklist[].id/question/required/type/answer, snapshot da definition e sua versão. Não=false é resposta preenchida; vazio é pendente |
| Aprovação com exceção | approval.incompleteChecklistException.reason/pendingItemIds; protótipo excecaoChecklist é adaptado, não copiado como arquitetura |
| Subida realizada / pipeline.releaseRef | deployment.actor/at/releaseRef; pipeline.resultado no protótipo não equivale a uma pipeline integrada |
| Validação PROD | production.executions com source.hoPlanId/hoRevision/executionId; resultados novos pending, sem copiar OK de HO |
| Finalização / rollback | closure ou rollback com ator/instante/motivo e IDs válidos; previousChangeId relaciona outra tentativa |
| Freeze escopo / termos / descricao | scope all/components; components guarda termos; matchMode=contains mantém busca literal por contém da tela; description guarda descrição |
| Estados visíveis | Planejada→draft; Em aprovação→awaiting_approval; Aprovada→approved; Executada→deployed; encerramento→closed; Rollback realizado→rollback; Rejeitada→rejected; Não realizada→not_performed |

## Datas e revisões

window usa instantes UTC e timeZone America/Sao_Paulo como referência inicial. Se final local for anterior ao início, explicitar virada para o dia seguinte; início=fim não é duração válida. API valida datas reais, ordem, HO antes de produção e regra de abertura. Regex BSON verifica forma, não um calendário real.

version é CAS do documento. preparationRevision muda em janela/features/checklist/plano PROD, enquanto notes muda só version. approval.revision captura preparationRevision. HO e PROD têm revisões próprias; seus aceites devem corresponder à revisão corrente. Campos técnicos approvalFence não são edição de negócio.

## Campos previstos por collection

“Sim” em um campo aninhado significa obrigatório quando o objeto pai está presente. As condições adicionais (por exemplo status=closed exige closure, acceptance exige execuções concluídas, failed exige motivo) estão no validator; não substituem regras e referências da API.

### delivery_features

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `externalId` | string; min caracteres 1 | Sim |
| `title` | string; min caracteres 1 | Sim |
| `teamId` | string; min caracteres 1 | Sim |
| `teamName` | string; min caracteres 1 | Não |
| `components` | array; min itens 0; max itens 100 | Sim |
| `environment` | string; ho, ho2, ephemeral | Sim |
| `hoStartDate` | string; min caracteres 1 | Não |
| `hoEndDate` | string; min caracteres 1 | Não |
| `plannedProductionDate` | string; min caracteres 1 | Não |
| `activeChangeId` | objectId | Não |
| `legacyId` | string; min caracteres 1; max caracteres 200 | Não |
| `plannedChangeOpenDate` | string | Não |
| `legacySource` | string; min caracteres 1; max caracteres 100 | Não |

Índices:
- `feature_external_unique`: `{"workspaceId": 1, "externalId": 1}` único
- `feature_calendar`: `{"workspaceId": 1, "teamId": 1, "hoStartDate": 1}`
- `legacy_origin_unique`: `{"workspaceId": 1, "legacySource": 1, "legacyId": 1}` único com filtro parcial

### delivery_scenarios

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `code` | string; min caracteres 1 | Sim |
| `name` | string; min caracteres 1; max caracteres 200 | Sim |
| `active` | bool | Sim |
| `guaranteeType` | string; automatic, manual, not_applicable | Não |
| `coverage` | string; min caracteres 1; max caracteres 100 | Não |
| `components` | array; min itens 0; max itens 100 | Não |
| `dimensions` | object | Não |
| `steps` | array; min itens 1; max itens 50 | Sim |
| `steps[].id` | string; min caracteres 1 | Sim |
| `steps[].name` | string; min caracteres 1 | Sim |
| `classification` | string; min caracteres 1 | Sim |
| `classificationLabel` | string; min caracteres 1 | Sim |
| `preconditions` | string; max caracteres 2000 | Não |
| `expectedResult` | string; max caracteres 3000 | Não |
| `frontId` | objectId | Não |
| `frontLabel` | string | Não |
| `functionalityId` | objectId | Não |
| `functionalityLabel` | string | Não |
| `executionMode` | enum; Manual, Automatizada | Não |
| `workflowId` | objectId | Não |
| `workflowVersion` | int/long; mínimo 1 | Não |
| `stageDefinitionId` | objectId | Não |
| `stageDefinitionVersion` | int/long; mínimo 0 | Não |
| `legacySource` | string; min caracteres 1; max caracteres 100 | Não |
| `legacyId` | string; min caracteres 1; max caracteres 200 | Não |

Índices:
- `scenario_code_unique`: `{"workspaceId": 1, "code": 1}` único
- `scenario_component_suggestions`: `{"workspaceId": 1, "active": 1, "components": 1}`
- `legacy_origin_unique`: `{"workspaceId": 1, "legacySource": 1, "legacyId": 1}` único com filtro parcial

### delivery_trails

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `name` | string; min caracteres 1; max caracteres 160 | Sim |
| `active` | bool | Sim |
| `scenarioIds` | array; min itens 1; max itens 200 | Sim |
| `nameNormalized` | string; min caracteres 1; max caracteres 160 | Sim |
| `legacySource` | string; min caracteres 1; max caracteres 100 | Não |
| `legacyId` | string; min caracteres 1; max caracteres 200 | Não |

Índices:
- `trail_catalog`: `{"workspaceId": 1, "active": 1, "name": 1}`
- `trail_name_unique`: `{"workspaceId": 1, "nameNormalized": 1}` único
- `legacy_origin_unique`: `{"workspaceId": 1, "legacySource": 1, "legacyId": 1}` único com filtro parcial

### delivery_definitions

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `kind` | string; test_flow, scenario_dimensions, change_checklist, quality_vocabulary, scenario_front, scenario_functionality, test_stages | Sim |
| `name` | string; min caracteres 1 | Sim |
| `items` | array; min itens 0; max itens 200 | Sim |
| `parentId` | objectId | Não |
| `nameNormalized` | string; min caracteres 1 | Sim |
| `active` | bool | Não |
| `legacySource` | string; min caracteres 1; max caracteres 100 | Não |
| `legacyId` | string; min caracteres 1; max caracteres 200 | Não |

Índices:
- `definition_scope_unique`: `{"workspaceId": 1, "kind": 1, "parentId": 1, "nameNormalized": 1}` único
- `scoped_quality_definitions`: `{"workspaceId": 1, "kind": 1, "parentId": 1, "active": 1, "name": 1}`
- `legacy_origin_unique`: `{"workspaceId": 1, "legacySource": 1, "legacyId": 1}` único com filtro parcial

### delivery_ho_plans

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `featureId` | objectId | Sim |
| `revision` | int/long; mínimo 0 | Sim |
| `approvalFence` | int/long; mínimo 0 | Sim |
| `state` | string; no_plan, testing, awaiting_acceptance, accepted | Sim |
| `executions` | array; min itens 0; max itens 200 | Sim |
| `executions[].id` | string; min caracteres 1 | Sim |
| `executions[].catalogScenarioId` | objectId | Não |
| `executions[].name` | string; min caracteres 1 | Sim |
| `executions[].guaranteeType` | string; automatic, manual, not_applicable | Não |
| `executions[].components` | array; min itens 0; max itens 100 | Não |
| `executions[].dimensions` | object | Não |
| `executions[].steps` | array; min itens 1; max itens 50 | Sim |
| `executions[].steps[].id` | string; min caracteres 1 | Sim |
| `executions[].steps[].name` | string; min caracteres 1 | Sim |
| `executions[].steps[].result` | string; pending, ok, failed, not_applicable | Sim |
| `executions[].steps[].failureReason` | string; max caracteres 2000 | Não |
| `executions[].source` | object | Não |
| `executions[].source.hoPlanId` | objectId | Sim |
| `executions[].source.hoRevision` | int/long; mínimo 0 | Sim |
| `executions[].source.executionId` | string; min caracteres 1 | Sim |
| `executions[].classification` | string; min caracteres 1 | Sim |
| `executions[].classificationLabel` | string; min caracteres 1 | Sim |
| `executions[].preconditions` | string; max caracteres 2000 | Não |
| `executions[].expectedResult` | string; max caracteres 3000 | Não |
| `executions[].frontId` | objectId | Não |
| `executions[].frontLabel` | string | Não |
| `executions[].functionalityId` | objectId | Não |
| `executions[].functionalityLabel` | string | Não |
| `executions[].executionMode` | enum; Manual, Automatizada | Não |
| `executions[].workflowId` | objectId | Não |
| `executions[].workflowVersion` | int/long; mínimo 1 | Não |
| `executions[].catalogVersion` | int/long; mínimo 0 | Não |
| `executions[].sourceSteps` | array; min itens 1; max itens 50 | Não |
| `executions[].sourceSteps[].id` | string; min caracteres 1 | Sim |
| `executions[].sourceSteps[].name` | string; min caracteres 1 | Sim |
| `executions[].scopeEndStepId` | string; min caracteres 1 | Não |
| `executions[].scopeLocked` | bool | Não |
| `executions[].assignedTo` | string; min caracteres 1 | Não |
| `executions[].assigneeName` | string; max caracteres 100 | Não |
| `executions[].reviewerId` | string; min caracteres 1 | Não |
| `executions[].reviewerName` | string; max caracteres 100 | Não |
| `executions[].coverage` | string; max caracteres 100 | Não |
| `executions[].orderReference` | string; max caracteres 300 | Não |
| `executions[].testReference` | string; max caracteres 500 | Não |
| `acceptance` | object | Não |
| `acceptance.actor` | object | Sim |
| `acceptance.actor.userId` | string; min caracteres 1 | Sim |
| `acceptance.actor.displayName` | string; min caracteres 1 | Sim |
| `acceptance.at` | date | Sim |
| `acceptance.note` | string | Não |
| `acceptance.revision` | int/long; mínimo 0 | Sim |
| `jiraReferences` | object | Não |
| `jiraReferences.issue` | string; max caracteres 500 | Não |
| `jiraReferences.execution` | string; max caracteres 500 | Não |
| `legacySource` | string; min caracteres 1; max caracteres 100 | Não |
| `legacyId` | string; min caracteres 1; max caracteres 200 | Não |

Índices:
- `ho_feature_unique`: `{"workspaceId": 1, "featureId": 1}` único
- `ho_queue`: `{"workspaceId": 1, "state": 1, "updatedAt": -1}`
- `legacy_origin_unique`: `{"workspaceId": 1, "legacySource": 1, "legacyId": 1}` único com filtro parcial

### delivery_changes

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `rdm` | string; min caracteres 1 | Não |
| `featureIds` | array; min itens 1; max itens 100 | Sim |
| `teamId` | string; min caracteres 1 | Sim |
| `teamName` | string; min caracteres 1 | Não |
| `tl` | object | Sim |
| `tl.userId` | string; min caracteres 1 | Sim |
| `tl.displayName` | string; min caracteres 1 | Sim |
| `po` | object | Sim |
| `po.userId` | string; min caracteres 1 | Sim |
| `po.displayName` | string; min caracteres 1 | Sim |
| `window` | object | Sim |
| `window.date` | string | Sim |
| `window.startAt` | date | Sim |
| `window.endAt` | date | Sim |
| `window.timeZone` | string; min caracteres 1 | Sim |
| `status` | string; draft, awaiting_approval, approved, deployed, closed, rollback, rejected, not_performed | Sim |
| `checklist` | array; min itens 0; max itens 200 | Sim |
| `checklist[].id` | string; min caracteres 1 | Sim |
| `checklist[].question` | string; min caracteres 1 | Sim |
| `checklist[].required` | bool | Sim |
| `checklist[].type` | string; boolean, number, text | Sim |
| `checklist[].answer` | string/int/long/double/decimal/bool/null | Não |
| `hoReferences` | array; min itens 0; max itens 100 | Sim |
| `hoReferences[].featureId` | objectId | Sim |
| `hoReferences[].planId` | objectId | Sim |
| `hoReferences[].revision` | int/long; mínimo 0 | Sim |
| `production` | object | Sim |
| `production.executions` | array; min itens 0; max itens 200 | Sim |
| `production.executions[].id` | string; min caracteres 1 | Sim |
| `production.executions[].catalogScenarioId` | objectId | Não |
| `production.executions[].name` | string; min caracteres 1 | Sim |
| `production.executions[].guaranteeType` | string; automatic, manual, not_applicable | Não |
| `production.executions[].components` | array; min itens 0; max itens 100 | Não |
| `production.executions[].dimensions` | object | Não |
| `production.executions[].steps` | array; min itens 1; max itens 50 | Sim |
| `production.executions[].steps[].id` | string; min caracteres 1 | Sim |
| `production.executions[].steps[].name` | string; min caracteres 1 | Sim |
| `production.executions[].steps[].result` | string; pending, ok, failed, not_applicable | Sim |
| `production.executions[].steps[].failureReason` | string; max caracteres 2000 | Não |
| `production.executions[].source` | object | Sim |
| `production.executions[].source.hoPlanId` | objectId | Sim |
| `production.executions[].source.hoRevision` | int/long; mínimo 0 | Sim |
| `production.executions[].source.executionId` | string; min caracteres 1 | Sim |
| `production.executions[].classification` | string; min caracteres 1 | Sim |
| `production.executions[].classificationLabel` | string; min caracteres 1 | Sim |
| `production.executions[].preconditions` | string; max caracteres 2000 | Não |
| `production.executions[].expectedResult` | string; max caracteres 3000 | Não |
| `production.executions[].frontId` | objectId | Não |
| `production.executions[].frontLabel` | string | Não |
| `production.executions[].functionalityId` | objectId | Não |
| `production.executions[].functionalityLabel` | string | Não |
| `production.executions[].executionMode` | enum; Manual, Automatizada | Não |
| `production.executions[].workflowId` | objectId | Não |
| `production.executions[].workflowVersion` | int/long; mínimo 1 | Não |
| `production.executions[].catalogVersion` | int/long; mínimo 0 | Não |
| `production.executions[].sourceSteps` | array; min itens 1; max itens 50 | Não |
| `production.executions[].sourceSteps[].id` | string; min caracteres 1 | Sim |
| `production.executions[].sourceSteps[].name` | string; min caracteres 1 | Sim |
| `production.executions[].scopeEndStepId` | string; min caracteres 1 | Não |
| `production.executions[].scopeLocked` | bool | Não |
| `production.executions[].assignedTo` | string; min caracteres 1 | Não |
| `production.executions[].assigneeName` | string; max caracteres 100 | Não |
| `production.executions[].reviewerId` | string; min caracteres 1 | Não |
| `production.executions[].reviewerName` | string; max caracteres 100 | Não |
| `production.executions[].coverage` | string; max caracteres 100 | Não |
| `production.executions[].orderReference` | string; max caracteres 300 | Não |
| `production.executions[].testReference` | string; max caracteres 500 | Não |
| `production.state` | string; not_started, pending, in_progress, failed, accepted | Sim |
| `production.acceptance` | object | Não |
| `production.acceptance.actor` | object | Sim |
| `production.acceptance.actor.userId` | string; min caracteres 1 | Sim |
| `production.acceptance.actor.displayName` | string; min caracteres 1 | Sim |
| `production.acceptance.at` | date | Sim |
| `production.acceptance.note` | string | Não |
| `production.acceptance.revision` | int/long; mínimo 0 | Sim |
| `production.revision` | int/long; mínimo 0 | Sim |
| `approval` | object | Não |
| `approval.actor` | object | Sim |
| `approval.actor.userId` | string; min caracteres 1 | Sim |
| `approval.actor.displayName` | string; min caracteres 1 | Sim |
| `approval.at` | date | Sim |
| `approval.revision` | int/long; mínimo 0 | Sim |
| `approval.incompleteChecklistException` | object | Não |
| `approval.incompleteChecklistException.reason` | string; min caracteres 1 | Sim |
| `approval.incompleteChecklistException.pendingItemIds` | array; min itens 0; max itens 200 | Sim |
| `deployment` | object | Não |
| `deployment.actor` | object | Sim |
| `deployment.actor.userId` | string; min caracteres 1 | Sim |
| `deployment.actor.displayName` | string; min caracteres 1 | Sim |
| `deployment.at` | date | Sim |
| `deployment.releaseRef` | string; min caracteres 1 | Sim |
| `closure` | object | Não |
| `closure.actor` | object | Sim |
| `closure.actor.userId` | string; min caracteres 1 | Sim |
| `closure.actor.displayName` | string; min caracteres 1 | Sim |
| `closure.at` | date | Sim |
| `closure.note` | string | Não |
| `closure.revision` | int/long; mínimo 0 | Sim |
| `rollback` | object | Não |
| `rollback.actor` | object | Sim |
| `rollback.actor.userId` | string; min caracteres 1 | Sim |
| `rollback.actor.displayName` | string; min caracteres 1 | Sim |
| `rollback.at` | date | Sim |
| `rollback.reason` | string; min caracteres 1 | Sim |
| `rollback.executionId` | string; min caracteres 1 | Não |
| `rollback.stepId` | string; min caracteres 1 | Não |
| `previousChangeId` | objectId | Não |
| `preparationRevision` | int/long; mínimo 0 | Sim |
| `notes` | string; max caracteres 4000 | Não |
| `executorTeamId` | string; min caracteres 1 | Não |
| `executorTeamName` | string; max caracteres 200 | Não |
| `checklistDefinitionId` | objectId | Não |
| `checklistDefinitionVersion` | int/long; mínimo 0 | Não |
| `legacySource` | string; min caracteres 1; max caracteres 100 | Não |
| `legacyId` | string; min caracteres 1; max caracteres 200 | Não |
| `reason` | string; max caracteres 1000 | Não |
| `changeTime` | string | Não |
| `plannedOpenDate` | string | Não |
| `participation` | object | Não |
| `participation.flex` | bool | Não |
| `participation.on` | bool | Não |
| `participation.onJustification` | string; max caracteres 1000 | Não |

Índices:
- `change_rdm_unique`: `{"workspaceId": 1, "rdm": 1}` único com filtro parcial
- `change_calendar`: `{"workspaceId": 1, "window.date": 1, "window.startAt": 1}`
- `production_queue`: `{"workspaceId": 1, "status": 1, "po.userId": 1, "window.startAt": 1}`
- `feature_change_history`: `{"workspaceId": 1, "featureIds": 1, "createdAt": -1}`
- `legacy_origin_unique`: `{"workspaceId": 1, "legacySource": 1, "legacyId": 1}` único com filtro parcial

### delivery_feature_locks

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `featureId` | objectId | Sim |
| `changeId` | objectId | Sim |

Índices:
- `active_change_feature_unique`: `{"workspaceId": 1, "featureId": 1}` único
- `change_lock_release`: `{"workspaceId": 1, "changeId": 1}`

### delivery_freezes

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `name` | string; min caracteres 1 | Sim |
| `active` | bool | Sim |
| `startDate` | string | Sim |
| `endDate` | string | Sim |
| `scope` | string; all, components | Sim |
| `components` | array; min itens 0; max itens 100 | Sim |
| `legacySource` | string; min caracteres 1; max caracteres 100 | Não |
| `legacyId` | string; min caracteres 1; max caracteres 200 | Não |
| `description` | string; max caracteres 1000 | Não |
| `matchMode` | string; contains, exact | Não |

Índices:
- `freeze_window`: `{"workspaceId": 1, "active": 1, "startDate": 1, "endDate": 1}`
- `legacy_origin_unique`: `{"workspaceId": 1, "legacySource": 1, "legacyId": 1}` único com filtro parcial

### delivery_audit_events

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `entityType` | string; feature, scenario, trail, ho_plan, change, definition, freeze, test_flow | Sim |
| `entityId` | objectId | Sim |
| `entityVersion` | int/long; mínimo 0 | Sim |
| `commandId` | string; min caracteres 1 | Sim |
| `type` | string; min caracteres 1 | Sim |
| `actor` | object | Sim |
| `actor.userId` | string; min caracteres 1 | Sim |
| `actor.displayName` | string; min caracteres 1 | Sim |
| `at` | date | Sim |
| `details` | object | Sim |

Índices:
- `audit_entity_version_unique`: `{"workspaceId": 1, "entityType": 1, "entityId": 1, "entityVersion": 1}` único
- `audit_history`: `{"workspaceId": 1, "entityType": 1, "entityId": 1, "at": -1, "_id": -1}`
- `ho_accepted_revision_unique`: `{"workspaceId": 1, "entityId": 1, "details.hoRevision": 1}` único com filtro parcial

### delivery_commands

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `actorId` | string; min caracteres 1 | Sim |
| `key` | string; min caracteres 1 | Sim |
| `requestHash` | string; min caracteres 1 | Sim |
| `result` | object | Sim |

Índices:
- `command_idempotency_unique`: `{"workspaceId": 1, "actorId": 1, "key": 1}` único

### delivery_module_settings

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `flags` | object | Sim |
| `flags.delivery` | bool | Sim |
| `flags.quality` | bool | Sim |
| `flags.gmud` | bool | Sim |
| `flags.production` | bool | Sim |
| `flags.planning` | bool | Sim |
| `flags.homologation` | bool | Sim |
| `flags.approval` | bool | Sim |

Índices:
- `module_settings_workspace_unique`: `{"workspaceId": 1}` único

### delivery_test_flows

| Campo | Tipo / limite | Obrigatório |
| --- | --- | --- |
| `name` | string; min caracteres 1; max caracteres 100 | Sim |
| `nameNormalized` | string; min caracteres 1; max caracteres 100 | Sim |
| `frontId` | objectId | Sim |
| `functionalityId` | objectId/null | Sim |
| `active` | bool | Sim |
| `steps` | array; min itens 1; max itens 50 | Sim |
| `steps[].id` | string; min caracteres 1 | Sim |
| `steps[].name` | string; min caracteres 1; max caracteres 200 | Sim |
| `legacySource` | string; min caracteres 1; max caracteres 100 | Não |
| `legacyId` | string; min caracteres 1; max caracteres 200 | Não |

Índices:
- `unique_flow_name_in_scope`: `{"workspaceId": 1, "frontId": 1, "functionalityId": 1, "nameNormalized": 1}` único
- `flow_catalog`: `{"workspaceId": 1, "frontId": 1, "active": 1, "name": 1}`
- `legacy_origin_unique`: `{"workspaceId": 1, "legacySource": 1, "legacyId": 1}` único com filtro parcial

## Campos reservados e migração

Escopo configurável por US/TP, reviewerId, referências Jira do plano, cadastro genérico e seleção de modelo no cenário são propostas opcionais retiradas da interface atual. Campos opcionais estão preparados, mas não tornam esses controles entregues. Ver pacote Testes para a R1 clássica.

legacySource/legacyId somente em importação explícita, com mapeamento e índice parcial único por workspace. Não persistir dados de demonstração automaticamente. Os snapshots aceitos em auditoria precisam de limite de bytes na API e retenção; se o mecanismo de auditoria do hospedeiro não suporta isso, resolver versionamento antes de liberar HO.
