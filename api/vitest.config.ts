import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    // Os testes de integração compartilham o mesmo banco: execução sequencial.
    fileParallelism: false,
  },
});
