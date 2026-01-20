"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const databasePath = process.env.DATABASE_URL?.replace('sqlite://', '') || './data/lumina.db';
const knexConfig = {
    client: 'sqlite3',
    connection: {
        filename: databasePath,
    },
    migrations: {
        directory: './src/database/migrations',
        extension: 'ts',
    },
    pool: {
        afterCreate: (conn, cb) => {
            conn.run('PRAGMA foreign_keys = ON', cb);
        },
    },
    useNullAsDefault: true,
};
exports.default = knexConfig;
