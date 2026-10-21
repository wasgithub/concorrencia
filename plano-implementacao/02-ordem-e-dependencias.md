# Ordem, dependências e limites

> Escopo vigente em 21/10/2026: primeira entrega somente de Testes, fase `02-catalog`, conforme `integration/releases/tests-first/`. Os controles genéricos e as fases adicionais descritos neste documento são propostas de evolução, não funcionalidades liberadas na R1.

| Etapa | Depende de | Pode liberar sozinha? | O que fica para depois |
| --- | --- | --- | --- |
| R1 Entregas | R0 | Sim | Execução de testes e GMUD |
| R2 Catálogo | R0 | Sim, inclusive antes de R1 | Plano e aceite HO |
| R3 HO | R1 + R2 | Sim | Aprovação de subida |
| R4 Preparação GMUD | R3 | Sim, apenas preparação | Aprovação e implantação |
| R5 Aprovação/agenda | R4 | Sim, com confirmação de implantação bloqueada | Execução PROD |
| R6 Produção | R5 | Sim, fecha o fluxo operacional | Planejamento avançado |
| R7 Planejamento | R1 | Sim, opcional | Não bloqueia produção |
| R8 Consolidação | R1–R6 | Regressão integrada; importação só se necessária | R7 é testada se habilitada |

## Jornada e responsabilidades

TL cadastra entrega → QA/TL escolhe cenários do catálogo e executa HO → PO aceita HO → TL prepara GMUD e escolhe cenários completos de PROD → gerente aprova subida → implantação é feita externamente e TL confirma versão implantada → PO valida cada etapa e registra aceite PROD → TL encerra.

Aprovação não confirma deploy nem libera validação por ter chegado a data. Uma etapa com erro mantém motivo e histórico; rollback é terminal e preserva os resultados. Uma correção com outro código/versão usa nova GMUD vinculada à mesma entrega. Reprogramar a mesma GMUD ocorre somente antes da implantação.

## O que compartilhar

Compartilhar identidade, workspace, equipes, componentes, conexão MongoDB, UI, auditoria e infraestrutura de comandos do hospedeiro. Separar responsabilidades de Entregas, Catálogo, HO, GMUD, Produção e Planejamento em módulos da aplicação existente. Não exigir serviços independentes ou um segundo login.

## Cadastro agnóstico

O catálogo define cenários reutilizáveis com classificação livre, atributos, passos próprios com IDs, pré-condições e resultado esperado. Trilhas agrupam cenários; componentes permitem sugestões, com seleção explícita pelo usuário. HO cria snapshots; PROD recebe o cenário completo selecionado de HO com resultados inicialmente pendentes. Alterar o cadastro não muda o histórico. Um futuro executor automatizado é uma integração adicional e não faz parte destas releases.
