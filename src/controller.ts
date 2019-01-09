import { SocketHandler } from './server-websocket';
import { Dao } from './dao';
import * as fs from 'fs';

export class Controller {

  private ERROR_MULTIPLE_OVERINFO = 'Multiple OverInfo data';

  // next가 다 있지만.. 생략한다.
  public async getHeartBeat(req: any, res: any, next: any) {
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'heartBeat'});
      const val = parseInt(result.trim());
      if (val === 0) {
        res.json({isSuccess: false});
      } else {
        res.json({isSuccess: true});
      }
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async checkPassword(req: any, res: any) {
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'checkPassword', data: {password: req.body.password}});
      const val = parseInt(result.trim());
      if (val === 0) {
        res.json({isSuccess: false});
      } else {
        res.json({isSuccess: true});
      }
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getSystemInfo(req: any, res: any) {
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'systemInfo', data: req.params});
      const overInfo: any = await new Dao().findOverInfoByMac(req.params.macAddr);
      if (overInfo.length > 1) {
        res.status(500).json(this.ERROR_MULTIPLE_OVERINFO);
        return;
      }
      const obj = JSON.parse(result);
      obj.gpuNum = overInfo[0].gpu_num;
      res.json(obj);
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getGpuInfo(req: any, res: any) {
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'gpuInfo', data: req.params});
      res.json(JSON.parse(result));
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async resetInitInfo(req: any, res: any) {
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'resetInfo'});
      res.json(JSON.parse(result));
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getGpuType(req: any, res: any) {
    try {
      const overInfo: any = await new Dao().findOverInfoByMac(req.params.macAddr);
      if (overInfo.length > 1) {
        res.status(500).json(this.ERROR_MULTIPLE_OVERINFO);
        return;
      }
      res.json({GPU_TYPE: overInfo[0].gpu_type});
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getOverInfo(req: any, res: any) {
    try {
      const overInfo: any = await new Dao().findOverInfoByMac(req.params.macAddr);
      if (overInfo.length > 1) {
        res.status(500).json(this.ERROR_MULTIPLE_OVERINFO);
        return;
      }
      if (overInfo[0].over_data === undefined || overInfo[0].over_data === null) {
        res.json([]);
        return;
      }
      res.json(JSON.parse(overInfo[0].over_data));
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getIsOver(req: any, res: any) {
    try {
      const overInfo: any = await new Dao().findOverInfoByMac(req.params.macAddr);
      if (overInfo.length > 1) {
        res.status(500).json(this.ERROR_MULTIPLE_OVERINFO);
        return;
      }
      res.json(JSON.parse(overInfo[0].is_over));
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getAutoInfo(req: any, res: any) {
    try {
      const overInfo: any = await new Dao().findOverInfoByMac(req.params.macAddr);
      if (overInfo.length > 1) {
        res.status(500).json(this.ERROR_MULTIPLE_OVERINFO);
        return;
      }
      if (overInfo[0].is_auto === undefined || overInfo[0].is_auto === null) {
        res.status(500).json('not found data');
      } else {
        res.json({isAutoOver: overInfo[0].is_auto});
      }
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async setAutoOver(req: any, res: any) {
    try {
      let overInfo: any = await new Dao().findOverInfoByMac(req.params.macAddr);
      if (overInfo.length > 1) {
        res.status(500).json(this.ERROR_MULTIPLE_OVERINFO);
        return;
      }
      overInfo[0].is_auto = req.body.isAutoOver;
      overInfo[0].password = req.body.password;
      const result = await new Dao().updateOverInfo(overInfo[0]);
      res.json(result);
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async setOverClock(req: any, res: any) {
    try {
      let overInfo: any = await new Dao().findOverInfoByMac(req.params.macAddr);
      if (overInfo.length > 1) {
        res.status(500).json(this.ERROR_MULTIPLE_OVERINFO);
        return;
      }
      let data: any = {};
      data.minerList = SocketHandler.minerList;
      data.over_data = [];
      data.gpu_type = overInfo[0].gpu_type;
      data.password = req.body.password;
      for (let item of req.body.minerOverClockValueInfoList) {
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

      const result = await SocketHandler.getInstance().sendMsg(req.params.macAddr, {key: 'doOverClock', data: data});
      if (data.gpu_type === 'AMD' || !overInfo[0].over_data || overInfo[0].over_data.length === 0) {
        overInfo[0].over_data = JSON.stringify(req.body.minerOverClockValueInfoList);
      } else {
        let originOverData = JSON.parse(overInfo[0].over_data);
        let requestOverData = data.over_data[0];
        const updateList = [];
        if (originOverData === null || originOverData.length < overInfo[0].gpu_num) {
          for (let i = originOverData.length; i <  overInfo[0].gpu_num; i++) {
            originOverData.push({
              idx: i,
              coreClock: 0,
              memClock: 0,
              fanSpeed: 0,
              power: 0
            })
          }
        }
        for (let data of originOverData) {
          if (data.idx === requestOverData.idx) {
            updateList.push(requestOverData);
          } else {
            updateList.push(data);
          }
        }
        overInfo[0].over_data = JSON.stringify(updateList);
      }
      overInfo[0].is_over = 1;
      await await new Dao().updateOverInfo(overInfo[0]);
      res.json(result);
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getServiceStatus(req: any, res: any) {
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'checkService', data: req.params});
      res.json(result);
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getSmi(req: any, res: any) {
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'smi', data: {password: req.body.password}});
      let list = result.split('\n');
      let amdList = [], nvidiaList = [], maxID = 0;
      for (let item of list) {
        let elements = item.split(',');
        if (elements.length === 6) {
          let obj = makeNvidiaGpuMonitoringObj(elements);
          nvidiaList.push(obj);
        } else if (elements.length === 12) {
          let obj = makeAmdGpuMonitoringObj(elements);
          amdList.push(obj);
          if (elements[1] > maxID) {
            maxID = elements[1];
          }
        }
      }
      if (amdList.length > 0) {
        res.json(renumberingNSortAMD(amdList, maxID));
      } else {
        res.json(nvidiaList);
      }
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getRomInfo(req: any, res: any) {
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'amdRomInfo', data: {password: req.body.password}});
      let list = result.split('\n');
      let output = [];
      for (let item of list) {
        let elements = item.split(',');
        if (elements.length < 3) {
          continue;
        }
        if (item.includes('pass')) {
          output.push({
            ROM_IDX: elements[1],
            PIN: elements[9]
          });
        } else {
          if (elements.length === 11) {
            output.push({
              ROM_IDX: elements[1],
              PIN: elements[6] + elements[7] + elements[10]
            });
          } else {
            output.push({
              ROM_IDX: elements[1],
              PIN: 'error:' + item
            });
          }
        }
      }
      res.json(output);
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public async getRomExtract(req: any, res: any) {
    if (req.body.romId === undefined) {
      res.status(500).json('romId is null');
      return;
    }
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'extractRom', data: {password: req.body.password, romId: req.body.romId}});
      res.json(result);
    } catch (e) {
      res.status(500).json(e);
    }
  }

  public setRomApply(req: any, res: any) {
    let data = req.body;
    data.file = req.files.uploadFile;
    if (data.file === undefined || data.file.path === undefined) {
      res.status(500).json('file key must be file');
      return;
    }
    let readStream = fs.createReadStream(data.file.path).on('error', function (err) {
      fs.unlink(data.file.path, err => {
        res.status(500).json(err);
      });
      res.status(500).json(err);
      return;
    });
    let fileBuffer: any = [];
    let fileLength = 0;
    readStream.on('data', (chunk) => {
      fileLength += chunk.length;
      fileBuffer.push(chunk);
    }).on('error', (error) => {
      fs.unlink(data.file.path, err => {
        res.status(500).json(err);
      });
      console.log('Error:', error.message);
    }).on('close', () => {
      console.log('close');
      let fileData = new Uint8Array(fileLength);
      let i = 0;

      //== Loop to fill the final array
      fileBuffer.forEach((buff: any) => {
        for (let j = 0; j < buff.length; j++) {
          fileData[i] = buff[j];
          i++;
        }
      });
      data.file.bytes = new Buffer(fileData).toString('base64');
      SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'writeRom', data: data}).then(result => {
        res.json(result);
      }).catch(err => {
        res.status(500).json(err);
      });
      fs.unlink(data.file.path, err => {
        console.error(err)
      });
    });
  }

  public async setMinerReboot(req: any, res: any) {
    try {
      const result = await SocketHandler.getInstance()
        .sendMsg(req.params.macAddr, {key: 'reboot', data: {password: req.body.password}});
      new Dao().findOverInfoByMac(req.params.macAddr).then((info: any) => {
        if (info.length > 0 && info[0].is_over === 1) {
          info[0].is_over = 0;
          new Dao().updateOverInfo(info[0]).then(data => {
          }).catch(err => {
            console.error(err)
          });
        }
      }).catch(e => {
        console.log('findOverInfoByMac error', e);
      });

      res.json(result);
    } catch (e) {
      res.status(500).json(e);
    }
  }
}

function renumberingNSortAMD(list: any[], maxID: number) {
  list.sort((a, b) => {
    if (a.GPU_IDX > b.GPU_IDX) {
      return 1;
    } else {
      return -1;
    }
  });
  for (let idx in list) {
    list[idx].GPU_IDX = idx;
  }
  return list
}

function makeNvidiaGpuMonitoringObj(elements: any[]) {
  return {
    GPU_IDX: parseInt(elements[1]),
    GPU: elements[0].trim(),
    BUS_ID: elements[5].trim(),
    TEMP: elements[2].trim(),
    FAN: elements[3].trim(),
    PWR: elements[4].trim(),
  }
}

function makeAmdGpuMonitoringObj(elements: any[]) {
  return {
    GPU_IDX: parseInt(elements[1]),
    TEMP: elements[3].trim(),
    PWR: elements[4].trim(),
    CORE_CLOCK: elements[5].trim(),
    MEM_CLOCK: elements[6].trim(),
    FAN: elements[7].trim(),
  }
}

