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