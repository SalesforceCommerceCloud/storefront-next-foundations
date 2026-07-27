import { Writable } from "stream";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

//#region src/mrt/streamingHandler.d.ts

type AsyncHandlerFunction = (event: APIGatewayProxyEvent, context: Context) => Promise<void>;
type BuildHandler = (responseStream: Writable) => AsyncHandlerFunction;
declare const buildHandler: BuildHandler;
//#endregion
export { buildHandler };
//# sourceMappingURL=streamingHandler.d.ts.map