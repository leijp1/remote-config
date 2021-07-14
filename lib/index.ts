import ConfigParser from './config';
import Logger from './logger';
import chalk from 'chalk';
import { Remote } from './remote/remote';

let parser = new ConfigParser({
  filePath:
    '/Users/qiweili/Desktop/crpyto-panel/remote-config/example.config.yml',
  concurrency: 2,
});

parser
  .readFile()
  .runRemoteCommand()
  .then(() => {
    console.log('ok');
  });
