import { t as logger } from "./logger.js";
import path from "path";
import fs from "fs-extra";
import prompts from "prompts";

//#region src/utils/local-dev-setup.ts
/**
* Prepares a cloned template for standalone use outside the monorepo.
* Prompts user for local package paths and replaces workspace:* dependencies with file: references.
*/
async function prepareForLocalDev(options) {
	const { projectDirectory, sourcePackagesDir, defaults } = options;
	const packageJsonPath = path.join(projectDirectory, "package.json");
	if (!fs.existsSync(packageJsonPath)) throw new Error(`package.json not found in ${projectDirectory}`);
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const workspaceDeps = [];
	for (const depType of [
		"dependencies",
		"devDependencies",
		"peerDependencies"
	]) {
		const deps = packageJson[depType];
		if (!deps) continue;
		for (const [pkg, version] of Object.entries(deps)) if (typeof version === "string" && version.startsWith("workspace:")) workspaceDeps.push({
			pkg,
			depType
		});
	}
	if (workspaceDeps.length === 0) {
		logger.info("No workspace:* dependencies found. Project is ready for standalone use.");
		return;
	}
	logger.info("\n🔗 Found workspace dependencies that need to be linked to local packages:\n");
	for (const { pkg } of workspaceDeps) logger.info(`   • ${pkg}`);
	logger.info("");
	const defaultPaths = {};
	if (sourcePackagesDir) {
		defaultPaths["@salesforce/storefront-next-dev"] = path.resolve(sourcePackagesDir, "storefront-next-dev");
		defaultPaths["@salesforce/storefront-next-runtime"] = path.resolve(sourcePackagesDir, "storefront-next-runtime");
	}
	const resolvedPaths = {};
	for (const { pkg } of workspaceDeps) {
		if (resolvedPaths[pkg]) continue;
		const defaultPath = defaultPaths[pkg] || "";
		const defaultExists = defaultPath && fs.existsSync(defaultPath);
		let localPath;
		if (defaults && defaultExists) localPath = defaultPath;
		else if (defaults) logger.warn(`Skipping ${pkg} - default path not found: ${defaultPath}`);
		else ({localPath} = await prompts({
			type: "text",
			name: "localPath",
			message: `📦 Path to ${pkg}:`,
			initial: defaultExists ? defaultPath : "",
			validate: (value) => {
				if (!value) return "Path is required";
				if (!fs.existsSync(value)) return `Directory not found: ${value}`;
				if (!fs.existsSync(path.join(value, "package.json"))) return `No package.json found in: ${value}`;
				return true;
			}
		}));
		if (!localPath) {
			logger.warn(`Skipping ${pkg} - no path provided`);
			continue;
		}
		resolvedPaths[pkg] = localPath;
	}
	let modified = false;
	for (const depType of [
		"dependencies",
		"devDependencies",
		"peerDependencies"
	]) {
		const deps = packageJson[depType];
		if (!deps) continue;
		for (const [pkg, version] of Object.entries(deps)) if (typeof version === "string" && version.startsWith("workspace:")) {
			const localPath = resolvedPaths[pkg];
			if (localPath) {
				const fileRef = `file:${localPath}`;
				logger.info(`Linked ${pkg} → ${fileRef}`);
				deps[pkg] = fileRef;
				modified = true;
			} else {
				logger.warn(`Removing unresolved workspace dependency: ${pkg}`);
				delete deps[pkg];
				modified = true;
			}
		}
	}
	if (packageJson.volta?.extends) {
		delete packageJson.volta.extends;
		if (Object.keys(packageJson.volta).length === 0) delete packageJson.volta;
		modified = true;
	}
	if (modified) {
		fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 4)}\n`);
		logger.info("package.json updated with local package links");
		patchViteConfigForLinkedPackages(projectDirectory, Object.keys(resolvedPaths));
	}
}
/**
* Patches vite.config.ts to fix "You must render this element inside a <HydratedRouter>" errors
* that occur when using file: linked packages.
*
* The fix adds:
* 1. resolve.dedupe for react, react-dom, react-router (helps with non-linked duplicates)
* 2. ssr.noExternal for file-linked packages (key fix - bundles them so they use host's dependencies)
*
* When packages are in ssr.noExternal, Vite bundles them during SSR instead of externalizing.
* During bundling, their imports resolve through the host project's node_modules,
* ensuring all code uses the same react-router instance with the same context.
*/
function patchViteConfigForLinkedPackages(projectDirectory, linkedPackages) {
	const viteConfigPath = path.join(projectDirectory, "vite.config.ts");
	if (!fs.existsSync(viteConfigPath)) {
		logger.warn("vite.config.ts not found, skipping patch for file-linked packages");
		return;
	}
	if (linkedPackages.length === 0) return;
	let viteConfig = fs.readFileSync(viteConfigPath, "utf8");
	let modified = false;
	if (!viteConfig.includes("dedupe:")) {
		const resolveMatch = viteConfig.match(/resolve:\s*\{/);
		if (resolveMatch && resolveMatch.index !== void 0) {
			const insertPos = resolveMatch.index + resolveMatch[0].length;
			viteConfig = viteConfig.slice(0, insertPos) + `
            // Deduplicates packages to prevent context issues with file-linked packages
            dedupe: ['react', 'react-dom', 'react-router'],` + viteConfig.slice(insertPos);
			modified = true;
		}
	}
	const packageList = linkedPackages.map((p) => `'${p}'`).join(", ");
	if (/ssr:\s*\{[^}]*noExternal:/.test(viteConfig)) {
		const noExternalArrayRegex = /noExternal:\s*\[([^\]]*)\]/;
		const noExternalMatch = viteConfig.match(noExternalArrayRegex);
		if (noExternalMatch) {
			const existingPackages = noExternalMatch[1];
			const packagesToAdd = linkedPackages.filter((p) => !existingPackages.includes(p));
			if (packagesToAdd.length > 0) {
				const newPackageList = packagesToAdd.map((p) => `'${p}'`).join(", ");
				const newArray = existingPackages.trim() ? `[${existingPackages.trim()}, ${newPackageList}]` : `[${newPackageList}]`;
				viteConfig = viteConfig.replace(noExternalArrayRegex, `noExternal: ${newArray}`);
				modified = true;
			}
		}
	} else {
		const ssrMatch = viteConfig.match(/ssr:\s*\{/);
		if (ssrMatch && ssrMatch.index !== void 0) {
			const insertPos = ssrMatch.index + ssrMatch[0].length;
			const noExternalBlock = `
            // Bundle file-linked packages so they use host project's dependencies
            // This prevents "You must render this element inside a <HydratedRouter>" errors
            noExternal: [${packageList}],`;
			viteConfig = viteConfig.slice(0, insertPos) + noExternalBlock + viteConfig.slice(insertPos);
			modified = true;
		} else {
			const returnMatch = viteConfig.match(/return\s*\{/);
			if (returnMatch && returnMatch.index !== void 0) {
				const insertPos = returnMatch.index + returnMatch[0].length;
				const ssrBlock = `
        // SSR config for file-linked packages
        ssr: {
            // Bundle file-linked packages so they use host project's dependencies
            // This prevents "You must render this element inside a <HydratedRouter>" errors
            noExternal: [${packageList}],
            target: 'node',
        },`;
				viteConfig = viteConfig.slice(0, insertPos) + ssrBlock + viteConfig.slice(insertPos);
				modified = true;
			}
		}
	}
	if (modified) {
		fs.writeFileSync(viteConfigPath, viteConfig);
		logger.info("vite.config.ts patched for file-linked packages (ssr.noExternal + resolve.dedupe)");
	} else logger.info("vite.config.ts already configured for file-linked packages");
}

//#endregion
export { prepareForLocalDev as t };