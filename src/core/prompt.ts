import { createInterface, emitKeypressEvents } from 'node:readline';
import { color, log, symbols } from './ui.js';

const ESC = '';
const CURSOR_UP = (n: number): string => `${ESC}[${n}A`;
const CLEAR_BELOW = `${ESC}[0J`;
const CLEAR_LINE_END = `${ESC}[0K`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export interface Choice<T> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Arrow-key single-select. With no TTY it resolves to the default choice so that
 * `agentic-sdlc init` stays usable in CI and in piped shells.
 */
export function select<T>(message: string, choices: Choice<T>[], initial = 0): Promise<T> {
  if (choices.length === 0) throw new Error('select() requires at least one choice');
  const at = (i: number): Choice<T> => {
    const choice = choices[Math.min(Math.max(i, 0), choices.length - 1)];
    if (choice === undefined) throw new Error('select(): index out of range');
    return choice;
  };
  if (!isInteractive()) return Promise.resolve(at(initial).value);

  return new Promise((resolve) => {
    let index = Math.min(Math.max(initial, 0), choices.length - 1);
    const { stdin, stdout } = process;
    emitKeypressEvents(stdin);
    const wasRaw = stdin.isRaw === true;
    stdin.setRawMode(true);
    stdin.resume();
    stdout.write(HIDE_CURSOR);

    const render = (firstPaint: boolean): void => {
      if (!firstPaint) stdout.write(CURSOR_UP(choices.length + 1));
      stdout.write(`${CLEAR_BELOW}${color.bold(message)}\n`);
      choices.forEach((choice, i) => {
        const active = i === index;
        const marker = active ? symbols.arrow : ' ';
        const label = active ? color.cyan(choice.label) : choice.label;
        const hint = choice.hint === undefined ? '' : color.gray(`  ${choice.hint}`);
        stdout.write(`${marker} ${label}${hint}${CLEAR_LINE_END}\n`);
      });
    };

    const cleanup = (): void => {
      stdin.removeListener('keypress', onKey);
      if (stdin.setRawMode) stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write(SHOW_CURSOR);
    };

    function onKey(_: string, key: { name?: string; ctrl?: boolean }): void {
      if (key.ctrl === true && key.name === 'c') {
        cleanup();
        stdout.write('\n');
        process.exit(130);
      }
      if (key.name === 'up' || key.name === 'k') {
        index = (index - 1 + choices.length) % choices.length;
        render(false);
      } else if (key.name === 'down' || key.name === 'j') {
        index = (index + 1) % choices.length;
        render(false);
      } else if (key.name === 'return') {
        render(false);
        cleanup();
        resolve(at(index).value);
      }
    }

    render(true);
    stdin.on('keypress', onKey);
  });
}

export async function confirm(message: string, fallback = true): Promise<boolean> {
  if (!isInteractive()) return fallback;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = fallback ? 'Y/n' : 'y/N';
  const answer = await new Promise<string>((resolve) => {
    rl.question(`${color.bold(message)} ${color.gray(`(${suffix})`)} `, resolve);
  });
  rl.close();
  const normalised = answer.trim().toLowerCase();
  if (normalised === '') return fallback;
  return normalised === 'y' || normalised === 'yes';
}

export function note(msg: string): void {
  log(color.gray(msg));
}
