'use strict';
const fs = require('fs');
const upath = require('upath');
const sh = require('shelljs');

module.exports = function renderAssets() {
    const sourcePath = upath.resolve(upath.dirname(__filename), '../src/assets');
    const destPath = upath.resolve(upath.dirname(__filename), '../dist/.');
    
    sh.cp('-R', sourcePath, destPath)
};

// Additionally copy any `images` folders that live alongside Pug pages
// so that `src/pug/<page>/images/*` ends up at `dist/<page>/images/*`.
// This ensures markdown image references like `images/foo.jpg` work
// when the page is built to `dist/<page>/index.html`.
const pugRoot = upath.resolve(upath.dirname(__filename), '../src/pug');
sh.find(pugRoot).forEach(function (p) {
    try {
        if (/[/\\]images$/.test(p)) {
            const rel = upath.relative(pugRoot, p); // e.g. "aacat1870/images"
            const dest = upath.resolve(upath.dirname(__filename), '../dist', rel);
            // ensure destination parent exists
            const destDir = upath.dirname(dest);
            if (!sh.test('-e', destDir)) {
                sh.mkdir('-p', destDir);
            }
            sh.cp('-R', p, destDir);
            console.log(`### INFO: Copied pug images from ${p} to ${destDir}`);
        }
    } catch (err) {
        // ignore
    }
});