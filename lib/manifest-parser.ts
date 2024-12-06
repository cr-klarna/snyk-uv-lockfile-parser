import * as toml from '@iarna/toml';
import { PkgInfo } from '@snyk/dep-graph';
import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';

export function pkgInfoFrom(manifestFileContents: string): PkgInfo {
  let manifest: UVManifestType;
  try {
    manifest = toml.parse(manifestFileContents) as unknown as UVManifestType;
    return {
      name: manifest.project.name,
      version: manifest.project.version,
    };
  } catch (error) {
    throw new OpenSourceEcosystems.UnparseableManifestError(
      'The pyproject.toml file is not parsable.',
      { error },
    );
  }
}

export function getDependenciesFrom(
  manifestFileContents: string,
  includeDevDependencies: boolean,
): Dependency[] {
  let manifest: UVManifestType;
  try {
    manifest = toml.parse(manifestFileContents) as unknown as UVManifestType;
  } catch (error) {
    throw new OpenSourceEcosystems.UnparseableManifestError(
      'The pyproject.toml file is not parsable.',
      { error },
    );
  }

  if (!manifest.project) {
    throw new OpenSourceEcosystems.UnparseableManifestError(
      'The pyproject.toml is not a valid uv file.',
    );
  }

  const dependencies: Dependency[] = dependenciesFrom(manifest).map((dep) => ({
    name: dep,
    isDev: false,
  }));
  const devDependencies: Dependency[] = (
    includeDevDependencies ? devDependenciesFrom(manifest) : []
  ).map((devDep) => ({
    name: devDep,
    isDev: true,
  }));

  return [...dependencies, ...devDependencies].filter(
    (pkg) => pkg.name != 'python',
  );
}

const getGroupDevDepNames = (deps: DependencyDeclaration[]): string[] => {
  const groupDevDepNames = deps.map(nameFromDependencyDeclaration);
  return groupDevDepNames;
};

function getAllDevDependencyNames(manifest: UVManifestType): string[] {
  const uvTool = manifest.tool?.uv;
  let legacyDevDeps: string[] = [];
  if (uvTool) {
    legacyDevDeps = (uvTool['dev-dependencies'] || []).map(
      nameFromDependencyDeclaration,
    );
  }
  const groupedDepsProperty = Object.values(manifest['dependency-groups'] || {})
    .map((group) => getGroupDevDepNames(group))
    .reduce((acc, curr) => [...acc, ...curr], []);
  return [...legacyDevDeps, ...groupedDepsProperty];
}

function devDependenciesFrom(manifest: UVManifestType): string[] {
  return getAllDevDependencyNames(manifest);
}

function dependenciesFrom(manifest: UVManifestType): string[] {
  return (manifest.project.dependencies || []).map(
    nameFromDependencyDeclaration,
  );
}

function nameFromDependencyDeclaration(dep: string): string {
  dep = dep.split(';')[0]; // ignore environmental markers for now
  return dep
    .split(/(~|=|<|>)=?/)[0]
    .split('[')[0]
    .trim();
}

// Useful if someone wants to use the version from the manifest later
// function versionFromDependencyDeclaration(dep: string): string {
//   dep = dep.split(';')[0]; // ignore environmental markers for now
//   return dep.split(/(=|<|>)=?/)[1].trim();
// }

interface UVManifestType {
  project: Project;
  tool?: Tool;
  'dependency-groups': GroupContainer;
}

interface Project {
  name: string;
  version: string;
  'requires-python': string;
  dependencies: DependencyDeclaration[];
}

interface Tool {
  uv: UVTool;
}

interface UVTool {
  'dev-dependencies'?: DependencyDeclaration[];
}

type DependencyDeclaration = string;

type GroupContainer = Record<string, DependencyDeclaration[]>;

export interface Dependency {
  name: string;
  isDev: boolean;
}
