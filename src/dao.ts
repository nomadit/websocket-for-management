import { MysqlPool } from './db';
import * as moment from 'moment';

export class Dao {
  private conn = MysqlPool.getInstance();

  constructor() {
    this.conn = MysqlPool.getInstance();
  }

  public async findOverInfoByMac(mac:string):Promise<any> {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM over_info WHERE mac_address = ? AND deleted_at IS NULL`;
      this.conn.query(query, [mac], (err: any, result: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }

  public async updateOverInfo(overInfo:any):Promise<any> {
    return new Promise((resolve, reject) => {
      const now = moment(new Date).format('YYYY-MM-DD HH:mm:ss');
      overInfo.updated_at = now;
      let query = `UPDATE over_info SET ? WHERE id=? AND deleted_at IS NULL`;
      this.conn.query(query, [overInfo, overInfo.id], (err: any, result: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }

  public async insertOverInfo(overInfo:any):Promise<any> {
    return new Promise((resolve, reject) => {
      const now = moment(new Date).format('YYYY-MM-DD HH:mm:ss');
      overInfo.updated_at = overInfo.created_at = now;
      let query = `INSERT INTO over_info SET ?`;
      this.conn.query(query, [overInfo], (err: any, result: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }

  // private getEncryptPassword(password: any) {
  //   const IV_LENGTH = 16; // For AES, this is always 16
  //
  //   let iv = crypto.randomBytes(IV_LENGTH);
  //
  //
  //   let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.alloc(32).fill(config.secret), iv);
  //   let encrypted = cipher.update(password);
  //
  //   encrypted = Buffer.concat([encrypted, cipher.final()]);
  //
  //   return iv.toString('hex') + ':' + encrypted.toString('hex');
  // }
  //
  // private getDecryptPassword(encPassword: any) {
  //   let textParts = encPassword.split(':');
  //
  //   let iv = new Buffer(textParts.shift(), 'hex');
  //   let encryptedText = new Buffer(textParts.join(':'), 'hex');
  //   let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.alloc(32).fill(config.secret), iv);
  //   let decrypted = decipher.update(encryptedText);
  //
  //   decrypted = Buffer.concat([decrypted, decipher.final()]);
  //
  //   return decrypted.toString();
  // }
}
