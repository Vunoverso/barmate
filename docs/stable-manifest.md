
# BarMate - Manifesto de Ponto de Restauração (v1.3.3-STABLE)

Este documento registra o estado estável do sistema antes do início da nova versão.

## Funcionalidades Ativas e Testadas:

### 1. Segurança e Acesso
- **Portal de Acesso:** Bloqueio obrigatório via login `Admin` e senha `cocofidido1981`.
- **Sessão Persistente:** O login é mantido via `localStorage`, garantindo que o usuário não precise logar toda vez que trocar de aba.

### 2. Gestão de Dados (Cloud Sovereignty)
- **Soberania da Nuvem:** O Google Firestore é a fonte mestre de dados para Produtos, Clientes e Configurações.
- **Backup Híbrido:** LocalStorage serve como cache de velocidade, mas a nuvem reescreve o local em caso de conflitos.
- **Exportação/Importação:** Botões dedicados para Comandas e para o Sistema Completo funcionando na aba Configurações.

### 3. Painel de Comandas
- **Visual de Itens Pagos:** Itens quitados ficam riscados e com 40% de opacidade (sem fundo branco).
- **Regras de Combo:** Combos pendentes de entrega mantêm "cor forte" mesmo se pagos, até a quitação total da entrega.
- **Fechamento Automático:** A mesa encerra apenas quando: Saldo = 0, Cozinha = Entregue, Combos = Entregues.
- **Desconto & Crédito:** Lógica de itens negativos para descontos e abertura de nova comanda para crédito de troco.

### 4. Monitor de Cozinha (Produção)
- **Sincronização em Tempo Real:** Pedidos aparecem instantaneamente para a cozinha.
- **Alerta Sonoro:** Bips de notificação em novos pedidos.
- **Controle de Produção:** Botão de "Play" para marcar itens em preparo.

### 5. Configurações do Bar
- **Identidade Visual:** Upload de logo com controle de escala e sincronização em tempo real na aba Guest.
- **Taxas:** Cálculo automático de taxas de transação para relatórios financeiros.

---
**Data deste ponto:** 2024-05-22
**Status:** 100% Funcional e Seguro.
