# BarMate - Gerenciador de Bar

Este é um sistema de ponto de venda (PDV) para bares e restaurantes, desenvolvido com Next.js, TypeScript e ShadCN UI.

## Persistência de Dados (Como as Alterações são Salvas)

Este aplicativo foi projetado para funcionar localmente no seu navegador. **Todas as alterações e dados que você gera são salvos diretamente no `localStorage` do seu navegador.** Isso significa que você pode fechar a aba ou o navegador e, ao abrir novamente no mesmo navegador, tudo estará como você deixou.

**O que é salvo localmente?**
*   **Comandas Abertas:** Todas as comandas criadas na tela "Comandas".
*   **Venda de Balcão Atual:** Os itens adicionados na tela "Venda Balcão".
*   **Histórico de Vendas:** Todas as vendas finalizadas, que alimentam a tela de "Relatórios".
*   **Status do Caixa:** Se o caixa está aberto ou fechado, o saldo inicial e o horário de abertura.
*   **Configurações Personalizadas:** O nome do seu bar e os nomes personalizados das categorias de produtos.

**Importante:** Como os dados são salvos no `localStorage`, eles são específicos para cada navegador. Se você abrir o aplicativo no Chrome e depois no Firefox, os dados não serão compartilhados entre eles.

## Rodando o Projeto Localmente

Siga os passos abaixo para instalar e executar o projeto em sua máquina.

### Pré-requisitos

*   **Node.js**: Certifique-se de que você tem o Node.js instalado. Você pode baixá-lo em [nodejs.org](https://nodejs.org/). O `npm` (Node Package Manager) é instalado automaticamente com o Node.js.

### Passo 1: Instalar as Dependências

Abra o seu terminal na pasta raiz do projeto e execute o seguinte comando para instalar todas as bibliotecas necessárias:

```bash
npm install
```

### Passo 2: Iniciar o Servidor de Desenvolvimento

Após a instalação ser concluída, inicie o servidor local com o comando:

```bash
npm run dev
```

Este comando iniciará a aplicação em modo de desenvolvimento.

### Passo 3: Acessar o Aplicativo

O terminal mostrará uma mensagem indicando que o servidor está rodando, geralmente em `http://localhost:9002`.

Abra seu navegador de preferência e acesse:

[**http://localhost:9002**](http://localhost:9002)

Pronto! Agora o sistema está rodando localmente na sua máquina e todas as suas interações serão salvas no seu navegador.
