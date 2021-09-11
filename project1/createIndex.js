const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;

function replace_tags(string, end_phrase) {
	string = string.split(`<${end_phrase}>`);
	string = string.length > 1 ? string[1] : string[0];
	string = string.split(`</${end_phrase}>`)[0];
	return string;
}
/*
	With our collection in the form:
		<collection>
			<page>
				<id>0<id>
				<title>Hello</title>
				<text>
					Nice to meet you
				</text>
			</page>
			<page>
				<id>1</id>
				<title>Charlie</title>
				<text>
					is cool.
				</text>
			</page>
			...
		</collection>
	We can parse this to grab each separate page
	Since the intended size of the pages is about 32 billion
		words in totality, we will need to consider only parsing
		portions of the string at a time.
*/
function createIndex(collection, stopwords) {
	let each_page = collection.split("<page>").splice(1);
	stopwords = stopwords.split("\n");

	// loop through each page and splice out the /page
	each_page = each_page.map(page => {
		page = page.split("</page>")[0].split("</id>");

		/* now we have the wanted:
			"<id>0</id>
			<title>Hello</title>
			<text>
				Nice to meet you
			</text>"

			Then we can remove the other tags and concatenate title and text:
		*/

		page = {
			id: page[0].match(/[0-9]/g)[0],
			text: page[1].split("<text>").map((text, ind) => {
				if (ind == 0)
					text = replace_tags(text, "title");
				else
					text = replace_tags(text, "text");
				text = text.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
				return text.split(" ").map(item => {return stemmer(item)}).join(" ");
			}).join('').toLowerCase()
		}

		// then need to remove stop words
		stopwords.forEach(stop => {
			page.text = stop.length ? page.text.replace(new RegExp(`\\b ${stop}\\b`, "g"), "") : page.text;
		});
		return page;
	});

	return each_page;
}

let collection = fs.readFileSync(`./myCollection.dat`, 'utf8');
let stop_words = fs.readFileSync(`./myStopWords.dat`, 'utf8');

createIndex(collection, stop_words);