# Implementação gradual e Qualidade genérica

> Escopo vigente em 21/10/2026: primeira entrega somente de Testes, fase `02-catalog`, conforme `integration/releases/tests-first/`. Os controles genéricos e as fases adicionais descritos neste documento são propostas de evolução, não funcionalidades liberadas na R1.

O protótipo mantém HTML, JavaScript e CSS nativos. Não houve conexão ao MongoDB nem implementação de autenticação/backend. A divisão abaixo é o roteiro para portar as funcionalidades ao sistema real por responsabilidade.

## Módulos e releases

| Módulo / flag | Primeira release | Evolução separada | Dependência |
| --- | --- | --- | --- |
| Entregas / `delivery` | Cadastro/consulta de features e componentes | Integração com a entidade de entrega existente | Nenhuma |
| Qualidade / `quality` | Cenários, classificações, passos próprios, atributos e trilhas | Plano HO, execução e aceite de produto | Catálogo independente; HO exige Entregas |
| GMUD / `gmud` | Cadastro, vínculos, checklist e plano PROD | Aprovação e calendário de implantações | Entregas + HO válida de Qualidade |
| Validação PROD / `production` | Confirmação da implantação e testes por etapa | Aceite, encerramento e rollback | GMUD |
| Planejamento / `planning` | Agenda HO e concorrências | Sugestões de ambiente e análises | Entregas; evolução opcional |

O plano executável de integração está em `integration/implementation-plan.json`; todos os status continuam pendentes no sistema real. Uma equipe pode entregar apenas Qualidade/catálogo sem subir GMUD ou validação de produção. Qualidade/HO entra em outra release, depois de integrar a identificação da entrega.

## Configurar no protótipo

Abra **Configurações** no menu, ou `configuracoes.html`.

- Habilite os módulos desejados. Ao desativar uma dependência, a tela desmarca os módulos dependentes; salvar não apaga registros.
- Catálogo funciona sem Entregas. As sugestões de componentes leem os registros disponíveis, sem importar o controlador/store de Features.
- HO exige Entregas e Qualidade. GMUD exige os dois; PROD exige GMUD. Configuração inconsistente é rejeitada.
- Módulos desativados saem do menu e sua página mostra o estado indisponível. A confirmação de subida também verifica se PROD está ativo; não basta ter a GMUD habilitada.
- Os valores iniciais são todos ativos para manter o protótipo atual. Na implantação real, começar com flags desligadas e habilitar por workspace/time piloto após homologar a release.

As flags desta referência atuam no navegador e **não são mecanismo de segurança**. Na integração, a configuração deve vir do servidor e cada comando deve verificar flag, permissões, workspace e dependências. Não copiar localStorage ou manipulação de DOM como controle de acesso.

## Cadastro genérico de testes

Na mesma tela de Configurações, altere o nome da classificação e suas opções. Exemplo: rótulo **Categoria**, valores **API**, **Segurança**, **Interface**, **Integração**.

Em **Cenários e trilhas → Novo caso**, informe:

1. Nome livre do cenário ou nome montado pelos atributos.
2. Classificação configurada, cobertura e componentes relacionados, quando houver.
3. Pré-condições e resultado esperado.
4. Selecione um **fluxo reutilizável** compatível com frente/funcionalidade ou escreva **passos próprios**, um por linha. A prévia mostra a sequência exata. Ao usar modelo, o escopo pode terminar em uma etapa desse modelo. Não existe fallback automático para o fluxo de crédito.

Exemplos:

| Cenário | Classificação | Passos |
| --- | --- | --- |
| Autenticação REST | API | Preparar credencial → Enviar requisição → Validar resposta |
| Recuperação de senha | Segurança | Solicitar recuperação → Confirmar token → Acessar com nova senha |
| Compra online | Funcional | Escolher produto → Pagar → Confirmar pedido |

O cadastro descreve o teste; a execução continua sendo registrada pelo QA/PO. Classificar como API não dispara automaticamente requisições HTTP ou uma ferramenta de automação.

Etapas compartilhadas e atributos (antes usados para Perfil/PF/PJ/Garantia etc.) continuam editáveis na tela de catálogo. Esses nomes são dados de exemplo/legado, não requisitos do motor. Novas classificações não são convertidas para “Garantia N/A”. Campos antigos e seus valores são preservados para consulta/edição.

## Histórico e snapshots

- O cenário guarda seu fluxo. Casos antigos recebem uma cópia do fluxo conhecido para não mudar quando as etapas compartilhadas forem editadas.
- Ao incluir em HO, copiar fluxo, classificação, atributos, componentes, pré-condições e resultado esperado.
- Ao selecionar para PROD, copiar o mesmo cenário completo e sua origem, com resultados pendentes.
- Mudar classificações/atributos/etapas não reescreve execuções anteriores.
- Etapas duplicadas e passos próprios repetidos são rejeitados. Nenhum plano vazio pode receber aceite.

## Contratos MongoDB / API

A proposta MongoDB usa `classification` e `classificationLabel` em cenários e execuções, em vez de exigir um enum de garantia. `guaranteeType` é apenas legado opcional. Passos usam IDs estáveis no sistema real; o protótipo ainda usa nomes únicos nos seus registros locais, a converter no adaptador de migração.

Vocabulário fica em `delivery_definitions` com kind `quality_vocabulary`. Flags por workspace ficam em `delivery_module_settings`, com configuração versionada. Os novos contratos são `/delivery/module-settings` e `/delivery/quality-settings`, além do CRUD de cenários já previsto. Migrations e repositórios devem seguir o backend existente.

## Validação

`node tests/run-e2e.cjs` executa a suíte original, configuração de módulos e um segundo percurso completo com categoria API e passos de autenticação, cobrindo HO, GMUD, PROD, sucesso, rollback e nova tentativa. Os testes usam contextos isolados e não modificam o navegador pessoal.

## Frentes e funcionalidades

Fluxos de testes → Frentes e funcionalidades permite cadastrar áreas e seus fluxos. Cenários usam Frente, Funcionalidade, Classificação e Forma de execução, além de atributos opcionais. CPR atual é reconhecida como Crédito → CPR; CPR Dollar é uma funcionalidade separada e pode receber uma cópia adaptada pelo botão Duplicar. O campo legado Automática/Manual não é convertido em forma de execução: representa a classificação antiga de garantia.

Atributos do montador podem se aplicar a todas as frentes ou a uma frente específica. Os atributos legados de crédito ficam nessa frente. Outras frentes usam modelos compatíveis ou passos próprios, evitando herdar o fluxo de crédito. Filtros de Frente e Funcionalidade estão no catálogo e no seletor HO. Snapshots de HO/PROD guardam o contexto e mantêm etapas/resultados existentes. As novas definições de frente e funcionalidade devem usar IDs estáveis por workspace no sistema real; o protótipo usa nomes.

## Fluxos reutilizáveis por frente

Abra `fluxos.html` para cadastrar uma sequência com etapas individuais, ordenar, duplicar e inativar. Em Cenários, escolha o modelo compatível ou escreva os passos específicos. A sequência é copiada ao salvar. A edição abre a cópia salva, sem adotar versões novas automaticamente. O fluxo global antigo fica em configuração avançada para compatibilidade. Veja [UX e MongoDB](../plano-implementacao/05-cadastro-qualidade-e-mongodb.md).

Veja [escopo por US/TP, Jira e responsáveis](../plano-implementacao/07-escopo-por-us-e-jira.md) para a configuração de alcance sem alterar o catálogo e sua propagação para PROD.
