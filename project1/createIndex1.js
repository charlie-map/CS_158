const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const skipWork = require('./skipList');
const {
	serializeObject
} = require('./utils');

let pages = Object.create(null),
	open_tag = null,
	buffer = null,
	buffer_place, word, page_id = "",
	page_idDone = false,
	page_title = "";

function findPages(string, stopwords, writer) {
	stopwords.forEach(stop => {
		string = stop.length ? string.replace(new RegExp(`(\\s+)${stop}(\\s+)`, "g"), " ") : string;
	});
	string = string.toLowerCase();

	word = "";
	for (let i = 0; i < string.length; i++) {

		if (open_tag == null) {
			if (buffer == null) {
				if (string[i] == "<" && string[i + 1] == "/") {
					// this is a special case for encapsulating tags,
					// if we've reached the end, we don't really care, we
					// just need to move past it
					// make sure that string.indexOf() is not negative
					// if the string.indexOf() is negative, we need to actually
					// go to the end of the string instead, since in this case we don't
					// care what happens to the data
					let string_end = string.indexOf(">", i + 1);
					i += string_end == -1 ? string.length - i : string_end - i; // BINGO
					continue;
				}

				// we know we're just looking for a "<" tag
				if (string[i] == "<") {
					open_tag = i;
					i += 2;
				}
			} else {
				// if this isn't true, we should be looking for words
				// (only if in the <text> element)
				if ((string[i] == " " || string[i] == "\n" || string[i] == "\t" ||
						string[i] == "<") && buffer == "text" && word.length) {
					// add the word (after stemming) into the skip list
					// see if we already have a skip list for this word:
					if (word.length < 25) {
						let stem_word = stemmer(word);
						page_id = parseInt(page_id, 10);
						if (!pages[stem_word]) {
							pages[stem_word] = [[page_id, [i]]];
							word = "";
							continue;
						}

						let added = false, less_than = 0;
						for (let find = 0; find < pages[stem_word].length; find++) {
							if (pages[stem_word][find][0] == page_id) {
								pages[stem_word][find][1].push(i);
								added = true;
							} else if (pages[stem_word][find][0] < page_id)
								less_than = find;
						}

						if (!added)
							pages[stem_word].splice(less_than + 1, 0, [page_id, [i]]);
					}
					word = "";
				} else {
					word += (string[i].charCodeAt(0) >= 97 && string[i].charCodeAt(0) <= 122) ||
						(string[i].charCodeAt(0) >= 48 && string[i].charCodeAt(0) <= 57) ?
						string[i] : "";
				}

				// we know we're looking for "</"
				if (string[i] == "<" && string[i + 1] == "/") {
					open_tag = i;
					i += 2;
					continue;
				}

				// we add to the page info if necessary
				page_id += !page_idDone && buffer == "id" ? string[i] : "";
				page_title += buffer == "title" ? string[i] : "";
			}
		} else {
			if (string[i] == ">" && buffer == null) {
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
				if (buffer == "page") {
					page_id = "";
					page_idDone = false;
					page_title = "";
					buffer = null;
				} else if (buffer == "id" || buffer == "title" || buffer == "text") {
					// change nothing
				} else {
					buffer = null;
				}
				open_tag = null;
				word = "";
			} else if (string[i] == ">" && buffer) {
				// we've found the end of our close tag (aka </id">")

				// buffer_place is the beginning of our tag data (the initial <id>"x" after our tag)
				// and open_tag is the end of our tag data (the end "<"/id>)

				if (!page_idDone && page_id && page_title &&
					((string[i - 5] == "t" && string[i - 4] == "i" && string[i - 3] == "t" && string[i - 2] == "l" && string[i - 1] == "e") ||
						string[i - 2] == "i" && string[i - 1] == "d")) {
					writer.write(`${page_id}|${page_title}\n`);
					page_idDone = true;
				}

				word = "";
				open_tag = null;
				buffer = null;
			}
		}
	}

	return;
}

function createIndex(coll_endpoint, stopwords, outputer) {

	console.time();
	let source = fs.createReadStream(coll_endpoint, {
		highWaterMark: 131071
	});

	fs.truncateSync(outputer, 0);

	let writerTitleIndex = fs.createWriteStream(outputer, {
		mode: 0o755
	});

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
			findPages(chunk.toString(), stopwords, writerTitleIndex);
		}
	});

	source.on('end', () => {
		console.log("end");
		// serialize pages into the inverted index:
		serializeObject(`/media/hotboy/DUMP/myIndex.dat`, pages);
		console.timeEnd();
	});
}

let stop_words = fs.readFileSync(`./myStopWords.dat`, 'utf8').split("\n");
// /media/hotboy/DUMP/wikidatawiki-20210901-pages-articles-multistream7.xml-p6052572p7552571
createIndex('./myCollection.dat', stop_words, './myTitles.dat');
//createIndex(`/media/hotboy/DUMP/enwiki-20210901-pages-articles-multistream1.xml-p1p41242`, stop_words, `./myTitles.dat`);
//createIndex(`/media/hotboy/DUMP/enwiki-20210901-pages-articles-multistream16.xml-p20460153p20570392`, stop_words, `./myTitles.dat`);