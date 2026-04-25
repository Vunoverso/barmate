---
name: barmate-saas-project-base
description: Regras e instrucoes base para criar, evoluir e manter o BarMate como plataforma SaaS multi-tenant.
applyTo: "src/**,firestore.rules,README.md,docs/**"
---

# Base de Criacao do Projeto

Este projeto deve evoluir como uma plataforma SaaS para bares, restaurantes e operacoes de atendimento rapido.

O objetivo nao e apenas manter um sistema de operacao interna. O objetivo e construir um produto escalavel, seguro, comercializavel e administravel.

## 1. Direcao do Produto

Toda implementacao deve respeitar estes tres contextos:

### 1. Camada publica

- pagina de apresentacao
- pagina de planos
- login
- cadastro
- pagina de contato ou suporte inicial

### 2. Camada do cliente autenticado

- dashboard do estabelecimento
- caixa
- comandas
- pedidos
- financeiro
- clientes
- produtos
- configuracoes da conta
- assinatura e cobranca

### 3. Camada administrativa global

- gestao de contas
- gestao de assinaturas
- gestao de pagamentos
- suporte
- cancelamentos
- metricas de trial, churn e inadimplencia

## 2. Principios Arquiteturais

- O sistema deve ser multi-tenant desde a modelagem de dados.
- Toda entidade de negocio deve pertencer a uma organizacao ou tenant.
- Nenhuma regra critica deve depender apenas do frontend.
- O frontend deve consumir regras validadas por backend ou camada segura de servidor.
- O sistema deve ser preparado para billing, auditoria e suporte desde a fundacao.

## 3. Regras Obrigatorias de Seguranca

- Nunca armazenar senhas, segredos ou chaves diretamente no codigo.
- Sempre usar variaveis de ambiente para credenciais.
- Nunca confiar em validacao apenas no cliente.
- Toda rota sensivel deve exigir autenticacao real.
- Toda acao critica deve validar permissao no backend.
- Usuarios so podem acessar dados da propria organizacao.
- Aplicar principio do menor privilegio.
- Evitar expor dados sensiveis em logs, respostas de erro ou payloads publicos.

## 4. Regras de Persistencia e Dados

- localStorage e sessionStorage nao podem ser fonte principal para dados criticos.
- Dados de autenticacao, assinatura, pagamentos, tenants e suporte devem estar em persistencia central segura.
- Identificadores criticos devem ser gerados de forma robusta e nao apenas com Date.now().
- Registros importantes devem ter createdAt, updatedAt, createdBy e organizationId quando aplicavel.
- Mudancas relevantes devem ser auditaveis.

## 5. Modelo Base do SaaS

Estas entidades devem existir ou estar previstas:

- Organization
- User
- Membership
- Role
- Permission
- Plan
- Subscription
- Invoice
- PaymentAttempt
- Trial
- SupportTicket
- CancellationRequest

As entidades operacionais existentes tambem devem carregar organizationId e metadados de autoria quando necessario.

## 6. Estrutura Recomendada de Rotas

Organizar o projeto com grupos de rota claros:

- src/app/(public)
- src/app/(app)
- src/app/(admin)

Sugestao de areas:

- (public): home, planos, login, cadastro
- (app): dashboard, orders, products, clients, financial, billing, support
- (admin): accounts, payments, support, cancellations, analytics

## 7. Regras para Novos Modulos

Sempre que um novo modulo for criado, ele deve responder a estas perguntas:

- qual problema de negocio resolve
- a qual contexto pertence: public, app ou admin
- quais dados manipula
- qual e o tenant responsavel
- quais perfis podem acessar
- quais eventos precisam de auditoria
- se impacta billing, trial, suporte ou cancelamento

## 8. Landing Page e Conversao

A pagina publica principal deve existir para vender o produto.

Ela deve conter no minimo:

- proposta de valor clara
- beneficios por tipo de cliente
- demonstracao dos modulos
- planos
- CTA de teste gratis
- CTA de cadastro
- FAQ basico

Nao redirecionar a raiz diretamente para o dashboard se a estrategia for SaaS comercial.

## 9. Cadastro e Onboarding

O cadastro deve criar:

- usuario owner
- organizacao
- vinculacao inicial do usuario
- trial de 7 dias, se habilitado

O onboarding deve orientar:

- nome do estabelecimento
- documento fiscal
- configuracao inicial
- cadastro de produtos
- equipe inicial

## 10. Billing e Trial

- O primeiro modelo de cobranca deve ser simples e auditavel.
- Priorizar assinatura mensal fixa antes de cobranca por uso variavel.
- Trial deve ter inicio, fim, status e regra clara de conversao ou expiracao.
- Cancelamento deve registrar motivo, data e estado final da conta.
- Integracoes com pagamento devem usar webhooks e reconciliacao segura.

## 11. Suporte e Operacao

- O sistema deve ter area de suporte para usuarios.
- Tickets devem possuir status, prioridade, categoria e historico.
- O admin global deve conseguir acompanhar situacoes de risco, trial, inadimplencia e cancelamento.

## 12. Regras de Codigo

- Preferir funcoes pequenas e com responsabilidade clara.
- Evitar duplicacao de regra de negocio em multiplos componentes.
- Regras compartilhadas devem ficar em camadas reutilizaveis.
- Tipos devem representar o dominio com clareza.
- Nomes de arquivos e modulos devem refletir o negocio e nao apenas a interface.
- Comentarios devem ser curtos e usados apenas quando realmente agregarem contexto.

## 13. Regras de Frontend

- A interface publica e a interface operacional nao devem competir pela mesma semantica visual.
- A area publica deve comunicar valor comercial.
- A area autenticada deve priorizar eficiencia operacional.
- A area administrativa global deve priorizar monitoramento, filtros e controle.
- Componentes de UI devem ser reutilizados sem misturar regras de negocio neles.

## 14. Regras de Backend e APIs

- Toda API sensivel deve validar autenticacao e permissao.
- Toda entrada deve ser validada e sanitizada.
- Toda resposta deve evitar vazamento de detalhes internos.
- Operacoes criticas devem registrar logs estruturados.
- Billing, suporte, cancelamento e administracao global nao podem depender apenas de client-side state.

## 15. O que deve ser evitado

- senha fixa no frontend
- sessao administrativa em localStorage como protecao principal
- regras abertas no banco
- segredo versionado no repositorio
- logica de tenant apenas por convencao visual
- cobranca sem auditoria
- cancelamento sem historico
- trial sem controle de datas
- modulos admin misturados com telas operacionais do cliente

## 16. Ordem Recomendada de Implementacao

1. autenticacao real
2. organizacoes e memberships
3. isolamento por tenant
4. persistencia central segura
5. billing e trial
6. landing page e planos
7. cadastro e onboarding
8. admin global
9. suporte
10. cancelamento

## 17. Definicao Final

Toda contribuicao neste projeto deve fortalecer o BarMate como SaaS seguro, escalavel e administravel.

Se uma alteracao melhorar apenas a interface, mas mantiver fragilidades de autenticacao, tenant, billing ou governanca, ela nao resolve a fundacao do produto.

Priorizar sempre a base estrutural antes de ampliar a exposicao comercial do sistema.