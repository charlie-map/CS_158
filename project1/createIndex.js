const fs = require('fs');
const readline = require('readline');
const stemmer = require('porter-stemmer').stemmer;

function isPage(string) {
	// need to check for id, title, and text
	return string.match(/\bid\b/) && string.match(/\btitle\b/) && string.match(/\btext\b/);
}

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
function pageIndexer(page, stopwords) {
	stopwords = stopwords.split("\n");

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
		// title: page[1].split("</title>")[0].split("<title>")[1],
		text: page[1].split("<text>").map((text, ind) => {
			if (ind == 0)
				text = replace_tags(text, "title");
			else
				text = replace_tags(text, "text");
			text = text.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
			return text.split(" ").map(item => {
				return stemmer(item)
			}).join(" ");
		}).join('').toLowerCase()
	}

	// then need to remove stop words
	stopwords.forEach(stop => {
		page.text = stop.length ? page.text.replace(new RegExp(`\\b${stop} \\b`, "g"), "") : page.text;
		page.text = stop.length ? page.text.replace(new RegExp(`\\b ${stop}\\b`, "g"), "") : page.text;
	});

	return page;
}

function openPages(chunk, pages, tag_place) {
	// per chunk we need to first know what we're looking for
	// if tag_place, then we're looking for a </page>
	// otherwise we're looking for a <page>
	chunk = tag_place ? chunk.split("</page>") : chunk.split("<page>").splice(1);

	if (tag_place)
		pages[pages.length - 1] += chunk.splice(0, 1);
	else
		pages.push("");

	if (!chunk.length)
		return;

	tag_place = !tag_place;

	return openPages(chunk.join(tag_place ? "<page>" : "</page>"), pages, tag_place);
}

function createIndex(coll_endpoint, stopwords, outputer) {

	let source = fs.createReadStream(coll_endpoint, {
		highWaterMark: 16383
	}, 'utf8');

	fs.truncate(outputer, 0, function() {
		return;
	});
	let writer = fs.createWriteStream(outputer);

	let pages = [],
		tag_open = false;
	source.on('data', function(chunk) {
		openPages(chunk.toString(), pages, tag_open);

		// loop through any completed pages, index, them, then
		// write them into the index, then delete them from pages
		for (let each = 0; each < pages.length - (tag_open ? 1 : 0); each++) {
			if (!isPage(pages[each]))
				pages.splice(each, 1);
			else {
				pages[each] = pageIndexer(pages[each], stop_words);
				writer.write(`page ${pages[each].id}: ${pages[each].text}\n`)
			}
		}
	});
}

let stop_words = fs.readFileSync(`./myStopWords.dat`, 'utf8');

createIndex(`./myCollection.dat`, stop_words, `./myIndex.dat`);