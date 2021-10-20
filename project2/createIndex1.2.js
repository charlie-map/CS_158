const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const {
	serializeObject,
	searchFindInsert
} = require('../project1/utils');

let wordObject = Object.create(null),
	open_tag = null,
	buffer = null,
	buffer_place, page_id = "",
	page_idDone = false,
	page_title = "",
	pageAmount = 0,
	wordTemp = Object.create(null); // stores term weight for document

function tempPageClear() {
	// let's go through page temp and use the term frequencies
	// we've found, and the total words to add a
	// normalized term to our terms
	let tempWords = Object.keys(wordTemp);
	for (let wordRun = 0; wordRun < tempWords.length; wordRun++) {

		wordTemp[tempWords[wordRun]][3] = tempWords.length;

		let subWords = wordObject[tempWords[wordRun]];
		if (!wordObject[tempWords[wordRun]]) {

			// this means this word hasn't been seen yet (in this chunk)
			// so we can just make the simple switch:
			wordObject[tempWords[wordRun]] = [wordTemp[tempWords[wordRun]]];
			continue;
		}

		// otherwise, we need to find where we place the word
		// inside of the words object, which is a little bit more trick
		searchFindInsert(subWords, wordTemp[tempWords[wordRun]], 0, subWords.length);
	}

	// done!
	wordTemp = Object.create(null);
}

function findPages(string, stopwords, writer) {
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

					// we can also go ahead and augment our pages to have extra values:
					// but only if we're closing a page tag:
					if (string[i + 2] == "p" && string[i + 3] == "a" && string[i + 4] == "g" && string[i + 5] == "e")
						tempPageClear();

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
					if (word.length < 25) {

						let stem_word = stemmer(word), // stemming during querying
							stem_page = wordTemp[stem_word];

						page_id = parseInt(page_id, 10);
						if (!stem_page) {
							// adding to our current word object:
							// pos 2 = tf
							// pos 3 = df
							wordTemp[stem_word] = [
								page_id, [i], 1, null
							]

						} else {

							stem_page[1].push(i);
							wordTemp[stem_word][2]++;
						}
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
					pageAmount++;

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

function createIndex(coll_endpoint, stopwords, outputer, indexFile) {

	console.time();
	let source = fs.createReadStream(coll_endpoint, {
		highWaterMark: 131071
	});

	fs.truncateSync(indexFile, 0);

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

			// serialize our new chunk of data:
			serializeObject(indexFile, wordObject, pageAmount);
			// then empty the pages object:
			wordObject = Object.create(null);
		}
	});

	source.on('end', () => {
		console.timeEnd();
	});
}

let stop_words = fs.readFileSync(`./myStopWords.dat`, 'utf8').split("\n");
//createIndex('../project1/myCollection.dat', stop_words, './myTitles.dat', `../project1/myIndex.dat`);
createIndex('/media/hotboy/162ae38b-fd40-443b-9963-6fc10196d6ff/wiki325', stop_words, './myTitles.dat', `/media/hotboy/162ae38b-fd40-443b-9963-6fc10196d6ff/myIndex.dat`);