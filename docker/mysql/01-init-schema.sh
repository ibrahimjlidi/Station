#!/bin/sh
set -eu

for migration in /station-migrations/*/migration.sql; do
  [ -f "$migration" ] || continue
  echo "Applying Station migration: $(basename "$(dirname "$migration")")"
  mysql --protocol=socket --user=root --password="$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < "$migration"
done

echo "Applying Station demo seed data"
mysql --protocol=socket --user=root --password="$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < /station-seed.sql
