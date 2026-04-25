# Análise Estrutural do Sistema e Proposta de Evolução para SaaS

## Objetivo

Este documento consolida uma análise estrutural do projeto atual, com foco em:

- arquitetura técnica
- semântica do sistema
- boas práticas de engenharia
- riscos para operação em produção
- proposta para transformar o sistema em um SaaS comercial
- direcionamento para nova página de apresentação, planos, cadastro, administração, pagamentos, suporte, cancelamento e teste grátis

---

## 1. Leitura do estado atual

O projeto atual é um sistema operacional de bar e restaurante construído com Next.js, React, TypeScript, Tailwind e componentes baseados em Radix/ShadCN.

Hoje o sistema funciona bem como produto operacional de uso direto, mas ainda não está estruturado como plataforma SaaS.

### Pontos identificados na base atual

- O projeto está organizado por áreas de negócio dentro de src/app.
- A interface está relativamente bem separada por páginas e componentes clientes.
- Existe uma camada central de persistência em src/lib/data-access.ts.
- O armazenamento principal ainda depende de localStorage e sessionStorage.
- Há sincronização parcial com Firebase Firestore.
- Não existe backend de domínio consolidado para regras críticas.
- Não existe modelo real de autenticação com usuários, contas, organizações e permissões.
- Não existe isolamento por tenant.
- Não existe módulo de cobrança recorrente.
- Não existe página comercial de apresentação do produto.
- Não existe área administrativa SaaS para gestão de contas, pagamentos, suporte e cancelamentos.

---

## 2. Análise estrutural por camadas

## 2.1 Frontend e experiência do produto

### Estrutura observada

- Rotas operacionais já existem para caixa, vendas, comandas, financeiro, produtos, clientes, pedidos, QR Code e configurações.
- A rota raiz redireciona diretamente para o dashboard operacional.
- Isso caracteriza um produto interno de uso direto, e não uma plataforma comercial pronta para aquisição por novos clientes.

### Leitura semântica

O sistema foi pensado como aplicação de operação diária de um estabelecimento, não como produto de entrada, conversão e retenção.

Para SaaS, a semântica de navegação precisa ser dividida em três contextos:

1. marketing e aquisição
2. onboarding e cadastro
3. operação interna do cliente

Hoje esses contextos ainda estão misturados ou ausentes.

---

## 2.2 Camada de dados

### Estrutura observada

- src/lib/data-access.ts concentra leitura, gravação, migração de dados antigos e sincronização parcial com nuvem.
- Grande parte da lógica de persistência está no navegador.
- Identificadores são gerados localmente com base em tempo.
- Não há boundary entre dados do produto e dados de tenant.

### Riscos

- localStorage não é uma base confiável para ambiente SaaS multiempresa.
- Não há controle transacional.
- Não há auditoria.
- Há risco de inconsistência entre abas, dispositivos e sessões.
- Não há trilha segura para faturamento, assinatura, permissões e histórico administrativo.

### Conclusão

Essa camada atende um MVP operacional local, mas não atende o nível de governança exigido por um SaaS.

---

## 2.3 Segurança e autenticação

### Estrutura observada

- A autenticação administrativa atual está no layout da aplicação.
- O acesso depende de credenciais fixas no frontend.
- A sessão administrativa é salva no localStorage.
- As regras do Firestore estão abertas para leitura e escrita.

### Impacto

Esse modelo inviabiliza a oferta comercial segura para múltiplos clientes.

Sem autenticação real, controle de sessão, autorização por perfil e isolamento por conta, o sistema não pode ser tratado como SaaS em produção.

### Conclusão

Autenticação e autorização são o primeiro bloqueio estrutural para a evolução do produto.

---

## 2.4 Modelo de domínio

### Estrutura observada

Os tipos atuais refletem bem o domínio operacional do bar:

- produtos
- categorias
- clientes
- comandas
- itens de pedido
- vendas
- caixa
- lançamentos financeiros
- solicitações de clientes

### O que falta para SaaS

Faltam entidades de plataforma:

