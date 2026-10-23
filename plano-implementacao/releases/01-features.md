# R1 — Entregas

Status: **pendente no sistema real**.

- ID canônico: `01-features`.
- Dependências: Somente a preparação R0; sem dependência de outro módulo funcional.
- Flags: delivery.
- Referência do protótipo: index.html; modules/features/
- Coleções propostas: delivery_features

## Jornada entregue

TL cadastra uma entrega com equipe, componentes e identificação externa; consulta e edita pelo sistema real.

## Frontend e backend da release

CRUD e filtros no backend; referências a usuários/equipes existentes; unicidade por workspace; formulário e listagem paginada com o design system hospedeiro.

Adaptar as operações de [API](../../integration/contracts/api.json) e [comandos](../../integration/contracts/operations.md) ao sistema hospedeiro. Reutilizar conexão MongoDB, autenticação, usuários, equipes, workspace e UI existentes. Cada escrita exige autorização, isolamento de workspace, revisão esperada, idempotência quando aplicável e histórico no servidor.

## Limite de escopo

Não incluir execução HO, GMUD ou confirmação de implantação.

## Critérios de aceite

- [ ] Cadastro e edição da feature/issue.
- [ ] Consulta paginada por squad, período e componente.
- [ ] ID externo único no workspace e referências a equipes existentes.

## Testes específicos

Criar, editar e consultar em duas sessões; rejeitar ID duplicado no mesmo workspace; permitir isolamento entre workspaces; negar escrita sem permissão.

Também executar testes de permissão, isolamento entre workspaces e persistência após recarregar/reabrir sessão. Os testes de navegador do protótipo são referência de comportamento; criar/adaptar a cobertura para a stack real.

## Liberação e reversão

Seguir [o procedimento comum](../03-validacao-e-liberacao.md). Habilitar somente capacidades desta release para o piloto. Desativar a capacidade bloqueia novos comandos e mantém histórico; não reverter dados destrutivamente. Com execução em andamento, preservar acesso de consulta e o procedimento operacional para concluir ou registrar rollback.

## Registro de conclusão

Preencher [o acompanhamento](../04-acompanhamento.md), anexar evidências dos testes e atualizar o status de `01-features` em [implementation-plan.json](../../integration/implementation-plan.json) apenas após frontend, backend e persistência reais validados.
