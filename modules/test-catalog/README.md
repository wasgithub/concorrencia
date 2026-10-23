# Catálogo de cenários e trilhas

Escopo atual: [Release 1 — Testes independentes](../../integration/releases/tests-first/README.md), com o formulário clássico restaurado. Classificações genéricas e passos livres no formulário de cenário citados em documentos anteriores não são controles desta release. A biblioteca independente de fluxos continua disponível.

Responsabilidades, dependências, pontos de entrada e contratos: [documentação dos módulos](../../docs/modulos.md).

Arquivos do módulo:

- `catalog-page.js`
- `catalog-store.js`

O catálogo funciona sem o store de Features. O formulário atual configura nome, tipo de garantia, etapa final, cobertura, componentes e dimensões. Os snapshots preservam as etapas já cadastradas; modelos independentes ficam em fluxos.html.

Veja [cadastro de qualidade: telas e MongoDB](../../plano-implementacao/05-cadastro-qualidade-e-mongodb.md) para a separação entre frente, funcionalidade, fluxo reutilizável, cenário e execução.
