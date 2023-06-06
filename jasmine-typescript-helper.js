/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */

const { register } = require('ts-node');
register({
    project: 'tsconfig.json',
});
if (process.env["JASMINE_TIMEOUT"]) {
    const t = process.env["JASMINE_TIMEOUT"];
    jasmine.DEFAULT_TIMEOUT_INTERVAL = parseInt(t);
}
