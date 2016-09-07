'use strict';

const assert = require('chai').assert;
const rewire = require('rewire');
const mockery = require('mockery');

const ERROR_UNCOMMITTED_CHANGES = require('../lib/errors').ERROR_UNCOMMITTED_CHANGES;

describe('allow ignoring unknown files', () => {

    // ////////////////////////////////////////////////////////////////////////////////////////////
    // setup the tests .. should possibly be in a before..

    // ignore inquirer prompts..
    mockery.enable();
    mockery.warnOnUnregistered(false);
    mockery.registerMock('inquirer', {
        prompt() {
            return Promise.resolve(''); // resolving an empty string removes the prompt output...
        },
    });

    // after mockery we can require our libraries..
    // though via rewire as the module requires a complete refactor for testing

    const npmBump = rewire('../lib/cli');
    npmBump.__set__('writePackageJson', () => {
        // do nothing; else would be modifying the package.json
    });

    // for these test to work we need to rewire the cmd answers...
    let cmdOutput = {  // eslint-disable-line prefer-const
        'git rev-parse --verify HEAD': '',
        'git rev-parse --verify unknown': '',
        'git rev-parse --verify test/unknown': '',
        'git rev-parse --verify other': '',
        'git rev-parse --verify test/other': '',
        'git rev-parse --verify mixed': '',
        'git rev-parse --verify test/mixed': '',
        'git rev-parse --show-cdup': '',
    };
    npmBump.__set__('run', cmd => {
        if (cmdOutput[cmd] !== undefined) {
            return cmdOutput[cmd];
        }
        return 'ERROR'; // otherwise deliver an unknown response
    });

    // ////////////////////////////////////////////////////////////////////////////////////////////
    // so now start some tests... ;-)

    /**
     * "git status -s" output uses "?? rel-path" for unknown resources
     */
    it('should ignore unknown files (prefixed by ??)', () => {
        cmdOutput['git status -s'] = '?? 123\n?? 456\r\f?? 789';

        npmBump.custom('test', 'unknown')('patch');
    });

    /**
     * "git status -s" output uses "XX rel-path" for other resources (XX is M/D/etc)
     */
    it('should NOT ignore known files (prefixed by M etc)', () => {
        assert.throws(
            () => {
                cmdOutput['git status -s'] = ' M 123\n M 456\n D 789';

                npmBump.custom('test', 'other')('patch');
            },
            ERROR_UNCOMMITTED_CHANGES
        );
    });

    it('should NOT ignore other files when unknown files are present', () => {
        assert.throws(
            () => {
                cmdOutput['git status -s'] = ' M 123\n M 456\r\f?? 789\n D 123';

                npmBump.custom('test', 'mixed')('patch');
            },
            ERROR_UNCOMMITTED_CHANGES
        );
    });

});
