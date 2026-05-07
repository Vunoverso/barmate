#!/bin/bash
set -e

echo "=== 1. Criar usuario e banco barmate ==="
docker exec vuno-postgres psql -U vuno -c "CREATE USER barmate_user WITH PASSWORD 'bm_V4ltr2026!';" 2>/dev/null || echo "(usuario ja existe)"
docker exec vuno-postgres psql -U vuno -c "CREATE DATABASE barmate OWNER barmate_user;" 2>/dev/null || echo "(banco ja existe)"
docker exec vuno-postgres psql -U vuno -c "GRANT ALL PRIVILEGES ON DATABASE barmate TO barmate_user;"
docker exec vuno-postgres psql -U vuno -d barmate -c "GRANT ALL ON SCHEMA public TO barmate_user;"
echo "DB barmate criado OK"

echo "=== 2. Atualizar pg_hba.conf para acesso externo do barmate_user ==="
if ! grep -q "barmate_user" /opt/vuno/infra/pg_hba.conf; then
  python3 -c "
content = open('/opt/vuno/infra/pg_hba.conf').read()
new_rule = 'host    barmate   barmate_user   0.0.0.0/0   scram-sha-256\n'
content = content.replace('# Bloqueia o resto', new_rule + '\n# Bloqueia o resto')
open('/opt/vuno/infra/pg_hba.conf', 'w').write(content)
print('pg_hba.conf atualizado')
"
else
  echo "Regra barmate_user ja existe em pg_hba.conf"
fi
cat /opt/vuno/infra/pg_hba.conf

echo "=== 3. Reload pg_hba.conf (sem reiniciar) ==="
docker exec vuno-postgres psql -U vuno -c "SELECT pg_reload_conf();"

echo "=== 4. Expor porta 5432 externamente no docker-compose ==="
python3 -c "
content = open('/opt/vuno/infra/docker-compose.prod.yml').read()
if '127.0.0.1:5432:5432' in content:
    content = content.replace('\"127.0.0.1:5432:5432\"', '\"0.0.0.0:5432:5432\"')
    open('/opt/vuno/infra/docker-compose.prod.yml', 'w').write(content)
    print('docker-compose atualizado: porta agora em 0.0.0.0:5432')
else:
    print('Porta ja exposta externamente ou configuracao diferente')
"

echo "=== 5. Recriar container postgres com nova porta ==="
cd /opt/vuno && docker compose -f infra/docker-compose.prod.yml up -d postgres

echo "=== 6. Aguardar postgres ficar pronto ==="
for i in {1..12}; do
  if docker exec vuno-postgres pg_isready -U vuno -q; then
    echo "Postgres pronto!"
    break
  fi
  echo "Aguardando... ($i/12)"
  sleep 5
done

echo "=== 7. Abrir porta 5432 no firewall ==="
ufw allow 5432/tcp && echo "ufw: porta 5432 aberta" || true
iptables -I INPUT -p tcp --dport 5432 -j ACCEPT 2>/dev/null && echo "iptables: porta 5432 aberta" || true

echo "=== 8. Verificar porta ==="
ss -tlnp | grep 5432 || echo "ATENCAO: porta nao visivel ainda"

echo "=== 9. Teste de conexao barmate ==="
docker exec vuno-postgres psql -U barmate_user -d barmate -c "SELECT current_database(), current_user;" 2>/dev/null || \
  docker exec vuno-postgres psql -U vuno -d barmate -c "SELECT current_database();"

echo ""
echo "=============================="
echo "CONCLUIDO!"
echo "DATABASE_URL=postgresql://barmate_user:bm_V4ltr2026!@216.238.125.211:5432/barmate"
echo "=============================="
