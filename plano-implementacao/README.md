# Plano de implementação gradual

**Ordem atual: Testes primeiro (`02-catalog`).** O [pacote da primeira release](../integration/releases/tests-first/README.md) define o escopo e prevalece sobre as propostas mais amplas desta pasta. A [ordem executável](../integration/releases/tests-first/manifest.json) mantém os IDs das fases, mas começa por Testes.

O plano foi preservado como referência. Em 21/10/2026 as telas de cenários e HO retornaram ao formato anterior; propostas de escopo por US/TP, atribuição de revisor e referências Jira não estão disponíveis na interface atual. Veja [o registro da reversão](../docs/retorno-cenarios-ho.md).

Esta é a pasta de entrada para implementar Gestão de entregas por partes no sistema real. O protótipo permanece como referência; este plano não significa que o backend já foi entregue.

## Como usar

1. Ler [preparação e decisões](01-preparacao.md) antes de alterar o sistema hospedeiro.
2. Escolher a próxima release em [ordem e dependências](02-ordem-e-dependencias.md).
3. Implementar frontend, backend, persistência e testes da ficha em `releases/`.
4. Seguir [validação e liberação](03-validacao-e-liberacao.md).
5. Registrar decisões e evidências em [acompanhamento](04-acompanhamento.md).

## Sequência recomendada

A lista vigente, com funcionalidades, telas, flags e critérios de validação, está em [Módulos e ordem de implementação](ORDEM-DE-IMPLEMENTACAO.md). Esta ordem substitui a numeração histórica das fichas; seus IDs continuam estáveis.

| Ordem | Entrega | ID técnico preservado |
| --- | --- | --- |
| 1 | Testes: cenários, trilhas e configurações | `02-catalog` |
| 2 | Entregas: features/issues | `01-features` |
| 3 | Homologação e aceite HO | `03-homologation` |
| 4 | Preparação da GMUD | `04-changes` |
| 5 | Aprovação e agenda GMUD | `04b-approval` |
| 6 | Implantação e validação PROD | `05-production` |
| Opcional, após 2 | Calendário HO e concorrências | `06-calendars` |
| Se necessário | Importação e consolidação | `07-migration` |

A preparação do hospedeiro acompanha a primeira entrega. Cada fase inclui sua regressão; a consolidação não adia testes para o fim. Somente Testes fica habilitado por padrão no protótipo.

## Referências técnicas sem duplicação

- [Plano e status canônicos](../integration/implementation-plan.json): IDs e dependências das fases. R0 é preparação, não uma fase concluída implicitamente.
- [Mapa de arquivos por módulo](../integration/module-packages.json): páginas, diretórios, capacidades e coleções.
- [Contratos API](../integration/contracts/api.json) e [regras de comandos](../integration/contracts/operations.md).
- [Modelo MongoDB](../integration/mongodb/model.md) e [schemas/índices](../integration/mongodb/collections.json).
- [Customização do protótipo](../docs/releases-e-customizacao.md) e [arquitetura](../docs/arquitetura.md).

Os documentos técnicos continuam em `integration/` para preservar os caminhos existentes. Esta pasta organiza a execução gradual e aponta para essas fontes. Se o escopo mudar, atualizar a ficha e o plano canônico juntos.

## Solicitação pronta para outra implementação

> Leia `IMPLEMENTAR_NO_SISTEMA.md`, `plano-implementacao/README.md`, `plano-implementacao/04-acompanhamento.md` e `integration/implementation-plan.json`. Inspecione o sistema hospedeiro antes de escolher a implementação. Execute somente a próxima release pendente com dependências satisfeitas, seguindo sua ficha. Reutilize autenticação, UI, usuários, equipes e MongoDB existentes. Entregue frontend, backend e testes reais; preserve o protótipo. Registre decisões, arquivos e evidências e atualize o progresso. Não habilite capacidades de releases futuras.

Veja [cadastro de qualidade: telas e MongoDB](05-cadastro-qualidade-e-mongodb.md) para a separação entre frente, funcionalidade, fluxo reutilizável, cenário e execução.

Consulte a [revisão ponta a ponta](06-revisao-fluxo-ponta-a-ponta.md) para achados, ajustes, cenários de validação e melhorias posteriores.

Veja [escopo por US/TP, Jira e responsáveis](07-escopo-por-us-e-jira.md) para a configuração de alcance sem alterar o catálogo e sua propagação para PROD.

## Revisão integrada de todas as fases

Consultar [all-phases](../integration/releases/all-phases/README.md): fronteiras de flags, campos e collections, migrations por dependência, relatório de problemas e teste de Mongo isolado. A integração de cada fase continua pendente no sistema real.
