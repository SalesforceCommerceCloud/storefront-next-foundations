//#region src/design/registry/registry.ts
/**
* Framework-agnostic ComponentRegistry manages component loading with static registration.
*
* Features:
* - Framework agnostic core with adapter pattern
* - Lazy loading via framework adapters for code splitting
* - Static component registration via build plugins (no dynamic discovery)
* - Design mode decoration via framework adapters
* - Request deduplication for concurrent component loads
* - Component metadata handled via API (not stored in registry)
*
* @template TProps - Component props type
*
* @example
* ```tsx
* const registry = new ComponentRegistry({
*   adapter: new ReactAdapter(),
*   designDecorator: createDesignDecorator,
* });
*
* // Components are pre-registered via static registry plugin
* // Get a component
* const Hero = registry.getComponent('hero');
*
* // Preload for SSR
* await registry.preload('hero');
* ```
*/
var ComponentRegistry = class {
	registry = /* @__PURE__ */ new Map();
	pending = /* @__PURE__ */ new Map();
	cancelled = /* @__PURE__ */ new Set();
	adapter;
	constructor({ adapter }) {
		this.adapter = adapter;
	}
	/**
	* Registers a component in the registry with the specified id.
	* If a component with the same id already exists, it will be overwritten.
	*/
	registerComponent(id, component) {
		const prev = this.registry.get(id) ?? {
			id,
			raw: null
		};
		this.registry.set(id, {
			...prev,
			id,
			raw: component
		});
	}
	/**
	* Registers a dynamic importer for a component id. Useful if you don't want to rely on scanning.
	*/
	registerImporter(id, importer, loaderNames) {
		const prev = this.registry.get(id) ?? {
			id,
			raw: null
		};
		this.registry.set(id, {
			...prev,
			id,
			import: importer,
			loaderNames
		});
	}
	/**
	* Retrieves a component by id. Returns a framework-specific component type.
	* In lazy loading scenarios, this will be a lazy component if the component
	* is discovered via dynamic import. In design mode, the returned component
	* is decorated via `designDecorator`.
	*/
	getComponent(id) {
		const e = this.ensureLocalEntry(id);
		if (!e) return null;
		const comp = e.raw ?? e.lazy ?? null;
		if (!comp) return null;
		return this.adapter.decorateComponent(comp);
	}
	/**
	* Preload the JS chunk for a component id (use in route loaders/SSR to avoid waterfalls).
	*
	* This method ensures the component module is loaded and cached. Concurrent calls
	* for the same component ID are automatically deduplicated via the pending map
	* in ensureDiscovered().
	*
	* @throws Error if the component cannot be discovered
	*/
	async preload(id) {
		const e = await this.ensureDiscovered(id);
		if (e?.lazy || e?.raw) return;
		throw new Error(`Component "${id}" could not be discovered (no importer, no raw/lazy).`);
	}
	/** Get loader function names for external invocation. */
	getLoaderNames(id) {
		return this.registry.get(id)?.loaderNames;
	}
	hasLoaders(id) {
		return Object.values(this.registry.get(id)?.loaderNames || {}).filter(Boolean).length > 0;
	}
	/**
	* Call a loader function for a component externally.
	*
	* @param id - Component ID
	* @param loaderArgs - Arguments to pass to the loader function
	* @param loaderType - Type of loader to call ('loader' or 'clientLoader')
	* @returns Promise resolving to the loader result
	*/
	async callLoader(id, loaderArgs, loaderType = "loader") {
		const loaderName = this.getLoaderNames(id)?.[loaderType];
		if (!loaderName) return Promise.resolve(void 0);
		const entry = this.registry.get(id);
		if (!entry?.import) throw new Error(`No importer found for component: ${id}`);
		try {
			const loaderFunction = (await entry.import())[loaderName];
			if (typeof loaderFunction !== "function") return;
			return await loaderFunction(loaderArgs);
		} catch (error) {
			throw new Error(`Failed to call ${loaderType} for component '${id}': ${error.message}`);
		}
	}
	/** Get fallback component if available. */
	getFallback(id) {
		return this.registry.get(id)?.fallback;
	}
	/**
	* Returns all registered component IDs.
	* Useful for debugging and introspection.
	*/
	getRegisteredIds() {
		return Array.from(this.registry.keys());
	}
	/**
	* Checks if a component is registered.
	*/
	has(id) {
		return this.registry.has(id);
	}
	/**
	* Clears all cached components and cancels pending discoveries.
	* In-flight async operations will be cancelled and their promises will reject.
	* Useful for testing or hot module replacement.
	*/
	clear() {
		for (const id of this.pending.keys()) this.cancelled.add(id);
		this.registry.clear();
		this.pending.clear();
	}
	ensureLocalEntry(id) {
		const cached = this.registry.get(id);
		if (cached) return cached;
		const placeholder = {
			id,
			raw: null
		};
		this.registry.set(id, placeholder);
		this.ensureDiscovered(id);
		return placeholder;
	}
	/**
	* Ensures a component is discovered and cached.
	* Only returns early if a raw (eagerly loaded) component exists.
	* Otherwise, attempts to discover via registered importer.
	*
	* @throws Error if the discovery is cancelled via clear()
	*/
	async ensureDiscovered(id) {
		const existing = this.registry.get(id);
		if (existing?.raw) return existing;
		if (this.pending.has(id)) return this.pending.get(id) ?? null;
		const work = (async () => {
			if (this.cancelled.has(id)) {
				this.cancelled.delete(id);
				throw new Error(`Component discovery for "${id}" was cancelled`);
			}
			let entry = this.registry.get(id) ?? {
				id,
				raw: null
			};
			if (entry.import) {
				entry = await this.buildFromImporter(id, entry.import);
				if (this.cancelled.has(id)) {
					this.cancelled.delete(id);
					throw new Error(`Component discovery for "${id}" was cancelled`);
				}
				this.registry.set(id, entry);
				return entry;
			}
			return this.registry.get(id) ?? null;
		})();
		this.pending.set(id, work);
		try {
			const done = await work;
			this.pending.delete(id);
			return done;
		} catch (error) {
			this.pending.delete(id);
			throw error;
		}
	}
	async buildFromImporter(id, importer) {
		const mod = await importer();
		return this.buildFromLoadedModule(id, importer, mod);
	}
	buildFromLoadedModule(id, importer, mod) {
		return {
			id,
			raw: null,
			lazy: this.adapter.createLazyComponent(importer),
			import: importer,
			fallback: mod.fallback
		};
	}
};

//#endregion
export { ComponentRegistry };
//# sourceMappingURL=design.js.map