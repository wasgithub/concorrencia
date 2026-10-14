# Arquitetura proposta para o sistema real

Diagrama de integração futura. O protótipo atual continua em HTML/JavaScript com localStorage. A proposta reutiliza frontend, backend, autenticação e conexão MongoDB do sistema hospedeiro. Os blocos representam módulos da mesma aplicação, sem exigir microserviços.

```mermaid
flowchart TB
    Pessoas["TL · QA · PO · Gerente"]

    subgraph Sistema["Sistema real existente"]
        subgraph Frontend["Frontend e componentes existentes"]
            Menu["Menu: Gestão de entregas"]
            FeaturesUI["Features / Issues"]
            QualidadeUI["Cenários, trilhas e validação HO"]
            GMUDUI["Gestão de GMUDs e calendário de implantações"]
            ProdUI["Validação de produção"]
            Modal["Modal compartilhada da GMUD"]
        end

        subgraph Backend["Backend existente — módulos por responsabilidade"]
            API["API /delivery · validação de comandos"]
            Features["Features e planejamento"]
            Catalogo["Catálogo de cenários e trilhas"]
            HO["Homologação e aceite de produto"]
            GMUD["GMUD, checklist, aprovação e implantação"]
            PROD["Resultados e aceite de produção"]
            Calendarios["Consultas de calendários e filas"]
            Infra["Repositórios · transações · versões · idempotência · auditoria"]
        end

        Identidade["Autenticação, usuários, equipes e permissões existentes"]
    end

    subgraph Mongo["MongoDB — conexão existente"]
        FeaturesDB[("delivery_features")]
        CatalogoDB[("delivery_scenarios · delivery_trails · delivery_definitions")]
        HODB[("delivery_ho_plans")]
        GMUDDB[("delivery_changes · delivery_feature_locks · delivery_freezes")]
        InfraDB[("delivery_audit_events · delivery_commands")]
    end

    Externo["Implantação externa / pipeline do time executor"]

    Pessoas --> Menu
    Menu --> FeaturesUI & QualidadeUI & GMUDUI & ProdUI
    GMUDUI --> Modal
    FeaturesUI & QualidadeUI & Modal & ProdUI --> API
    GMUDUI --> API
    API --> Identidade
    API --> Features & Catalogo & HO & GMUD & PROD & Calendarios
    Features & Catalogo & HO & GMUD & PROD & Calendarios --> Infra
    Infra --> FeaturesDB & CatalogoDB & HODB & GMUDDB & InfraDB
    Externo -. "TL registra a subida realizada" .-> GMUD

    classDef ui fill:#eef3ff,stroke:#7893da,color:#273449
    classDef domain fill:#eef8f2,stroke:#70ac8b,color:#273449
    classDef database fill:#fff5e5,stroke:#cda269,color:#273449
    class FeaturesUI,QualidadeUI,GMUDUI,ProdUI,Modal,Menu ui
    class Features,Catalogo,HO,GMUD,PROD,Calendarios domain
    class FeaturesDB,CatalogoDB,HODB,GMUDDB,InfraDB database
```

## Fluxo entre as responsabilidades

```mermaid
flowchart LR
    Cadastro["TL cadastra feature / issue"] --> Catalogo["QA define cenários e trilhas"]
    Catalogo --> HO["QA / PO executam HO"]
    HO --> AceiteHO["PO registra aceite de HO"]
    AceiteHO --> GMUD["TL cria GMUD, checklist e plano de PROD"]
    GMUD --> Aprovacao["Gerente aprova a subida"]
    Aprovacao --> Deploy["Time executor realiza implantação externa"]
    Deploy --> Registro["TL confirma subida realizada"]
    Registro --> PROD["PO valida cenários e etapas em PROD"]
    PROD --> Decisao{"Resultado"}
    Decisao -->|"OK / N/A"| AceitePROD["PO conclui validação"]
    AceitePROD --> Encerramento["TL encerra GMUD"]
    Decisao -->|"Falha"| Falha["PO registra etapa e motivo; TL avalia"]
    Falha -->|"Correção da validação sem nova implantação"| PROD
    Falha -->|"Reversão necessária"| Rollback["TL registra rollback realizado"]
    Rollback --> Nova["Correção e nova GMUD para a mesma feature"]
    Nova --> HO
```

## Como ler

- A UI usa componentes e rotas do sistema real. Calendário e gestão abrem o mesmo componente de GMUD, sem iframe na integração.
- Controllers/API autenticam e delegam comandos aos módulos; regras ficam nos serviços de aplicação/domínio, não no navegador.
- As ligações à infraestrutura representam a camada de repositórios. Cada módulo acessa somente os dados de sua responsabilidade; não deve escrever livremente em todas as coleções.
- O planejamento consulta features, ambientes e componentes para calcular concorrência. Calendários e filas são consultas dos mesmos registros, sem outra coleção de timeline.
- HO e PROD guardam snapshots independentes dos cenários. PROD fica dentro do documento da GMUD; alterações são feitas pelos comandos do módulo de produção.
- Auditoria e recibos de idempotência são gravados junto da alteração operacional em transação. Versões evitam sobrescrever outra edição; locks impedem duas GMUDs ativas para a mesma feature.
- A pipeline é externa. O sistema registra a implantação realizada e seus resultados; não executa deploy nesta primeira integração.
- Mudança de código após rollback gera outra GMUD, mantendo a feature e o histórico da tentativa anterior. Correções relevantes exigem revalidar HO e obter os novos aceites.
- O catálogo é reutilizável e pode existir antes do cadastro; a sequência do segundo desenho mostra o percurso de uma entrega, não uma obrigação de recadastrar testes a cada feature.

Detalhes: [módulos](modulos.md), [modelo MongoDB](../integration/mongodb/model.md) e [guia de implementação](../IMPLEMENTAR_NO_SISTEMA.md).
