import { NodeSSH } from 'node-ssh';
import { Directory } from '../config/config-interface';
import Logger from '../logger';

interface Param {
  remoteIP: string;
  username: string;
  password: string;
  concurrency: number;
  showOutput: boolean;
}

interface ReplaceParams {
  index: number;
}

interface Command {
  command: string;
  cwd?: string;
  envs?: string[];
  catchErr: boolean;
  withRoot: boolean;
}

export class Remote {
  private remoteIP: string;
  private username: string;
  private password: string;
  private concurrency: number;
  private ssh: NodeSSH | undefined;
  private showOutput: boolean;

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
    { command, envs, cwd, catchErr, withRoot }: Command
  ) {
    if (this.ssh === undefined) {
      throw new Error('You need to connect to the remote server first');
    }

    let newCommand = this.replacePlaceHolder(command, { index });
    console.log();
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
  }

  async putFiles(index: number, files: Directory[]) {
    if (this.ssh === undefined) {
      throw new Error('You need to connect to the remote server first');
    }
    let newFiles = files.map((f) => {
      return {
        local: this.replacePlaceHolder(f.local, { index }),
        remote: this.replacePlaceHolder(f.remote, { index }),
      };
    });

    Logger.info('Copy local files ' + newFiles.map((f) => f.local));
    let result = await this.ssh.putFiles(newFiles, {
      concurrency: this.concurrency,
    });
  }

  async putDirectory(index: number, { local, remote }: Directory) {
    if (this.ssh === undefined) {
      throw new Error('You need to connect to the remote server first');
    }
    let result = await this.ssh.putDirectory(local, remote, {
      concurrency: this.concurrency,
    });
  }

  replacePlaceHolder(name: string, { index }: ReplaceParams) {
    let newName = name.replace('{index}', `${index}`);
    return newName;
  }
}
