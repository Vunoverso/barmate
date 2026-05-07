#!/bin/bash
set -e

# Cria usuario e banco barmate
sudo -u postgres psql <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'barmate_user') THEN
    CREATE USER barmate_user WITH PASSWORD 'bm_V4ltr2026!';
  END IF;
END
$$;

SELECT 'CREATE DATABASE barmate' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'barmate')\gexec

GRANT ALL PRIVILEGES ON DATABASE barmate TO barmate_user;
\c barmate
GRANT ALL ON SCHEMA public TO barmate_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO barmate_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO barmate_user;
SQL

echo "DB_CRIADO_OK"

# Verifica se postgresql.conf permite conexoes externas
PG_CONF=$(sudo -u postgres psql -t -c "SHOW config_file;" | tr -d ' ')
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | tr -d ' ')

# Habilita listen_addresses = '*'
if grep -q "^#listen_addresses\|^listen_addresses = 'localhost'" "$PG_CONF"; then
  sudo sed -i "s/^#listen_addresses.*/listen_addresses = '*'/" "$PG_CONF"
  sudo sed -i "s/^listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
  echo "LISTEN_ADDRESSES_OK"
fi

# Adiciona regra pg_hba para conexoes externas com senha
if ! grep -q "barmate_user" "$PG_HBA"; then
  echo "host    barmate    barmate_user    0.0.0.0/0    scram-sha-256" | sudo tee -a "$PG_HBA"
  echo "PG_HBA_OK"
fi

# Reinicia postgres
sudo systemctl restart postgresql
echo "POSTGRESQL_RESTARTED"
