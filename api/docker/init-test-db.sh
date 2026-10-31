#!/bin/bash
# Roda uma única vez, quando o contêiner cria o banco (docker-entrypoint-initdb.d).
# Cria o banco dos testes de integração (npm test) e dá acesso ao usuário do .env.
set -euo pipefail

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_test\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL ON \`${MYSQL_DATABASE}_test\`.* TO '${MYSQL_USER}'@'%';
SQL
