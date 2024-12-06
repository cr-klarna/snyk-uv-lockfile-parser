import { DepGraph, PkgInfo } from '@snyk/dep-graph';
import * as manifest from './manifest-parser';
import * as lockFile from './lock-file-parser';
import { UVLockFileDependency } from './lock-file-parser';
import * as uvDepGraphBuilder from './uv-dep-graph-builder';

export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
  includeDevDependencies = false,
): DepGraph {
  const dependencies: manifest.Dependency[] = manifest.getDependenciesFrom(
    manifestFileContents,
    includeDevDependencies,
  );
  const pkgDetails: PkgInfo = manifest.pkgInfoFrom(manifestFileContents);
  const pkgSpecs: UVLockFileDependency[] =
    lockFile.packageSpecsFrom(lockFileContents);
  return uvDepGraphBuilder.build(pkgDetails, dependencies, pkgSpecs);
}
