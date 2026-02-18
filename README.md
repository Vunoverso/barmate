
# BarMate - Gerenciador de Bar

Este é um sistema de ponto de venda (PDV) para bares e restaurantes, desenvolvido com Next.js, TypeScript e ShadCN UI.

## Persistência de Dados (Como as Alterações são Salvas)

Este aplicativo utiliza uma arquitetura híbrida para garantir velocidade e confiabilidade:
*   **Dados Operacionais:** Comandas abertas e solicitações de clientes são sincronizadas em tempo real via **Firebase Firestore**. Isso permite que o cliente veja a conta no celular dele instantaneamente.
*   **Dados Históricos e Locais:** Vendas finalizadas, histórico de caixa e configurações de produtos são salvos no `localStorage` do seu navegador para máxima performance.

## Rodando o Projeto Localmente

Siga os passos abaixo para instalar e executar o projeto em sua máquina.

### Pré-requisitos

*   **Node.js**: Certifique-se de que você tem o Node.js instalado. Você pode baixá-lo em [nodejs.org](https://nodejs.org/). O `npm` (Node Package Manager) é instalado automaticamente com o Node.js.

### Passo 1: Instalar as Dependências

Abra o seu terminal na pasta raiz do projeto e execute o seguinte comando:

```bash
npm install
```

### Passo 2: Iniciar o Servidor de Desenvolvimento

Após a instalação ser concluída, inicie o servidor local com o comando:

```bash
npm run dev
```

Este comando iniciará a aplicação em modo de desenvolvimento na porta **9000**.

### Passo 3: Acessar o Aplicativo

O terminal mostrará uma mensagem indicando que o servidor está rodando em `http://localhost:9000`.

Abra seu navegador e acesse: [**http://localhost:9000**](http://localhost:9000)

## Funcionalidades Principais

1.  **Gestão de Comandas:** Abra, edite, junte e finalize contas com facilidade.
2.  **QR Code de Cliente:** Gere um QR Code por comanda ou um QR Code Geral para que os clientes acompanhem seus pedidos em tempo real.
3.  **Controle de Caixa:** Abertura, fechamento, suprimentos (entradas) e sangrias (saídas).
4.  **Relatórios Financeiros:** Visualize seu faturamento por período, método de pagamento e analise sua lucratividade.
5.  **Catálogo de Produtos:** Gerencie categorias, preços e estoque.

## Solução de Problemas

### Página não encontrada (404)
Ao adicionar novas páginas, o Next.js pode precisar de um "refresh" no cache. Se vir um erro 404, pare o terminal (Ctrl+C) e rode:
```bash
npm run dev:clean
```
