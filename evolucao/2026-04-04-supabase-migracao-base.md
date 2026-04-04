# 2026-04-04 - Base de migracao para Supabase

## Data
2026-04-04

## Objetivo
Criar a fundacao tecnica e documental para migrar o BarMate de Firebase para Supabase de forma incremental, sem interromper o app atual.

## Motivacao
- Firebase esta gerando erros operacionais e travamentos recorrentes.
- O login publicado depende de uma configuracao externa frágil no Firebase Auth.
- O projeto precisa de uma rota de migracao com mais controle sobre auth, banco, storage e politicas multi-tenant.

## Decisao tomada
- Manter o provider atual como firebase por padrao.
- Introduzir um scaffold de Supabase sem ativar a troca no runtime.
- Definir variaveis de ambiente para o futuro backend Supabase.
- Criar o cliente Supabase opcional e um seletor de provider.
- Criar uma migration SQL base com tabelas iniciais e RLS para tenancy.

## Arquivos impactados
- .env.example
- package.json
- src/lib/supabaseClient.ts
- src/lib/backend-provider.ts
- src/types/supabase.ts
- supabase/migrations/2026-04-04-000001_barmate_foundation.sql

## Estrategia de migracao
1. Ativar Supabase Auth primeiro.
2. Migrar organizations e membership.
3. Migrar dados documento-a-documento via tabela de compatibilidade app_documents.
4. Substituir acessos Firebase por camadas Supabase por modulo.
5. Migrar uploads por ultimo para Supabase Storage.

## Dados que ainda serao necessarios
- URL do projeto Supabase.
- anon key.
- service role key.
- decisao final sobre schema fisico: tabelas normalizadas ou compatibilidade com payload jsonb.
- lista de usuarios/admins que precisam ser importados do ambiente atual.

## Riscos e observacoes
- O app ainda nao foi apontado para Supabase.
- A migration criada e fundacional e nao cobre todos os modulos operacionais do produto.
- A etapa de migracao do auth exige dados reais do projeto Supabase para ser concluida.

## Proximos passos
1. Receber as credenciais do projeto Supabase.
2. Instalar e aplicar a migration inicial no Supabase.
3. Migrar login/cadastro para Supabase Auth mantendo o restante do app no Firebase temporariamente.
4. Criar scripts de backfill dos dados atuais.

## Atualizacao fase 2
- Credenciais do Supabase recebidas para desenvolvimento local.
- Login e cadastro passaram a ter rota de migracao por Supabase Auth quando NEXT_PUBLIC_BACKEND_PROVIDER estiver em supabase.
- Foram adicionadas rotas server-side para criacao do usuario/organizacao e resolucao do contexto da organizacao.
- O restante do app continua dependente de Firebase para dados operacionais, reduzindo o risco da troca inicial.
- A migration inicial foi aplicada no banco remoto do Supabase com sucesso via CLI.

## Atualizacao deploy producao
- Variaveis de ambiente de producao configuradas no Vercel: NEXT_PUBLIC_BACKEND_PROVIDER, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.
- Novo deploy de producao acionado no Vercel a partir do commit 5b8943b.
- Validacao publica executada em /login apos o deploy pronto.
- O erro antigo de configuracao do Firebase deixou de aparecer em producao; o login invalido agora retorna mensagem funcional de credencial incorreta, indicando que o fluxo publicado passou a usar Supabase Auth.

## Proximos passos operacionais
1. Validar login com uma conta real ja provisionada no Supabase.
2. Validar cadastro completo em producao e conferir criacao de organization_members.
3. Migrar os primeiros modulos operacionais hoje presos ao Firebase.