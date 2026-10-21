-- Banco separado para os testes de integração (npm test).
CREATE DATABASE IF NOT EXISTS fast_street_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL ON fast_street_test.* TO 'fast_street'@'%';
