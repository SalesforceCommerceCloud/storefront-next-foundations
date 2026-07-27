#!/usr/bin/env node
/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Allure Report Runner
 *
 * Wrapper script for Allure report generation and serving that ensures proper
 * error handling for CI/CD pipelines.
 *
 * **Why we check for Java ourselves:**
 * The Allure command-line tool itself checks for Java installation and will
 * display an error message if Java is not available. However, if Java is not
 * installed, Allure does not exit with a non-zero error code. This is problematic
 * for CI/CD pipelines, which rely on exit codes to detect failures. This script
 * performs Java detection upfront and exits with a proper non-zero status code
 * if Java is missing, ensuring CI/CD pipelines can correctly detect and handle
 * the failure.
 */

import { spawn } from 'node:child_process';
import { log } from '../../utils/logger';

/**
 * Check if Java is installed and available.
 *
 * **Note:** We perform this check ourselves because while Allure checks for Java
 * and displays an error message if it's missing, it does not exit with a non-zero
 * error code. This wrapper ensures proper exit codes for CI/CD pipelines.
 *
 * @returns Promise that resolves to true if Java is available, false otherwise
 */
async function checkJavaInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
        const javaProcess = spawn('java', ['-version'], {
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let hasOutput = false;

        javaProcess.stdout?.on('data', () => {
            hasOutput = true;
        });

        javaProcess.stderr?.on('data', () => {
            hasOutput = true;
        });

        javaProcess.on('close', (code) => {
            // Java -version typically exits with 0, but stderr contains version info
            // If we got any output, Java is installed
            resolve(code === 0 || hasOutput);
        });

        javaProcess.on('error', () => {
            // If spawn fails, Java is not installed
            resolve(false);
        });
    });
}

/**
 * Display error message when Java is not installed.
 */
function displayJavaError(action: 'view' | 'generate'): void {
    log.error('Java is not installed or not available in PATH');
    log.info('');
    log.info(`Allure requires Java to run. Please install Java to ${action} test reports.`);
    log.info('');
    log.info('The supported Java platform at Salesforce is: Azul Zulu Community (OpenJDK)');
    log.info('Find more information by visiting this Concierge page: http://sfdc.co/openjdk');
    log.info('');
    log.hint('After installing Java, ensure it is available in your PATH by running: java -version');
    process.exit(1);
}

/**
 * Run Allure serve command (interactive server).
 */
function runAllureServe(resultsPath: string): void {
    const allureProcess = spawn('allure', ['serve', resultsPath], {
        stdio: 'inherit',
    });

    allureProcess.on('exit', (code) => {
        process.exit(code || 0);
    });

    allureProcess.on('error', (error) => {
        log.error(`Failed to execute Allure: ${error.message}`);
        log.hint('Make sure Allure is installed: pnpm install');
        process.exit(1);
    });
}

/**
 * Run Allure generate command (static HTML generation).
 */
function runAllureGenerate(resultsPath: string, outputPath: string): void {
    const allureProcess = spawn('allure', ['generate', resultsPath, '-c', '-o', outputPath], {
        stdio: 'inherit',
    });

    allureProcess.on('exit', (code) => {
        if (code !== 0) {
            log.error(`Allure generation failed with exit code ${code}`);
            process.exit(code || 1);
        } else {
            log.success(`Allure report generated successfully at ${outputPath}`);
            process.exit(0);
        }
    });

    allureProcess.on('error', (error) => {
        log.error(`Failed to execute Allure: ${error.message}`);
        log.hint('Make sure Allure is installed: pnpm install');
        process.exit(1);
    });
}

/**
 * Main execution.
 *
 * Performs Java availability check before invoking Allure. This ensures that
 * if Java is missing, we exit with a non-zero status code (required for CI/CD),
 * rather than relying on Allure's behavior which may exit with code 0 even
 * when Java is unavailable.
 */
async function main(): Promise<void> {
    // Determine mode based on script name or command-line argument
    const isCiMode = process.argv[1]?.includes('ci-report-runner') || process.argv.includes('--ci');
    const mode = isCiMode ? 'generate' : 'serve';

    const resultsPath = './output/allure-results';
    const outputPath = './output/allure-html';

    log.step('Checking Java installation...');

    const javaInstalled = await checkJavaInstalled();

    if (!javaInstalled) {
        displayJavaError(mode === 'serve' ? 'view' : 'generate');
    }

    log.success('Java is installed');

    if (mode === 'serve') {
        log.step('Starting Allure server...');
        runAllureServe(resultsPath);
    } else {
        log.step('Generating Allure HTML report...');
        runAllureGenerate(resultsPath, outputPath);
    }
}

// Run CLI
void main().catch((error) => {
    log.error(`Failed to run report command: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
