import { ConnectionOptions, Connection } from 'mongoose';

export type ModuleOptions = {
    rootPath: string
}

export type Database = {
    name: string
    connectionString: string
    connection?: Connection
} & Partial<ConnectionOptions>