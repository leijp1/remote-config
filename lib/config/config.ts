import fs from 'fs';
import YAML from 'yaml';
import {Config, Logger as ConfigLogger, Login} from './config-interface';

import cliProgress from 'cli-progress';
import Logger from '../logger';
import {Remote} from '../remote/remote';
import {throws} from 'assert';
import {Result} from "../remote/remoteInterface";

interface Param {
    filePath: string;
    concurrency: number;
}

export class ConfigParser {
    private readonly filePath: string;
    config: Config | undefined;
    private readonly concurrency: number;

    constructor({filePath, concurrency}: Param) {
        this.filePath = filePath;
        this.concurrency = concurrency;
    }

    readFile() {
        let file = fs.readFileSync(this.filePath, 'utf-8');
        let config: Config = YAML.parse(file);
        Logger.info('Finish reading configuration file');
        // Check if the yaml file meets the requirement
        if (config.logger === undefined) {
            config.logger = {output: './'};
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

    /**
     * Private helper method to run command
     * @param remoteIp
     * @param count
     * @private
     */
    private async runCommandHelper(remoteIp: string, count: number): Promise<Result[]> {
        let results: Result[] = []
        try {
            if (this.config === undefined) {
                return []
            }

            // Setup remote
            let remote = new Remote({
                showOutput: this.config.output,
                remoteIP: remoteIp,
                password: this.config.login.password,
                username: this.config.login.username,
                concurrency: this.concurrency,
            });

            await remote.connect();
            Logger.warning(`${remoteIp}: Connected`);
            // run step
            for (let step of this.config!.steps) {
                const {files, directory, run, cwd, env, catch_err, name, with_root} =
                    step;
                let result: Result | undefined = undefined
                // start running command
                if (run !== undefined) {
                    result = await remote.runCommand(count, {
                        command: run,
                        cwd,
                        envs: env,
                        catchErr: catch_err ?? false,
                        withRoot: with_root ?? false,
                    });
                } else if (files !== undefined) {
                    result = await remote.putFiles(count, files);
                } else if (directory !== undefined) {
                    result = await remote.putDirectory(count, directory);
                } else {
                    Logger.error("Nothing to run")
                }

                if (result) {
                    results.push(result)
                }
            }
            return results
        } catch (err) {
            Logger.error("Cannot run set up on remote " + remoteIp + " because" + err)
            return results
        }
    }

    /**
     * Run Command.
     * Will run command in parallel if config.concurrency is set
     */
    async runRemoteCommand(): Promise<Result[][] | undefined> {
        let returnResults: Result[][] = []
        if (this.config === undefined) {
            throw new Error('You need to read config file first');
        }
        Logger.info('Starting job ' + this.config.name);
        let concurrency = this.config.concurrency ?? 1;
        // Perform deep copy
        let remoteAddresses: string[] = JSON.parse(JSON.stringify(this.config.remote))
        let count = 0
        while (remoteAddresses.length > 0) {
            // Split array into a small size of chunk
            let remotes = remoteAddresses.splice(0, concurrency)
            let promises = remotes.map((r, index) => this.runCommandHelper(r, index + count))
            let results = await Promise.all(promises)
            returnResults = returnResults.concat(results)
            count += remotes.length
        }

        return returnResults
    }

}
