import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import semver from 'semver';
import inquirer from 'inquirer';
import shellQuote from 'shell-quote';

const createNpmBump = ({
    remoteName = 'origin',
    branch = 'main',
    prefix = '',
    access,
} = {}) => {
    const UsageError = class extends Error {
        constructor(...args) {
            super(...args);
            this.name = 'UsageError';
        }
    };

    return async releaseType => {
        if (!releaseType) {
            throw new UsageError(
                'Error: Release type not provided! ' +
                    'Type `npm-bump -h` for usage instructions.',
            );
        }

        if (access && !['public', 'private'].includes(access)) {
            throw new UsageError(
                `Error: access, if provided, needs to be "public" or "private"`,
            );
        }

        const isPrerelease = !['major', 'minor', 'patch'].includes(releaseType);

        const getHashFor = branchName => {
            try {
                return run(
                    `git rev-parse --verify ${quote(branchName)}`,
                ).trim();
            } catch (error) {
                throw new UsageError(
                    `Git couldn't find the branch: "${branchName}"; please ensure it exists`,
                );
            }
        };

        const isFileTracked = file =>
            run(`git ls-files ${quote(file)}`).trim().length > 0;

        const ensureCleanBranch = () => {
            if (getHashFor('HEAD') !== getHashFor(branch)) {
                throw new UsageError(
                    `You need to be on the "${branch}" branch to run this script`,
                );
            }
            if (getHashFor(branch) !== getHashFor(`${remoteName}/${branch}`)) {
                throw new UsageError('You need to push your changes first');
            }
            if (run('git status -s').length) {
                throw new UsageError(
                    'You have uncommited changes! Commit them before running this script',
                );
            }
        };

        const getRootPath = () => run('git rev-parse --show-cdup').trim();
        const getPackageJsonPath = () =>
            path.join(process.cwd(), `${getRootPath()}package.json`);
        const getPackageLockJsonPath = () =>
            path.join(process.cwd(), `${getRootPath()}package-lock.json`);

        const quote = string => shellQuote.quote([string]);

        const run = (command, options) => {
            console.debug(`Running: \`${command}\``);
            return execSync(command, { encoding: 'utf8', ...options });
        };

        const writeJsonFile = async (filePath, object) => {
            const currContents = (await fs.readFile(filePath, 'utf-8')).trim();
            let indent = '  ';
            const match = currContents.match(/^\{\n(\s+)/);
            if (match && match[1]) {
                indent = match[1];
            }

            await fs.writeFile(
                filePath,
                `${JSON.stringify(object, null, indent)}\n`,
                'utf-8',
            );
        };

        const writePackageJson = async configObject => {
            await writeJsonFile(getPackageJsonPath(), configObject);
        };
        const writePackageLockJson = async configObject => {
            await writeJsonFile(getPackageLockJsonPath(), configObject);
        };

        const readAndParseJson = async filePath =>
            JSON.parse(await fs.readFile(filePath, 'utf-8'));

        const doBump = async () => {
            const packageJson = await readAndParseJson(getPackageJsonPath());
            const oldVersion = packageJson.version;
            let packageLockJson;

            // Update package.json & package-lock.json with a new version.
            const newStableVersion = (packageJson.version = isPrerelease
                ? semver.inc(oldVersion, 'pre', releaseType)
                : semver.inc(oldVersion, releaseType));

            await writePackageJson(packageJson);

            if (existsSync(getPackageLockJsonPath())) {
                packageLockJson = await readAndParseJson(
                    getPackageLockJsonPath(),
                );
                packageLockJson.version = newStableVersion;
                await writePackageLockJson(packageLockJson);
            }

            // Tag a new release.
            console.log(
                `Version bumped from ${oldVersion} to ${newStableVersion}`,
            );
            run(`git add ${quote(getPackageJsonPath())}`);
            if (packageLockJson && isFileTracked('package-lock.json')) {
                run(`git add ${quote(getPackageLockJsonPath())}`);
            }
            run(
                `git commit -m ${quote(
                    `${prefix ? `${prefix} ` : ''}Tag ${newStableVersion}`,
                )}`,
            );

            // An empty `-m` is required when forced tag signing is enabled
            run(`git tag ${quote(newStableVersion)} -m ""`);

            // Bump to a new pre-release version but only if the version to publish is not
            // itself a pre-release; otherwise semver gets confused.
            if (!isPrerelease) {
                const newVersion = `${semver.inc(
                    packageJson.version,
                    'patch',
                )}-pre`;

                packageJson.version = newVersion;
                await writePackageJson(packageJson);
                run(`git add ${quote(getPackageJsonPath())}`);

                if (packageLockJson) {
                    packageLockJson.version = newVersion;
                    await writePackageLockJson(packageLockJson);
                    if (isFileTracked('package-lock.json')) {
                        run(`git add ${quote(getPackageLockJsonPath())}`);
                    }
                }

                run(
                    `git commit -m ${quote(
                        `${prefix ? `${prefix} ` : ''}Bump to ${
                            packageJson.version
                        }`,
                    )}`,
                );
            }

            const revertChanges = () => {
                run(`git tag -d ${quote(newStableVersion)}`);
                run(`git reset --hard ${quote(remoteName)}/${quote(branch)}`);
                console.log('Changes reverted');
            };

            // All public changes are done here.
            try {
                const { shouldProceed } = await inquirer.prompt([
                    {
                        name: 'shouldProceed',
                        type: 'confirm',
                        message:
                            'Are you sure you want to publish the new version?',
                    },
                ]);

                if (shouldProceed) {
                    const { otp } = await inquirer.prompt([
                        {
                            name: 'otp',
                            message:
                                'If you use two factor authentication, provide an npm one-time ' +
                                'password. Otherwise, leave empty.',
                        },
                    ]);

                    // Push & publish the tag.
                    run(`git checkout ${quote(newStableVersion)}`, {
                        stdio: [process.stdin, process.stdout, 'ignore'],
                    });
                    run(
                        `npm publish ${
                            access ? `--access ${access}` : ''
                        } ${quote(getRootPath())} ${
                            isPrerelease ? `--tag ${quote(releaseType)}` : ''
                        } ${otp ? `--otp ${otp}` : ''}`,
                    );
                    run(
                        `git push ${quote(remoteName)} ${quote(
                            newStableVersion,
                        )}`,
                    );

                    // Push the latest commit.
                    run(`git checkout ${quote(branch)}`, {
                        stdio: [process.stdin, process.stdout, 'ignore'],
                    });

                    if (!isPrerelease) {
                        // Force-update the date to prevent two commits having
                        // the same time stamp.
                        const commitMsg = run('git show -s --format=%s');
                        run('git reset --soft HEAD^');
                        run(`git commit -m ${quote(commitMsg)}`);
                    }

                    run(`git push ${quote(remoteName)} ${quote(branch)}`);
                } else {
                    revertChanges();
                }
            } catch (err) {
                console.error('error:', err);
                process.exitCode = 1;
                revertChanges();
            }
        };

        ensureCleanBranch();
        doBump().catch(err => {
            console.error('Uncaught error:', err);
            process.exitCode = 1;
        });
    };
};

export default createNpmBump();
export { createNpmBump };
