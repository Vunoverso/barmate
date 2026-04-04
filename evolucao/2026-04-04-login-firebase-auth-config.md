# 2026-04-04 - Login Firebase Auth

## Data
2026-04-04

## Objetivo
Diagnosticar o erro de login publicado em https://barmate.vercel.app/login e ajustar o frontend para expor a causa real do erro de autenticacao.

## Diagnostico
- O endpoint do Firebase Auth accounts:signInWithPassword esta retornando HTTP 400.
- Corpo da resposta retornado pelo backend: CONFIGURATION_NOT_FOUND.
- O problema ocorre antes da validacao de credenciais, portanto nao depende do e-mail/senha informados.
- O frontend anterior convertia esse retorno em mensagem generica, escondendo a causa real.

## Arquivos impactados
- src/lib/firebase-auth-errors.ts
- src/app/login/page.tsx
- src/app/cadastro/page.tsx
- tsconfig.json

## Decisao tomada
- Criado helper central para extrair codigos reais do backend do Firebase Auth.
- Login e cadastro passaram a usar o helper para exibir mensagens precisas.
- CONFIGURATION_NOT_FOUND agora gera mensagem explicita informando falha de configuracao do Firebase Auth no ambiente publicado.

## Riscos e observacoes
- A correcao de codigo melhora o diagnostico, mas nao resolve sozinha o login em producao.
- A acao obrigatoria agora e operacional: revisar Firebase Authentication do projeto barmate-lp3fo e a configuracao publicada na Vercel.
- Nao existem pastas projeto/ e evolucao/ previas neste workspace, apesar da instrucao global exigir esse historico.

## Proximos passos
1. Conferir no console do Firebase se o provedor Email/Password esta habilitado para o projeto publicado.
2. Conferir se a API key e o app publicado na Vercel pertencem ao mesmo projeto Firebase.
3. Fazer novo deploy apos o push para refletir a mensagem de erro melhorada.

## Atualizacao complementar
- Adicionado compilerOptions.ignoreDeprecations = 6.0 no tsconfig para silenciar o aviso deprecado de baseUrl no TypeScript atual, sem alterar o mapeamento de paths ja usado pelo projeto.