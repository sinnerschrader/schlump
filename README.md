# schlump

[![license](https://img.shields.io/github/license/sinnerschrader/schlump.svg?maxAge=2592000)](https://github.com/sinnerschrader/schlump/blob/master/LICENSE)
[![npm](https://img.shields.io/npm/v/schlump.svg?maxAge=2592000)](https://www.npmjs.com/package/schlump)
[![dependencies Status](https://david-dm.org/sinnerschrader/schlump/status.svg)](https://david-dm.org/sinnerschrader/schlump)
[![devDependencies Status](https://david-dm.org/sinnerschrader/schlump/dev-status.svg)](https://david-dm.org/sinnerschrader/schlump?type=dev)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)

A static site generator utilizing reactjs

## Installation

```shell
npm install schlump
```

## Quickstart

Create the following folder structure:

```
src
src/pages     <-- place your content here
src/templates <-- place your page components here
src/statics   <-- place all static assets here
src/helpers   <-- place all helper functions here (optional)
```

```shell
./node_modules/.bin/schlump
```

The result is written into the dist folder.

## Usage

```shell
./node_modules/.bin/schlump --help

    A static site generator utilizing reactjs
  
    Usage
    	$ schlump
  
    Options
  
        --help           Usage information
        --src            Source folder (defaults to src)
        --src-pages      Folder to look for pages (default to <src>/pages)
        --src-templates  Folder to look for templates (defaults to <src>/templates)
        --src-statics    Folder to look for static files (defaults to <src>/statics)
        --src-helpers    Folder to look for helper functions (defaults to <src>/helpers)
        --dest           Destination folder (defaults to dist)
        --dest-statics    Folder to write statics (defaults to <dest>/statics)

```

## Templates

Templates for schlump are JSX files (only the JSX code without JavaScript boilerplate). All components are stateless
function components. The templates could have a frontmatter preamble.  
The component name is either given in frontmatter as name or derived from the file name.

For example in a file named `src/templates/my-component.html`:

```
---
name: MyComponent
---
<div>
    {props.message || 'Lorem ipsum'}
</div>
```

This template (component) could then be used in a page with the name `MyComponent`.
Pages could also have a frontmatter preamble which could contain a route entry to specify the URL of the page to create.

For example in a file named `src/pages/index.html`:

```
---
route: /index.html
---
<MyComponent message="Hello World!" />
```

## Helpers

Helpers are functions which could be used in all templates.  

Helpers must export a function at `module.exports`, the name of the helper is deduced from the camel-cased file
name of the helper function.  

For example in a file named `src/helpers/hello-world.js`:

```
module.exports = function () { return 'Hello World!'; };
```

This results in a helper which could be called in a template like this:

```
<div>
    {helloWorld()}
</div>
```

**Note**: The helpers are only availalbe in templates, **NOT** in pages.

---
schlump is built with JavaScript and :heart: and released under the
[MIT](./LICENSE) license.
