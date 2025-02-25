# TrueFA Version Management Guide

This document describes how to manage version numbers for TrueFA releases.

## Version Management Scripts

Two scripts are provided to simplify version management:

1. `update-version.bat` - Updates all version references to a specific version
2. `increment-version.bat` - Increments major, minor, or patch version numbers

## Using the Scripts

### Increment Version

The easiest way to update the version is to use the `increment-version.bat` script, which will automatically increment the version number according to [Semantic Versioning](https://semver.org/) principles:

```
increment-version.bat [major|minor|patch]
```

Examples:
- `increment-version.bat patch` - Increases the patch version (e.g., 1.0.0 → 1.0.1)
- `increment-version.bat minor` - Increases the minor version and resets patch (e.g., 1.0.1 → 1.1.0)
- `increment-version.bat major` - Increases the major version and resets minor and patch (e.g., 1.1.0 → 2.0.0)

### Specify Exact Version

If you need to set a specific version number, use the `update-version.bat` script:

```
update-version.bat [version]
```

Example:
- `update-version.bat 1.5.0` - Sets the version to exactly 1.5.0

## What Gets Updated

Running either script will automatically update version references in:

1. `package.json` - The main source of truth for the application version
2. `sign-and-package.bat` - References to executable names and ZIP file name
3. `release-readme.txt` - Documentation references

## After Updating the Version

After running either script, you should:

1. Run `npm install` to update package-lock.json
2. Build the application with the new version:
   - `npm run build:prod` - For both installer and portable versions
   - `npm run build:portable` - For portable version only
3. Run `sign-and-package.bat` to create the release package
4. Commit all changes to version control

## Version Scheme

TrueFA follows [Semantic Versioning](https://semver.org/) conventions:

- **Major version** (1.0.0): Incompatible API changes or significant new features
- **Minor version** (0.1.0): Backward-compatible new features
- **Patch version** (0.0.1): Backward-compatible bug fixes

## Manual Updates (Not Recommended)

While not recommended, if you need to modify versions manually, you'll need to update:

1. The version field in package.json
2. All file references in sign-and-package.bat
3. All version references in release-readme.txt
4. Any other files that might contain version-specific information

## Complete Release Process

For convenience, a comprehensive release script is provided that automates the entire release workflow:

```
release.bat [major|minor|patch|none]
```

This script handles the complete release process:

1. Updates the version (if requested)
2. Installs dependencies
3. Builds the Rust module
4. Builds the application
5. Signs and packages the release

Examples:
- `release.bat patch` - Increment patch version, build, and package
- `release.bat minor` - Increment minor version, build, and package
- `release.bat major` - Increment major version, build, and package
- `release.bat none` - Use current version, build, and package

This is the recommended way to create releases as it ensures all steps are performed in the correct order. 