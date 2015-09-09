# npm-bump

> A better `npm version major|minor|patch`

<!--
[![Build Status](https://travis-ci.org/mzgol/npm-bump.svg?branch=master)](https://travis-ci.org/mzgol/npm-bump)
[![Build status](https://ci.appveyor.com/api/projects/status/3lddln8y5hvn5pq0/branch/master?svg=true)](https://ci.appveyor.com/project/mzgol/npm-bump/branch/master)
-->

## Installation

To install invoke:
```shell
npm install -g npm-bump
```
You now have the `npm-bump` binary available.

If you want to use it as a module, invoke:

```shell
npm install npm-bump --save
```

## Rationale

The aim of this module is to keep a repository in a state where if the `version` value in `package.json` points to a stable version, it's a tagged commit that was published to npm. Since one can add Git endpoints as packages' "versions", this allows to quickly check if an installed dependency uses a pre-release or a stable version.

## Usage

Once the package has been installed, it may be used from the terminal:

```shell
npm-bump releaseType
```

where `releaseType` is one of: `major`, `minor` and `patch`.

To use as a module, do the following:

```js
var npmBump = require('npm-bump');
npmBump(releaseType);
```

Regardless of using the package as a binary or a module, invoking the above code will result in:

1. Creating a new commit that increases the project version to the nearest stable one having a larger `major`/`minor`/`patch` than currently.
2. Tagging the commit with a specified version.
3. Creating a new commit with an increased patch version and the `-pre` suffix added.
4. Asking the user to do a final check and proceed or rollback.

If the user goes along, the new version gets published and created commits and tags pushed to the `origin` remote. Otherwise, all the changes are reversed.

Until the user gives the final green light, everything happens locally and is fully reversible.

### Pre-releases

If you supply `releaseType` other than `major`/`minor`/`patch`, it will be treated as a pre-release identifier and a proper pre-release version will be tagged & published. Such a version will be published with an npm tag equal to the identifier. For example, if your package is currently at version `1.0.0-pre`, the following command:

```shell
npm-bump beta
```

will publish a version `1.0.0-beta.0` under the tag `beta` and bump the version to `1.0.0-beta.1-pre`.


## Options

You can optionally pass the remote name and the branch name to be used. By default the remote is assumed to be `origin` and the branch: `master`. To customize, do the following:

1. When using from shell:
```shell
npm-bump releaseType remoteName branch
```
2. When using as a library:
```js
var npmBump = require('npm-bump').custom(remoteName, branch);
npmBump(releaseType);
```

## Supported Node.js versions
This project aims to support the latest Node.js LTS versions in the "active" phase (see [LTS README](https://github.com/nodejs/LTS/blob/master/README.md) for more details) as well as the latest stable Node.js. Today that means Node.js 4.x.

## Contributing
In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using `npm test`.

## License
Copyright (c) 2014 Michał Gołębiowski. Licensed under the MIT license.
