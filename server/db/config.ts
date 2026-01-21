/**
 * Database Configuration
 * Centralized database settings for SQLite and future Aurora migration
 */

export interface SqliteConfig {
  path: string;
  walMode: boolean;
}

export interface AuroraConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface DbConfig {
  type: 'sqlite' | 'aurora';
  sqlite: SqliteConfig;
  aurora: AuroraConfig;
}

/**
 * Database configuration loaded from environment variables
 */
export const dbConfig: DbConfig = {
  type: (process.env.DB_TYPE as 'sqlite' | 'aurora') || 'sqlite',
  sqlite: {
    path: process.env.DB_PATH || 'data/app.db',
    walMode: true,
  },
  aurora: {
    host: process.env.AURORA_HOST || '',
    port: parseInt(process.env.AURORA_PORT || '3306', 10),
    database: process.env.AURORA_DATABASE || '',
    username: process.env.AURORA_USERNAME || '',
    password: process.env.AURORA_PASSWORD || '',
    ssl: process.env.AURORA_SSL === 'true',
  },
};
