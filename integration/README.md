# Pacote de preparação para integração

A revisão completa das fases está em [all-phases](releases/all-phases/README.md), com dicionário de campos, preflight, migrations limitadas às dependências e teste Mongo descartável. A validação real de banco ficou bloqueada por Docker sem daemon nesta sessão; ver relatório do pacote.

> Escopo vigente em 21/10/2026: primeira entrega somente de Testes, fase `02-catalog`, conforme `integration/releases/tests-first/`. Os controles genéricos e as fases adicionais descritos neste documento são propostas de evolução, não funcionalidades liberadas na R1.

O roteiro por release está na pasta [plano-implementacao](../plano-implementacao/README.md), com escopo, dependências, validação e acompanhamento.

Comece por [IMPLEMENTAR_NO_SISTEMA.md](../IMPLEMENTAR_NO_SISTEMA.md). Esta pasta contém desenho e contratos para implementar no sistema hospedeiro com MongoDB, sem impor framework, driver/ODM ou autenticação diferentes.

- `implementation-plan.json`: ordem e status de implementação no sistema real.
- `tasks/`: critérios de aceite por fase.
- `mongodb/model.md`: escolhas de dados e consistência.
- `mongodb/collections.json`: validators BSON e índices propostos.
- `mongodb/apply-schema.cjs`: bootstrap explícito usando a conexão existente.
- `contracts/api.json`: catálogo de operações a adaptar à API existente.
- `contracts/operations.md`: regras de comandos, permissões e transações.

O bootstrap foi testado com um adaptador simulado; os schemas e índices precisam ser validados em uma instância real, com a versão e topologia do sistema hospedeiro, antes de aplicar a migration. Nenhum banco foi acessado por esta preparação.

A versão 2 do plano separa Entregas, Qualidade, GMUD, Validação de produção e Planejamento. As flags e o cadastro genérico são descritos em [releases e customização](../docs/releases-e-customizacao.md).
