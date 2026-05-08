# Auditoria Geral do Sistema - 2026-05-07

## Objetivo
Registrar uma visao completa do BarMate (cabo a rabo), com foco em:
- o que esta 100% funcional hoje, mas ainda pode melhorar
- o que esta incompleto ou meio feito
- prioridades praticas para evolucao

## Fontes desta auditoria
- Testes funcionais feitos em ambiente real (conta bartherapia)
- Leitura tecnica de codigo em modulos de app, API, auth, billing e infra
- Verificacao de configuracoes de seguranca, build e scripts

## 1) Esta 100% funcional hoje (mas pode melhorar)

### 1.1 Operacao do bar (core)
Status: 100% funcional no uso diario.

Itens validados:
- Produtos: criar, listar, excluir
- Comandas: criar, listar, excluir (soft delete)
- Clientes: criar e excluir
- Caixa: leitura de saldos, suprimento e estorno
- Configuracoes principais: salvar dados

Pode melhorar:
- Cobertura de teste automatizado (hoje validado manualmente)
- Regras de permissao por perfil mais detalhadas (owner/admin/staff)

### 1.2 Autenticacao
Status: funcional.

Itens validados:
- NextAuth com Credentials
- Sessao JWT com organizationId e role no contexto
- Registro com criacao de organizacao + membership

Pode melhorar:
- Rate limit no login/registro
- 2FA para perfis sensiveis

### 1.3 APIs de estado e comandas
Status: funcional.

Itens validados:
- Endpoints protegem por sessao + organizationId
- App-state com upsert/get/delete
- Open-orders com get/upsert/delete logico

Pode melhorar:
- Validacao de payload mais estrita em todas as rotas
- Limite de tamanho de request para reduzir risco de abuso

### 1.4 Deploy e runtime de producao
Status: funcional em producao.

Itens validados:
- Aplicacao no ar
- Banco principal operando na migracao atual
- Dados criticos carregando corretamente

Pode melhorar:
- Monitoramento proativo (alertas e erros centralizados)
- Runbook de recuperacao e backup formalizado

## 2) Meio feito / incompleto

### 2.1 Leitura de nota fiscal por foto/PDF
Status: NAO existe hoje.

O que existe:
- Conferencia manual de saidas por texto colado
- Upload de imagem para logo
- Import/export de backup

O que falta:
- Upload de foto/PDF de nota
- OCR
- Extracao automatica de campos (fornecedor, data, total, itens, impostos)

### 2.2 Seguranca de legado (ponto critico)
Status: incompleto.

Ponto encontrado:
- Regras do Firestore abertas (allow read/write if true em colecoes legadas)

Impacto:
- Risco alto se algum fluxo ainda tocar esse backend legado

### 2.3 Blindagem de build
Status: incompleto.

Ponto encontrado:
- next.config com ignoreBuildErrors e ignoreDuringBuilds ativos

Impacto:
- Erro pode passar no CI e aparecer so em runtime

### 2.4 Billing SaaS
Status: parcial.

O que existe:
- Checkout Stripe

O que falta:
- Webhooks completos de assinatura/falha/cancelamento
- Enforcamento de limites por plano
- Ciclo de trial mais forte no backend

### 2.5 Testes automatizados
Status: incompleto.

Ponto encontrado:
- Nao ha suite de testes (unit/integration/e2e) versionada para regressao continua

Impacto:
- Risco maior de quebrar fluxos em mudancas futuras

## 3) Classificacao resumida

### Verde - Funciona hoje
- Operacao diaria (produtos, comandas, clientes, caixa, configuracoes)
- Autenticacao e sessao
- APIs principais de estado/comandas
- Deploy e dados migrados

### Amarelo - Funciona, mas precisa reforco
- Billing/plano (esta de pe, mas nao completo para escala)
- Governanca de validacao e observabilidade

### Vermelho - Incompleto
- Leitura de nota fiscal por foto/PDF
- Testes automatizados
- Hardening de seguranca em legado (Firestore rules)
- Hardening de build (ignorar erros)

## 4) Prioridade pratica (ordem sugerida)
1. Fechar superficie de risco legado (Firestore rules)
2. Remover bypass de erros de build e corrigir erros reais
3. Implementar suite minima de testes de regressao (auth + APIs + caixa/comandas)
4. Fechar ciclo de billing (webhooks + limites por plano)
5. Implementar modulo de leitura de nota fiscal (foto/PDF + OCR + conciliacao)

