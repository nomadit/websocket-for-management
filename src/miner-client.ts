import WebSocket = require("ws");

export class MinerClient {
    public gpuInfo: string = '';
    public gpuType: string = '';
    public gpuCnt: string = '';
    public ip: string = '';
    public macAddr: string = '';
    public isReboot = false;
	  public ws!: WebSocket;

    constructor(ws: WebSocket, initData:string){
      this.ws = ws;
      const obj = JSON.parse(initData);
      const data = JSON.parse(obj.data);
      this.gpuType = data.gpuType;
      this.gpuCnt = data.gpuNum;
      this.ip = data.ip;
      this.isReboot = obj.isReboot;
      this.macAddr = data.mac;
    }
}