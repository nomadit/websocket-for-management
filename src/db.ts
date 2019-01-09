import * as mysql from 'mysql';

export class MysqlPool {
  private static _pool: mysql.Pool;

  public static getInstance(): mysql.Pool {
    if (!MysqlPool._pool) {
      let host = 'localhost';
      let mode = process.env.MODE;
      let debug = true;
      if (!mode) {
        mode = 'dev'
      }

      if (mode === 'dev') {
        host = 'localhost';
      } else if (mode === 'prod') {
        host = 'localhost';
        debug = false;
      } else if (mode === 'local') {
        host = 'localhost';
      }
      debug = false;

      MysqlPool._pool = mysql.createPool({
        connectionLimit: 100,
        host: host,
        database: 'db',
        password: 'password',
        debug: debug,

        // Set connection string for accio_test_db or real_db
        user: 'user',
        port: 3306,
        timezone: 'utc',

        // // Set connection string for local db
        // user: 'root',
      });
      MysqlPool.createTable();
    }
    return MysqlPool._pool;
  }

  private static createTable() {
    const createTableSql = `CREATE TABLE if not exists over_info (
  id BIGINT ZEROFILL UNSIGNED NOT NULL AUTO_INCREMENT,
  mac_address VARCHAR(255) NOT NULL,
  gpu_type VARCHAR(256) NOT NULL,
  gpu_num INT NOT NULL DEFAULT 0,
  is_auto INT NOT NULL DEFAULT 0,
  is_over TINYINT NOT NULL DEFAULT 0,
  over_data TEXT NULL,
  password VARCHAR(1024) NULL,
  updated_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_mac_live (mac_address ASC, deleted_at ASC));`;
    MysqlPool._pool.query(createTableSql,
    (err: any, results: any) => {
      if (err) {
        throw err
        return;
      }
    });
  }
}

