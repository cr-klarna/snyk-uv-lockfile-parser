import { build } from '../../../lib/uv-dep-graph-builder';
import { UVLockFileDependency } from '../../../lib/lock-file-parser';
import { PkgInfo } from '@snyk/dep-graph';

describe('uv-dep-graph-builder', () => {
  const rootPkg: PkgInfo = { name: 'RootPkg', version: '1.0.0' };

  describe('build', () => {
    it('should return a graph of given dependencies successfully', () => {
      // given
      const pkgA = generateUVLockFileDependency('pkg-a');
      const pkgB = generateUVLockFileDependency('pkg_b', ['pkg-c']);
      const pkgC = generateUVLockFileDependency('pkg-c');
      const pkgSpecs: UVLockFileDependency[] = [pkgA, pkgB, pkgC];

      // when
      const result = build(
        rootPkg,
        [
          { name: 'pkg-a', isDev: false },
          { name: 'pkg-b', isDev: false },
        ],
        pkgSpecs,
      );

      // then
      const resultGraph = result.toJSON().graph;
      expect(resultGraph.nodes).toHaveLength(4);
      const rootNode = resultGraph.nodes.find(
        (node) => node.pkgId === `${rootPkg.name}@${rootPkg.version}`,
      );
      expect(rootNode!.deps).toHaveLength(2);
      const nodeWithTransitive = resultGraph.nodes.find(
        (node) => node.nodeId === pkgB.name,
      );
      expect(nodeWithTransitive!.deps).toHaveLength(1);
      expect(nodeWithTransitive!.deps[0].nodeId).toBe(pkgC.name);
    });

    it('should ignore uv installed virtualenv packages as transitives', () => {
      // given
      const pkgA = generateUVLockFileDependency('pkg-a');
      const wheel = generateUVLockFileDependency('wheel');
      const setuptools = generateUVLockFileDependency('setuptools');
      const distribute = generateUVLockFileDependency('distribute');
      const pip = generateUVLockFileDependency('pip');
      pkgA.dependencies = [
        wheel.name,
        setuptools.name,
        distribute.name,
        pip.name,
      ];

      // when
      const result = build(rootPkg, [{ name: 'pkg-a', isDev: false }], [pkgA]);

      // then
      const resultGraph = result.toJSON().graph;
      expect(resultGraph.nodes).toHaveLength(2);
      const nodeWithVirtualEnvDeps = resultGraph.nodes.find(
        (node) => node.nodeId === pkgA.name,
      );
      expect(nodeWithVirtualEnvDeps!.deps).toHaveLength(0);
    });

    it('should not add node twice when there are circular dependencies', () => {
      // given
      const pkgA = generateUVLockFileDependency('pkg-a', ['pkg-b']);
      const pkgB = generateUVLockFileDependency('pkg-b', ['pkg-a']);
      const pkgC = generateUVLockFileDependency('pkg-c', ['pkg-a']);

      // when
      const result = build(
        rootPkg,
        [
          { name: 'pkg-a', isDev: false },
          { name: 'pkg-b', isDev: false },
          { name: 'pkg-c', isDev: false },
        ],
        [pkgA, pkgB, pkgC],
      );

      // then
      expect(result).toBeDefined();
      const aNodes = result
        .toJSON()
        .graph.nodes.filter((node) => node.nodeId === pkgA.name);
      const bNodes = result
        .toJSON()
        .graph.nodes.filter((node) => node.nodeId === pkgB.name);
      const cNode = result
        .toJSON()
        .graph.nodes.find((node) => node.nodeId === pkgC.name);
      expect(aNodes).toHaveLength(1);
      expect(bNodes).toHaveLength(1);
      expect(cNode).toBeDefined();
      expect(cNode!.deps).toHaveLength(1);
    });

    it('should treat underscores in manifest as equal to hyphens in lockfile', () => {
      // given
      const pkgA = generateUVLockFileDependency('pkg-a');

      // when
      const result = build(rootPkg, [{ name: 'pkg-a', isDev: false }], [pkgA]);

      // then
      expect(result).toBeDefined();
      const hyphenatedNode = result
        .toJSON()
        .graph.nodes.filter((node) => node.nodeId === pkgA.name);
    });

    it('should treat hyphens in manifest as equal to underscores in lockfile', () => {
      // given
      const pkgA = generateUVLockFileDependency('pkg_a');

      // when
      const result = build(rootPkg, [{ name: 'pkg-a', isDev: false }], [pkgA]);

      // then
      expect(result).toBeDefined();
      const hyphenatedNode = result
        .toJSON()
        .graph.nodes.filter((node) => node.nodeId === pkgA.name);
    });

    it('should log warning if metadata cannot be found in pkgSpecs', () => {
      // given
      const missingPkg = 'non-existent-pkg';
      const pkgA = generateUVLockFileDependency('pkg-a', ['non-existent-pkg']);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // when
      build(rootPkg, [{ name: 'pkg-a', isDev: false }], [pkgA]);

      // then
      const expectedWarningMessage = `Could not find any lockfile metadata for package: ${missingPkg}. This package will not be represented in the dependency graph.`;
      expect(consoleSpy).toBeCalledWith(expectedWarningMessage);
    });
  });
});

function generateUVLockFileDependency(
  pkgName: string,
  dependencies: string[] = [],
): UVLockFileDependency {
  return { name: pkgName, version: '1.0.0', dependencies: dependencies };
}
