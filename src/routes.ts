import { Controller } from './controller';
import * as express from 'express';
import { SocketHandler } from './server-websocket';

export function init(app: express.Application) {
  const ctrl = new Controller();
  let router = express.Router();
  router.get('/heartbeat/:macAddr', checkMacAddress(), ctrl.getHeartBeat);
  router.get('/reset_info/:macAddr', checkMacAddress(), ctrl.resetInitInfo);
  router.get('/system/info/:macAddr', checkMacAddress(), ctrl.getSystemInfo);
  router.get('/system/gpu_type/:macAddr', checkMacAddress(), ctrl.getGpuType);
  router.get('/system/gpu/:macAddr', checkMacAddress(), ctrl.getGpuInfo);
  router.get('/service/status/:macAddr', checkMacAddress(), ctrl.getServiceStatus);
  router.get('/over_clock/:macAddr', checkMacAddress(), ctrl.getOverInfo);
  router.post('/smi/:macAddr', checkMacAddress(), checkAuth(), checkPassword(), ctrl.getSmi);
  router.post('/check_password/:macAddr', checkMacAddress(), checkAuth(), ctrl.checkPassword);

  router.get('/auto_over/:macAddr', checkMacAddress(), ctrl.getAutoInfo);
  router.post('/auto_over/:macAddr', checkMacAddress(), checkAuth(), checkPassword(), ctrl.setAutoOver);

  router.post('/over_clock/:macAddr', checkMacAddress(), checkAuth(), checkPassword(), ctrl.setOverClock);

  router.get('/is_over/:macAddr', checkMacAddress(), ctrl.getIsOver);

  router.post('/atiflash/:macAddr', checkMacAddress(), checkAuth(), checkPassword(), ctrl.getRomInfo);
  router.post('/rom/extract/:macAddr', checkMacAddress(), checkAuth(), checkPassword(), ctrl.getRomExtract);
  const multipart = require('connect-multiparty');
  const multipartMiddleware = multipart();
  router.post('/rom/apply/:macAddr', checkMacAddress(), multipartMiddleware, checkAuth(), checkPassword(), ctrl.setRomApply);
  router.post('/reboot/:macAddr', checkMacAddress(), checkAuth(), checkPassword(), ctrl.setMinerReboot);
  app.use('/api/miner', router);
}

function checkMacAddress(): any {
  return (req: any, res: any, next: any) => {
    if (req.params === undefined || req.params.macAddr === undefined) {
      res.status(500).json({
        msg: 'macAddr is empty'
      });
    } else if (SocketHandler.getInstance().isConnect(req.params.macAddr) === false){
      res.status(500).json({
        msg: 'not connection'
      });
    } else {
      next();
    }
  }
}

function checkAuth(): any {
  const devAuthKey = 'e487d39625d2dee190a59f2bf1ff771009d44d38';
  const prodAuthKey = '46e8182caefd1cee1ca42296ec2798dcebb1c32e';
  const mode = process.env.MODE || 'dev';
  let authKey = devAuthKey;
  if (mode === 'prod') {
    authKey = prodAuthKey;
  }
  return (req: any, res: any, next: any) => {
    if (req.body === undefined || req.body.authKey === undefined || req.body.authKey !== authKey) {
      res.status(500).json({
        msg: 'Authkey is empty or invalid'
      });
    } else {
      next();
    }
  }
}

function checkPassword(): any {
  return (req: any, res: any, next: any) => {
    if (req.body === undefined || req.body.password === undefined) {
      res.status(500).json({
        msg: 'password is empty'
      });
    } else {
      next();
    }
  }
}


