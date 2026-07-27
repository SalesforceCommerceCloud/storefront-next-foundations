//#region src/events/events.ts
/**
* Type-safe event creation function
*
* This generic function allows creating any event type under AnalyticsEvent
* with full type safety. The event type is inferred from the string literal
* passed as the first parameter, and TypeScript will enforce the correct
* data properties for that specific event type.
*
* @example
* ```typescript
* const viewPageEvent = createEvent('view_page', { path: '/products', payload });
* const viewProductEvent = createEvent('view_product', { product, payload });
* ```
*/
function createEvent(eventType, data) {
	return {
		eventType,
		...data
	};
}
/**
* Send a view page event to the event mediator
*
* This wrapper function is used in the automated page view event tracking client middleware.
* This function exists to support build-time checks and type safety.
*
* @param event - The view page event to send
* @param eventMediator - The event mediator to send the event to
*/
function sendViewPageEvent(event, eventMediator, siteInfo, consentPreferences) {
	eventMediator.track(event, siteInfo, consentPreferences);
}

//#endregion
//#region src/events/mediator.ts
let mediatorInstance;
/**
* Create an event mediator instance
*
* Creates a new EventMediator that processes events through the provided adapters.
* The mediator uses the getAdapters function on each track() invocation to ensure
* it always uses the latest adapters from the adapter registry.
*
* @param getAdapters - Function that returns the current array of engagement adapters.
*                      This function is called on each track() invocation to ensure
*                      the mediator always uses the latest adapters from the adapter registry.
* @returns EventMediator instance
*/
function createEventMediator(getAdapters) {
	return { track: (event, siteInfo, consentPreferences) => {
		processEventWithAdapters(event, getAdapters, siteInfo, consentPreferences).catch((error) => {
			console.error("Analytics tracking failed:", error);
		});
	} };
}
/**
* Get the event mediator singleton instance
*
* Returns the singleton EventMediator instance, creating it if it doesn't exist.
*
* @param getAdapters - Function that returns the current array of engagement adapters.
* @returns EventMediator instance (singleton) or undefined if not on client side
*/
function getEventMediator(getAdapters) {
	if (mediatorInstance) return mediatorInstance;
	if (typeof window === "undefined") return;
	mediatorInstance = createEventMediator(getAdapters);
	return mediatorInstance;
}
/**
* Reset the event mediator singleton (for testing only)
*
* This function clears the singleton instance, allowing tests to create a fresh mediator.
*/
function resetEventMediator() {
	mediatorInstance = void 0;
}
/**
* Process an event with all registered adapters
*
* @param event - The analytics event to process
* @param getAdapters - Function that returns the current array of event adapters
*/
async function processEventWithAdapters(event, getAdapters, siteInfo, consentPreferences) {
	const eventAdapters = getAdapters();
	if (eventAdapters.length === 0) {
		console.warn(`There are no active adapters to send the event to`);
		return;
	}
	const promises = eventAdapters.map(async (adapter) => {
		try {
			if (typeof adapter.sendEvent === "function") await adapter.sendEvent(event, siteInfo, consentPreferences);
			else console.warn(`Adapter ${adapter.name} does not implement sendEvent`);
		} catch (error) {
			console.error(`Failed to send event to ${adapter.name}:`, error);
		}
	});
	await Promise.allSettled(promises);
}

//#endregion
export { createEvent, getEventMediator, resetEventMediator, sendViewPageEvent };
//# sourceMappingURL=events.js.map