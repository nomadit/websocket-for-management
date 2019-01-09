import WebSocket = require('ws');
import { MinerClient } from './miner-client';
import { Server } from 'http';
import { Dao } from './dao';

export function runSocketServer(httpServer: Server) {
  let port = 9100;
  if (typeof process.env.SOCKET_PORT === 'string') {
    port = parseInt(process.env.SOCKET_PORT)
  }
  console.log('runSocketServer', port);
  const socketServer = new WebSocket.Server({server: httpServer, port: port});
  socketServer.setMaxListeners(100000);
  socketServer.on('connection', (ws: WebSocket) => {
    console.log('connection', port);
    SocketHandler.getInstance().onReady(ws);
  });
}

export class SocketHandler {
  private static _instance: SocketHandler;
  public macMinerMap = new Map(); // Hold all registered sockets
  public browserMap = new Map(); // Hold all registered sockets
  public static minerList = [
    'zecminer64',
    'ethdcrminer64',
    'EWBF.zec/miner',
    'sgminer',
    'ccminer',
    'xmrig-amd',
    'xmrig-nvidia',
    'xmr-stak-amd',
    'xmr-stak-nvidia'];

  public static getInstance() {
    // Do you need arguments? Make it a regular method instead.
    return this._instance || (this._instance = new this());
  }

  public isConnect(mac: string): boolean {
    return this.macMinerMap.has(mac)
  }

  public onReady(ws: WebSocket) {
    ws.on('message', (message: any) => {
      if (message.length > 0) {
        const obj = JSON.parse(message);
        if (obj.key === 'initMiner') {
          this.initMiner(ws, message);
        } else if (obj.key === 'log') {
          if (this.browserMap.has(obj.macAddr) === false) {
            let wsMap = new Map();
            this.browserMap.set(obj.macAddr, wsMap);
          }
          const uuid = this.guid();
          this.browserMap.get(obj.macAddr).set(uuid, ws);
          this.browserLogReq(obj).then(res => {
            // 시작만 하면 된다.. res가 key값이 tailLog로 포함 될 것이 때문에...
            // ws.send(JSON.stringify(res));
          }).catch(e => {
            ws.send(JSON.stringify({key: obj.key, error: e.message}));
          });
        } else if (obj.key === 'tailLog') {
          this.browserMap.get(obj.macAddr).forEach((value: WebSocket, key: string) => {
            if (value.readyState === WebSocket.CLOSING || value.readyState === WebSocket.CLOSED) {
              value.close();
              this.browserMap.get(obj.macAddr).delete(key);
            } else {
              value.send(JSON.stringify(message));
            }
          });
          if (this.browserMap.get(obj.macAddr).length === 0) {
            this.browserMap.delete(obj.macAddr);
          }
        }
      }
    });
    ws.onclose = (event: any) => {
      console.log('onClose', event.target.url);
    };
  }

  public sendMsg(mac: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = this.macMinerMap.get(mac);
      if (client === undefined || client.ws === undefined) {
        console.log('socket is empty', mac, params);
        return;
      }
      if (client.ws === undefined) {
        reject({msg: 'Miner conn closed'});
      }
      if (client.ws.readyState === WebSocket.CLOSING || client.ws.readyState === WebSocket.CLOSED) {
        client.ws.close();
        this.macMinerMap.delete(mac);
        reject({msg: 'Miner conn closed'});
      } else {
        params.macAddr = mac;
        console.log('send message', params);
        client.ws.send(JSON.stringify(params));
        const listener = (data: any) => {
          let rsJson = JSON.parse(data.toString());
          console.log('receive message', rsJson);
          if (rsJson.key === params.key && mac === rsJson.macAddr) {
            client.ws.removeListener('message', listener);
            if (rsJson.error !== undefined) {
              reject(rsJson.error);
            } else {
              resolve(rsJson.data);
            }
          }
        };
        client.ws.on('message', listener);
      }
    });
  }

  public initMiner(ws: WebSocket, message: string) {
    const minerClient = new MinerClient(ws, message);
    this.macMinerMap.delete(minerClient.macAddr);
    this.macMinerMap.set(minerClient.macAddr, minerClient);
    new Dao().findOverInfoByMac(minerClient.macAddr).then((info: any) => {
      if (info.length > 0 && info[0].is_auto === 1 && minerClient.isReboot) {
        this.doAutoOver(info[0]);
      }
      if (info.length === 0) {
        this.createInfo(minerClient)
      } else if (parseInt(info[0].gpu_num) !== parseInt(minerClient.gpuCnt) ||
        info[0].gpu_type !== minerClient.gpuType
      ) {
        this.updateInfo(info[0], minerClient)
      }
    }).catch(e => {
      console.log('findOverInfoByMac error', e);
    });
  }

  public async updateInfo(info: any, minerClient: any) {
    info.gpu_num = minerClient.gpuCnt;
    info.gpu_type = minerClient.gpuType;
    try {
      await new Dao().updateOverInfo(info);
    } catch (e) {
      console.error(e)
    }
  }

  public async createInfo(minerClient: any) {
    const obj = {
      mac_address: minerClient.macAddr,
      gpu_type: minerClient.gpuType,
      gpu_num: minerClient.gpuCnt,
      is_auto: 0,
      is_over: 0
    };
    try {
      await new Dao().insertOverInfo(obj);
    } catch (e) {
      console.error(e)
    }
  }

  public async doAutoOver(info: any) {
    setTimeout(() => {
      let data: any = {};
      data.minerList = SocketHandler.minerList;
      data.gpu_type = info.gpu_type;
      data.password = info.password;
      data.over_data = [];
      const list = JSON.parse(info.over_data);
      console.log('empty', list);
      if (list == null) {
        return;
      }
      for (let item of list) {
        if (data.gpu_type === 'AMD') {
          let fanSpeed = item.fanSpeed;
          fanSpeed = Math.floor(fanSpeed * 2.55);
          data.over_data.push({
            idx: item.idx, vddcCore: item.vddcCore, vddcMem: item.vddcMem,
            coreClock: item.coreClock, memClock: item.memClock, fanSpeed: fanSpeed
          });
        } else {
          data.over_data.push({
            idx: item.idx,
            coreClock: item.coreClock,
            memClock: item.memClock,
            fanSpeed: item.fanSpeed,
            power: item.power
          });
        }
      }
      this.sendMsg(info.mac_address, {key: 'doOverClock', data: data}).then(data => {
        info.is_over = 1;
        new Dao().updateOverInfo(info).then(data => {
        }).catch(err => {
          console.error(err)
        });
      }).catch(err => {
        console.error('init auto over error:' + info.mac_address, err)
      })
    }, (1 * 1000));
  }

  public async browserLogReq(obj: any) {
    try {
      const paramsWithKey = {key: 'tailLog', line: obj.line, macAddr: obj.macAddr};
      const retObj = await this.sendMsg(obj.macAddr, paramsWithKey);
      if (retObj.retCode === 'error') {
        throw new Error(retObj);
      }
      return retObj;
    } catch (e) {
      throw new Error(e);
    }
  }


  private guid() {
    const s4 = () => {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }
}
