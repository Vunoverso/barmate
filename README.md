
# BarMate - Gerenciador de Bar SaaS

Sistema de ponto de venda (PDV) e gestão SaaS para bares e restaurantes.

## 🚀 Como Hospedar na Vercel (Passo a Passo)

1. **Suba seu código para o GitHub**: Crie um repositório privado e faça o push do seu código.
2. **Conecte à Vercel**:
   - Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"**.
   - Importe seu repositório do GitHub.
3. **Configure as Variáveis de Ambiente**:
   - Durante o setup na Vercel, abra a seção **"Environment Variables"**.
   - Copie e cole as chaves que estão no arquivo `.env.example` do projeto.
4. **Deploy**:
   - Clique em **"Deploy"**. A Vercel detectará automaticamente que é um projeto Next.js e fará tudo por você.

## 🛠️ Tecnologias Utilizadas

*   **Frontend**: Next.js 15 (App Router)
*   **UI**: Tailwind CSS + ShadCN UI
*   **Banco de Dados**: Firebase Firestore (Real-time)
*   **Autenticação**: Firebase Auth (Pronto para ativar)
*   **Arquitetura**: Multi-tenant SaaS

## 🔒 Segurança e Isolamento

O sistema utiliza `organizationId` para garantir que os dados de um bar nunca vazem para outro. Toda a comunicação com o Firebase é protegida por regras de segurança baseadas em Tenant.

## 📄 Licença

Uso exclusivo para a plataforma BarMate SaaS.
