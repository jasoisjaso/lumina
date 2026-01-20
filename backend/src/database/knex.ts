import knex from 'knex';
import { knexConfig } from './config';

const db = knex(knexConfig);

export default db;
