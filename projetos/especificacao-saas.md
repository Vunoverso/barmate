# Especificação SaaS - BarMate

## Objetivo

Transformar o BarMate de sistema operacional local em plataforma SaaS multi-tenant, com segurança, governança, billing, admin global, suporte e retenção.

---

## Diretriz Executiva

Implementar em duas frentes paralelas:

1. Fundação SaaS
2. Camada Comercial

Sem a fundação, o produto não deve ser escalado comercialmente.

---

## 1. Fundação SaaS (prioridade máxima)

### 1.1 Segurança e autenticação

- Eliminar credenciais fixas no frontend.
- Implementar autenticação real com sessão segura.
- Validar autorização no backend para todas as ações sensíveis.

### 1.2 Multi-tenant

- Criar Organization, User e Membership.
- Garantir isolamento por organizationId em todo domínio.
- Aplicar controle de acesso por perfil.

### 1.3 Persistência central

- Migrar dados críticos de localStorage para persistência central segura.
- Adotar banco com isolamento por tenant (exemplo: PostgreSQL + RLS).
- Preservar rastreabilidade com createdAt, updatedAt, createdBy.

### 1.4 Segurança de dados existentes

- Fechar regras abertas de acesso do Firestore.
- Remover segredos expostos no frontend.
- Evitar qualquer lógica crítica apenas no cliente.

### 1.5 Middleware de autorização

- Validar organização, plano e status em toda rota autenticada.
- Bloquear acesso fora do contexto do tenant.

---

## 2. Camada Comercial (SaaS)

### 2.1 Landing page comercial

- Hero com proposta de valor.
- Funcionalidades principais.
- Planos e comparativo.
- FAQ.
- CTAs para cadastro e teste.
- SSR e SEO.

### 2.2 Cadastro e trial

Fluxo mínimo:

1. Criar organização.
2. Criar usuário owner.
3. Aceitar termos.
4. Ativar trial de 7 dias.

### 2.3 Onboarding inicial

- Nome do estabelecimento.
- Configuração inicial de caixa.
- Cadastro de produtos essenciais.

---

## 3. Admin Global SaaS

### 3.1 Contas

- Listar contas ativas, trial e inadimplentes.
- Suspender, reativar e acompanhar status.

### 3.2 Pagamentos

- Visualizar assinaturas e faturas.
- Conferir eventos de cobrança e falhas.

### 3.3 Trial

- Listar contas em trial ativo.
- Destacar trials com expiração próxima (3 dias ou menos).
- Permitir extensão manual de trial por conta.
- Medir taxa de conversão trial para pago.
- Após expiração: conta em modo restrito com preservação de dados por 15 dias.

### 3.4 Cancelamentos

- Registrar solicitação e motivo.
- Definir data efetiva.
- Medir churn e retenção.
- Permitir marcação de retenção quando o cancelamento for revertido.

---

## 4. Modelo de Domínio SaaS

Entidades de plataforma:

- Organization: id, legalName, tradeName, document, status, createdAt
- User: id, name, email, phone, passwordHash, status, createdAt
- Membership: id, organizationId, userId, role, status
- Subscription: id, organizationId, planId, stripeSubscriptionId, status, startedAt, endsAt
- Plan: id, name, billingType, price, limits, features
- Trial: id, organizationId, startsAt, endsAt, status
- SupportTicket: id, organizationId, userId, subject, category, priority, status
- CancellationRequest: id, organizationId, requestedBy, reason, status, scheduledEndDate
- Invoice: id, organizationId, stripeInvoiceId, amount, status, paidAt

Entidades operacionais devem receber organizationId:

- Product
- ProductCategory
- Client
- ActiveOrder
- Sale
- FinancialEntry
- CashRegisterStatus

---

## 5. Planos

### Trial (7 dias)

- Acesso completo.
- Sem cartão.
- Conversão manual ou automática ao final.

### Essencial

- 1 unidade.
- Até 3 usuários.
- POS, comandas, produtos, clientes.
- Suporte básico.

### Profissional

- 1 unidade.
- Até 10 usuários.
- Tudo do Essencial.
- Financeiro completo e relatórios avançados.
- Suporte prioritário.

### Enterprise / Rede

- Múltiplas unidades.
- Usuários ilimitados.
- Gestão consolidada.
- Suporte dedicado.
- Integrações.

Implementação técnica de limites:

- Limits em JSON no Plan.
- Feature flags validadas em middleware.
- Upgrade e downgrade refletidos por webhook de cobrança.

---

## 6. Billing

### Estratégia inicial

- Começar com assinatura mensal simples e auditável.
- Integrar checkout e portal de assinatura.
- Processar webhooks para sincronização de status.

### Estratégia avançada

Cobrança por hora ou por consumo variável somente após:

- medição confiável de uso
- eventos auditáveis
- reconciliação financeira sólida

---

## 7. Suporte e Retenção

### 7.1 Módulo de suporte

- Ticket com categoria, prioridade, status e histórico.
- Comentário interno para equipe.

### 7.2 Base de ajuda

- FAQ público com busca.

### 7.3 Indicadores de retenção

- motivos de cancelamento
- taxa de retenção
- cohorts
- contas sem uso há N dias

---

## 8. Estrutura de Pastas Sugerida

```text
src/
  app/
    (public)/
      page.tsx
      planos/page.tsx
      login/page.tsx
      cadastro/page.tsx
      suporte/page.tsx
    (app)/
      layout.tsx
      dashboard/page.tsx
      caixa/page.tsx
      comandas/page.tsx
      financeiro/page.tsx
      produtos/page.tsx
      conta/page.tsx
      suporte/page.tsx
    (admin)/
      layout.tsx
      admin/page.tsx
      admin/contas/page.tsx
      admin/pagamentos/page.tsx
      admin/suporte/page.tsx
      admin/cancelamentos/page.tsx
      admin/trial/page.tsx
  modules/
    auth/
    organizations/
    billing/
    support/
    cancellation/
    pos/
    financial/
  lib/
    db/
    stripe/
    email/
    middleware/
```

---

## 9. Roadmap de Implementação

### Fase 1 - Fundação SaaS

- Auth real
- Organization, User, Membership
- Persistência central multi-tenant
- Fechamento de regras abertas
- Middleware de autorização

### Fase 2 - Produto Comercial

- Landing page
- Página de planos
- Cadastro com trial
- Onboarding inicial

### Fase 3 - Billing e Administração

- Integração de cobrança (produtos, preços, assinaturas, portal, webhooks)
- Painel admin global
- Portal da conta do cliente
- Alertas automáticos de expiração e inadimplência

### Fase 4 - Suporte e Retenção

- Módulo de suporte
- FAQ e base de conhecimento
- Métricas de churn e retenção
- Alertas de saúde de contas

---

## 10. Prioridade Imediata

1. Iniciar Landing Page comercial.
2. Iniciar Painel Admin SaaS.
3. Executar Fundação SaaS em paralelo com prioridade técnica máxima.

Se a camada comercial avançar sem fundação, o produto será vendido sem segurança e sem governança suficientes para escala.