'use strict';

const UsageError = class extends Error {
    constructor(message) {
        super(message);
        this.name = 'UsageError';
    }
};

// todo is use sprintf or suchlike

const ERROR_UNKNOWN_BRANCH = 'Git couldn\'t find the branch: "%branch%"; please ensure it exists';

const ERROR_INVALID_BRANCH = 'You need to be on the "%branch%" branch to run this script';

// can contain branch name but is bc
const ERROR_BRANCH_IS_NOT_CURRENT = 'You need to push your changes first';

const ERROR_UNCOMMITTED_CHANGES =
    'You have uncommited changes! Commit them before running this script';

module.exports = {
    UsageError,
    ERROR_UNKNOWN_BRANCH,
    ERROR_INVALID_BRANCH,
    ERROR_BRANCH_IS_NOT_CURRENT,
    ERROR_UNCOMMITTED_CHANGES,

    unknownBranch: branch => new UsageError(
        ERROR_UNKNOWN_BRANCH.replace('%branch%', branch)),

    invalidBranch: branch => new UsageError(
        ERROR_INVALID_BRANCH.replace('%branch%', branch)),

    notCurrentBranch: branch => new UsageError(
        ERROR_BRANCH_IS_NOT_CURRENT.replace('%branch%', branch)),

    uncommittedChanges: branch => new UsageError(
        ERROR_UNCOMMITTED_CHANGES.replace('%branch%', branch)),

};
