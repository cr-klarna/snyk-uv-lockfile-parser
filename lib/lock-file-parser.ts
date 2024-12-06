import * as toml from '@iarna/toml';
import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';

export function packageSpecsFrom(
  lockFileContents: string,
): UVLockFileDependency[] {
  let lockFile: UVLockFile;
  try {
    lockFile = toml.parse(lockFileContents) as unknown as UVLockFile;
  } catch (error) {
    throw new OpenSourceEcosystems.UnparseableLockFileError(
      'The uv.lock file is not parsable.',
      { error },
    );
  }

  if (!lockFile.package) {
    throw new OpenSourceEcosystems.UnparseableLockFileError(
      'The uv.lock file contains no package stanza.',
    );
  }

  return lockFile.package
    .filter((pkg) => pkg.source?.virtual !== '.')
    .map((pkg) => {
      return {
        name: pkg.name,
        version: pkg.version,
        dependencies: pkg.dependencies?.map((dep) => dep.name) || [],
      };
    });
}

interface UVLockFile {
  package: Package[];
}

interface UVLockFileDependencyDeclaration {
  name: string;
}

interface PackageSource {
  registry?: string;
  virtual?: string;
}

interface Package {
  name: string;
  source?: PackageSource;
  version: string;
  dependencies?: UVLockFileDependencyDeclaration[];
}

export interface UVLockFileDependency {
  name: string;
  version: string;
  dependencies: string[];
}