## 5) Nota operacional
- Arquivo temporario de debug ainda existe e pode ser removido:
  - scripts/_debug-encoding.mjs

## 6) Conclusao simples
O sistema esta bom e utilizavel para operacao real do bar.
Para escalar com seguranca como SaaS, faltam principalmente:
- seguranca/hardening
- testes automatizados
- billing completo
- leitura automatica de nota fiscal

## 7) Novo projeto solicitado: Cardapio Digital completo (mesa + externo)

Status na auditoria: PLANEJADO (a implementar).

Objetivo de negocio:
- Ter um fluxo de pedido online no padrao iFood, mas com foco forte em consumo no restaurante (mesa) e tambem pedidos externos (entrega/retirada).

### 7.1 Escopo funcional obrigatorio

Cadastro de cardapio pelo restaurante:
- Cadastrar item com foto, nome, descricao e valor
- Organizar por categoria
- Ativar/desativar item
- Marcar disponibilidade por horario (opcional na fase 2)

Cliente no cardapio digital:
- Selecionar itens
- Ver resumo do pedido
- Confirmar e fechar pedido
- Acompanhar progresso em tempo real

Diferenciacao de tipo de pedido:
- Pedido de mesa (dentro do restaurante)
- Pedido externo (entrega)

Campos obrigatorios para pedido externo:
- CEP
- Endereco completo
- Ponto de referencia
- Telefone
- Nome do cliente

Fluxo de status (padrao operacional solicitado):
1. Enviado
2. Recebido pelo restaurante
3. Em producao
4. Finalizado
5. Aguardando entregador
6. Saindo para entrega
7. Entregue

### 7.2 O que ja existe e pode ser reaproveitado
- Base de produtos e categorias
- Modulo de comandas/open orders
- Views de pedidos e cozinha
- Estrutura de app-state e APIs autenticadas por organizacao

### 7.3 O que falta construir para este projeto
- Entidade de pedido unificada com tipo (mesa/externo)
- Endereco de entrega estruturado por pedido
- Timeline de status com historico de transicoes
- Canal de atualizacao em tempo real para cliente acompanhar progresso
- Regras de negocio de entrega (ex: so vai para entrega apos finalizado)
- Tela publica de acompanhamento por codigo/link do pedido

### 7.4 Critico para qualidade "nivel iFood"
- SLA de atualizacao de status quase em tempo real
- Historico auditavel de mudanca de status (quem mudou, quando mudou)
- Validacao forte dos dados de entrega
- Experiencia mobile prioritaria
- Mensagens claras para cliente e equipe do restaurante

### 7.5 Plano de implementacao sugerido

Fase 1 (MVP de valor rapido):
- Cardapio digital com foto/nome/descricao/preco
- Carrinho, fechamento de pedido e identificacao de tipo (mesa ou externo)
- Captura de dados de entrega para pedidos externos
- Status basicos: Enviado, Recebido, Em producao, Finalizado, Entregue

Fase 2 (operacao completa):
- Fluxo completo de entrega: Aguardando entregador e Saindo para entrega
- Acompanhamento em tempo real para cliente
- Historico completo de eventos de status
- Melhorias de UX para cozinha e expedicao

Fase 3 (escala SaaS):
- Regras por plano (limites de pedidos, modulos premium)
- Metricas de operacao (tempo medio por status, taxa de entrega)
- Painel de performance e qualidade de atendimento

### 7.6 Definicao de pronto (DoD) para este projeto
- Restaurante consegue cadastrar cardapio com foto, texto e valor
- Cliente consegue selecionar, revisar e fechar pedido sem friccao
- Sistema identifica corretamente pedido de mesa vs pedido externo
- Pedido externo exige CEP, endereco, referencia, telefone e nome
- Cliente consegue ver cada etapa de progresso ate entrega
- Equipe do restaurante consegue atualizar status em fluxo guiado

### 7.7 Prioridade na auditoria geral
Este projeto entra como prioridade estrategica alta, logo apos os itens criticos de seguranca e qualidade da base (hardening + testes).