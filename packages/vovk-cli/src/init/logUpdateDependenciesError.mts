import chalkHighlightThing from "../utils/chalkHighlightThing.mjs";
import getLogger from "../utils/getLogger.mjs";
import { getPackageManager } from "./installDependencies.mjs";

export default function logUpdateDependenciesError(
    {
      useNpm,
      useYarn,
      usePnpm,
      useBun,
      log,
      dependencies,
      devDependencies,
      error
    }: {
      useNpm?: boolean;
      useYarn?: boolean;
      usePnpm?: boolean;
      useBun?: boolean;
      log: ReturnType<typeof getLogger>;
      dependencies: string[],
      devDependencies: string[],
      error: Error
    },
  ) {
    const packageManager = getPackageManager({ useNpm, useYarn, usePnpm, useBun });  
    const installCommands: string[] = [];
  
    if (dependencies.length > 0) {
      let depInstallCmd = '';
      switch (packageManager) {
        case 'npm':
          depInstallCmd = `npm install ${dependencies.join(' ')}`;
          break;
        case 'yarn':
          depInstallCmd = `yarn add ${dependencies.join(' ')}`;
          break;
        case 'pnpm':
          depInstallCmd = `pnpm add ${dependencies.join(' ')}`;
          break;
        case 'bun':
          depInstallCmd = `bun add ${dependencies.join(' ')}`;
          break;
      }
      installCommands.push(depInstallCmd);
    }
  
    if (devDependencies.length > 0) {
      let devDepInstallCmd = '';
      switch (packageManager) {
        case 'npm':
          devDepInstallCmd = `npm install -D ${devDependencies.join(' ')}`;
          break;
        case 'yarn':
          devDepInstallCmd = `yarn add --dev ${devDependencies.join(' ')}`;
          break;
        case 'pnpm':
          devDepInstallCmd = `pnpm add -D ${devDependencies.join(' ')}`;
          break;
        case 'bun':
          devDepInstallCmd = `bun add -d ${devDependencies.join(' ')}`;
          break;
      }
      installCommands.push(devDepInstallCmd);
    }
  
    const installCmd = installCommands.join(' && ');
  
    // Log the error with the appropriate manual installation instructions
    log.error(
      `Failed to update dependencies: ${error.message}. Please, install them manually with ${chalkHighlightThing(installCmd)}`
    );
  }
  