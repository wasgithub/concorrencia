# R3 — Qualidade: execução e aceite HO

Status: **pendente no sistema real**.

- ID canônico: `03-homologation`.
- Dependências: 01-features, 02-catalog
- Flags: delivery + quality.
- Referência do protótipo: homologacao.html; validacao-ho.html; modules/homologation/; shared/testing/
- Coleções propostas: delivery_ho_plans

## Jornada entregue

TL/QA monta o plano de uma entrega; QA registra etapas; PO registra aceite da homologação.

## Frontend e backend da release

Snapshots de cenários/trilhas, sugestões por componentes, resultados por etapa, fila HO, ação de concluir fluxo e aceite separado da execução.

Adaptar as operações de [API](../../integration/contracts/api.json) e [comandos](../../integration/contracts/operations.md) ao sistema hospedeiro. Reutilizar conexão MongoDB, autenticação, usuários, equipes, workspace e UI existentes. Cada escrita exige autorização, isolamento de workspace, revisão esperada, idempotência quando aplicável e histórico no servidor.

## Limite de escopo

Não considerar cadastro de cenário ou nome digitado como aceite autenticado.

## Critérios de aceite

- [ ] Fila de HO por situação.
- [ ] Execução por etapa e motivo de falha.
- [ ] Aceite de PO apenas com plano não vazio concluído; alteração posterior invalida aceite.

## Testes específicos

Plano vazio não recebe aceite; falha bloqueia aceite; alteração invalida aceite anterior; mudança do catálogo não altera execução; gravação concorrente exige revisão atual; concluir fluxo preserva motivos e regras de auditoria.

Também executar testes de permissão, isolamento entre workspaces e persistência após recarregar/reabrir sessão. Os testes de navegador do protótipo são referência de comportamento; criar/adaptar a cobertura para a stack real.

## Liberação e reversão

Seguir [o procedimento comum](../03-validacao-e-liberacao.md). Habilitar somente capacidades desta release para o piloto. Desativar a capacidade bloqueia novos comandos e mantém histórico; não reverter dados destrutivamente. Com execução em andamento, preservar acesso de consulta e o procedimento operacional para concluir ou registrar rollback.

## Registro de conclusão

Preencher [o acompanhamento](../04-acompanhamento.md), anexar evidências dos testes e atualizar o status de `03-homologation` em [implementation-plan.json](../../integration/implementation-plan.json) apenas após frontend, backend e persistência reais validados.

- [ ] Motivo obrigatório por falha, histórico de falha/reteste e indicação da etapa em que retomar.
- [ ] Ação rápida trata somente pendências e não sobrescreve falhas/N/A; fica indisponível enquanto houver falha.
- [ ] HO aceita permite preparar GMUD com a entrega já selecionada.

- [ ] Escopo por cenário na US/TP, origem/versionamento preservados e fora do escopo sem resultados artificiais.
- [ ] Referências manuais ao Jira, responsável e revisor opcionais, com indicação de bloqueios.
- [ ] Escopo bloqueado após resultado; PROD recebe apenas o alcance homologado.
