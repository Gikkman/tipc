#! /usr/bin/env bash

cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs",
    "types": "index.node.d.ts"
}
!EOF

cat >dist/mjs/package.json <<!EOF
{
    "type": "module",
    "types": "index.node.d.ts"
}
!EOF

cat >dist/umd/package.json <<!EOF
{
    "type": "module",
    "types": "index.browser.d.ts"
}
!EOF