const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const skiplist = require('./skipList');
const {
	serializeObject
} = require('./utils');

function findPages(string, pages, stopwords, writer) {
	let open_tag = null,
		buffer = null,
		buffer_place,
		page_id, page_title;

	stopwords.forEach(stop => {
		string = stop.length ? string.replace(new RegExp(`(\\s+)${stop}(\\s+)`, "g"), " ") : string;
	});
	string = string.toLowerCase();

	let word = "";
	for (let i = 0; i < string.length; i++) {

		if (open_tag == null) {
			if (buffer == null) {
				if (string[i] == "<" && string[i + 1] == "/") {
					// this is a special case for encapsulating tags,
					// if we've reached the end, we don't really care, we
					// just need to move past it
					i += string.indexOf(">", i + 1) - i;
					continue;
				}

				// we know we're just looking for a "<" tag
				if (string[i] == "<") {
					open_tag = i;
					i += 2;
				}
			} else {
				// we know we're looking for "</"
				if (string[i] == "<" && string[i + 1] == "/") {
					open_tag = i;
					i += 2;
					continue;
				}

				// if this isn't true, we should be looking for words
				// (only if in the <text> element)
				if ((string[i] == " " || string[i] == "\n" || string[i] == "\t") && buffer == "text" && word.length) {
					// add the word (after stemming) into the skip list
					// see if we already have a skip list for this word:
					let stem_word = stemmer(word);
					if (!pages[stem_word])
						pages[stem_word] = {};

					if (!pages[stem_word].skiplist)
						pages[stem_word].skiplist = new skiplist;

					pages[stem_word].skiplist.insert(page_id, [i]);
					word = "";
				} else {
					word += string[i].charCodeAt(0) >= 97 && string[i].charCodeAt(0) <= 122 ?
						string[i] : "";
				}
			}
		} else {
			if (string[i] == ">" && buffer == null) {
				if (string[open_tag + 1] == "/")
					continue; // disregard the closure (an extrenous tag that we ignored earlier)

				// we've found the end of a tag
				let string_sub = string.substring(open_tag + 1, i);
				/* there's a chance there's extra stuff inside of string_sub
					ex. <text bytes="10593" xml:space="preserve">
					to just look at the beginning (no excess information)
					we can use substr since substr has O(k) complexity
					where k is string_sub.substr(0, k) length of pulled string
					versus split() which is n where n = string_sub.length */

				let index_ofSpace = string_sub.indexOf(" ");
				buffer = string_sub.substring(0, index_ofSpace == -1 ? string_sub.length : index_ofSpace);
				// make sure the buffer is a type of tag we want
				// ^ we only care about id, title, and text
				if (buffer == "text" || buffer == "title" || buffer == "id") {
					buffer_place = i + 1;
				} else if (buffer == "page") {
					page_id = null;
					page_title = null;
					buffer = null;
				} else {
					buffer = null;
				}
				open_tag = null;
				word = "";
			} else if (string[i] == ">") {
				// we've found the end of our close tag (aka </id">")

				// buffer_place is the beginning of our tag data (the initial <id>"x" after our tag)
				// and open_tag is the end of our tag data (the end "<"/id>)
				page_id = buffer == "id" && !page_id ? parseInt(string.substring(buffer_place, open_tag), 10) : page_id;
				page_title = buffer == "title" ? string.substring(buffer_place, open_tag) : page_title;

				if (page_id && page_title &&
					((string[i - 5] == "t" && string[i - 4] == "i" && string[i - 3] == "t" && string[i - 2] == "l" && string[i - 1] == "e") ||
						string[i - 2] == "i" && string[i - 1] == "d"))
					writer.write(`${page_id}|${page_title}\n`);

				word = "";
				open_tag = null;
				buffer = null;
			}
		}
	}

	return [open_tag, buffer, buffer_place, word];
}

function createIndex(coll_endpoint, stopwords, outputer) {

	let pages = {},
		open_tag, buffer, buffer_place, curr_word, page_id;
	let source = fs.createReadStream(coll_endpoint, {
		highWaterMark: 131072
	});

	fs.truncateSync(outputer, 0);

	let writerTitleIndex = fs.createWriteStream(outputer);

	/*
		example page:
			{
				id: if finished, integer
					else: [end of open tag (integer),
						   start of close tag (if found)]
				title: if finished, string
					else: ^^ same
			}
	*/
	source.on('readable', () => {
		let chunk;

		while (null !== (chunk = source.read())) {
			let data = findPages(chunk.toString(), pages, stopwords, writerTitleIndex);
		}
	});

	source.on('end', () => {
		// serialize pages into the inverted index:
		serializeObject(`./myIndex.dat`, pages);
	});
}

let stop_words = fs.readFileSync(`./myStopWords.dat`, 'utf8').split("\n");
// /media/hotboy/DUMP/wikidatawiki-20210901-pages-articles-multistream7.xml-p6052572p7552571
console.time();
createIndex('./myCollection.dat', stop_words, './myTitles.dat');
//createIndex(`/media/hotboy/DUMP/wikidatawiki-20210901-pages-articles-multistream7.xml-p6052572p7552571`, stop_words, `./myTitles.dat`);
console.timeEnd();