- organization
- workspace
- user
- membership
- role
- permission
- subscription
- invoice
- payment_attempt
- support_ticket
- cancellation_request
- trial_period
- usage_meter

### Conclusão

O domínio atual cobre a operação do estabelecimento, mas não cobre a operação do negócio SaaS.

---

## 3. Diagnóstico de maturidade para virar SaaS

## 3.1 O que já existe e pode ser reaproveitado

- boa base de interface operacional
- separação por páginas e componentes
- tipos principais do domínio do bar
- fluxo funcional de comandas e operação
- base para relatórios e financeiro
- fluxo de QR Code e pedidos de cliente

## 3.2 O que precisa ser refeito ou reposicionado

- autenticação
- autorização
- persistência central
- sincronização de dados
- segurança de acesso
- regras de cobrança
- onboarding de cliente
- gestão administrativa SaaS
- observabilidade
- suporte operacional

---

## 4. Principais problemas estruturais

## 4.1 Problemas críticos

### 1. Autenticação no cliente

Hoje a proteção administrativa é apenas visual e local. Isso não é segurança real.

### 2. Regras abertas no Firestore

Com leitura e escrita liberadas, não há garantia de integridade, sigilo ou separação de dados.

### 3. Ausência de multi-tenant

O sistema não possui organizationId, tenantId ou qualquer estratégia de isolamento por conta.

### 4. Persistência operacional no navegador

Isso compromete confiabilidade, suporte, auditoria, cobrança e escalabilidade.

### 5. Falta de backoffice SaaS

Não existe área central para acompanhar contas, assinaturas, inadimplência, cancelamentos, tickets e suporte.

---

## 4.2 Problemas importantes, mas secundários

- ausência de landing page comercial
- ausência de cadastro guiado
- ausência de período de teste controlado
- ausência de política formal de cancelamento
- ausência de perfil de suporte
- ausência de métricas de uso por cliente
- ausência de monitoramento e logs

---

## 5. Proposta de evolução arquitetural

## 5.1 Objetivo da nova arquitetura

Separar o sistema em dois níveis:

### Plataforma SaaS

Responsável por:

- apresentação comercial
- cadastro
- autenticação
- cobrança
- gestão de contas
- suporte
- cancelamento
- administração global

### Produto operacional do cliente

Responsável por:

- caixa
- comandas
- produtos
- clientes
- pedidos
- financeiro
- relatórios

---

## 5.2 Macroarquitetura sugerida

### Camada pública

- página inicial do produto
- página de recursos
- página de planos
- página de contato
- página de cadastro
- página de login

### Camada autenticada do cliente

- dashboard do cliente
- módulos operacionais do bar
- gestão de equipe e permissões
- configurações da conta
- cobrança e assinatura

### Camada administrativa global

- painel admin SaaS
- gestão de contas
- gestão de pagamentos
- gestão de suporte
- visão de cancelamentos
- visão de trial
- indicadores de crescimento e retenção

### Camada backend

- autenticação
- API de domínio
- cobrança e webhooks
- auditoria
- autorização por tenant e perfil
- integrações externas

---

## 6. Módulos necessários para o SaaS

## 6.1 Página de apresentação do sistema

Essa página precisa vender o produto e preparar conversão.

### Conteúdo recomendado

- proposta de valor clara
- benefícios para bares, restaurantes e operação rápida
- visão dos módulos do sistema
- prova social futura
- CTA para teste grátis
- CTA para falar com vendas ou suporte
- apresentação dos planos

### Estrutura mínima

- hero principal
- seção de funcionalidades
- seção de diferenciais
- seção de planos
- seção de perguntas frequentes
- rodapé institucional

---

## 6.2 Planos

### Estrutura recomendada

#### Plano Teste

- 7 dias grátis
- acesso completo ou quase completo
- sem fidelidade
- conversão automática manual ou assistida

#### Plano Essencial

- operação principal do sistema
- 1 unidade
- usuários limitados
- suporte básico

#### Plano Profissional

- mais usuários
- relatórios avançados
- financeiro ampliado
- suporte prioritário

#### Plano Enterprise ou Rede

- múltiplas unidades
- gestão consolidada
- suporte dedicado
- integrações especiais

