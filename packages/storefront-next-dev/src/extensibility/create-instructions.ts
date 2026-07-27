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
 * This script is used to create a LLM instruction file for a given extension.
 * @author kzheng
 * @since 260
 */
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { logger } from '../logger';

// The directories to skip when searching for files to merge
const SKIP_DIRS = ['node_modules', 'dist', 'build'];
// The templates for the instructions
const INSTALL_INSTRUCTIONS_TEMPLATE = 'install-instructions.mdc.hbs';
const UNINSTALL_INSTRUCTIONS_TEMPLATE = 'uninstall-instructions.mdc.hbs';

/**
 * Context object for generating extension instructions
 */
interface ExtensionContext {
    extensionName: string;
    pwaRepo: string;
    branch: string;
    markerValue: string;
    mergeFiles: string[];
    newFiles: string[];
    copy: Array<{
        src: string;
        dest: string;
        isDirectory: boolean;
    }>;
    dependencies: Array<{
        key: string;
        name: string;
    }>;
}

/**
 * Build the context for the instructions template.
 */
export function getContext(
    projectRoot: string,
    markerValue: string,
    pwaRepo = 'https://github.com/SalesforceCommerceCloud/storefront-next-template.git',
    branch = 'main',
    filesToCopy: string[] = [],
    extensionConfigPath: string = ''
): ExtensionContext {
    const extensionConfig = JSON.parse(fs.readFileSync(extensionConfigPath, 'utf8'));
    if (!extensionConfig.extensions[markerValue]) {
        throw new Error(`Extension ${markerValue} not found in extension config`);
    }
    filesToCopy.forEach((file) => {
        const fullPath = path.join(projectRoot, file);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File or directory ${fullPath} not found`);
        }
    });
    // find all marked files
    const { mergeFiles, newFiles } = findMarkedFiles(projectRoot, markerValue);
    // add new files (marked with @sfdc-extension-file) to filesToCopy
    filesToCopy.push(...newFiles);

    // Build dependencies array with key and name
    const extensionMeta = extensionConfig.extensions[markerValue];
    const dependencyKeys: string[] = extensionMeta.dependencies || [];
    const dependencies = dependencyKeys.map((depKey: string) => ({
        key: depKey,
        name: extensionConfig.extensions[depKey]?.name || depKey,
    }));

    const context = {
        extensionName: extensionMeta.name,
        pwaRepo,
        branch,
        markerValue,
        mergeFiles,
        newFiles,
        copy: getFilesToCopyContext(projectRoot, filesToCopy),
        dependencies,
    };
    return context;
}

/**
 * Get the context for the files to copy.
 */
export const getFilesToCopyContext = (projectRoot: string, filesToCopy: string[]) => {
    filesToCopy.forEach((file) => {
        const fullPath = path.join(projectRoot, file);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`File or directory ${fullPath} not found`);
        }
    });
    return filesToCopy.map((file) => ({
        src: file,
        dest: file,
        isDirectory: fs.statSync(path.join(projectRoot, file)).isDirectory(),
    }));
};

/**
 * Find all the files that contain the marker value in the project folder.
 * @param {string} markerValue
 * @returns {string[]} The files that are marked with the marker value
 */
export const findMarkedFiles = (projectRoot: string, markerValue: string) => {
    const fileTypes = ['jsx', 'tsx', 'ts', 'js'];
    const mergeFiles: string[] = [];
    const newFiles: string[] = [];
    const lineRegex = new RegExp(`@sfdc-extension-line\\s+${markerValue}`);
    const blockStartRegex = new RegExp(`@sfdc-extension-block-start\\s+${markerValue}`);
    const blockEndRegex = new RegExp(`@sfdc-extension-block-end\\s+${markerValue}`);
    const fileRegex = new RegExp(`@sfdc-extension-file\\s+${markerValue}`);
    const searchFiles = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !SKIP_DIRS.includes(entry.name)) {
                searchFiles(fullPath);
            } else if (entry.isFile() && fileTypes.some((ext) => fullPath.endsWith(`.${ext}`))) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (lineRegex.test(content) || blockStartRegex.test(content) || blockEndRegex.test(content)) {
                    mergeFiles.push(path.relative(projectRoot, fullPath));
                } else if (fileRegex.test(content)) {
                    newFiles.push(path.relative(projectRoot, fullPath));
                }
            }
        }
    };
    searchFiles(projectRoot);
    logger.info(`Found ${mergeFiles.length} files to merge for marker value ${markerValue}:`);
    logger.info(mergeFiles.join('\n'));
    logger.info(`Found ${newFiles.length} files to add for marker value ${markerValue}:`);
    logger.info(newFiles.join('\n'));
    return { mergeFiles, newFiles };
};

/**
 * Generate the MDC instructions file based on user inputs.
 */
export const generateInstructions = (
    projectRoot: string,
    markerValue: string,
    outputDir: string,
    pwaRepo?: string,
    branch?: string,
    filesToCopy?: string[],
    extensionConfig: string = '',
    templateDir: string = ''
) => {
    const context = getContext(projectRoot, markerValue, pwaRepo, branch, filesToCopy, extensionConfig);
    const instructionsDir = path.join(projectRoot, outputDir || 'instructions');
    if (!fs.existsSync(instructionsDir)) {
        fs.mkdirSync(instructionsDir);
    }
    genertaeAndWriteInstructions(
        path.join(templateDir, INSTALL_INSTRUCTIONS_TEMPLATE),
        context,
        path.join(instructionsDir, `install-${context.extensionName.toLowerCase().replace(/ /g, '-')}.mdc`)
    );
    genertaeAndWriteInstructions(
        path.join(templateDir, UNINSTALL_INSTRUCTIONS_TEMPLATE),
        context,
        path.join(instructionsDir, `uninstall-${context.extensionName.toLowerCase().replace(/ /g, '-')}.mdc`)
    );
};

/**
 * Generate the MDC instructions file based on the template file and context.
 */
export const genertaeAndWriteInstructions = (templateFile: string, context: ExtensionContext, outputFile: string) => {
    const templateContent = fs.readFileSync(templateFile, 'utf8');
    const template = Handlebars.compile(templateContent);
    const mdcContent = template(context);
    fs.writeFileSync(outputFile, mdcContent, 'utf8');
    logger.info(`MDC instructions written to ${outputFile}`);
};
