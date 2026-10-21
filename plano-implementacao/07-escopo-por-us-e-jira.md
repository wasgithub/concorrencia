# Escopo regressivo por US/TP, Jira e responsáveis

> Atualização em 21/10/2026: a interface de cenários e HO foi restaurada para o fluxo anterior a pedido do usuário. Os controles descritos abaixo não estão mais disponíveis na tela de HO; este documento foi preservado como proposta. Consulte `docs/retorno-cenarios-ho.md` para o estado atual.

Este fluxo foi implementado no protótipo HTML/JS antes da restauração descrita acima. A integração com servidor/MongoDB continua pendente: estes contratos são preparação, não uma API conectada ou sincronização com Jira.

## Uso na tela

1. Abra a homologação da entrega/US/TP.
2. Em **Selecionar cenários**, marque cenários em Catálogo/Sugeridos ou escolha uma trilha.
3. Para o uso comum, marque os cenários e clique em **Adicionar ao plano**. O primeiro cenário adicionado abre suas etapas automaticamente. Para personalizar o alcance, use **Ajustar escopo e responsáveis (opcional)** no rodapé. A seção **Revise o escopo e os responsáveis** mostra cada cenário selecionado. Escolha **Executar até**, informe responsável e, quando necessário, revisor. O padrão é o fluxo completo disponível no cenário.
4. Adicione ao plano. Buscar, filtrar e trocar abas preserva as escolhas; cancelar não altera o plano.
5. Após registrar os resultados, use **Salvar plano e execução**, disponível junto às etapas e no topo da página. Adicionar ao plano ainda não grava os dados automaticamente. Antes do primeiro resultado, o botão **Escopo e responsáveis** no cenário permite ajustar o alcance usando a cópia original, sem editar o catálogo. Salve o plano para persistir.
6. No painel **Referências da US/TP e dos testes específicos no Jira**, informe as chaves ou URLs correspondentes. Não há leitura automática nem resultado aprovado a partir do link.
7. Execute apenas as etapas selecionadas. As posteriores aparecem como **Fora do escopo**, sem resultado OK ou N/A e sem entrar nos denominadores da execução.
8. Use **Responsáveis e pendências** e a fila HO para ver quem executa, quem revisa e em qual etapa há bloqueio.
9. Após aceite HO, selecione os cenários para PROD. A cópia mantém exatamente o prefixo homologado, sem ampliar para etapas não executadas em HO.

Exemplo: catálogo CPR com Simulação → Pedido → Documentos → Contrato → Desembolso. US A seleciona até Documentos; US B, até Contrato. O catálogo e a outra US não são alterados. A GMUD da US A só recebe Simulação, Pedido e Documentos como etapas executáveis.

## Escopo planejado não é ponto de falha

Depois do primeiro resultado, `scopeLocked` permanece verdadeiro: limpar resultados ou voltar uma etapa a Pendente não libera a redução do alcance. A falha continua exigindo motivo e reteste explícito. Atribuições podem ser ajustadas, mantendo histórico e invalidando aceite conforme as regras atuais.

Se for necessário replanejar depois de executar, usar uma nova execução; resultados/histórico anteriores devem ser preservados. No protótipo, remover e incluir novamente gera outro ID de execução e mantém o histórico já salvo no plano. O backend deve preservar também o snapshot completo da execução removida na auditoria, conforme sua política de retenção.

As etapas escolhidas são um prefixo contínuo: não permite pular uma etapa intermediária e declarar o restante homologado. Uma etapa aplicável que não pôde ser executada permanece pendente/com falha; não virar N/A automaticamente.

## Fonte oficial de cada informação

- Jira: critérios e testes específicos da alteração, defeitos, PR/pipeline e relatórios de testes técnicos.
- Este módulo: cenários regressivos reutilizáveis, trilhas, planejamento e execução HO, aceites, GMUD e validação PROD.
- Cenários que já existem no Jira precisam de decisão de origem antes de transferência: não manter duas cópias editáveis do mesmo cenário. Referência manual é o primeiro passo, não comprovação de execução.
- Responsável/revisor do protótipo são nomes informados. Na integração, usar IDs de usuários já existentes; atribuição não significa que a revisão foi executada ou aprovada.

