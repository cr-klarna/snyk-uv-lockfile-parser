import { DepGraph, DepGraphBuilder, PkgInfo } from '@snyk/dep-graph';
import { UVLockFileDependency } from './lock-file-parser';
import { Dependency } from './manifest-parser';

// UV uses the virtualenv to create an environment and this comes some
// packages pre-installed, therefore they won't be part of the lockfile.
const IGNORED_DEPENDENCIES: string[] = [
  'setuptools',
  'distribute',
  'pip',
  'wheel',
];

export function build(
  pkgDetails: PkgInfo,
  dependencies: Dependency[],
  pkgSpecs: UVLockFileDependency[],
): DepGraph {
  const builder = new DepGraphBuilder({ name: 'uv' }, pkgDetails);
  addDependenciesToGraph(dependencies, pkgSpecs, builder.rootNodeId, builder);
  return builder.build();
}

function addDependenciesToGraph(
  dependencies: Dependency[],
  pkgSpecs: UVLockFileDependency[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
  for (const dep of dependencies) {
    addDependenciesForPkg(dep, pkgSpecs, parentNodeId, builder);
  }
}

function addDependenciesForPkg(
  dependency: Dependency,
  pkgSpecs: UVLockFileDependency[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
  const pkgName = dependency.name;
  if (IGNORED_DEPENDENCIES.includes(pkgName)) {
    return;
  }
  const pkg = pkgLockInfoFor(pkgName, pkgSpecs);
  if (!pkg) {
    return;
  }
  if (isPkgAlreadyInGraph(pkg, builder)) {
    builder.connectDep(parentNodeId, pkg.name);
    return;
  }

  const pkgInfo: PkgInfo = { name: pkg.name, version: pkg.version };
  builder
    .addPkgNode(pkgInfo, pkg.name, {
      labels: { scope: dependency.isDev ? 'dev' : 'prod' },
    })
    .connectDep(parentNodeId, pkg.name);
  addDependenciesToGraph(
    pkg.dependencies.map((dep) => ({
      name: dep,
      isDev: dependency.isDev,
    })),
    pkgSpecs,
    pkg.name,
    builder,
  );
}

function isPkgAlreadyInGraph(
  pkg: UVLockFileDependency,
  builder: DepGraphBuilder,
): boolean {
  return builder
    .getPkgs()
    .some(
      (existingPkg) =>
        existingPkg.name === pkg.name && existingPkg.version === pkg.version,
    );
}

function pkgLockInfoFor(
  pkgName: string,
  pkgSpecs: UVLockFileDependency[],
): UVLockFileDependency | undefined {
  // From PEP 426 https://www.python.org/dev/peps/pep-0426/#name
  // All comparisons of distribution names MUST be case insensitive, and MUST
  // consider hyphens and underscores to be equivalent
  const pkgLockInfo = pkgSpecs.find(
    (lockItem) =>
      lockItem.name.toLowerCase().replace(/_/g, '-') ===
        pkgName.toLowerCase().replace(/_/g, '-') ||
      lockItem.name.toLowerCase().replace(/-/g, '_') ===
        pkgName.toLowerCase().replace(/-/g, '_'),
  );

  if (!pkgLockInfo) {
    console.warn(
      `Could not find any lockfile metadata for package: ${pkgName}. This package will not be represented in the dependency graph.`,
    );
  }
  return pkgLockInfo;
}
