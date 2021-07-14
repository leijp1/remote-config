import { NodeSSH } from 'node-ssh';
import { Directory } from '../config/config-interface';
import Logger from '../logger';

interface Param {
  remoteIP: string;
  username: string;
  password: string;
  concurrency: number;
}

interface Command {
  command: string;
  cwd?: string;
  envs?: string[];
  catchErr: boolean;
}

export class Remote {
  private remoteIP: string;
  private username: string;
  private password: string;
  private concurrency: number;
  private ssh: NodeSSH | undefined;

  constructor({ remoteIP, username, password, concurrency }: Param) {
    this.remoteIP = remoteIP;
    this.username = username;
    this.password = password;
    this.concurrency = concurrency;
  }

  async connect() {
    this.ssh = new NodeSSH();
    await this.ssh.connect({
      host: this.remoteIP,
      username: this.username,
      password: this.password,
    });
  }

  async runCommand({ command, envs, cwd, catchErr }: Command) {
    if (this.ssh === undefined) {
      throw new Error('You need to connect to the remote server first');
    }

    if (envs) {
      // set environments
    }

    let result = await this.ssh.execCommand(command, {
      cwd,
      onStdout: (out) => {
        Logger.info(out.toString());
      },
      onStderr: (err) => {
        if (catchErr) {
          throw new Error(result.stderr);
        } else {
          Logger.error(result.stderr);
        }
      },
    });
  }

  async putFiles(files: Directory[]) {
    if (this.ssh === undefined) {
      throw new Error('You need to connect to the remote server first');
    }
    let result = await this.ssh.putFiles(files, {
      concurrency: this.concurrency,
    });
  }

  async putDirectory({ local, remote }: Directory) {
    if (this.ssh === undefined) {
      throw new Error('You need to connect to the remote server first');
    }
    let result = await this.ssh.putDirectory(local, remote, {
      concurrency: this.concurrency,
    });
  }
}