## Persistência e compatibilidade

O protótipo mantém as chaves existentes, incluindo `issueflow.hoplans.v1`. Os campos adicionais são:

| Campo local | Papel |
| --- | --- |
| `catalogVersion` | Versão do cenário capturada ao selecionar; novos saves do catálogo incrementam `version` |
| `sourceFlow`, `sourceStepDefinitions` | Cópia completa da sequência disponível no cenário de origem |
| `fluxo`, `stepDefinitions`, `etapaAlvo` | Prefixo executável desta entrega |
| `scopeLocked` | Bloqueio de escopo após registrar resultado |
| `resp`, `reviewer` | Atribuições opcionais da execução |
| `jiraReferences.issue`, `.execution` | Chaves/URLs manuais associadas ao plano |

Para dados legados sem cópia completa, considerar somente a sequência já persistida como origem conhecida. Não buscar a versão atual do catálogo nem reconstruir etapas históricas pelo fluxo global. A leitura não acrescenta retroativamente etapas, aprovações ou N/A. Versão ausente é apresentada como referência legada 1 no protótipo; na migração real, registrar explicitamente que a versão histórica exata é desconhecida, em vez de inventar correspondência com uma revisão atual do catálogo.

## Estrutura MongoDB / API

Estender os snapshots em `delivery_ho_plans.executions` e `delivery_changes.production.executions`:

- `sourceSteps`: array ordenado e limitado de `{id, name}` sem resultados.
- `steps`: prefixo selecionado, com resultados somente nas etapas aplicáveis.
- `catalogVersion` e origem do catálogo/fluxo já existente.
- `scopeEndStepId`, `scopeLocked`, `assignedTo`, `reviewerId` e rótulos históricos opcionais.
- `jiraReferences` no plano, com strings limitadas e validadas na API.

Não criar uma coleção por US nem replicar o catálogo global por entrega. Os snapshots pequenos ficam junto do plano; eventos de escopo, atribuição, falha, reteste e remoção vão para a auditoria paginada do sistema real.

Comandos previstos em `integration/contracts/api.json`:

- `selectHOScenarios`: aceita escolhas com cenário, última etapa e atribuições; servidor copia a origem e valida o prefixo. Cenários vindos de trilha usam escopo completo salvo escolha explícita para o cenário.
- `configureHOExecution`: permite mudar escopo somente antes do primeiro resultado e atribuições conforme permissão; exige revisão atual e invalida aceite.
- `setHOJiraReferences`: registra chaves/URLs, sem consultar nem presumir resultado do Jira.

Regras no servidor: workspace e ator da sessão, usuários autorizados, IDs de etapas pertencentes à origem, prefixo não vazio, escopo bloqueado monotonicamente, CAS/idempotência e auditoria. O cliente não define o snapshot de origem nem destrava `scopeLocked`. PROD deve copiar a seleção HO aceita e rejeitar ampliação, alteração ou origem obsoleta. A comparação não depende da versão atual do catálogo.

Referências são validadas como chave de issue ou URL HTTP/HTTPS; rejeitar protocolos executáveis e credenciais na URL. Não buscar URLs arbitrárias no backend ao salvar um link.

## Releases e validação

R2: revisão do catálogo. R3: escopo, referências e atribuições. R4/R6: cópia e validação do alcance de PROD. Os status de integração continuam pendentes em `integration/implementation-plan.json`.

Testes: `node --test tests/*.test.cjs` e `node tests/run-e2e.cjs`. A suíte `ho-scope-browser` cobre duas USs com alcances diferentes, seleção por trilha, filtros, mobile, Jira, revisor, bloqueio após falha, reteste, aceite e cópia limitada para PROD até encerramento da GMUD. As execuções de teste usam contextos isolados e não limpam o navegador pessoal.
