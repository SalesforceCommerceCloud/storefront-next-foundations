import { APIGatewayProxyEvent, APIGatewayProxyHandler, Callback, Context } from "aws-lambda";
import { ServerBuild } from "react-router";

//#region src/mrt/ssr.d.ts

/**
 * Creates a handler using the provided build loader.
 * Exported for testing purposes.
 */
declare const createHandler: (buildLoader?: () => Promise<ServerBuild>) => Promise<APIGatewayProxyHandler>;
/**
 * Invokes the handler with proper error handling.
 * Exported for testing purposes.
 */
declare const invokeHandler: (handlerPromise: Promise<APIGatewayProxyHandler | null>, event: APIGatewayProxyEvent, context: Context, callback: Callback) => void;
declare const get: APIGatewayProxyHandler;
//#endregion
export { createHandler, get, invokeHandler };
//# sourceMappingURL=ssr.d.ts.map