# Comece aqui: implementar Gestão de entregas no sistema real

**Escopo atual: somente Testes.** Começar por [Release 1 — Testes](integration/releases/tests-first/README.md), seu dicionário de campos e manifest. As fases de Entregas, HO, GMUD e PROD continuam desligadas e pendentes. A fase `02-catalog` é a primeira entrega; seus IDs foram preservados para compatibilidade.

O roteiro por release está na pasta [plano-implementacao](plano-implementacao/README.md), com escopo, dependências, validação e acompanhamento.

Esta pasta é uma referência funcional, com protótipo HTML/JS, contratos de dados e roteiro de implementação. Copie-a para uma pasta de referência dentro do repositório do sistema, por exemplo `references/gestao-entregas/`. Ela não deve substituir a aplicação existente.

## Solicitação pronta para usar

> Leia `references/gestao-entregas/IMPLEMENTAR_NO_SISTEMA.md` e o pacote `integration/releases/tests-first/`. Analise primeiro a arquitetura, autenticação, permissões, conexão MongoDB e componentes existentes. Implemente **somente a Release 1 de Testes**, fase `02-catalog`, conforme `manifest.json`, `campos.md`, `api.json` e `checklist.md`. Reutilize usuários, workspace, UI e infraestrutura do hospedeiro. Entregue frontend e backend com persistência real, validators, índices, controle de versão, idempotência e auditoria. Preserve o protótipo como referência; não copie localStorage, globais JS ou iframe para a arquitetura real. Não habilite Features, HO, GMUD ou PROD e não avance para outra fase sem nova solicitação. Registre o resultado dos testes e mantenha a integração pendente até validar MongoDB/API reais.

Para continuar outra fase:

> Continue a implementação seguindo `integration/implementation-plan.json`. Verifique o código já integrado e o último registro de progresso antes de iniciar a próxima fase. Entregue a funcionalidade completa, com persistência MongoDB e regras no backend.

## O que consultar

- `integration/releases/all-phases/README.md`: revisão das demais fases, campos, migrations e pendências de validação real de banco. A consulta não autoriza habilitar todas as fases.

- `docs/releases-e-customizacao.md`: módulos independentes, flags, releases e cadastro genérico de testes.

- `docs/arquitetura.md`: diagramas Mermaid da arquitetura e do fluxo operacional.

- `modules/`: comportamento de cada responsabilidade e interfaces do protótipo.
- `docs/modulos.md`: responsabilidades, vínculos e fluxo operacional completo.
- `integration/mongodb/model.md`: desenho de dados, estados, referências, concorrência e migração.
- `integration/mongodb/collections.json`: proposta executável de validators BSON e índices.
- `integration/mongodb/apply-schema.cjs`: função de bootstrap; usa a conexão do backend e não acessa um banco sozinha.
- `integration/contracts/api.json`: catálogo de operações proposto; não é uma API já implementada nem um arquivo OpenAPI.
- `integration/contracts/operations.md`: regras de comandos, permissões, atomicidade e erros.
- `integration/tasks/`: critérios de aceite por fase.
- `integration/module-packages.json`: arquivos, responsabilidades e dependências de cada parte a implementar.
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

## Escolher apenas uma parte

Consulte integration/module-packages.json para os arquivos de Entregas, Qualidade, GMUD, Validação PROD e Planejamento. Comece pelo catálogo de Qualidade se o objetivo for liberar apenas cadastro de cenários/trilhas; a execução HO depende da integração com uma entrega. Flags podem ser configuradas no protótipo para reproduzir cada combinação, mas precisam ser verificadas no backend do sistema real.