### Observação importante

O plano precisa ser refletido tecnicamente por limites, permissões e recursos ativados.

---

## 6.3 Cadastro

O cadastro não pode ser apenas criação de login.

Precisa contemplar:

- criação da conta
- criação da organização
- criação do usuário owner
- aceitação de termos
- validação de email ou telefone
- início do trial de 7 dias
- wizard inicial de configuração do negócio

---

## 6.4 Admin para gerenciar contas e pagamentos

Esse módulo é obrigatório para operar o SaaS.

### Funções principais

- listar contas ativas
- listar contas em trial
- listar contas inadimplentes
- suspender e reativar contas
- visualizar plano atual
- visualizar histórico de pagamento
- registrar observações internas
- gerenciar upgrades e downgrades
- acompanhar cancelamentos solicitados

---

## 6.5 Suporte para os usuários do sistema

### Funções recomendadas

- abertura de ticket
- categorização por prioridade
- status do atendimento
- comentários internos da equipe
- histórico por cliente
- possibilidade de anexar evidências no futuro

### Perfis mínimos

- owner da conta
- operador do cliente
- agente de suporte
- admin global

---

## 6.6 Sistema de cancelamento

O cancelamento precisa ser modelado como processo, não como botão solto.

### Etapas sugeridas

1. solicitação de cancelamento
2. captura do motivo
3. confirmação de impacto
4. data efetiva de encerramento
5. status da assinatura
6. política de retenção ou exclusão dos dados
7. opção de reversão dentro de janela definida

### Benefícios

- reduz conflito operacional
- melhora retenção
- gera inteligência sobre churn
- profissionaliza o relacionamento com o cliente

---

## 6.7 Teste grátis de 7 dias

O trial precisa ter controle sistêmico.

### Requisitos

- data de início
- data de fim
- status do trial
- lembretes automáticos
- bloqueio ou downgrade após expiração
- conversão para plano pago

### Decisão estratégica

Definir se o trial será:

- sem cartão
- com cartão obrigatório
- assistido por equipe comercial

---

## 6.8 Sistema pelo Stripe por hora

Se a ideia é cobrar por uso ou por consumo variável, há duas possibilidades:

### Modelo A. Assinatura mensal fixa

Mais simples para lançar.

### Modelo B. Cobrança por uso com Stripe

Exemplo:

- por hora de operação
- por quantidade de comandas
- por número de pedidos
- por volume transacionado

### Recomendação prática

Para a primeira fase, usar assinatura mensal fixa com trial.

Cobrança variável por hora deve entrar apenas quando o sistema já tiver:

- medição confiável de uso
- eventos auditáveis
- reconciliação financeira
- regras de cobrança transparentes

Sem isso, cobrar por hora cria disputa operacional e suporte desnecessário.

---

## 7. Boa conduta técnica para essa transição

## 7.1 Princípios recomendados

- separar produto operacional de plataforma SaaS
- mover regras críticas para backend
- tratar autenticação como fundação, não detalhe
- criar isolamento por tenant desde o modelo de dados
- registrar eventos importantes em trilha de auditoria
- evitar lógica crítica apenas no cliente
- modelar billing como domínio próprio
- usar feature flags por plano quando necessário

## 7.2 Decisões de engenharia recomendadas

- manter Next.js no frontend
- introduzir backend com rotas seguras ou BFF
- usar autenticação real
- adotar banco com suporte forte a controle por tenant
- reduzir dependência de localStorage para dados críticos
- manter o que é offline apenas como recurso complementar

---

## 8. Modelo de domínio sugerido para a fase SaaS

## 8.1 Entidades de plataforma

### Organization

- id
- legalName
- tradeName
- document
- status
- createdAt
- updatedAt

### User

- id
- name
- email
- phone
- status
- createdAt

### Membership

- id
- organizationId
- userId
- role
- status

### Subscription

- id
- organizationId
- planId
- provider
- providerCustomerId
- providerSubscriptionId
- status
- startedAt
- endsAt

### Plan

- id
- name
- billingType
- price
- limits
- features

### SupportTicket

