'use strict';

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const semver = require('semver');
const inquirer = require('inquirer');
const shellQuote = require('shell-quote');

const createNpmBump = (remoteName = 'origin', branch = 'master') => {
    const UsageError = class extends Error {
        constructor(message) {
            super(message);
            this.name = 'UsageError';
        }
    };

    return releaseType => {
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
        const quote = string => shellQuote.quote([string]);
        const run = (command, options) => execSync(command, {encoding: 'utf8', ...options});
        const writePackageJson = configObject =>
            fs.writeFileSync(getPackageJsonPath(),
                `${ JSON.stringify(configObject, null, 2) }\n`);

        const doBump = () => {
            const packageJson = require(getPackageJsonPath());
            const oldVersion = packageJson.version;

            // Tag a new release
            const newStableVersion = packageJson.version = isPrerelease ?
                semver.inc(oldVersion, 'pre', releaseType) :
                semver.inc(oldVersion, releaseType);
            writePackageJson(packageJson);
            console.log(`Version bumped from ${ oldVersion } to ${ newStableVersion }`);
            run(`git add ${ quote(getPackageJsonPath()) }`);
            run(`git commit -m ${ quote(`Tag ${ newStableVersion }`) }`);
            run(`git tag ${ quote(newStableVersion) }`);

            // Bump to a new pre-release version but only if the version to publish is not
            // itself a pre-release; otherwise semver gets confused.
            if (!isPrerelease) {
                packageJson.version = `${ semver.inc(packageJson.version, 'patch') }-pre`;
                writePackageJson(packageJson);
                run(`git add ${ quote(getPackageJsonPath()) }`);
                run(`git commit -m ${ quote(`Bump to ${ packageJson.version }`) }`);
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

module.exports = createNpmBump('origin', 'master');
module.exports.custom = createNpmBump;
