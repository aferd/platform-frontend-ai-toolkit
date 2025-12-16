import path from 'path';
import { readJsonFile } from './readFile';
import { resolveModule } from './moduleResolver';

type VerifyLocalPackageStatus = {
  exists: boolean;
  version: string;
  packageRoot: string;
  error?: Error;
};

/**
 * Verifies if a local package exists and retrieves its version and root path.
 *
 * @param packageName string - The name of the local package to verify.
 * @param nodeModulesRootPath string - Optional absolute path to the node_modules directory root.
 * @returns {Promise<VerifyLocalPackageStatus>} Verification status including existence, version, and root path.
 */
export const verifyLocalPackage = async (packageName: string, nodeModulesRootPath?: string) : Promise<VerifyLocalPackageStatus> => {
  const errorStatus : VerifyLocalPackageStatus = {
    exists: false,
    version: '',
    packageRoot: ''
  };

  if (!packageName || typeof packageName !== 'string') {
    return { ...errorStatus, error: new Error(`Invalid package name: ${packageName}`) };
  }

  // Use provided nodeModulesRootPath or fall back to current working dir of agent
  const projectRoot = nodeModulesRootPath || process.cwd();

  try {
    // TODO: consider monorepo setup in the future
    const nodeModulesPath = nodeModulesRootPath ? projectRoot : `${projectRoot}/node_modules`;
    const pkgPath = resolveModule(`${nodeModulesPath}/${packageName}/package.json`);
    const packageDir = path.dirname(pkgPath).replace(/^file:\/\//, '');
    const data = await readJsonFile<{ version: string }>(pkgPath.replace(/^file:\/\//, ''));

    return {
      exists: true,
      version: data.version || '',
      packageRoot: packageDir
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return { ...errorStatus, error: new Error(`Error resolving package "${packageName}": ${message}`) };
  }
};
