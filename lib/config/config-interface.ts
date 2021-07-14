export interface Config {
  name: string;
  remote: string[];
  login: Login;
  logger: Logger;
  steps: Step[];
}

export interface Logger {
  output: string;
}

export interface Login {
  username: string;
  password: string;
}

export interface Step {
  run?: string;
  catch_err?: boolean;
  files?: Directory[];
  directory?: Directory;
  env?: string[];
  cwd?: string;
  name?: string;
}

export interface Directory {
  local: string;
  remote: string;
}
