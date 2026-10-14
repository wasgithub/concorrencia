# Comece aqui: implementar Gestão de entregas no sistema real

Esta pasta é uma referência funcional, com protótipo HTML/JS, contratos de dados e roteiro de implementação. Copie-a para uma pasta de referência dentro do repositório do sistema, por exemplo `references/gestao-entregas/`. Ela não deve substituir a aplicação existente.

## Solicitação pronta para usar

> Leia `references/gestao-entregas/IMPLEMENTAR_NO_SISTEMA.md`, `docs/modulos.md` e a pasta `integration/`. Analise primeiro a arquitetura, autenticação, MongoDB e componentes do sistema atual. Implemente Gestão de entregas neste sistema, seguindo suas convenções e as fases de `integration/implementation-plan.json`. Use o protótipo como referência de comportamento e aproveite as entidades de usuário e equipe existentes. Comece pela fase 01, entregue frontend e backend funcionando, execute os testes aplicáveis e atualize o progresso antes de seguir. Preserve o fluxo até HO, aprovação da GMUD, implantação registrada, validação de PROD e encerramento. Não copie localStorage, globais de JavaScript nem o iframe da modal como arquitetura do sistema real. Não crie outro login ou uma segunda aplicação.

Para continuar outra fase:

> Continue a implementação seguindo `integration/implementation-plan.json`. Verifique o código já integrado e o último registro de progresso antes de iniciar a próxima fase. Entregue a funcionalidade completa, com persistência MongoDB e regras no backend.

## O que consultar

- `docs/arquitetura.md`: diagramas Mermaid da arquitetura e do fluxo operacional.

- `modules/`: comportamento de cada responsabilidade e interfaces do protótipo.
- `docs/modulos.md`: responsabilidades, vínculos e fluxo operacional completo.
- `integration/mongodb/model.md`: desenho de dados, estados, referências, concorrência e migração.
- `integration/mongodb/collections.json`: proposta executável de validators BSON e índices.
- `integration/mongodb/apply-schema.cjs`: função de bootstrap; usa a conexão do backend e não acessa um banco sozinha.
- `integration/contracts/api.json`: catálogo de operações proposto; não é uma API já implementada nem um arquivo OpenAPI.
- `integration/contracts/operations.md`: regras de comandos, permissões, atomicidade e erros.
- `integration/tasks/`: critérios de aceite por fase.
- `integration/implementation-plan.json`: progresso no sistema real, inicialmente pendente.

## Como adaptar sem reconstruir o sistema

1. Identifique a stack real, seus módulos, roteamento, design system, camada de serviços, migrations, testes e configuração MongoDB.
2. Mapeie usuário, equipe, workspace e permissões para as entidades existentes. `workspaceId` representa o escopo real; em aplicação de um único escopo, o servidor pode usar um valor fixo configurado.
3. Decida se a entidade existente de feature atende ao registro do protótipo. Feature e issue são o mesmo registro aqui; não criar uma hierarquia adicional sem necessidade.
4. Use a conexão/driver ou ODM já instalado. Os validators e índices devem virar migrations da stack existente; não adicionar outro backend ou conexão por tela.
5. Construa serviços por responsabilidade, com controllers finos, validação de comandos, repositórios MongoDB e testes. Reutilize os componentes reais de menu, formulário, modal e tabela.
6. Integre as fases em sequência. Calendários consultam os documentos existentes. A modal da GMUD chama o mesmo serviço e componente usados pela gestão de GMUDs, sem iframe no produto integrado.
7. Execute o fluxo ponta a ponta ao concluir: feature → catálogo → HO → aceite PO → GMUD → aprovação gerente → confirmação TL → testes PROD → aceite PO → encerramento TL. Verifique também falha, rollback e segunda GMUD para a mesma feature.

## Limites desta entrega

O protótipo continua no localStorage e pode ser usado para conferir o fluxo. A pasta `integration/` prepara a implementação futura; não existe backend MongoDB conectado, nem autenticação real nesta referência. Nenhuma coleção foi criada ou alterada em um banco. A implantação externa continua sendo registrada pelo TL; não há execução de pipeline pelo protótipo.
