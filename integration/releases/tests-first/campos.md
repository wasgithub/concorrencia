> Atualização de 21/10/2026: o cadastro agora começa por Frente → Produto/funcionalidade → Fluxo. Consulte [cadastro por frente](../../../docs/cadastro-cenarios-por-frente.md), que prevalece sobre referências anteriores ao formulário restaurado sem seleção de fluxo.

# Dicionário da R1 — nomes para MongoDB

Nomes canônicos em inglês, camelCase para campos e snake_case nas collections, mantendo o prefixo existente `delivery_`. Labels das telas continuam em português. Não criar uma collection por frente, pessoa, garantia, etapa ou cenário. Usar a conexão MongoDB do hospedeiro.

## Collections

| Collection | Responsabilidade | Origem do protótipo |
| --- | --- | --- |
| delivery_scenarios | Cenários reutilizáveis e snapshot ordenado das etapas | issueflow.scenariocatalog.v1 |
| delivery_trails | Trilhas com referências ordenadas aos cenários | issueflow.testtrails.v1 |
| delivery_definitions | Etapas clássicas, dimensões/opções, frentes e funcionalidades, discriminadas por kind | issueflow.teststages.v1, issueflow.scenariodims.v1, issueflow.scenarioareas.v1 |
| delivery_test_flows | Modelos independentes por frente/funcionalidade | issueflow.testflows.v1 |
| delivery_audit_events | Histórico paginado de alterações, sem array ilimitado nas entidades | Eventos produzidos pelo backend |
| delivery_commands | Recibos de idempotência | Infraestrutura do backend |

Se o sistema já tiver auditoria/idempotência, reaproveitar e documentar o mapeamento. O wrapper de schema fornece estes nomes de referência; uma adaptação aprovada pode retirar as collections técnicas da migration, mantendo as garantias. Não criar delivery_features, delivery_ho_plans, delivery_changes, delivery_feature_locks ou delivery_freezes nesta release.

## Campos comuns, preenchidos pelo servidor

| Campo BSON | Tipo | Regra |
| --- | --- | --- |
| _id | ObjectId | Identidade interna imutável, gerada pelo servidor |
| workspaceId | string | Escopo obtido da sessão; adaptar ao tipo do hospedeiro antes de aplicar validator |
| schemaVersion | int | 1, versão do formato |
| version | int/long | 0 na criação; incrementar em cada alteração efetiva |
| createdAt, updatedAt | Date | Instantes UTC do servidor |
| createdBy, updatedBy | object | {userId:string, displayName:string}, identidade autenticada existente |

API serializa ObjectId como string hexadecimal e Date como ISO 8601. Não persistir datas como texto, expectedVersion ou Idempotency-Key dentro do cenário. Não aceitar campos de auditoria enviados pelo cliente. Nomes históricos são informativos, userId é a identidade.

## delivery_scenarios

| Campo da tela / local | Campo BSON | Tipo / regra da R1 |
| --- | --- | --- |
| id | _id | Gerar ObjectId; manter mapa legado somente em importação explícita |
| Código não editável | code | string única no workspace, gerada no servidor, por exemplo SCN-<identificador>; colisão deve ser tratada pelo índice único |
| Nome / nome | name | string, obrigatório, trim, 1–200 |
| Tipo de garantia / tipo | guaranteeType | automatic, manual, not_applicable; Automática → automatic; Manual → manual; N/A → not_applicable |
| Cobertura / cobertura | coverage | string, 1–100; vazio no formulário usa Regressivo padrão |
| Componentes / componentes | components | array string, até 100, trim, normalizar caixa, remover repetições; reusar IDs/códigos do catálogo do hospedeiro quando houver |
| Montador / dimensoes | dimensions | objeto {dimensionId:optionId}; IDs estáveis da definition, nunca labels como chaves persistentes |
| Testar até / etapaAlvo | steps | request usa throughStepId; servidor copia o prefixo ordenado de etapas, 1–50 itens {id:string,name:string}; última etapa é o alvo, sem campo duplicado de nome |
| Origem das etapas | stageDefinitionId, stageDefinitionVersion | ObjectId e int; backend registra origem/versão da configuração clássica usada ao criar/alterar o snapshot |
| Ativo / ativo | active | boolean obrigatório; true por padrão |
| Sem controle na tela clássica | classification | string exigida pelo schema geral; backend usa Regressivo na R1 |
| Sem controle na tela clássica | classificationLabel | backend usa Finalidade na R1 |

**Automática/Manual neste formulário é tipo de garantia, não teste automatizado/manual.** executionMode continua opcional e sem controle nesta tela; não inferir a partir de guaranteeType. O cadastro agora usa frontId, functionalityId, workflowId e workflowVersion. preconditions e expectedResult continuam opcionais e sem controles nesta tela; preservá-los em atualizações parciais. Fora de Crédito, garantia usa not_applicable. Tipos legados ambíguos não devem ser convertidos silenciosamente.

Dimensões aceitam frontId opcional em items: null significa todas as frentes; um ObjectId restringe à frente correspondente. No protótipo esse escopo é d.frente (label), convertido em ID no servidor da integração. Campos de crédito existentes têm escopo Crédito por compatibilidade; novos campos podem selecionar uma frente ou todas.

