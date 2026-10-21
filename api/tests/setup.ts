// Carregado antes de cada arquivo de teste, antes de qualquer import de src/.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= process.env.TEST_DATABASE_URL ?? 'mysql://fast_street:fast_street@localhost:3306/fast_street_test';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-123';
process.env.PUBLIC_API_URL ??= 'http://localhost:3333';
