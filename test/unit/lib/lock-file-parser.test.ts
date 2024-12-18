import { packageSpecsFrom } from '../../../lib/lock-file-parser';
import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';

describe('when loading lockfile', () => {
  it('should throw LockFileNotValid if toml parsing throws an error', () => {
    const fileContents = `[[package]
      version = '1.0.0"`;
    expect(() => packageSpecsFrom(fileContents)).toThrow(
      OpenSourceEcosystems.UnparseableLockFileError,
    );
  });
  it('should throw exception if package stanza not found', () => {
    expect(() => packageSpecsFrom('')).toThrow(
      OpenSourceEcosystems.UnparseableLockFileError,
    );
  });

  it('should parse a lockfile and return a list of its packages and their dependency names', () => {
    const fileContents = `[[package]]
      name = "pkg_a"
      version = "2.11.2"

      dependencies = [
        { name = "pkg_b" }
      ]

      [[package]]
      name = "pkg_b"
      version = "1.1.1"`;
    const lockFileDependencies = packageSpecsFrom(fileContents);
    expect(lockFileDependencies.length).toBe(2);
    expect(lockFileDependencies).toContainEqual({
      name: 'pkg_a',
      version: '2.11.2',
      dependencies: ['pkg_b'],
    });
    expect(lockFileDependencies).toContainEqual({
      name: 'pkg_b',
      version: '1.1.1',
      dependencies: [],
    });
  });

  it('should return an empty list when no packages are specified in file', () => {
    const lockFileDependencies = packageSpecsFrom('package = []');
    expect(lockFileDependencies.length).toBe(0);
  });
});
