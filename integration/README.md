# Pacote de preparação para integração

Comece por [IMPLEMENTAR_NO_SISTEMA.md](../IMPLEMENTAR_NO_SISTEMA.md). Esta pasta contém desenho e contratos para implementar no sistema hospedeiro com MongoDB, sem impor framework, driver/ODM ou autenticação diferentes.

- `implementation-plan.json`: ordem e status de implementação no sistema real.
- `tasks/`: critérios de aceite por fase.
- `mongodb/model.md`: escolhas de dados e consistência.
- `mongodb/collections.json`: validators BSON e índices propostos.
- `mongodb/apply-schema.cjs`: bootstrap explícito usando a conexão existente.
- `contracts/api.json`: catálogo de operações a adaptar à API existente.
- `contracts/operations.md`: regras de comandos, permissões e transações.

O bootstrap foi testado com um adaptador simulado; os schemas e índices precisam ser validados em uma instância real, com a versão e topologia do sistema hospedeiro, antes de aplicar a migration. Nenhum banco foi acessado por esta preparação.
