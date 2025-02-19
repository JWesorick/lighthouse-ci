/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const os = require('os');
const path = require('path');
const {runCLI, withTmpDir, cleanStdOutput} = require('./test-utils.js');

describe('collect', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const rcFile = path.join(fixturesDir, 'lighthouserc.json');

  it(
    'should collect results from staticDistDir',
    () =>
      withTmpDir(tmpDir => {
        const {stdout, stderr, status} = runCLI(
          ['collect', `--config=${rcFile}`, `--static-dist-dir=${fixturesDir}`],
          {
            // Run in temp dir to avoid conflicts with other tests
            cwd: tmpDir,
          }
        );

        const stdoutClean = stdout;
        expect(stdoutClean).toMatchInlineSnapshot(`
          "Started a web server on port XXXX...
          Running Lighthouse 2 time(s) on http://localhost:XXXX/checkout.html
          Run #1...done.
          Run #2...done.
          Running Lighthouse 2 time(s) on http://localhost:XXXX/index.html
          Run #1...done.
          Run #2...done.
          Done running Lighthouse!
          "
        `);
        expect(stderr.toString()).toMatchInlineSnapshot(`""`);
        expect(status).toEqual(0);
      }),
    90000
  );

  it('should collect results with a server command with custom start pattern', () =>
    withTmpDir(tmpDir => {
      // FIXME: for some inexplicable reason this test cannot pass in Travis Windows
      if (os.platform() === 'win32') return;

      const serverPath = path.join(fixturesDir, 'autorun-start-server/autorun-server.js');
      const startCommand = `SERVER_START_PORT=52427 SERVER_START_MESSAGE='Running server' node ${serverPath}`;
      const {stdout, stderr, status} = runCLI(
        [
          'collect',
          `-n=1`,
          `--config=${rcFile}`,
          `--start-server-command=${startCommand}`,
          '--start-server-ready-pattern=running',
          '--url=http://localhost:52427/',
        ],
        {
          // Run in temp dir to avoid conflicts with other tests
          cwd: tmpDir,
        }
      );

      // Check server started and lighthouse ran.
      const cleanStartCommand = cleanStdOutput(startCommand);
      expect(stdout).toMatchInlineSnapshot(`
        "Started a web server with \\"${cleanStartCommand}\\"...
        Running Lighthouse 1 time(s) on http://localhost:XXXX/
        Run #1...done.
        Done running Lighthouse!
        "
      `);
      // Checkout no errors were logged.
      expect(stderr.toString()).toMatchInlineSnapshot(`""`);
      // Check script ran without errors.
      expect(status).toEqual(0);
    }));

  it('should print timeout message for server command not printing a matchable pattern', () =>
    withTmpDir(tmpDir => {
      // FIXME: for some inexplicable reason this test cannot pass in Travis Windows
      if (os.platform() === 'win32') return;

      const serverPath = path.join(fixturesDir, 'autorun-start-server/autorun-server.js');
      const startCommand = `SERVER_START_PORT=52428 SERVER_START_MESSAGE='Running server' node ${serverPath}`;
      const {stdout, status} = runCLI(
        [
          'collect',
          `-n=1`,
          `--config=${rcFile}`,
          `--start-server-command=${startCommand}`,
          '--url=http://localhost:52428/',
        ],
        {
          // Run in temp dir to avoid conflicts with other tests
          cwd: tmpDir,
        }
      );

      // Check server started and lighthouse ran.
      const cleanStartCommand = cleanStdOutput(startCommand);
      expect(stdout).toMatchInlineSnapshot(`
        "Started a web server with \\"${cleanStartCommand}\\"...
        WARNING: Timed out waiting for the server to start listening.
                 Ensure the server prints a matching pattern /listen|ready/i when it is ready.
        Running Lighthouse 1 time(s) on http://localhost:XXXX/
        Run #1...done.
        Done running Lighthouse!
        "
      `);
      // Check script ran without errors.
      expect(status).toEqual(0);
    }));
});
