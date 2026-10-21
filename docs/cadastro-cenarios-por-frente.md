# Cadastro de cenários por frente

Atualização de 21/10/2026, posterior ao retorno do formulário clássico. Esta evolução adiciona contexto e seleção de fluxo; não reintroduz escopo por US, revisor, uploads ou outros controles retirados.

## Uso

1. Em Testes → Cenários e trilhas → Novo caso, escolher **Frente** primeiro.
2. Escolher **Produto / funcionalidade**, ou Toda a frente.
3. Escolher **Fluxo de teste** compatível. Cadastrar fluxos, frentes e funcionalidades em Biblioteca de fluxos. Se não houver fluxo compatível fora de Crédito, o salvamento orienta a cadastrá-lo.
4. Preencher somente os atributos aplicáveis; Linha aparece primeiro entre os atributos de Crédito. Nome, cobertura, componentes e situação continuam comuns.
5. Escolher até qual etapa testar e salvar. O cenário guarda uma cópia das etapas e da versão do fluxo.

Crédito mantém o modelo de etapas clássico como opção compatível e o tipo de garantia. Marketplace/Site não recebem etapas de desembolso automaticamente nem campos de crédito por padrão; garantia é N/A. Não foram inventadas novas opções de negócio para Marketplace: equipe cadastra os campos/opções de que precisa.

Em Dimensões do montador, **Aplicar em** permite escolher uma frente ou Todas as frentes por campo. Campos históricos Perfil, Tipo/Pessoa, Linha, Garantia e Variação mantêm escopo Crédito por padrão; novas dimensões continuam globais até definição explícita. A configuração de escopo não apaga cenários já cadastrados.

Ao trocar a frente no formulário, as seleções de atributos são limpas e funcionalidades/fluxos incompatíveis deixam de ser selecionados. O nome digitado livremente é preservado; o nome gerado automaticamente é limpo. Trocar funcionalidade exige selecionar novamente o fluxo. Ao salvar, atributos conhecidos incompatíveis não são persistidos escondidos.

## Histórico e compatibilidade

Na edição, a opção **Manter etapas salvas do cenário** preserva as etapas mesmo se o modelo foi alterado ou desativado. Escolher outro modelo explicitamente cria outra cópia para o cenário. Nenhuma alteração do catálogo reescreve planos HO/PROD existentes.

Campos do protótipo: frente, funcionalidade, workflowId, workflowVersion, stepDefinitions, sourceFlow, sourceStepDefinitions, fluxo, catalogVersion e dimensoes. Chaves de localStorage e URLs permanecem existentes. O fluxo HO/PROD usa as etapas copiadas, podendo falhar e retestar em uma etapa de Marketplace como em Crédito.

Na integração MongoDB: frente/funcionalidade viram frontId/functionalityId referenciando delivery_definitions; workflowId referencia delivery_test_flows. Steps têm IDs estáveis e nomes copiados. Escopo do atributo usa items[].frontId (null para todas), equivalente ao d.frente do protótipo. Validar referências, workspace e compatibilidade no servidor; versão do fluxo é resolvida pelo servidor, não confiada ao cliente. Nenhuma collection adicional é necessária.

O sistema hospedeiro continua responsável por persistência e regras do servidor. Este ajuste é HTML/CSS/JavaScript local, sem conexão MongoDB e sem alterar flags para liberar outros módulos.

## Verificação

A suíte scenario-front-form-browser cobre formulário com Frente primeiro, Linha como primeiro atributo de Crédito, escopo configurável, limpeza de PJ ao trocar para Marketplace, bloqueio sem fluxo, seleção de etapas próprias, persistência, edição após desativar/alterar o modelo, snapshot de execução com falha e preservação de cenário legado. Ela integra node tests/run-e2e.cjs, junto aos unitários e à regressão das demais fases.

## Revisão complementar do fluxo

Na edição com Manter etapas salvas, o seletor inclui a sequência de origem guardada no próprio cenário. Reduzir o alvo e depois ampliá-lo reutiliza essa cópia, mesmo se o modelo original estiver alterado ou inativo; não consulta o modelo corrente para atualizar etapas silenciosamente. O nome automático acompanha a limpeza das dimensões, enquanto nomes digitados permanecem preservados. Dimensões explícitas vazias não são inferidas novamente pelo texto do nome; somente legados sem o campo dimensoes usam inferência. Cenários inativos aparecem identificados na edição de trilhas existentes e não são oferecidos como novas seleções.
