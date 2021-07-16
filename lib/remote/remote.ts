import { NodeSSH } from 'node-ssh';
import { Directory } from '../config/config-interface';
import Logger from '../logger';
import {Command, ReplaceParams, Result} from "./remoteInterface";

interface Param {
  remoteIP: string;
  username: string;
  password: string;
  concurrency: number;
  showOutput: boolean;
}



export class Remote {
  private readonly remoteIP: string;
  private readonly username: string;
  private readonly password: string;
  private readonly concurrency: number;
  private ssh: NodeSSH | undefined;
  private readonly showOutput: boolean;

  constructor({
    remoteIP,
    username,
    password,
    concurrency,
    showOutput,
  }: Param) {
    this.remoteIP = remoteIP;
    this.username = username;
    this.password = password;
    this.concurrency = concurrency;
    this.showOutput = showOutput;
  }

  async connect() {
    this.ssh = new NodeSSH();
    await this.ssh.connect({
      host: this.remoteIP,
      username: this.username,
      password: this.password,
    });
  }

  async runCommand(
    index: number,
    { command, envs, cwd, catchErr, withRoot, name }: Command
  ): Promise<Result | undefined> {
    if (this.ssh === undefined) {
      throw new Error('You need to connect to the remote server first');
    }
    // Logging
    let cmdName = name ?? command
    Logger.info(`${this.remoteIP}: Running command ${cmdName}`)
    // Run command
    let newCommand = this.replacePlaceHolder(command, { index });
    const onError = (err: Buffer) => {
      if (catchErr) {
        throw new Error(err.toString());
      } else {
        Logger.error(err.toString());
      }
    };

    const onStdOut = (out: Buffer) => {
      if (this.showOutput) {
        console.log(out.toString());
      }
    };

    if (envs) {
      // set environments
    }

    if (withRoot) {
      let cmds = newCommand.split(' ');
      await this.ssh.exec('sudo', cmds, {
        cwd,
        stdin: this.password + '\n',
        execOptions: {
          pty: true,
        },
        onStdout: onStdOut,
        onStderr: onError,
      });
    } else {
      await this.ssh.execCommand(newCommand, {
        cwd,
        onStdout: onStdOut,
        onStderr: onError,
      });
    }

    return {
      name: cmdName,
      type: "command",
      success: true,
      remote: this.remoteIP,
    }
  }

  async putFiles(index: number, files: Directory[]): Promise<Result | undefined> {
    if (this.ssh === undefined) {
      throw new Error('You need to connect to the remote server first');
    }
    let newFiles = files.map((f) => {
      return {
        local: this.replacePlaceHolder(f.local, { index }),
        remote: this.replacePlaceHolder(f.remote, { index }),
      };
    });

    Logger.info(`${this.remoteIP}: Copy local files ` + newFiles.map((f) => f.local));
    await this.ssh.putFiles(newFiles, {
      concurrency: this.concurrency,
    });

    return {
      remote: this.remoteIP,
      type: "file",
      success: true,
      files: newFiles,
    }
  }

  async putDirectory(index: number, { local, remote }: Directory): Promise<Result | undefined> {
    if (this.ssh === undefined) {
      throw new Error('You need to connect to the remote server first');
    }
    Logger.info(`${this.remoteIP}: Putting directory ${local} to ${remote}`)
    let result = await this.ssh.putDirectory(local, remote, {
      concurrency: this.concurrency,
    });

    return {
      type: "directory",
      remote: this.remoteIP,
      success: result,
    }
  }

  replacePlaceHolder(name: string, { index }: ReplaceParams) {
    let newName = name.replace('{index}', `${index}`);
    return newName;
  }
}
