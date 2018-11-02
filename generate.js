import fs from 'fs';
import fetch from 'node-fetch';
import pkg from './package.json';
import vars from './conf/.vars.json';

const productPackageMap = {
	'js-toolkit': 'https://raw.githubusercontent.com/360player/js-toolkit/master/package.json',
	'js-sdk': 'https://raw.githubusercontent.com/360player/js-sdk/master/package.json'
};

const productPackageLogoMap = {
	'js-toolkit': 'https://raw.githubusercontent.com/360player/js-toolkit/master/js-toolkit__logotype.svg',
	'js-sdk': 'https://raw.githubusercontent.com/360player/js-sdk/master/js-sdk__logotype.svg'
}

const productNameMap = {
	'js-toolkit': 'JavaScript Toolkit',
	'js-sdk': 'JavaScript SDK',
};

let templateVariables = Object.assign(vars, {
	title: 'Code at 360Player',
	products: [],
});

async function fetchProductVariables() {
	const products = [];

	for ( const [ key, url ] of Object.entries(productPackageMap)) {
		const request = await fetch(url);
		const response = await request.json();

		const logoRequest = await fetch(productPackageLogoMap[key]);
		const logoResponse = await logoRequest.text();

		products.push({
			id: key,
			title: productNameMap[key],
			description: response.description,
			version: response.version,
			url: response.repository.url,
			logotype: logoResponse
		});
	}

	templateVariables.products = products;
}

function transformVariable( source, vars, name = null ) {
  let pattern = '\\{\\{(.*?)\\}\\}';

  if ( name !== null ) {
    pattern = `\\{\\{${name}\\.(.*?)\\}\\}`;
  }

  const regex = new RegExp(pattern, 'g');

  return source.replace( regex, ( match, variable ) => {
    return vars[variable] || '';
  })
}

function transformIterator( source, vars, name = null ) {
  let pattern = /\{\{each\.(.*?)\s+?\%\s+?(.*?)\}\}([\s\S]*)\{\{endeach\..*?\}\}/g

  return source.replace( pattern, ( match, variable, name, body ) => {
    const items = vars[variable];

    if ( Array.isArray(items) ) {
      body = items.map( item => transformVariable( body, item, name )).join('');
      return transformIterator(body, vars);
    }
  });
}

function render( source, vars ) {
  source = transformIterator( source, vars );
  return transformVariable( source, vars );
}

function read( templateFilePath, callback ) {
	fs.readFile( templateFilePath, 'utf8', ( error, contents ) => {
		if ( error ) throw error;
		callback( contents );
	});
}

async function build( targetPath, sourcePath ) {
	await fetchProductVariables();

	read( sourcePath, data => {
		const generatedData = render( data, templateVariables );

		fs.writeFile( targetPath, generatedData, error => {
			if ( error ) throw error;
			console.log( `Generated template at ${targetPath} from ${sourcePath}.` );
		})
	});
}

build( './index.html', './conf/index.template' );
