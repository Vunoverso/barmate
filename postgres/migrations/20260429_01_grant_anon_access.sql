-- Correcao critica: tabelas criadas via migration nao receberam GRANT
-- automatico para roles anon/authenticated do antigo ambiente Postgres gerenciado, gerando
-- "42501 permission denied for table" mesmo com RLS policies using(true).
--
-- Sintoma observado em producao (2026-04-29):
--   - 401 em todas as queries para app_state, open_orders, guest_requests
--   - 140+ pendencias offline acumuladas porque a fila nunca consegue sincronizar
--   - Comandas/caixa "voltam de 3 dias atras" pois nada e persistido no backend remoto
--
-- Esta migration concede os GRANTs necessarios e e idempotente (pode ser
-- re-executada sem efeitos colaterais).

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.app_state to anon, authenticated;
grant select, insert, update, delete on public.open_orders to anon, authenticated;
grant select, insert, update, delete on public.guest_requests to anon, authenticated;

-- Garantia para futuras tabelas criadas no schema public.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
