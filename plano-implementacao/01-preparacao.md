# R0 — Preparar a integração

Status: pendente no sistema real. Nenhuma escolha de framework ou execução de migration é presumida.

## Inspeção e decisões necessárias

- [ ] Localizar instruções do repositório, módulos, rotas, menu, design system e testes existentes.
- [ ] Mapear autenticação e permissões para TL, QA, PO/PM e gerente, usando identidades autenticadas. Registrar a matriz efetiva do sistema; não assumir que rótulos de tela concedem permissão.
- [ ] Identificar entidades existentes de entrega/issue, componentes, equipe e workspace. Reutilizar IDs; não criar cadastros duplicados.
- [ ] Identificar conexão/driver/ODM MongoDB, versão, topologia, migrations e estratégia para comandos atômicos entre documentos.
- [ ] Definir isolamento por workspace, revisão otimista, idempotência e trilha de auditoria segundo os contratos.
- [ ] Definir configuração de módulos por workspace, responsável por habilitação e padrão inicial desligado.
- [ ] Definir vocabulário genérico: classificação, atributos, etapas, trilhas e componentes são dados configuráveis. Separar tipo de cenário de método de execução manual/automatizado; cadastrar API não executa uma automação.
- [ ] Definir ambientes, contas de teste, piloto, observabilidade e procedimento de reversão.

## Capacidade por release

As cinco flags do protótipo são agrupamentos de módulos. Elas não substituem a liberação por capacidade no sistema real. Durante R4, por exemplo, GMUD pode estar disponível para preparação enquanto aprovação e confirmação de implantação continuam indisponíveis. Implementar esse controle no backend com configuração de capacidades ou disponibilidade das operações; registrar a escolha. Não é necessário criar microserviços ou instalar uma biblioteca de flags.

Configuração/vocabulário precisam de endpoints administrativos autorizados, versão e histórico; não copiar a edição livre do navegador. Alterações de catálogo não reescrevem snapshots já executados. Inativar deve preservar referências históricas.

## Saída esperada

Registrar no acompanhamento o mapa entre responsabilidades e diretórios reais, entidades reutilizadas, permissões, estratégia MongoDB e capacidades de rollout. Validar em ambiente de testes antes de aplicar migrations. Não executar `apply-schema.cjs` automaticamente nem considerar mock como persistência entregue.
