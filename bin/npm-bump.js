#!/usr/bin/env node

'use strict';

/* eslint-disable no-process-exit */

const minimist = require('minimist');
const npmBump = require('../lib/cli');

const opts = minimist(process.argv.slice(2), {
    alias: {
        // Configuration
        r: 'remote',
        b: 'branch',
        p: 'prefix',
        t: 'type',

        // Miscellaneous
        h: 'help',
        v: 'version',
    },
    default: {
        remote: 'origin',
        branch: 'master',
    },
});

if (opts.help) {
    console.log(`
USAGE:
    npm-bump release-type [options]

where release-type can be major, minor, patch or a custom name 

Configuration:
    -r, --remote    Remote name to push to, origin by default
    -b, --branch    Branch name to push, master by default
    -p, --prefix    Prefix applied to the version bump commit message
    -t, --type      An alternative way to pass the release type (as described above)
        --access    Indicate whether the package is public or private (value: "public" or "private").
                    By default, uses default npm behavior: unscoped packages are public,
                    scoped ones: private. 

Miscellaneous:
    -h, --help      Display this help
    -v, --version   Display version info
`);
    process.exit(0);
}

if (opts.version) {
    console.log(`npm-bump ${require('../package.json').version}`);
    process.exit(0);
}

try {
    npmBump.custom({
        remote: opts.remote,
        branch: opts.branch,
        prefix: opts.prefix,
        access: opts.access,
    })(opts.type || opts._[0]);
} catch (error) {
    if (error.name === 'UsageError') {
        console.error(error.message);
        process.exitCode = 1;
    } else {
        throw error;
    }
}
