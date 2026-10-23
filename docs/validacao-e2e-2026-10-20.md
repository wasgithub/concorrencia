# Validação E2E do protótipo — 20/10/2026

Execução contra `http://localhost:8080`, com contextos de navegador isolados.
Os registros do navegador do usuário não foram acessados nem excluídos.

## Resultado

- A bateria completa teve 17 suítes aprovadas e uma falha por timeout em `ho-scope-browser`, ao selecionar o filtro “Análise Documental Flex”.
- A suíte de escopo passou nas três repetições seguintes. A causa da falha intermitente continua sem confirmação; não considerar a bateria integralmente estável.
- Os 31 testes unitários passaram.
- Os fluxos completos de sucesso, replanejamento, rollback, deploy pendente de aceite e PROD validado passaram, incluindo cenários genéricos e Marketplace.
- Na repetição avulsa após acrescentar a conferência de OK salvo e recarregado, todas as verificações funcionais passaram, mas o processo ficou aguardando `browser.close()`. Foi encerrado manualmente após imprimir os resultados; essa repetição não é contabilizada como execução concluída com código zero.

## Cobertura acrescentada

O teste completo agora acessa HO pelo botão da issue, adiciona e salva o cenário, sai pelo menu e retoma pela fila de homologação. Também registra OK em uma etapa, salva e recarrega para verificar a persistência antes de continuar até PROD.

O teste de escopo passou a emitir catálogo, etapas, opções do filtro e erros JavaScript, além de uma captura da tela, caso o timeout se repita. Esses dados são exclusivamente do contexto de teste.

## Pendência de reprodução

A falha relatada pelo usuário ao adicionar plano ou registrar resultado ainda não foi reproduzida. É necessário identificar a issue, a URL e a ação que falhou para verificar o mesmo estado de dados. Não foi aplicada correção na aplicação nesta validação por falta de causa confirmada.

Os resultados detalhados da bateria ficam em `test-results/e2e/report.md` e nos logs da mesma pasta; são artefatos locais ignorados pelo Git.
