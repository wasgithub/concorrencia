# Validação local do módulo de Testes — 21/10/2026

O resultado vigente é registrado no [relatório completo](../all-phases/validacao.md). O comando reproduzível é `node tests/run-e2e.cjs`; inclui os testes unitários e as suítes de navegador da interface atual. Execução sem conexão com MongoDB, backend real ou limpeza de registros pessoais.

## Percursos exercitados

- Perfil inicial somente Testes, entrada pela raiz, menu e bloqueio de módulos futuros.
- Cadastro/edição de etapas, dimensões e escopo por frente; cenário com nome, cobertura, componentes, garantia de Crédito e alvo.
- Frente → funcionalidade → fluxo; Marketplace com etapas próprias, sem PJ/garantia de Crédito por padrão; bloqueio sem fluxo válido.
- Nome automático acompanha campos limpos; nome digitado é preservado. Dimensões explícitas vazias não são reconstruídas pelo texto do nome.
- Cenário copia fluxo e versão; alteração/inativação do modelo não reescreve essa cópia. Reduzir e ampliar novamente o alvo usa a sequência salva de origem.
- Trilhas: criação/edição, duplicidade de nome, referência que impede remoção do cenário, indicação de inativo e seleção de ativos para HO.
- Falha de armazenamento e retry sem perda do formulário; persistência após recarregar.
- HO: selecionar cenário Marketplace pela tela, validar etapas, registrar falha/motivo, salvar e recarregar. Regressão HO cobre reteste, N/A, ação em lote, aceite e preservação histórica.
- Regressão de cenários legados, sugestão por componentes e próximas fases em navegadores isolados.

## Situação

As correções locais e evidências estão no relatório completo. A integração no hospedeiro permanece `pending` e segue [o checklist](checklist.md); isso não bloqueia o aceite local solicitado nem exige conectar banco real nesta revisão. Somente Testes fica ligado por padrão.
