# Módulos e integração

HTML, CSS e JavaScript puro. Sem build, framework ou banco. Os HTMLs na raiz são pontos de entrada públicos e compõem os scripts dos módulos; as URLs e chaves de dados existentes foram preservadas.

| Módulo | Responsabilidade / perfil | Entradas HTML | Dependências |
| --- | --- | --- | --- |
| `modules/features` | Cadastro da feature/issue e componentes; TL | `index.html` | Nenhum módulo de execução |
| `modules/planning` | Agenda, ambientes e concorrências; TL / QA | `timeline.html` | Features, catálogo e planos de HO |
| `modules/test-catalog` | Cenários, dimensões, etapas, vínculos de componentes e trilhas; QA | `testes.html` | Adaptador local de dados |
| `modules/homologation` | Plano por issue, execução e aceite; QA / PO | `validacao-ho.html`, `homologacao.html?issue=ID` | Features, catálogo, execução compartilhada |
| `modules/changes` | GMUD, checklist, aprovação, freeze, janela, confirmação da subida, rollback e encerramento; TL / gerente | `changes.html`, `gmud-timeline.html` | Features, HO, catálogo, regras de PROD |
| `modules/production` | Execução por etapa, motivo de falha, andamento, aceite e proteção de revisão; PO | `producao.html?change=ID` | Execução compartilhada, planos de HO e registro da GMUD |
| `modules/demo` | Exemplos e dados de demonstração | `exemplos.html` | Adaptador local de dados |
| `shared/storage` | Adaptador JSON/localStorage | Carregado pelas páginas | Nenhuma interface |
| `shared/testing` | Snapshot do cenário e resultado calculado pelas etapas | Carregado pelas páginas | Definições do catálogo |
| `shared/ui` | Estilos comuns e composição do menu | Carregado pelas páginas | Nenhuma regra operacional |

## Contratos entre responsabilidades

- Feature e issue representam o mesmo registro neste protótipo: `idIssue` identifica a entrega. Não há uma hierarquia nova de feature com várias issues.
- Features publicam ID, squad, descrição, componentes, ambiente e datas. A GMUD vincula `issueIds`; quando sua janela muda, atualiza as datas das entregas vinculadas.
- Catálogo publica casos e trilhas. HO cria snapshots; alterações do catálogo não reescrevem execuções existentes.
- HO publica plano por `idIssue`, resultados e aceite. GMUD exige HO concluída e aceita e seleciona cópias dos cenários para PROD, com a origem preservada.
- Aprovação para subir, confirmação da implantação, aceite de PROD e encerramento são registros independentes. O registro de subida não executa uma pipeline real.
- PROD grava resultados e motivos no registro da GMUD, preserva histórico e verifica revisão antes de salvar. A GMUD continua responsável pela decisão de rollback e pelo encerramento.
- A modal do calendário de implantações reutiliza a operação de GMUD em modo incorporado; não contém uma segunda implementação das regras de aprovação.

## Dados e futura API

As chaves `issueflow.*.v1` permanecem inalteradas, no mesmo navegador/origem:

| Dados | Responsável |
| --- | --- |
| `records` | Features |
| `scenariocatalog`, `scenariodims`, `teststages`, `testtrails` | Catálogo |
| `hoplans` | Homologação |
| `changes`, `checklist`, `freezes` | GMUDs; PROD atualiza somente execução e aceite dentro da GMUD |

`shared/storage/local-storage.js` contém os helpers JSON. Os stores de features, catálogo e GMUD ainda possuem acesso direto ao localStorage; cada store deve ser adaptado ao integrar uma API. O código continua usando scripts clássicos e funções compartilhadas por página, com ordem de carga explícita nos HTMLs; não são pacotes isolados nem serviços independentes.

No sistema real, mantenha IDs estáveis e separe endpoints por dono dos dados. Autenticação, permissões e concorrência precisam ser aplicadas também no servidor. O menu agrupado não define permissões. Não envie o módulo demo para o ambiente real.

Ordem sugerida de implementação: features → catálogo → HO → GMUD/aprovação → confirmação da implantação → validação de PROD/encerramento. Planejamento e os calendários são visões sobre esses dados e podem entrar depois.

## Percorrer uma feature até o fim

1. Em Features / Issues, cadastre o ID da feature, descrição, squad, componentes, ambiente e datas.
2. Em Cenários e trilhas, cadastre os cenários e associe os componentes, para gerar sugestões na HO.
3. Em Validação de homologação, abra a feature, selecione o plano, execute as etapas e salve. O PO registra nome e parecer de aceite após os testes concluídos.
4. Em Gestão de GMUDs, crie a RDM, vincule a feature, informe janela, equipe, TL e PO. Selecione os cenários de PROD a partir da HO e preencha o checklist.
5. O gerente aprova a subida na GMUD ou pela modal do Calendário de implantações. Pendências aparecem antes da confirmação.
6. A implantação é feita externamente. O TL registra Subida realizada.
7. O PO abre Validar em PROD, registra resultado por etapa e motivo quando houver falha. Pode salvar andamento.
8. Com tudo OK/N/A, o PO conclui a validação e o TL encerra a GMUD. Os registros encerrados ficam para consulta.
9. Se houver reversão, o TL registra o rollback e seu motivo. Para outro código/versão, cadastre outra GMUD vinculada à mesma feature; mantenha a tentativa anterior no histórico.

## Validar a integração

`node --test tests/*.test.cjs` verifica os contratos de testes, HO e PROD. `tests/full-flow-browser.cjs` percorre o cadastro até encerramento e rollback pelas telas reais. Os outros testes de navegador cobrem navegação, seleção, bloqueios, proteção entre abas e calendários. Consulte o README para executar.

## Preparação MongoDB

O desenho de persistência e o roteiro para portar os módulos estão em [IMPLEMENTAR_NO_SISTEMA.md](../IMPLEMENTAR_NO_SISTEMA.md) e [integration/mongodb/model.md](../integration/mongodb/model.md). Eles descrevem a arquitetura futura; não alteram os dados locais ou conectam este protótipo a um banco. No sistema real, após deploy/rollback, uma nova tentativa será outra GMUD; a reprogramação do protótipo após execução não deve ser copiada para sobrescrever a tentativa anterior.
