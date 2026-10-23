# Catálogo e trilhas — primeira release

Status: pendente no sistema real. O protótipo não conclui esta fase.

Pacote canônico: `integration/releases/tests-first/README.md`, `manifest.json`, `campos.md`, `api.json` e `checklist.md`. Módulo: test-catalog. Primeira fase executada, antes de Features; manter o ID histórico 02-catalog.

## Critérios da R1

- [ ] Somente Testes habilitado no cliente e no servidor; sem depender de Features, HO ou GMUD.
- [ ] Cadastro clássico de cenários com nome, tipo de garantia, etapa alvo, cobertura, componentes, dimensões e situação.
- [ ] Etapas e dimensões/opções com IDs estáveis; servidor monta snapshot do prefixo e alterações do modelo não mudam cenários existentes.
- [ ] Cadastro/edição/arquivamento de trilhas e referências válidas no workspace, com tratamento de cenários inativos.
- [ ] Biblioteca independente de fluxos por frente/funcionalidade, sem ligação implícita ao formulário clássico.
- [ ] Campos/collections/índices do pacote implementados na conexão MongoDB já existente.
- [ ] Workspace, autorização, CAS, idempotência, auditoria e validações de tamanho no servidor.
- [ ] Frontend e backend completos, testes reais de API/MongoDB e E2E no hospedeiro conforme checklist.

## Incrementos futuros fora da R1

Classificação genérica editável, pré-condições/resultado esperado, passos livres por cenário, escolha de modelo por frente/funcionalidade no cenário, execução HO, revisão e aceite, escopo por US/TP e validação PROD. Os contratos gerais preservam essas propostas; não expor controles que o incremento atual não implementa.

## Entrega

Registrar arquivos do hospedeiro, mapeamentos de entidades existentes e testes executados. Não marcar como concluída com mock de persistência ou somente pela existência do protótipo.
