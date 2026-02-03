import { spawn } from 'child_process';

export type RunCommandResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  output: string;
};
/**
 * Run a shell command
 * @param command The command to run
 * @param options Options including current working directory and environment variables
 * @returns A promise that resolves with the result of the command execution
 */
export async function runCommand(
  command: string,
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
  }
): Promise<RunCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: options.cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        ...options.env,
      },
      shell: true,
      windowsHide: false,
    });

    let output = '';
    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      output += data.toString();
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.on('close', (code, signal) => {
      resolve({ code, signal, output });
    });
  });
}
