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
import type { APIGatewayProxyEvent, APIGatewayProxyHandler, Callback, Context } from 'aws-lambda';
import serverlessExpress from '@codegenie/serverless-express';
import type { ServerBuild } from 'react-router';
import { createServer } from '../server/index';
import { mergeHeadersIntoMultiValueHeaders } from './utils';

// cache the server instance to avoid creating a new one for each request
let handler: APIGatewayProxyHandler | null = null;

/**
 * Default build loader that imports the server build from MRT.
 * This is separated to allow testing with a mock build loader.
 */
const defaultBuildLoader = async (): Promise<ServerBuild> => {
    // @ts-expect-error: This file isn't available during build time, but will be on MRT.
    const { default: build } = (await import('./server/index.js')) as unknown as {
        default: ServerBuild;
    };
    return build;
};

/**
 * Creates a handler using the provided build loader.
 * Exported for testing purposes.
 */
export const createHandler = async (
    buildLoader: () => Promise<ServerBuild> = defaultBuildLoader
): Promise<APIGatewayProxyHandler> => {
    const build = await buildLoader();
    const app = await createServer({
        mode: 'production',
        build,
        streaming: false,
    });
    return serverlessExpress({ app, resolutionMode: 'CALLBACK' });
};

const getHandler = async (): Promise<typeof handler> => {
    if (!handler) {
        handler = await createHandler();
    }
    return handler;
};

/**
 * Invokes the handler with proper error handling.
 * Exported for testing purposes.
 */
export const invokeHandler = (
    handlerPromise: Promise<APIGatewayProxyHandler | null>,
    event: APIGatewayProxyEvent,
    context: Context,
    callback: Callback
): void => {
    void handlerPromise
        .then((handlerInstance) => {
            if (!handlerInstance) {
                callback(new Error('Serverless Express handler is not available'));
                return;
            }
            void handlerInstance(event, context, callback);
        })
        .catch((error) => {
            callback(error);
        });
};

// Important Constraints:
// - The export must be named "get" to be compatible with Managed Runtime
// - The handler must follow the AWS Lambda "callback" signature ("async" lambda is not supported by MRT)
export const get: APIGatewayProxyHandler = (event, context, callback) => {
    // Important: It must be set to false to avoid the response
    // being delayed until the event loop is empty
    context.callbackWaitsForEmptyEventLoop = false;

    // Merge headers to ensure all headers from event.headers are available
    // This fixes an issue where @codegenie/serverless-express only reads multiValueHeaders
    const mergedEvent = mergeHeadersIntoMultiValueHeaders(event);

    invokeHandler(getHandler(), mergedEvent, context, callback);
};
