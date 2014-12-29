'use strict';

var fs = require('fs');
var execSync = require('child_process').execSync;
var semver = require('semver');
var inquirer = require('inquirer');

module.exports = createNpmBump('origin', 'master');
module.exports.custom = createNpmBump;

function createNpmBump(remote, branch) {
    remote = remote || 'origin';
    branch = branch || 'master';

    function UsageError(message) {
        this.name = 'UsageError';
        this.message = message;
    }
    UsageError.prototype = Object.create(Error.prototype);

    return function npmBump(kind) {

        if (['major', 'minor', 'patch'].indexOf(kind) === -1) {
            throw new UsageError('USAGE: npm-bump major|minor|patch');
        }

        ensureCleanBranch();
        doBump();

        function getHashFor(branchName) {
            return run('git rev-parse --verify ' + branchName).trim();
        }

        function ensureCleanBranch() {
            if (getHashFor('HEAD') !== getHashFor(branch)) {
                throw new UsageError('You need to be on the "' + branch + '" branch to run this script');
            }
            if (getHashFor(branch) !== getHashFor(remote + '/' + branch)) {
                throw new UsageError('You need to push your changes first');
            }
            if (run('git status -s').length) {
                throw new UsageError('You have uncommited changes! Commit them before running this script');
            }
        }

        function run(command) {
            return execSync(command, {encoding: 'utf8'});
        }

        function writePackageJson(configObject) {
            fs.writeFileSync('./package.json', JSON.stringify(configObject, null, 2) + '\n');
        }

        function doBump() {
            var packageJson = require(process.cwd() + '/package.json');
            var oldVersion = packageJson.version;

            // Tag a new release
            var newStableVersion = packageJson.version = semver.inc(oldVersion, kind);
            writePackageJson(packageJson);
            console.log('Version bumped from ' + oldVersion + ' to ' + newStableVersion);
            run('git add package.json');
            run('git commit -m "Tag ' + newStableVersion + '"');
            run('git tag ' + newStableVersion);

            // Bump to a new pre-release version
            packageJson.version = semver.inc(packageJson.version, 'patch') + '-pre';
            writePackageJson(packageJson);
            run('git add package.json');
            run('git commit -m "Bump to ' + packageJson.version + '"');

            // All public changes are done here.
            inquirer.prompt([{
                name: 'shouldProceed',
                type: 'confirm',
                message: 'Are you sure you want to publish the new version?',
            }], function (answers) {
                if (answers.shouldProceed) {
                    run('git checkout ' + newStableVersion + ' 2>/dev/null');
                    run('npm publish');
                    run('git checkout ' + branch + ' 2>/dev/null');
                    run('git push ' + remote + ' ' + newStableVersion);
                    run('git push ' + remote + ' ' + branch);
                } else {
                    run('git tag -d ' + newStableVersion);
                    run('git reset --hard ' + remote + '/' + branch);
                    console.log('Changes reverted');
                }
            });
        }
    };
}
