import * as express from 'express';
import * as http from 'http';
import * as BodyParser from 'body-parser';
import * as cors from 'cors';
import * as compression from 'compression';
import * as routes from './routes';
import { runSocketServer } from './server-websocket';


function init() {
  const port = process.env.PORT || 9101;
  process.on('unhandledRejection', r => console.log(r));
  const app = express();
  app.use(cors());
  app.use(BodyParser.urlencoded({extended: true}));
  app.use(BodyParser.json());
  app.use(BodyParser.text());
  app.use(compression());

  app.all('/*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Pragma", "no-cache");
        if ('OPTIONS' === req.method) {
        //respond with 200
        res.status(200);
        res.send('');
    }else{
        next();
    }
  });

  routes.init(app);

  /**
   * Server with gzip compression.
   */
  return new Promise<http.Server>((resolve, reject) => {
    let server = app.listen(port, () => {
      console.log('App is listening on port:' + port);
      runSocketServer(server);
      resolve(server);
    });
  });
}

init();
