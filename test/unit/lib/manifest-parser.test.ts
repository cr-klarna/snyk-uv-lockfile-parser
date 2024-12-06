import { getDependenciesFrom, pkgInfoFrom } from '../../../lib/manifest-parser';
import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';

describe('when loading manifest files', () => {
  describe('pkgInfoFrom', () => {
    it('should throw ManifestFileNotValid if toml parsing throws an error', () => {
      const fileContents = `[[tool]`;
      expect(() => pkgInfoFrom(fileContents)).toThrow(
        OpenSourceEcosystems.UnparseableManifestError,
      );
    });
    it('should return package info given the contents of a manifest', () => {
      const fileContents = `[project]
        name = "uv-fixtures-project"
        version = "0.1.0"`;

      const { name, version } = pkgInfoFrom(fileContents);
      expect(name).toBe('uv-fixtures-project');
      expect(version).toBe('0.1.0');
    });

    it('should throw ManifestFileNotValid if it cannot retrieve package information', () => {
      const fileContents = `[build-system]
        requires = ["foo>=0.12"]
        build-backend = "foo.masonry.api"`;
      const errorResult = () => {
        pkgInfoFrom(fileContents);
      };
      expect(errorResult).toThrow(
        OpenSourceEcosystems.UnparseableManifestError,
      );
    });
  });

  describe('getDependenciesFrom', () => {
    it('should throw exception if uv dependencies not found', () => {
      expect(() => getDependenciesFrom('', false)).toThrow(
        OpenSourceEcosystems.UnparseableManifestError,
      );
    });

    it('should return list of dependency package names', () => {
      const fileContents = `[project]
      dependencies = [
        "pkg_a>=2.11",
        "pkg_b>=1.0"
      ]`;
      const uvDependencies = getDependenciesFrom(fileContents, false);
      expect(uvDependencies.length).toBe(2);
      expect(uvDependencies.some((dep) => dep.name === 'pkg_a')).toBe(true);
      expect(uvDependencies.some((dep) => dep.name === 'pkg_b')).toBe(true);
    });

    it('should not return python if listed as a dependency', () => {
      const fileContents = `[project]
      dependencies = [
        "pkg_a>=2.11",
        "python>=2.7,<3.5"
        ]`;
      const uvDependencies = getDependenciesFrom(fileContents, false);
      expect(uvDependencies.length).toBe(1);
      expect(uvDependencies.some((dep) => dep.name === 'pkg_a')).toBe(true);
      expect(uvDependencies.some((dep) => dep.name === 'python')).toBe(false);
    });

    it('should include devDependencies when asked to', () => {
      const fileContents = `[project]
      [dependency-groups]
      dev = [
        "pkg_a>=2.11",
        "pkg_b>=1.0"
      ]
      `;
      const uvDependencies = getDependenciesFrom(fileContents, true);
      expect(uvDependencies.length).toBe(2);
      expect(uvDependencies.some((dep) => dep.name === 'pkg_a')).toBe(true);
      expect(uvDependencies.some((dep) => dep.name === 'pkg_b')).toBe(true);

      // dependency-groups.<group>
      const fileContents2 = `[project]
      dependencies = [
        "pkg_a>=2.11"
      ]
      [dependency-groups]
      dev = [
        "pkg_c>=1.0"
      ]
      `;
      const uvDependencies2 = getDependenciesFrom(fileContents2, true);
      expect(uvDependencies2.length).toBe(2);
      expect(uvDependencies2.some((dep) => dep.name === 'pkg_a')).toBe(true);
      expect(uvDependencies2.some((dep) => dep.name === 'pkg_c')).toBe(true);

      // dev-dependencies & dependency-groups.<group>
      const fileContents3 = `[project]
      dependencies = [
        "pkg_a>=2.11"
      ]
      [tool.uv]
      dev-dependencies = [
        "pkg_b>=1.0"
      ]
      [dependency-groups]
      dev = [
        "pkg_c>=1.0"
      ]
      `;
      const uvDependencies3 = getDependenciesFrom(fileContents3, true);
      expect(uvDependencies3.length).toBe(3);
      expect(uvDependencies3.some((dep) => dep.name === 'pkg_a')).toBe(true);
      expect(uvDependencies3.some((dep) => dep.name === 'pkg_b')).toBe(true);
      expect(uvDependencies3.some((dep) => dep.name === 'pkg_c')).toBe(true);

      // tool.uv.dev-dependencies & multiple dependency-groups.<group>
      const fileContents4 = `[project]
      dependencies = [
        "pkg_a>=2.11"
      ]
      [tool.uv]
      dev-dependencies = [
        "pkg_b>=1.0"
      ]
      [dependency-groups]
      dev = [
        "pkg_c>=1.0"
      ]
      more-dev = [
        "pkg_d>=1.0"
      ]
      even-more-dev = [
        "pkg_e>=1.0"
      ]
      `;
      const uvDependencies4 = getDependenciesFrom(fileContents4, true);
      expect(uvDependencies4.length).toBe(5);
      expect(uvDependencies4.some((dep) => dep.name === 'pkg_a')).toBe(true);
      expect(uvDependencies4.some((dep) => dep.name === 'pkg_b')).toBe(true);
      expect(uvDependencies4.some((dep) => dep.name === 'pkg_c')).toBe(true);
      expect(uvDependencies4.some((dep) => dep.name === 'pkg_d')).toBe(true);
      expect(uvDependencies4.some((dep) => dep.name === 'pkg_e')).toBe(true);
    });

    it('should not include devDependencies when not asked to', () => {
      const fileContents = `[project]
      dependencies = [
        "pkg_a>=2.11"
      ]
      [dependency-groups]
      dev = [
        "pkg_b>=1.0"
      ]`;
      const uvDependencies = getDependenciesFrom(fileContents, false);
      expect(uvDependencies.length).toBe(1);
      expect(uvDependencies.some((dep) => dep.name === 'pkg_a')).toBe(true);
      expect(uvDependencies.some((dep) => dep.name === 'pkg_b')).toBe(false);

      const fileContents2 = `[project]
      dependencies = [
        "pkg_a>=2.11"
      ]
      [dependency-groups]
      dev = [
        "pkg_b>=1.0"
      ]
      more-dev = [
        "pkg_c>=1.0"
      ]
      `;
      const uvDependencies2 = getDependenciesFrom(fileContents2, false);
      expect(uvDependencies2.length).toBe(1);
      expect(uvDependencies2.some((dep) => dep.name === 'pkg_a')).toBe(true);
      expect(uvDependencies2.some((dep) => dep.name === 'pkg_b')).toBe(false);
      expect(uvDependencies2.some((dep) => dep.name === 'pkg_c')).toBe(false);
      expect(uvDependencies2.some((dep) => dep.name === 'pkg_d')).toBe(false);
    });

    it('should not return any dependencies when dependency stanza not present', () => {
      const uvDependencies = getDependenciesFrom('[project]', false);
      expect(uvDependencies.length).toBe(0);
    });
  });
});
