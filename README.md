# npm-bump

> A better `npm version major|minor|patch`

<!--
[![Build Status](https://travis-ci.org/mgol/npm-bump.svg?branch=main)](https://travis-ci.org/mgol/npm-bump)
[![Build status](https://ci.appveyor.com/api/projects/status/3lddln8y5hvn5pq0/branch/main?svg=true)](https://ci.appveyor.com/project/mgol/npm-bump/branch/main)
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

You can check the version of `npm-bump` via:

```shell
npm-bump --version
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

You can optionally pass the remote name and the branch name to be used, in addition to a prefix to be applied to the version bump commit message. By default the remote is assumed to be `origin` and the branch: `main`.

You can also provide the `access` option with the `public` or `private` value to declare whether the package should be public or private. When not provided, it uses default npm behavior: scoped packages are private & unscoped ones - public.

To customize, do the following:

1. When using from shell:

```shell
npm-bump minor --remote origin --branch main --prefix "[no-ci]" --access public
```

or:

```shell
npm-bump minor -r origin -b main -p "[no-ci]" ---access public
```

Run:

```shell
npm-bump --help
```

or:

```shell
npm-bump -h
```

to see the full information about accepted options.

2. When using as a library:

```js
var npmBump = require('npm-bump').custom({
    remote: 'origin',
    branch: 'main',
    prefix: '[no-ci]',
    access: 'public',
});
npmBump(minor);
```

## Supported Node.js versions

This project aims to support all Node.js versions supported upstream with the exception of those in maintenance mode (see [Release README](https://github.com/nodejs/Release/blob/main/README.md) for more details).

## Contributing

In lieu of a formal style guide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using `npm test`.

## License

Copyright (c) 2014 Michał Gołębiowski-Owczarek. Licensed under the MIT license.
