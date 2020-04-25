import express, { Express } from 'express';
import mongoose, { Connection } from 'mongoose';
import chalk from 'chalk';
import Table from 'cli-table3';
import http from 'http';
import https from 'https';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import { ModuleOptions, Database } from './types';
import { ArkExpressModule } from './module';

export type ExpressModuleMap = {
    [key: string]: ArkExpressModule
} 

function clearConsole() {
    // console.clear();
}

export class ArkExpressPackage<T extends ExpressModuleMap = any> {
    static instance: any;
    static getInstance<T extends ExpressModuleMap>(): ArkExpressPackage<T> {
        if (!ArkExpressPackage.instance) {
            ArkExpressPackage.instance = new ArkExpressPackage<T>();
            return ArkExpressPackage.instance as ArkExpressPackage<T>;
        }

        return ArkExpressPackage.instance as ArkExpressPackage<T>;
    }

    private app: Express

    modules: T = {} as any;
    databases: Database[] = [];
    httpServer: http.Server = null;
    httpsServer: https.Server = null;
    httpsOptions: https.ServerOptions = null;
    httpOption: http.ServerOptions = null;
    httpPort: number = 80;
    httpsPort: number = 443;

    constructor() {
        this.app = express();
    }

    private _normalizeModuleOptions(opts: ModuleOptions): ModuleOptions {
        return Object.assign<ModuleOptions, Partial<ModuleOptions>>({
            rootPath: '/'
        }, opts || {});
    }

    useModule(id: string, module: ArkExpressModule, options?: ModuleOptions): ArkExpressPackage<T> {
        module.options = this._normalizeModuleOptions(options);
        module.package = this;
        module.id = id;
        // @ts-ignore
        this.modules[id] = module;
        return this;
    }

    useDatabase(dbConfig: Database): ArkExpressPackage<T> {
        if (this.databases.findIndex(d => d.name === dbConfig.name) > -1) {
            throw new Error(`Database with same name already exists. Name: ${dbConfig.name}`)
        }
        dbConfig.name = dbConfig.name || 'default';
        this.databases.push(dbConfig);
        return this;
    }

    getDatabase(name?: string): Connection {
        name = name || 'default';
        if (Array.isArray(this.databases)) {
            if (this.databases.length > 0) {
                const _db = this.databases.find((db) => db.name === name);
                if (_db) {
                    if (!_db.connection) {
                        throw new Error('Looks like you tried to call getDatabase before starting the server');
                    }
                    return _db.connection;
                }
            }
        }

        return null;
    }

    resolveDatabaseModuleMap(moduleId: string, databaseName: string): string {
        return 'default';
    }

    configure(opts: http.ServerOptions): ArkExpressPackage<T> {
        this.httpOption = opts;
        return this;
    }

    configureHttps(opts: https.ServerOptions): ArkExpressPackage<T> {
        this.httpsOptions = opts;
        return this;
    }

    usePort(port?: number, securePort?: number) {
        this.httpPort = port ? port : 80;
        this.httpsPort = securePort ? securePort : 443;
    }

    private _initializeModules(cb: (err: Error) => void) {
        Object.keys(this.modules).forEach((moduleKey: string) => {
            const _module: ArkExpressModule = this.modules[moduleKey];

            // Register Models - BEGIN
            let db;
            if (Array.isArray(_module.modelMapping) && _module.modelMapping.length > 0) {
                _module.modelMapping.forEach((model) => {
                    model.dbName = model.dbName ? model.dbName : 'default';
                    model.name = _module.__normalizeModelName(model.name);
                    db = this.getDatabase(this.resolveDatabaseModuleMap(_module.id, model.dbName));
                    if (!db) { throw new Error('Database has to be initialized before performing module registration') }
                    model.instance = db.model(model.name, model.schema);
                })
            }
            // Register Models - END

            this.app.use(_module.options.rootPath, _module.getRouter());
        })
        cb(null);
    }

    private _connectDatabases(cb: (err: Error) => void) {

        const verifyConnection = (cb: (isConnectedAll: boolean) => void) => {
            cb(this.databases.every((db) => {
                if (db.connection) {
                    return db.connection.readyState === 1;
                }

                return false;
            }));
        }

        const showConnectionStatus = () => {
            clearConsole();
            console.log(chalk.gray('DATABASES:'));
            const dbTable = new Table({
                head: [chalk.gray('#'), chalk.gray('name'), chalk.gray('status')]
            });

            dbTable.push(...this.databases.map((db, index) => {
                return [`${index + 1}`, chalk.green(db.name), chalk.green('online')]
            }));

            console.log(dbTable.toString());
        }

        new Promise((resolve, reject) => {
            console.log(chalk.green(`Connecting ${this.databases.length} database(s)...`));

            setTimeout(() => {
                clearConsole();
                this.databases.forEach((db) => {
                    if (!db.connection) {
                        db.connection = mongoose.createConnection(db.connectionString, db);
                        db.connection.on('open', () => verifyConnection((isConnectedAll) => {
                            if (isConnectedAll === true) {
                                showConnectionStatus();
                                resolve(true);
                                cb(null);
                            }
                        }));
                        db.connection.on('error', (e) => {
                            console.error(chalk.red(e.message));
                            reject(e);
                            cb(e);
                        });
                    }
                })
            }, 2000);
        })
    }

    private _connectUtilityMiddlewares(cb: (err: Error) => void) {
        try {
            // Initialize app middlewares
            this.app.use(logger('dev'));
            this.app.use(express.json());
            this.app.use(express.urlencoded({ extended: false }));
            this.app.use(cookieParser());

            cb(null);
        } catch (err) {
            cb(err);
        }
    } 

    start(cb?: (err: Error) => void) {
        // Initialize server(s)
        this.httpServer = http.createServer(this.httpOption, this.app);

        clearConsole();
        console.log(chalk.blue('Starting application server...'));
        this._connectDatabases((err) => {
            this._connectUtilityMiddlewares((err) => {
                if (err) {
                    throw err;
                }

                this._initializeModules((err) => {
                    if (this.httpsOptions) {
                        // Initialize HTTPS server
                        this.httpsServer = https.createServer(this.httpsOptions, this.app);
                        this.httpsServer.addListener('listening', () => {
                            console.log(chalk.green(`HTTPS listening on port ${this.httpsPort}`));
                        });
    
                        this.httpsServer.listen(this.httpsPort);
                    }
                    this.httpServer.addListener('listening', () => {
                        console.log(chalk.green(`HTTP listening on port ${this.httpPort}`));
                        cb && cb(null);
                    });
    
                    this.httpServer.listen(this.httpPort);
                })
            })
        })
    }
}