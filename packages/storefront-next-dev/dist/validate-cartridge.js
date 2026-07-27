import path from "path";
import { glob } from "glob";
import { MetaDefinitionDetectionError, validateMetaDefinitionFile } from "@salesforce/b2c-tooling-sdk/operations/content";

//#region src/cartridge-services/validate-cartridge.ts
/**
* Validate all Page Designer metadata JSON files in a directory.
*
* Globs for `**\/*.json` in `metadataDir`, validates each file against
* the appropriate metadefinition schema, and returns a summary.
*
* Files whose schema type cannot be detected are skipped and reported
* in `skippedFiles`.
*/
async function validateCartridgeMetadata(metadataDir) {
	const filePaths = await glob("**/*.json", {
		cwd: metadataDir,
		absolute: true,
		nodir: true
	});
	const results = [];
	const skippedFiles = [];
	for (const filePath of filePaths) try {
		const result = validateMetaDefinitionFile(filePath);
		results.push(result);
	} catch (error) {
		if (error instanceof MetaDefinitionDetectionError) {
			skippedFiles.push(path.relative(metadataDir, filePath));
			continue;
		}
		throw error;
	}
	const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
	const validFiles = results.filter((r) => r.valid).length;
	return {
		results,
		totalFiles: results.length,
		validFiles,
		totalErrors,
		skippedFiles
	};
}

//#endregion
export { validateCartridgeMetadata as t };