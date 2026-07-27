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
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { Writable } from 'stream';
import type { Express } from 'express';
import type { ServerBuild } from 'react-router';
import { createServer } from '../server/index';
import { createStreamingLambdaAdapter } from './create-lambda-adapter';

// type AsyncStreamingHandlerFunction = (event: APIGatewayProxyEvent, responseStream: Writable, context: Context) => Promise<void>;

type AsyncHandlerFunction = (event: APIGatewayProxyEvent, context: Context) => Promise<void>;

type BuildHandler = (responseStream: Writable) => AsyncHandlerFunction;

const createBuildHandler = (app: Express): BuildHandler => {
    return (responseStream: Writable) => {
        return async (event: APIGatewayProxyEvent, context: Context) => {
            const streamingLambdaAdapter = createStreamingLambdaAdapter(app, responseStream);
            return streamingLambdaAdapter(event, context);
        };
    };
};

// @ts-expect-error: This file isn't available during build time, but will be on MRT.
const { default: build } = (await import('./server/index.js')) as unknown as {
    default: ServerBuild;
};
const app = await createServer({
    mode: 'production',
    build,
    streaming: true,
});

export const buildHandler = createBuildHandler(app);
