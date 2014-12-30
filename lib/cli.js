'use strict';

var fs = require('fs');
var execSync = require('child_process').execSync;
var semver = require('semver');
var inquirer = require('inquirer');
var shellQuote = require('shell-quote');

module.exports = createNpmBump('origin', 'master');
module.exports.custom = createNpmBump;

function createNpmBump(remoteName, branch) {
    remoteName = remoteName || 'origin';
    branch = branch || 'master';

    function UsageError(message) {
        this.name = 'UsageError';
        this.message = message;
    }

    UsageError.prototype = Object.create(Error.prototype);

    return function npmBump(releaseType) {

        if (['major', 'minor', 'patch'].indexOf(releaseType) === -1) {
            throw new UsageError('USAGE: npm-bump major|minor|patch');
        }

        ensureCleanBranch();
        doBump();

        function getHashFor(branchName) {
            return run('git rev-parse --verify ' + quote(branchName)).trim();
        }

        function ensureCleanBranch() {
            if (getHashFor('HEAD') !== getHashFor(branch)) {
                throw new UsageError('You need to be on the "' + branch + '" branch to run this script');
            }
            if (getHashFor(branch) !== getHashFor(remoteName + '/' + branch)) {
                throw new UsageError('You need to push your changes first');
            }
            if (run('git status -s').length) {
                throw new UsageError('You have uncommited changes! Commit them before running this script');
            }
        }

        function getRootPath() {
            return run('git rev-parse --show-cdup').trim();
        }

        function getPackageJsonPath() {
            return process.cwd() + '/' + getRootPath() + 'package.json';
        }

        function quote(string) {
            return shellQuote.quote([string]);
        }

        function run(command) {
            return execSync(command, {encoding: 'utf8'});
        }

        function writePackageJson(configObject) {
            fs.writeFileSync(getPackageJsonPath(), JSON.stringify(configObject, null, 2) + '\n');
        }

        function doBump() {
            var packageJson = require(getPackageJsonPath());
            var oldVersion = packageJson.version;

            // Tag a new release
            var newStableVersion = packageJson.version = semver.inc(oldVersion, releaseType);
            writePackageJson(packageJson);
            console.log('Version bumped from ' + oldVersion + ' to ' + newStableVersion);
            run('git add ' + quote(getPackageJsonPath()));
            run('git commit -m ' + quote('Tag ' + newStableVersion));
            run('git tag ' + quote(newStableVersion));

            // Bump to a new pre-release version
            packageJson.version = semver.inc(packageJson.version, 'patch') + '-pre';
            writePackageJson(packageJson);
            run('git add ' + quote(getPackageJsonPath()));
            run('git commit -m ' + quote('Bump to ' + packageJson.version));

            // All public changes are done here.
            inquirer.prompt([{
                name: 'shouldProceed',
                type: 'confirm',
                message: 'Are you sure you want to publish the new version?',
            }], function (answers) {
                if (answers.shouldProceed) {
                    run('git checkout ' + quote(newStableVersion) + ' 2>/dev/null');
                    run('npm publish ' + quote(getRootPath()));
                    run('git checkout ' + quote(branch) + ' 2>/dev/null');
                    run('git push ' + quote(remoteName) + ' ' + quote(newStableVersion));
                    run('git push ' + quote(remoteName) + ' ' + quote(branch));
                } else {
                    run('git tag -d ' + quote(newStableVersion));
                    run('git reset --hard ' + quote(remoteName) + '/' + quote(branch));
                    console.log('Changes reverted');
                }
            });
        }
    };
}
