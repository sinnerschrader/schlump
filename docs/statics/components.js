helpers = {};
helpers.loremIpsum = function (text) {
	return text || 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.';
};
window.EmailField = (props, style = '[object Object]') => (React.createElement(
	UI.FormField,
	{
		label: "Email address",
		htmlFor: "basic-form-input-email"
	},
	React.createElement(UI.FormInput, {
		autoFocus: true,
		type: "email",
		placeholder: "Enter email",
		name: "basic-form-input-email"
	})
));
window.JsLogo = (props, style = '[object Object]') => (React.createElement("img", {
  src: props.base + '/statics/js.png',
  width: "50"
}));
window.JsLogoSvg = (props, style = '[object Object]') => (React.createElement(
	"svg",
	{
		viewBox: "0 0 612 612"
	},
	React.createElement(
		"g",
		{
			fill: "none",
			"fill-rule": "evenodd"
		},
		React.createElement("path", {
			fill: "#E2007A",
			d: "M0 0h612v612H0"
		}),
		React.createElement("path", {
			fill: "#FFF",
			d: "M161 511.4l46.8-28.3c9 16 17.2 30 37 30 18.8 0 30.7-7 30.7-36V281H333v196.3c0 59.6-35 86.7-85.8 86.7-46 0-72.7-23.8-86.3-52.6m203-6l47-27c12 20 28 34.7 57 34.7 23 0 39-11 39-28 0-19-16-26-42-38l-15-6c-41.7-18-69-40-69-87 0-43 33-76 84-76 36.3 0 62.6 13 81.5 46L502 353c-9.7-17.4-20.4-24.4-37-24.4-16.7 0-27.4 10.7-27.4 24.6 0 17.4 10.5 24.4 35.2 35l14.4 6c48.7 21 76.2 42.5 76.2 90.6 0 51.8-40.7 80-95.4 80-53.5 0-88-25.4-104.8-58.6"
		})
	)
));
window.Layout = (props, style = '[object Object]') => (React.createElement(
	"html",
	null,
	React.createElement(
		"head",
		null,
		React.createElement(
			"title",
			null,
			props.title
		),
		React.createElement("link", {
			href: "./statics/site.css",
			rel: "stylesheet"
		}),
		props.scopedCss ? React.createElement(
			"style",
			{
				type: "text/css"
			},
			props.scopedCss
		) : null,
		!props.scopedCss ? React.createElement("link", {
			href: "./statics/scoped.css",
			rel: "stylesheet"
		}) : null,
		React.createElement("link", {
			href: "./statics/elemental.styles.css",
			rel: "stylesheet"
		})
	),
	React.createElement(
		"body",
		null,
		React.createElement(
			"div",
			{
				className: "content"
			},
			props.children
		),
		React.createElement("hr", null),
		"Built with ",
		React.createElement(
			"a",
			{
				href: "https://github.com/sinnerschrader/schlump"
			},
			"schlump"
		),
		" and",
		React.createElement(JsLogo, {
			base: props.base
		}),
		React.createElement(JsLogoSvg, {
			base: props.base
		}),
		React.createElement("script", {
			src: "./statics/components.js"
		}),
		React.createElement("script", {
			src: "./statics/nav.js"
		})
	)
));
window.MyComponent = (props, style = '[object Object]') => (React.createElement(
  "div",
  null,
  helpers.loremIpsum(props.message)
));
window.WithStyle = (props, style = '[object Object]') => (React.createElement(
	"div",
	{
		className: style.styledContainer
	},
	React.createElement(
		"h2",
		null,
		"headline"
	),
	React.createElement(MyComponent, null)
));

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };
		window.SitePagesElementalHtml =
			(props, frontmatter = {"title":"Schlump!","route":"/elemental.html"}, scopedCss = '', style = '{}') =>
			(React.createElement(
	Layout,
	_extends({}, frontmatter, {
		base: "."
	}),
	React.createElement(
		UI.Form,
		null,
		React.createElement(EmailField, null)
	),
	React.createElement(
		UI.Button,
		{
			type: "primary"
		},
		"Primary"
	),
	React.createElement(
		"div",
		null,
		React.createElement(
			"a",
			{
				href: "./index.html"
			},
			"Link to page 1"
		)
	)
));
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };
		window.SitePagesIndexHtml =
			(props, frontmatter = {"title":"Schlump!","route":"/index.html"}, scopedCss = '', style = '{}') =>
			(React.createElement(
	Layout,
	_extends({}, frontmatter, {
		base: "."
	}),
	React.createElement(
		"div",
		{
			className: "container"
		},
		React.createElement(MyComponent, {
			message: "Hello World!"
		}),
		React.createElement(MyComponent, null)
	),
	React.createElement(
		"div",
		null,
		React.createElement(
			"a",
			{
				href: "./index2.html"
			},
			"Link to page 2"
		)
	),
	React.createElement(
		"div",
		null,
		React.createElement(
			"a",
			{
				href: "./elemental.html"
			},
			"Link to External elemental components"
		)
	)
));
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };
		window.SitePagesIndex2Html =
			(props, frontmatter = {"title":"Schlump!","route":"/index2.html"}, scopedCss = '.site-pages-index2-html-second-page {  /* Permalink - use to edit and share this gradient: http://colorzilla.com/gradient-editor/#fcecfc+0,fba6e1+50,fd89d7+51,ff7cd8+100;Pink+Gloss+%232 */  background: rgb(252,236,252);  /* Old browsers */  background: -moz-linear-gradient(top,  rgba(252,236,252,1) 0%, rgba(251,166,225,1) 50%, rgba(253,137,215,1) 51%, rgba(255,124,216,1) 100%);  /* FF3.6-15 */  background: -webkit-linear-gradient(top,  rgba(252,236,252,1) 0%,rgba(251,166,225,1) 50%,rgba(253,137,215,1) 51%,rgba(255,124,216,1) 100%);  /* Chrome10-25,Safari5.1-6 */  background: linear-gradient(to bottom,  rgba(252,236,252,1) 0%,rgba(251,166,225,1) 50%,rgba(253,137,215,1) 51%,rgba(255,124,216,1) 100%);  /* W3C, IE10+, FF16+, Chrome26+, Opera12+, Safari7+ */  filter: progid:DXImageTransform.Microsoft.gradient( startColorstr=\#fcecfc\, endColorstr=\#ff7cd8\,GradientType=0 );  /* IE6-9 */}', style = '{"secondPage":"site-pages-index2-html-second-page"}') =>
			(React.createElement(
	Layout,
	_extends({}, frontmatter, {
		base: ".",
		scopedCss: scopedCss
	}),
	React.createElement(
		"div",
		{
			className: style.secondPage
		},
		React.createElement(MyComponent, {
			message: 'foo=' + props.foo
		}),
		React.createElement(WithStyle, null)
	),
	React.createElement(
		"a",
		{
			href: "./index.html"
		},
		"Link to page 1"
	)
));