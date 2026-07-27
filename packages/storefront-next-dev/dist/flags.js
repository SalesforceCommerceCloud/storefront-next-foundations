import { Flags } from "@oclif/core";

//#region src/flags.ts
const PROJECT_DIRECTORY_FLAG = "project-directory";
const PROJECT_DIRECTORY_CHAR = "d";
const commonFlags = { [PROJECT_DIRECTORY_FLAG]: Flags.string({
	char: PROJECT_DIRECTORY_CHAR,
	description: "Project directory",
	default: process.cwd()
}) };

//#endregion
export { PROJECT_DIRECTORY_FLAG as n, commonFlags as r, PROJECT_DIRECTORY_CHAR as t };