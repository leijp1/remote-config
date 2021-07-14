import ConfigParser from './config';
import Logger from './logger';
import chalk from 'chalk';
import { Remote } from './remote/remote';

let argv = process.argv;
if (argv.length !== 3) {
  Logger.error('Expected 1 argument. Ex: config /abc/test.yml');
} else {
  Logger.info('Read file ' + argv[2]);
  let parser = new ConfigParser({
    filePath: argv[2],
    concurrency: 2,
  });

  parser
    .readFile()
    .runRemoteCommand()
    .then(() => {
      console.log('ok');
    });
}
