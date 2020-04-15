import { Router, RequestHandler } from 'express';
import { Schema, Connection } from 'mongoose';
import { ModuleOptions } from './types';
import { ArkExpressPackage } from './package';

type ModelMap<DBT> = {
    name: string
    schema: Schema,
    dbName?: DBT
}

export class ArkExpressModule<DBT = any> {
    id: string = null;
    options: ModuleOptions = null;
    router: Router = null;
    package: ArkExpressPackage = null;
    modelMapping: ModelMap<DBT>[] = [];

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

    getDatabase(name?: string): Connection {
        name = name || 'default';
        return this.getDatabase(this.package.resolveDatabaseModuleMap(this.id, name));
    }

    getRouter(): RequestHandler {
        return this.router;
    }
}