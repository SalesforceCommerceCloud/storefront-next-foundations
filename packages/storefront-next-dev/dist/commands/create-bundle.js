import { t as logger } from "../logger.js";
import "../logger2.js";
import { i as getMrtConfig, n as getDefaultBuildDir, r as getDefaultMessage } from "../utils.js";
import { a as buildMrtConfig } from "../config.js";
import { r as commonFlags } from "../flags.js";
import { t as createBundle } from "../bundle.js";
import { Command, Flags } from "@oclif/core";
import path from "path";
import fs from "fs-extra";
import zlib from "zlib";
import { promisify } from "util";

//#region src/lib/create-bundle.ts
const gzip = promisify(zlib.gzip);
/**
* Create a bundle and save it to disk without pushing to Managed Runtime
*/
async function createBundleCommand(options) {
	if (!fs.existsSync(options.projectDirectory)) throw new Error(`Project directory "${options.projectDirectory}" does not exist!`);
	const mrtConfig = getMrtConfig(options.projectDirectory);
	const projectSlug = options.projectSlug ?? mrtConfig.defaultMrtProject;
	if (!projectSlug || projectSlug.trim() === "") throw new Error("Project slug could not be determined from CLI, .env, or package.json");
	const buildDirectory = options.buildDirectory ?? getDefaultBuildDir(options.projectDirectory);
	if (!fs.existsSync(buildDirectory)) throw new Error(`Build directory "${buildDirectory}" does not exist!`);
	const outputDirectory = options.outputDirectory ?? path.join(options.projectDirectory, ".bundle");
	await fs.ensureDir(outputDirectory);
	const message = options.message ?? getDefaultMessage(options.projectDirectory);
	const config = await buildMrtConfig(buildDirectory, options.projectDirectory);
	logger.info(`Creating bundle for project: ${projectSlug}`);
	logger.info(`Build directory: ${buildDirectory}`);
	logger.info(`Output directory: ${outputDirectory}`);
	const bundle = await createBundle({
		message,
		ssr_parameters: config.ssrParameters,
		ssr_only: config.ssrOnly,
		ssr_shared: config.ssrShared,
		buildDirectory,
		projectDirectory: options.projectDirectory,
		projectSlug
	});
	const bundleTgzPath = path.join(outputDirectory, "bundle.tgz");
	const bundleJsonPath = path.join(outputDirectory, "bundle.json");
	const bundleData = Buffer.from(bundle.data, "base64");
	const compressedData = await gzip(bundleData);
	await fs.writeFile(bundleTgzPath, compressedData);
	const bundleMetadata = {
		message: bundle.message,
		encoding: bundle.encoding,
		ssr_parameters: bundle.ssr_parameters,
		ssr_only: bundle.ssr_only,
		ssr_shared: bundle.ssr_shared,
		bundle_metadata: bundle.bundle_metadata,
		data_size: bundleData.length
	};
	await fs.writeJson(bundleJsonPath, bundleMetadata, { spaces: 2 });
	logger.info(`Bundle created successfully!`);
	logger.info(`Bundle tgz file: ${bundleTgzPath}`);
	logger.info(`Bundle metadata: ${bundleJsonPath}`);
	logger.info(`Uncompressed size: ${(bundleData.length / 1024 / 1024).toFixed(2)} MB`);
	logger.info(`Compressed size: ${(compressedData.length / 1024 / 1024).toFixed(2)} MB`);
}

//#endregion
//#region src/commands/create-bundle.ts
/**
* Create bundle command - creates an MRT bundle without pushing.
*/
var Bundle = class Bundle extends Command {
	static description = "Create an MRT bundle from the build directory without pushing";
	static examples = [
		"<%= config.bin %> <%= command.id %>",
		"<%= config.bin %> <%= command.id %> -d ./my-project",
		"<%= config.bin %> <%= command.id %> -o ./my-bundle"
	];
	static flags = {
		...commonFlags,
		"build-directory": Flags.string({
			char: "b",
			description: "Build directory to bundle (default: auto-detected)"
		}),
		"output-directory": Flags.string({
			char: "o",
			description: "Output directory for bundle files (default: .bundle)"
		}),
		message: Flags.string({
			char: "m",
			description: "Bundle message (default: git branch:commit)"
		}),
		"project-slug": Flags.string({
			char: "s",
			description: "Project slug - the unique identifier for your project on Managed Runtime (default: from .env MRT_PROJECT or package.json name)"
		})
	};
	async run() {
		const { flags } = await this.parse(Bundle);
		await createBundleCommand({
			projectDirectory: flags["project-directory"],
			buildDirectory: flags["build-directory"],
			outputDirectory: flags["output-directory"],
			message: flags.message,
			projectSlug: flags["project-slug"]
		});
		this.log("Bundle created successfully!");
	}
};

//#endregion
export { Bundle as default };