# Operações e regras do backend

O catálogo `api.json` é uma proposta agnóstica de framework. Ajustar rotas e DTOs à aplicação existente. GETs não alteram dados. O frontend recebe a versão corrente da entidade e envia `expectedVersion` nos comandos de alteração. A API devolve a entidade/projeção atualizada, nova versão e o identificador do comando.

## Identidade e permissões

Workspace e ator são derivados da sessão. Não aceitar `approvedBy`, `acceptedBy`, `createdBy` ou status arbitrário do cliente. TL opera GMUD e confirmação; QA monta catálogo/HO; PO registra aceites e valida PROD; gerente aprova/rejeita. Mapeie esses papéis às permissões já existentes; se a pessoa acumula responsabilidades, vale a união das permissões. Escopo de equipe/PO atribuído também deve ser validado no servidor, conforme a organização. Permissões `QA/TL` em definitions valem para fluxo/dimensões; checklist é TL. Não há uploads no primeiro fluxo de PROD.

## Comando atômico

1. Autenticar, verificar permissão e escopo. Validar payload com allowlist: não aplicar `$set` direto do body.
2. Exigir `Idempotency-Key` nas mutações. Calcular hash do comando, método, rota e payload normalizado. Consultar recibo por workspace, ator e chave; mesma chave com hash diferente retorna 409. Mesma chave/hash devolve o resultado original após verificar o acesso.
3. Em transação, revalidar a entidade/revisão e dependências; aplicar atualização com filtro por `_id`, workspace e expectedVersion; incrementar version e carimbar ator/instante.
4. Criar um evento da nova versão com conjunto de alterações; gravar resultado/idempotência na mesma transação. Inclusões criam version=0 e seu evento inicial na transação. Locks e projeções alteradas geram seus registros necessários.
5. Commit antes de responder. Concorrência no índice único de recibo exige ler o comando já confirmado e comparar hash. Nunca repetir efeito externo em callback transacional.

Guards técnicos de HO (`approvalFence`) não criam nova versão de negócio/evento. Fluxo de atualizações e retry deve respeitar isso. Rejeição ou cancelamento de comando aborta a transação inteira.

## Condições de negócio

- ID externo, code e RDM são normalizados no servidor. RDM não informado deve ser omitido, não `TBD`/string vazia. Equipes, usuários e referências devem existir no escopo. FeatureIds, executionIds, stepIds e scenarioIds não podem repetir dentro do documento; MongoDB validator/índice não resolve sozinho duplicidade no mesmo array.
- Data da implantação depois do fim de HO; janela válida com timezone e meia-noite tratados corretamente. Feature vinculada não edita independentemente a janela de produção.
- Definições globais modificam apenas futuros snapshots. Excluir/desativar caso não elimina resultados históricos.
- Seleção de cenário em HO cria snapshot no servidor. Aceite exige plano não vazio e todas etapas OK/N/A. Alteração real de plano/resultados invalida aceite e incrementa revision. A identidade vem da sessão, e o parecer deve ser informado.
- Seleção PROD é o cenário completo aprovado em HO, com IDs estáveis e origem/revisão. Não copiar resultados de HO. Não permitir ao cliente forjar `validadoHO`. Na migração, plano legado sem origem deve passar por revisão explícita; não é fluxo normal de criação.
- Aprovação exige HO aceita/válida para todas features e plano PROD não vazio cujas origens continuam válidas. Checklist responde Sim, Não ou N/A como preenchido; vazio é pendente. Exceção para checklist incompleto requer motivo e lista de pendências registrada pela gerência; não substitui o aceite de HO ou o plano PROD.
- Revisão de plano/checklist/janela/features invalida aprovação. Mudança de observação não invalida. Aprovação captura revisões de HO. Confirmar deploy exige referências ainda válidas; se HO mudou, retornar erro de negócio e orientar nova aprovação. A projeção informa aprovação desatualizada; o gerente pode executar approve novamente em uma GMUD approved com referência desatualizada, verificando todos os requisitos e registrando outro evento. Não fingir que a tentativa de deploy foi realizada nem alterar status ao abortar o comando.
- Freeze sobre a janela bloqueia aprovação/confirmação segundo regra acordada. Proposta inicial: sem exceção implícita. Confirmar deploy registra o ocorrido externamente; não programa execução real e não é liberado automaticamente pela data.
- Apenas `approved` pode virar `deployed`. Reprogramar é permitido antes da subida; exige motivo e nova aprovação. Rejeição ocorre antes do deploy; não realizada registra uma subida aprovada que não foi executada.
- PROD só recebe resultados depois do deploy e antes do aceite. Step failed exige motivo não vazio. “Marcar tudo OK” produz resultados para todas etapas aplicáveis, em um comando com mesma versão e auditoria. Corrigir uma falha não apaga o evento da falha original.
- Aceite PROD só com plano não vazio e todas etapas OK/N/A. Encerramento TL exige deploy e aceite; closed não aceita alterações.
- Rollback exige deploy confirmado, motivo e identidade TL. Se a causa é um cenário/etapa, ambos IDs devem existir. Closed/rollback são terminais somente leitura. Nova versão ou tentativa após rollback é outra GMUD, same featureId e previousChangeId; nunca apagar registros anteriores.

## Erros e consultas

Usar 401 sem sessão, 403 sem permissão, 404 para entidade inexistente/no escopo, 409 para versão/lock/idempotência em conflito, 422 para regra operacional e 400 para payload inválido. A lista detalhada de pendências é retornada em `details` com códigos estáveis, não apenas uma mensagem concatenada.

Todas consultas incluem workspace e limites de paginação. Filtrar calendários por faixa de datas e filas por situação, PO/equipe e período. Não carregar todas coleções para filtrar no navegador. Escape/limite de busca deve impedir consultas regex irrestritas; escolher estratégia de busca conforme capacidades da instalação real. Projeções de timeline e fila são derivadas das mesmas entidades e status do servidor.

Auditoria não possui endpoint de edição/exclusão e não usa TTL por padrão. Os detalhes do evento devem conter apenas alterações relevantes e limites de tamanho, sem dados sigilosos extras do sistema hospedeiro.