Cliente não monta steps livremente: envia frontId, functionalityId, workflowId e throughStepId; o servidor valida o escopo e copia IDs/sequência/versão do fluxo. Sem workflowId, permitir etapas clássicas apenas em Crédito, ou preservação explícita de snapshot existente sem troca de contexto. Em edição de cenário antigo, pode preservar a sequência já salva mesmo se a etapa tiver sido retirada do modelo global. Alterar o modelo não altera nenhum cenário existente. Ao modificar o alvo, o servidor produz outro snapshot/version, sem reconstruir resultados históricos de releases futuras.

Índices canônicos: scenario_code_unique {workspaceId,code} único; scenario_component_suggestions {workspaceId,active,components}. Usar paginação estável por name,_id. Busca por texto e novos índices devem ser definidos conforme volume/recursos reais; não depender de Atlas Search como requisito oculto da primeira entrega.

## delivery_trails

| Tela / local | Campo BSON | Regra |
| --- | --- | --- |
| id | _id | ObjectId |
| Nome / nome | name | string 1–160, obrigatório |
| Técnico | nameNormalized | string normalizada, obrigatória, gerada no servidor para unicidade por workspace |
| Cenários / casoIds | scenarioIds | array ObjectId, 1–200, sem duplicatas; ordem da seleção preservada |
| Disponível | active | boolean; true por padrão, arquivar em vez de excluir |

Validar referências no mesmo workspace. Novas seleções exigem cenários ativos; uma trilha antiga pode continuar referenciando cenário arquivado para não perder história, mas não pode executar nem apresentar essa referência como nova seleção válida. UI do hospedeiro deve destacar/remover a referência antes de reutilizar a trilha. Desativar um cenário não o apaga de trilhas antigas. Índices trail_catalog {workspaceId,active,name} e trail_name_unique {workspaceId,nameNormalized} único. Não colocar resultados de execução na trilha.

## delivery_definitions

Campos próprios: kind:string, name:string, nameNormalized:string, active:boolean, items:array até 200; parentId:ObjectId somente para funcionalidade. Mais campos comuns.

| kind | Documento / estrutura de items |
| --- | --- |
| test_stages | Um modelo clássico ativo por workspace; items ordenado de {id:string,name:string,active:boolean}, 1–50 |
| scenario_dimensions | Um montador ativo por workspace; items de {id,name,options:[{id,name,active}]}, até 50 dimensões e 100 opções por dimensão |
| scenario_front | Uma frente por documento, name contém rótulo, items=[] |
| scenario_functionality | Uma funcionalidade por documento, parentId aponta para scenario_front do mesmo workspace, items=[] |

IDs internos de etapa/dimensão/opção são UUIDs string gerados no backend, estáveis em renomeações; exclusão seguida de criação gera novo ID. Posição é a ordem do array. PF, PJ, Hipoteca, CPR e CPR Dollar são valores configurados, não campos especiais nem collections. Não criar campos dinâmicos com ponto ou prefixo $. API valida as estruturas discriminadas de items; o validator genérico isolado não faz todas essas verificações.

Definições de etapa e dimensões usam nomes canônicos stages-default e dimensions-default, respectivamente. definition_scope_unique {workspaceId,kind,parentId,nameNormalized} impede duplicação; API impede uma segunda configuração default ativa. parentId é omitido quando não aplicável. Desativar etapa/opção não reescreve snapshots antigos. Definitions de checklist e vocabulário genérico são de releases futuras e não são aceitas pela API R1.

## delivery_test_flows

Campos próprios: name:string (1–100), nameNormalized:string, frontId:ObjectId, functionalityId:ObjectId|null, active:boolean, steps:[{id:string,name:string}] (1–50, nomes 1–200). Campos comuns. IDs de etapa únicos no documento; nomes não vazios e duplicados rejeitados. version é copiado como workflowVersion ao selecionar o fluxo.

Validar frente e funcionalidade no mesmo workspace e vínculo pai-filho. Sem funcionalidade: null (campo presente). Índice unique_flow_name_in_scope {workspaceId,frontId,functionalityId,nameNormalized} único. flow_catalog suporta frente, active e nome. A biblioteca agora alimenta a seleção de fluxo no formulário de cenário. A seleção copia etapas e versão, sem vínculo vivo que reescreva cenários anteriores.

## delivery_audit_events e delivery_commands

Evento: entityType (scenario, trail, definition, test_flow), entityId:ObjectId, entityVersion:int, commandId:string, type:string, actor:{userId,displayName}, at:Date, details:object. Exemplos de type: scenario.created, scenario.updated, scenario.archived, trail.created, trail.updated, definition.updated, test_flow.updated. Guardar mudanças identificáveis, não documento gigante nem nomes como identidade. Campos comuns também se aplicam. Índices audit_entity_version_unique e audit_history permitem evento único por versão e consulta paginada.

Recibo: actorId:string, key:string (Idempotency-Key), requestHash:string (hash da operação, rota e payload normalizado), result:object (status/body ou IDs+versão reproduzíveis). Mais campos comuns. command_idempotency_unique {workspaceId,actorId,key} único. Mesma chave e hash retornam resultado anterior; hash diferente retorna 409. Retenção segue política do hospedeiro; não aplicar TTL arbitrário que comprometa retries. Comando de entidade, evento e recibo na mesma transação/recurso equivalente do sistema.
