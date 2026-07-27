import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        coverage: {
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                'src/**/*config.d.ts',
                // Exclude the hybrid proxy plugin — its configureServer middleware requires
                // a running Vite server and is not unit-testable. Helper functions
                // (shouldSkipProxy, rewriteCookieForLocalhost) are tested in hybridProxy.test.ts.
                'src/plugins/hybridProxy.ts',
                // Exclude CLI/deployment files that don't have Vitest tests
                'src/bundle.ts',
                'src/cloud-api.ts',
                'src/config.ts',
                'src/utils.ts',
                'src/types.ts',
                'src/cli.ts',
                'dist/**',
                'node_modules/**',
            ],
            thresholds: {
                lines: 90,
                functions: 90,
                branches: 88,
                statements: 90,
            },
        },
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
        ],
    },
});
