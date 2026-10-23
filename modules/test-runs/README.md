# Acompanhamento de testes por ciclo

Protótipo HTML/CSS/JavaScript, atualizado em 23/10/2026, baseado nas planilhas de imgs/. Entrada: acompanhamento-testes.html, menu Qualidade → Acompanhamento de testes. Usa quality sem exigir Entregas, HO ou GMUD habilitados.

## Fluxo disponível

- Seletor de ciclo por nome e janela prevista de produção; exemplos de Crédito, Marketplace e Site com validações simultâneas.
- Resumo de cenários previstos, concluídos, em execução, com falha e não iniciados; dispensados ficam separados. Percentual de cenários e etapas OK exclui N/A do denominador. Falha não conta como validação OK; cenário inteiramente N/A é dispensado. Concluir execução não dá aceite nem confirma implantação.
- Abas Cenários, Planilha de etapas, Agenda dos times e Histórico. Por time e Cobertura planejada foram retiradas; o filtro de time permanece na lista e na planilha.
- Painel lateral por cenário: time/responsável, link de evidências Jira, etapas, motivo de falha e confirmação explícita de reteste.
- Novo ciclo seleciona cenários ativos do catálogo, com cópia de etapas e versões e resultados pendentes. As opções de reutilizar/copiar ciclos ou cenários de outro ciclo foram retiradas a pedido do usuário. Registros já salvos permanecem preservados.

## Planilha e seleção de datas

Exibir permite Ciclo selecionado, Por data de produção, Datas selecionadas e Todos os ciclos. Os botões Datas de subida, junto à tabela de etapas, permitem selecionar mais de uma data, desmarcar, escolher Todas as subidas ou Este ciclo. Uma janela que inclui dois dias selecionados aparece uma única vez. Janelas muito longas possuem sugestões limitadas ao primeiro ano e à data final; o calendário permite consultar outros dias.

O consolidado agrupa por ciclo, informa datas de validação e produção no grupo e nos cenários e mostra uma faixa temporal: azul para validação prevista, verde para implantação prevista. Filtrar datas não copia resultados. Filtros de busca, frente, time e situação se aplicam ao recorte escolhido; o resumo de um único ciclo é ocultado no consolidado. Cada célula abre o painel focado na etapa, usando o par cycleId/scenarioId para não alterar outra execução com ID igual.

Etapa fora do fluxo aparece como —, diferente de uma etapa marcada N/A. As colunas vêm dos fluxos próprios dos cenários filtrados; Marketplace não recebe automaticamente etapas de crédito. A visão aceita ?view=matrix.

## Agenda

De/Até e ambiente consultam todos os ciclos cujas datas de validação se cruzam com o intervalo, com limites inclusivos. Cada linha representa time executor/ciclo; a barra abre a planilha filtrada pelo time. A contagem por dia/faixa considera times distintos. Intervalos maiores são agrupados em até 14 colunas, preservando todo o período. A agenda representa planejamento, não atividade online ou conflito de componentes. A visão aceita ?view=agenda.

validationStartDate/validationEndDate são opcionais e diferentes de startDate/endDate (produção prevista). Sem datas de validação em registro antigo, usa a janela do ciclo com aviso explícito, sem inventar HO. Cenário compartilhado tem um time executor e acompanhantes, contado uma vez; editor de participantes/execuções independentes ainda não está nesta prévia.

## Evidências no Jira

Cada execução pode ter evidenceUrl:string opcional. No painel lateral, colar o link completo do card ou página de evidências e Salvar validação. O link aparece também na lista e na primeira coluna da planilha. É possível editar e remover sem alterar resultados; criação/alteração/remoção gera evento evidence_updated no histórico do ciclo, com previousUrl/newUrl e responsável.

URL aceita HTTP/HTTPS, até 2048 caracteres, sem credenciais na URL. Não há restrição fixa ao domínio atlassian.net, pois o Jira pode usar domínio próprio. Links abrem com target=_blank e rel=noopener noreferrer; protocolos como javascript/data/file não são permitidos. Não há upload, consulta à API Jira ou verificação de acesso ao destino. O link é por execução/ciclo, não por cenário reutilizável do catálogo, e não é pré-requisito para concluir etapas. Dados antigos sem evidenceUrl continuam válidos.

## Isolamento e preparação de integração

Store próprio issueflow.testruns.v1. Exemplos são exibidos em memória na primeira abertura e só persistem após salvamento/criação. Novos exemplos não são injetados em stores já salvos. Nenhuma alteração nos planos das issues, GMUDs ou aceites existentes.

A visão é independente dos resultados HO/PROD das issues nesta prévia. Não agrega automaticamente os planos das features: integração futura exige vínculos explícitos à execução de origem. Ambiente HO/PROD é descritivo, sem liberar comandos de deploy. Nenhuma collection, migration ou backend conectado foi criado nesta visualização; não ampliar a primeira release do hospedeiro implicitamente.

Ciclo: id, name, startDate/endDate, validationStartDate/validationEndDate, environment, release, demo, scenarios, history. Execução: id, name, team, owner, front, functionality, watchers, issue, evidenceUrl opcional, steps[{id,name,result,reason}], mais referências de catálogo/fluxo quando originada do catálogo. Referências antigas sourceRunId/sourceScenarioId são preservadas, embora a UI de cópia tenha sido removida.

Falhas de gravação preservam formulário e estado anterior. Mudança detectada em outra aba bloqueia salvamento até recarregar. Nomes digitados são demonstração; integração real deve usar identidades existentes, autorização, workspace, revisão, idempotência e auditoria paginada no servidor. Histórico local não é modelo de array ilimitado para produção.

## Testes

node --test tests/*.test.cjs verifica estados, métricas, N/A, times, datas de validação/produção, isolamento e validação segura de URLs. Suítes afetadas: test-runs-browser, test-run-views-browser, test-production-matrix-browser e test-evidence-browser. Incluídas em node tests/run-e2e.cjs. Cobrem filtros, criação pelo catálogo, edição no ciclo correto, datas, painel, falhas/retestes, evidências, histórico, persistência/reload, erro de armazenamento, retirada da reutilização e mobile.