- id
- organizationId
- requesterUserId
- subject
- category
- priority
- status
- createdAt

### CancellationRequest

- id
- organizationId
- requestedBy
- reason
- status
- scheduledEndDate

### Trial

- id
- organizationId
- startsAt
- endsAt
- status

---

## 8.2 Entidades operacionais com vínculo de tenant

Todas as entidades operacionais devem passar a incluir vínculo organizacional, por exemplo:

- organizationId
- createdBy
- updatedBy
- createdAt
- updatedAt

Isso vale para:

- Product
- ProductCategory
- Client
- ActiveOrder
- Sale
- FinancialEntry
- CashRegisterStatus
- GuestRequest

---

## 9. Roadmap recomendado

## Fase 1. Fundação SaaS

- implementar autenticação real
- criar modelo organization, user e membership
- fechar regras de acesso
- criar persistência central segura
- remover dependência crítica de localStorage
- preparar separação por tenant

## Fase 2. Produto comercial

- criar landing page
- criar página de planos
- criar login e cadastro
- criar onboarding de trial
- criar conta owner do cliente

## Fase 3. Billing e administração

- integrar Stripe
- criar módulo de assinatura
- criar histórico de pagamento
- criar painel admin global
- criar regras de cancelamento

## Fase 4. Suporte e retenção

- criar módulo de suporte
- criar FAQ e ajuda
- criar métricas de churn
- criar alertas de expiração e inadimplência

---

## 10. Melhor proposta de evolução

## Proposta recomendada

Não transformar o sistema atual em SaaS apenas adicionando telas novas.

O melhor caminho é fazer a evolução em duas frentes coordenadas:

### Frente 1. Reestruturação da fundação

- autenticação
- tenant
- persistência
- segurança
- billing base

### Frente 2. Nova camada comercial

- landing page
- planos
- cadastro
- trial
- área de conta
- admin global
- suporte

### Motivo

Se a camada comercial vier antes da fundação, o sistema passa a vender algo que ainda não tem segurança nem governança suficiente para escalar.

---

## 11. Proposta prática de pastas futuras

Uma organização possível para a próxima etapa:

```text
src/
  app/
    (public)/
      page.tsx
      planos/page.tsx
      login/page.tsx
      cadastro/page.tsx
    (app)/
      dashboard/page.tsx
      orders/page.tsx
      financial/page.tsx
      settings/page.tsx
      billing/page.tsx
      support/page.tsx
    (admin)/
      admin/page.tsx
      admin/accounts/page.tsx
      admin/payments/page.tsx
      admin/support/page.tsx
      admin/cancellations/page.tsx
  modules/
    auth/
    organizations/
    billing/
    support/
    cancellation/
    pos/
    financial/
```

---

## 12. Decisão recomendada para o próximo passo

### Ordem ideal de execução

1. definir arquitetura SaaS alvo
2. definir autenticação e tenancy
3. definir modelo de planos e trial
4. criar landing page e fluxo de cadastro
5. criar admin global
6. criar suporte e cancelamento

---

## 13. Conclusão executiva

O sistema atual tem valor real como produto operacional, mas ainda está em estágio de aplicação local ampliada, não de plataforma SaaS.

Para torná-lo comercializável com segurança e escala, a prioridade não deve ser apenas design ou novas páginas, e sim a criação da fundação de plataforma:

- autenticação real
- multi-tenant
- backend seguro
- billing
- administração global
- suporte
- cancelamento
- trial controlado

Depois dessa base, a página de apresentação, os planos e o cadastro passam a gerar negócio de forma sustentável.

---

## 14. Recomendação final

Se o objetivo é transformar este produto em SaaS, a melhor proposta é:

- preservar os módulos operacionais já maduros
- refatorar a camada de acesso a dados
- introduzir modelo de organização e usuários
- criar nova camada pública para aquisição
- criar camada administrativa global
- iniciar com cobrança simples por assinatura
- deixar cobrança por hora para uma segunda etapa, quando houver medição confiável de uso

Esse caminho reduz risco, evita retrabalho estrutural e permite evoluir o sistema com base sólida.