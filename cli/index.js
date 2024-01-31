#!/usr/bin/env node
// @ts-check
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const generateClient = require('./generateClient');
const path = require('path');
const parallel = require('./lib/parallel');
const getAvailablePort = require('./lib/getAvailablePort');
const getVars = require('./getVars');

const builder = {
  config: {
    type: 'string',
    default: path.join(process.cwd(), 'vovk.config.js'),
    describe: 'Path to vovk.config.js',
  },

  project: {
    type: 'string',
    default: process.cwd(),
    describe: 'Path to Next.js project',
  },

  clientOut: {
    type: 'string',
    default: path.join(process.cwd(), './node_modules/.vovk'),
    describe: 'Path to output directory',
  },
};

/** @type {{ config: string, project: string, clientOut: string }} */
// @ts-expect-error yargs
const argv = yargs(hideBin(process.argv)) // @ts-expect-error yargs
  .command('dev', 'Run development server', builder) // @ts-expect-error yargs
  .command('build', 'Build the app', builder) // @ts-expect-error yargs
  .command('generate', 'Generate client', builder).argv;

const nextArgs = process.argv.join(' ').split(' -- ')[1] ?? '';

const env = getVars(argv.config, { VOVK_CLIENT_OUT: argv.clientOut });

let VOVK_PORT = parseInt(env.VOVK_PORT);

// @ts-expect-error yargs
if (argv._.includes('dev')) {
  void (async () => {
    env.VOVK_PORT = await getAvailablePort(VOVK_PORT, 20).catch(() => {
      throw new Error(' 🐺 Failed to find available port');
    });
    await parallel(
      [
        {
          command: `node ${__dirname}/server.js`,
          name: 'Vovk',
        },
        { command: `cd ${argv.project} && npx next dev ${nextArgs}`, name: 'Next' },
      ],
      env
    ).catch((e) => console.error(e));
    console.info(' 🐺 All processes have completed');
  })();
}

// @ts-expect-error yargs
if (argv._.includes('build')) {
  void (async () => {
    env.VOVK_PORT = await getAvailablePort(VOVK_PORT, 20).catch(() => {
      throw new Error(' 🐺 Failed to find available port');
    });
    await parallel(
      [
        {
          command: `node ${__dirname}/server.js --once`,
          name: 'Vovk',
        },
        { command: `cd ${argv.project} && npx next build ${nextArgs}`, name: 'Next' },
      ],
      env
    ).catch((e) => console.error(e));
  })();
}

// @ts-expect-error yargs
if (argv._.includes('generate')) {
  void generateClient(env).then(({ path }) => {
    console.info(` 🐺 Client generated in ${path}`);
  });
}
