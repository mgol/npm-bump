'use strict';

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const semver = require('semver');
const inquirer = require('inquirer');
const shellQuote = require('shell-quote');

const createNpmBump = ({
    remoteName = 'origin',
    branch = 'master',
    prefix = '',
} = {}) => {
    const UsageError = class extends Error {
        constructor(message) {
            super(message);
            this.name = 'UsageError';
        }
    };

    return releaseType => {
        if (!releaseType) {
            console.error('Error: Release type not provided! ' +
                'Type `npm-bump -h` for usage instructions.');
            process.exitCode = 1;
            return;
        }

        const isPrerelease = !['major', 'minor', 'patch'].includes(releaseType);

        const getHashFor = branchName => {
            try {
                return run(`git rev-parse --verify ${ quote(branchName) }`).trim();
            } catch (error) {
                throw new UsageError(`Git couldn't find the branch: "${
                    branchName }"; please ensure it exists`);
            }
        };

        const ensureCleanBranch = () => {
            if (getHashFor('HEAD') !== getHashFor(branch)) {
                throw new UsageError(`You need to be on the "${
                    branch }" branch to run this script`);
            }
            if (getHashFor(branch) !== getHashFor(`${ remoteName }/${ branch }`)) {
                throw new UsageError('You need to push your changes first');
            }
            if (run('git status -s').length) {
                throw new UsageError(
                    'You have uncommited changes! Commit them before running this script');
            }
        };

        const getRootPath = () => run('git rev-parse --show-cdup').trim();
        const getPackageJsonPath = () => path.join(process.cwd(), `${ getRootPath() }package.json`);
        const getPackageLockJsonPath = () => path.join(
            process.cwd(),
            `${ getRootPath() }package-lock.json`,
        );
        const quote = string => shellQuote.quote([string]);
        const run = (command, options) => execSync(command, {encoding: 'utf8', ...options});
        const writePackageJson = configObject =>
            fs.writeFileSync(getPackageJsonPath(),
                `${ JSON.stringify(configObject, null, 2) }\n`);
        const writePackageLockJson = configObject =>
            fs.writeFileSync(getPackageLockJsonPath(),
                `${ JSON.stringify(configObject, null, 2) }\n`);

        const doBump = () => {
            const packageJson = require(getPackageJsonPath());
            const oldVersion = packageJson.version;
            let packageLockJson;

            // Update package.json & package-lock.json with a new version.
            const newStableVersion = packageJson.version = isPrerelease ?
                semver.inc(oldVersion, 'pre', releaseType) :
                semver.inc(oldVersion, releaseType);

            writePackageJson(packageJson);

            if (fs.existsSync(getPackageLockJsonPath())) {
                packageLockJson = require(getPackageLockJsonPath());
                packageLockJson.version = newStableVersion;
                writePackageLockJson(packageLockJson);
            }

            // Tag a new release.
            console.log(`Version bumped from ${ oldVersion } to ${ newStableVersion }`);
            run(`git add ${ quote(getPackageJsonPath()) }`);
            if (packageLockJson) {
                run(`git add ${ quote(getPackageLockJsonPath()) }`);
            }
            run(`git commit -m ${ quote(`${ prefix } Tag ${ newStableVersion }`) }`);
            run(`git tag ${ quote(newStableVersion) }`);

            // Bump to a new pre-release version but only if the version to publish is not
            // itself a pre-release; otherwise semver gets confused.
            if (!isPrerelease) {
                const newVersion = `${ semver.inc(packageJson.version, 'patch') }-pre`;

                packageJson.version = newVersion;
                writePackageJson(packageJson);
                run(`git add ${ quote(getPackageJsonPath()) }`);

                if (packageLockJson) {
                    packageLockJson.version = newVersion;
                    writePackageLockJson(packageLockJson);
                    run(`git add ${ quote(getPackageLockJsonPath()) }`);
                }

                run(`git commit -m ${ quote(`${ prefix } Bump to ${ packageJson.version }`) }`);
            }

            const revertChanges = () => {
                run(`git tag -d ${ quote(newStableVersion) }`);
                run(`git reset --hard ${ quote(remoteName) }/${ quote(branch) }`);
                console.log('Changes reverted');
            };

            // All public changes are done here.
            inquirer
                .prompt([{
                    name: 'shouldProceed',
                    type: 'confirm',
                    message: 'Are you sure you want to publish the new version?',
                }])
                .then(answers => {
                    if (answers.shouldProceed) {
                        // Push & publish the tag.
                        run(`git checkout ${ quote(newStableVersion) }`, {
                            stdio: [process.stdin, process.stdout, 'ignore'],
                        });
                        run(`npm publish ${ quote(getRootPath()) }${
                            isPrerelease ? ` --tag ${ quote(releaseType) }` : '' }`,
                        );
                        run(`git push ${ quote(remoteName) } ${ quote(newStableVersion) }`);

                        // Push the latest commit.
                        run(`git checkout ${ quote(branch) }`, {
                            stdio: [process.stdin, process.stdout, 'ignore'],
                        });

                        if (!isPrerelease) {
                            // Force-update the date to prevent two commits having
                            // the same time stamp.
                            const commitMsg = run('git show -s --format=%s');
                            run('git reset --soft HEAD^');
                            run(`git commit -m ${ quote(commitMsg) }`);
                        }

                        run(`git push ${ quote(remoteName) } ${ quote(branch) }`);
                    } else {
                        revertChanges();
                    }
                })
                .catch(err => {
                    console.error('error:', err);
                    process.exitCode = 1;
                    revertChanges();
                });
        };

        ensureCleanBranch();
        doBump();
    };
};

module.exports = createNpmBump();
module.exports.custom = createNpmBump;
