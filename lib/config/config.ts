import fs from 'fs';
import YAML from 'yaml';
import { Config, Logger as ConfigLogger, Login } from './config-interface';

import cliProgress from 'cli-progress';
import Logger from '../logger';
import { Remote } from '../remote/remote';
import { throws } from 'assert';

interface Param {
  filePath: string;
  concurrency: number;
}

export class ConfigParser {
  private filePath: string;
  private config: Config | undefined;
  private concurrency: number;

  constructor({ filePath, concurrency }: Param) {
    this.filePath = filePath;
    this.concurrency = concurrency;
  }

  readFile() {
    let file = fs.readFileSync(this.filePath, 'utf-8');
    let config: Config = YAML.parse(file);
    Logger.info('Finish readding configuration file');
    // Check if the yaml file meets the requirement
    if (config.logger === undefined) {
      config.logger = { output: './' };
      Logger.info('Use default logger output');
    }
    if (config.remote.length === 0) {
      throw new Error('You need to set your remote ip address');
    }

    if (config.steps.length === 0) {
      throw new Error('You need to set your step');
    }

    if (
      config.login === undefined ||
      config.login.password === undefined ||
      config.login.username === undefined
    ) {
      throw new Error(
        'You need to set your username and password in loggin section'
      );
    }
    this.config = config;
    return this;
  }

  async runRemoteCommand() {
    if (this.config === undefined) {
      throw new Error('You need to read config file first');
    }
    Logger.info('Starting job ' + this.config.name);
    let stepLength = this.config.steps.length;

    for (let remoteIp of this.config.remote) {
      // Setup remote
      let remote = new Remote({
        showOutput: this.config.output,
        remoteIP: remoteIp,
        password: this.config.login.password,
        username: this.config.login.username,
        concurrency: this.concurrency,
      });

      await remote.connect();
      Logger.warning(`${remoteIp} is connected`);

      // run steps
      let count = 0;
      for (let step of this.config.steps) {
        const { files, directory, run, cwd, env, catch_err, name, with_root } =
          step;

        // start running command
        if (run !== undefined) {
          await remote.runCommand(count, {
            command: run,
            cwd,
            envs: env,
            catchErr: catch_err ?? false,
            withRoot: with_root ?? false,
          });
        } else if (files !== undefined) {
          await remote.putFiles(count, files);
        } else if (directory !== undefined) {
          await remote.putDirectory(count, directory);
        } else {
          throw new Error('Nothing to run');
        }
        count++;
      }
    }
  }

  async sleep(time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }
}
