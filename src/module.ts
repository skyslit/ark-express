import { Router, RequestHandler } from 'express';
import { PathParams } from 'express-serve-static-core';
import { Schema, Connection, Model, Document } from 'mongoose';
import { ModuleOptions } from './types';
import { ArkExpressPackage } from './package';
import { Utils } from './utils'

type ModelMap<DBT> = {
    name: string
    schema: Schema
    instance?: Model<any>
    dbName?: DBT
}

type MiddlewareMatcher = {
    path?: PathParams
    handler: RequestHandler | RequestHandler[],
};

export class ArkExpressModule<DBT = any> {
    id: string = null;
    options: ModuleOptions = null;
    router: Router = null;
    package: ArkExpressPackage = null;
    modelMapping: ModelMap<DBT>[] = [];
    utils: Utils;

    // private middlewares: RequestHandler[] = [];
    private middlewares: MiddlewareMatcher[] = [];

    constructor() {
        this.router = Router();
    }

    registerModel(name: string, schema: Schema, dbName?: DBT): ArkExpressModule<DBT> {
        this.modelMapping.push({
            name,
            schema,
            dbName
        });

        return this;
    }

    getModel<T extends Document = Document>(name: string): Model<T> {
        const index = this.modelMapping.findIndex((model) => model.name === this.__normalizeModelName(name));
        if (index > -1) {
            if (this.modelMapping[index].instance) {
                return this.modelMapping[index].instance;
            } else {
                throw new Error('Looks like getModel is called before running the package');
            }
        }

        return null;
    }

    getDatabase(name?: string): Connection {
        name = name || 'default';
        return this.getDatabase(this.package.resolveDatabaseModuleMap(this.id, name));
    }

    getRouter(): RequestHandler {
        return this.router;
    }

    __normalizeModelName(modelName: string): string {
        return `${this.id.toLowerCase()}_${modelName}`;
    }

    __getMiddlewares(): MiddlewareMatcher[] {
        return this.middlewares;
    }

    use(middleware: RequestHandler): ArkExpressModule<DBT> {
        this.middlewares.push({
            handler: middleware
        });
        return this;
    }

    useWithPath(path: PathParams, middleware: RequestHandler | RequestHandler[]): ArkExpressModule<DBT> {
        this.middlewares.push({
            handler: middleware,
            path
        });
        return this;
    }

    main() {
        // Do nothing

    }
}