# schlump

[![license](https://img.shields.io/github/license/sinnerschrader/schlump.svg)](https://github.com/sinnerschrader/schlump/blob/master/LICENSE)
[![npm](https://img.shields.io/npm/v/schlump.svg)](https://www.npmjs.com/package/schlump)
[![dependencies Status](https://david-dm.org/sinnerschrader/schlump/status.svg)](https://david-dm.org/sinnerschrader/schlump)
[![devDependencies Status](https://david-dm.org/sinnerschrader/schlump/dev-status.svg)](https://david-dm.org/sinnerschrader/schlump?type=dev)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Standard Version](https://img.shields.io/badge/release-standard%20version-brightgreen.svg)](https://github.com/conventional-changelog/standard-version)

A static site generator utilizing reactjs.

schlump generates html and copies your static resources into a give folder structure. Aftewards the generated html
is validated for consistency.

## Installation

```shell
npm install schlump
```

## Quickstart

Create the following folder structure:

    src
    src/pages     <-- place your content here
    src/templates <-- place your page components here
    src/statics   <-- place all static assets here
    src/helpers   <-- place all helper functions here (optional)

```shell
./node_modules/.bin/schlump
```

The result is written into the dist folder.

## Usage

```shell
./node_modules/.bin/schlump --help

    Usage
        $ schlump

    Options

        --help, -h             Usage information
        --src                  Source folder (defaults to src)
        --src-pages            Folder to look for pages (default to <src>/pages)
        --src-templates        Folder to look for templates (defaults to <src>/templates)
        --src-statics          Folder to look for static files (defaults to <src>/statics)
        --src-helpers          Folder to look for helper functions (defaults to <src>/helpers)
        --dest                 Destination folder (defaults to dist)
        --dest-statics         Folder to write statics (defaults to <dest>/statics)
        --var.<name>=<value>   Define global properties which are usable during build pages
        --disable-validation   Disable html validation (no link and resource checking)
        --redirect-map         A json file with key value pairs of url-path (source) and full qualifed urls (target)
        --scoped-css           Path of the file to write all scoped css to
        --template-import='<file-or-node-module-path>[:<namespace>]'
                               Imports the react-components from the given path at the given namespace

```

## Pages

Pages in schlump are JSX files (only the JSX code without JavaScript boilerplate).
All pages are stateless function components which could have a frontmatter preamble.
The frontmatter could contain a route entry to specify the URL of the page to create.
All other frontmatter data is given to the page under the scope `frontmatter`.

```html
---
route: /index.html
text: Content!
---
<p>{frontmatter.text}</p>
```

## Templates

Templates for schlump are JSX files (only the JSX code without JavaScript boilerplate).
All templates are stateless function components which could have as well a frontmatter preamble.

The component name is either given in frontmatter as name or derived from the file name.

For example in a file named `src/templates/my-component.html`:

```html
---
name: MyComponent
---
<div>
    {props.message || 'Lorem ipsum'}
</div>
```

This template (component) could then be used in a page with the name `MyComponent`.

For example in a file named `src/pages/index.html`:

```html
<MyComponent message="Hello World!" />
```

## Helpers

Helpers are functions which could be used in all templates.

Helpers must export a function at `module.exports`, the name of the helper is deduced from the camel-cased file
name of the helper function.

For example in a file named `src/helpers/hello-world.js`:

```js
module.exports = function () { return 'Hello World!'; };
```

This results in a helper which could be called in a template like this:

```html
<div>
    {helpers.helloWorld()}
</div>
```

**Note**: The helpers are only availalbe in templates, **NOT** in pages.

## Globals

Global variables which are available in all pages. These values are available as top-level `props`.

If schlump is executed with `schlump --var.foo=bar` and the following page:

```html
<div>
    {props.foo}
</div>
```

this html is rendered as result: `<div>bar</div>`.

## Validation

Currently the following elements get validated:

* a[href] - relative links to pages must exist (no dead links)
* img[src] - relatie image resources must exist
* img[srcset] - relatie image resources must exist
* *[style] background-image - relative resources in inline-style background-images must exist
* link[href] - relative external resources must exist

## Redirects

Given schlump is started with the parameter `--redirect-map map.json` and map.json contains:

```json
{
  "/old/page/url": "https://github.com/sinnerschrader/schlump"
}
```

then schlump generates a page at `<dest>/old/page/url/index.html` which contains a meta refresh
to `https://github.com/sinnerschrader/schlump`.

## Scoped CSS

Pages and Templates could have a scoped css tag which contains the styles of that component.
Only simple selectors are possible which implicitly means that the style rules are scoped to that component.

```html
---
name: Element
---
<style scoped>
.element {
    color: blue;
}
.headline {
    color: green;
}
.copy {
    color: red;
}
</style>
<div className={style.element}>
    <h1 className={style.headline}>headline<h1>
    <p className={style.copy}>
        copytext
    </p>
</div>
```

## Template Imports

With the option `--template-import` it is possible to integrate external [React](https://reactjs.com) component
libraries (e.g. [elemental ui](http://elemental-ui.com/)) into schlump sites.

The libraries are either referenced from node_modules (e.g. `elemental`) or by relative path
(e.g. `./node_modules/elemental`) and could be imported into an optional given namespace.

```shell
$ # This would import elemental-ui into the namespace UI
$ schlump --template-import='elemental:UI'
```

Afterwards all components of the library could be used with the given namespace.

```html
<body>
    <UI.Button/>
</body>
```

The option could occurr multiple times on the cli. If there are name clashes in the namespace and module names, the
last given option overwrites former imports.

If there is no namespace given, then the library is imported into the default schlump component space. But it is not
possible to overwrite local schlump components by an imported library.

---
schlump is built with JavaScript and :heart: and released under the
[MIT](./LICENSE) license.
