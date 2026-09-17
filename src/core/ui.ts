const ESC = '';

const noColor =
  process.env.NO_COLOR !== undefined ||
  process.env.TERM === 'dumb' ||
  !process.stdout.isTTY;

// Legacy Windows consoles render these glyphs as mojibake; Windows Terminal is fine.
const asciiOnly = process.platform === 'win32' && process.env.WT_SESSION === undefined;

const wrap = (open: string, close: string) => (s: string) =>
  noColor ? s : `${ESC}[${open}m${s}${ESC}[${close}m`;

export const color = {
  bold: wrap('1', '22'),
  dim: wrap('2', '22'),
  red: wrap('31', '39'),
  green: wrap('32', '39'),
  yellow: wrap('33', '39'),
  blue: wrap('34', '39'),
  magenta: wrap('35', '39'),
  cyan: wrap('36', '39'),
  gray: wrap('90', '39'),
};

const glyph = (fancy: string, plain: string): string => (asciiOnly ? plain : fancy);

export const symbols = {
  ok: color.green(glyph('✓', '+')),
  warn: color.yellow(glyph('⚠', '!')),
  fail: color.red(glyph('✗', 'x')),
  skip: color.gray(glyph('·', '-')),
  arrow: color.cyan(glyph('❯', '>')),
  robot: glyph('\u{1f916}', '::'),
};

export function log(msg = ''): void {
  process.stdout.write(`${msg}\n`);
}

export function heading(msg: string): void {
  log();
  log(color.bold(msg));
}

export function bullet(sym: string, msg: string): void {
  log(`  ${sym} ${msg}`);
}

export function fatal(msg: string): never {
  process.stderr.write(`${symbols.fail} ${msg}\n`);
  process.exit(1);
}
