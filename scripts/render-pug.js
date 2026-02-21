'use strict';
const fs = require('fs');
const upath = require('upath');
const MarkdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const cheerio = require('cheerio');
const pug = require('pug');
const sh = require('shelljs');
const prettier = require('prettier');

module.exports = function renderPug(filePath) {
    const destPath = filePath.replace(/src\/pug\//, 'dist/').replace(/\.pug$/, '.html');
    const srcPath = upath.resolve(upath.dirname(__filename), '../src');

    console.log(`### INFO: Rendering ${filePath} to ${destPath}`);
    // create a markdown-it instance and expose a helper to templates
    const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
    // add anchor plugin to generate ids for headings and optional permalinks
    md.use(markdownItAnchor, {});

    function renderMarkdown(relPath) {
        // resolve path relative to the pug file
        const mdPath = upath.isAbsolute(relPath) ? relPath : upath.resolve(upath.dirname(filePath), relPath);
        if (!fs.existsSync(mdPath)) {
            return `<!-- Missing markdown file: ${mdPath} -->`;
        }
        const content = fs.readFileSync(mdPath, 'utf8');
        const contentHtml = md.render(content);

        // Use cheerio to wrap each H1 and its following nodes until the next H1
        const $ = cheerio.load(contentHtml, { decodeEntities: false });
    // prefer body children if cheerio created a body wrapper
    const rootChildren = $('body').length ? $('body').children().toArray() : $.root().children().toArray();
        const out = $('<div></div>');
        let currentSection = null;

        rootChildren.forEach(function (node) {
            const $node = $(node);
            if ($node.is('h1')) {
                    // start a new section when we hit an H1
                    currentSection = $('<section class="page-section text-white"></section>');
                    // if the heading has an id, move it to the section
                    const hid = $node.attr('id');
                    if (hid) {
                        currentSection.attr('id', hid);
                        $node.removeAttr('id');
                    }
                    // move tabindex as well so the section remains focusable if set
                    const htab = $node.attr('tabindex');
                    if (htab) {
                        currentSection.attr('tabindex', htab);
                        $node.removeAttr('tabindex');
                    }
                    currentSection.append($node);
                    out.append(currentSection);
            } else {
                if (currentSection) {
                    currentSection.append($node);
                } else {
                    // content before the first H1 — keep as-is
                    out.append($node);
                }
            }
        });

        // Wrap markdown images so they behave like other portfolio items:
        // <a class="portfolio-box" href="path/to/image"><img class="img-fluid" src="path/to/image"/></a>
        out.find('img').each(function (i, img) {
            const $img = $(img);
            // add responsive class
            const existingClass = $img.attr('class') || '';
            if (!/\bimg-fluid\b/.test(existingClass)) {
                $img.attr('class', (existingClass + ' img-fluid').trim());
            }

            const src = $img.attr('src') || '';
            const parent = $img.parent();
            const parentIsPortfolio = parent.is('a') && parent.hasClass('portfolio-box') && parent.attr('href') === src;
            if (!parentIsPortfolio) {
                // wrap the image in the desired anchor
                $img.wrap(`<a class="portfolio-box" href="${src}"></a>`);
            }
        });

        return out.html();
    }

    const html = pug.renderFile(filePath, {
        doctype: 'html',
        filename: filePath,
        basedir: srcPath,
        // expose the helper as `markdown()` inside pug templates
        markdown: renderMarkdown
    });

    const destPathDirname = upath.dirname(destPath);
    if (!sh.test('-e', destPathDirname)) {
        sh.mkdir('-p', destPathDirname);
    }

    const prettified = prettier.format(html, {
        printWidth: 1000,
        tabWidth: 4,
        singleQuote: true,
        proseWrap: 'preserve',
        endOfLine: 'lf',
        parser: 'html',
        htmlWhitespaceSensitivity: 'ignore'
    });

    fs.writeFileSync(destPath, prettified);
};
