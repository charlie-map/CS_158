const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const {
	serializeObject
} = require('../project1/utils');

let pages = Object.create(null),
	open_tag = null,
	buffer = null,
	buffer_place, page_id = "",
	page_idDone = false,
	page_title = "",
	pageAmount = 0,
	totalWords = 0,
	pageTemp = Object.create(null); // stores term weight for document

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
					if (string[i + 2] == "p" && string[i + 3] == "a" && string[i + 4] == "g" && string[i + 5]) {
						// let's go through page temp and use the term frequencies
						// we've found, and the total words to add a
						// normalized term to our terms
						let tempWords = Object.keys(pageTemp);
						for (let wordRun = 0; wordRun < tempWords.length; wordRun++) {

							// we need to look for the correct page_id:
							// at pageTemp[tempWords[wordRun]][1]:

							// POS 2 in pages is the term frequency
							pages[tempWords[wordRun]][pageTemp[tempWords[wordRun]][1]][2] = pageTemp[tempWords[wordRun]][0];

							// POS 3 is the total words in our page
							pages[tempWords[wordRun]][pageTemp[tempWords[wordRun]][1]][3] = totalWords;
							// ^ grab totalWords
							// which can be save as tempWords.length
						}

						// done!
						pageTemp = Object.create(null);
					}

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
						let stem_word = word, //stemmer(word), stemming during querying
							stem_page = pages[stem_word];
						page_id = parseInt(page_id, 10);
						if (!stem_page) {
							pages[stem_word] = [
								[page_id, [i]]
							];
							pageTemp[stem_word] = [1, 0];
						} else {

							let added = false,
								less_than = 0;
							for (let find = 0; find < stem_page.length; find++) {
								if (stem_page[find][0] == page_id) {
									pages[stem_word][find][1].push(i);

									// also add to the term frequency:
									pageTemp[stem_word][0]++;
									added = true;
								} else if (stem_page[find][0] < page_id)
									less_than = find;
							}

							if (!added) {
								pages[stem_word][stem_page.length] = [
									page_id, [i]
								];
								pageTemp[stem_word] = [1, stem_page.length - 1];
								// the second argument is the position of our page_id
								// in pages
							}
						}
					}
					totalWords++;
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
					totalWords = 0;
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
		serializeObject(`../project1/myIndex.dat`, pages, pageAmount);
		console.timeEnd();
	});
}

let stop_words = fs.readFileSync(`./myStopWords.dat`, 'utf8').split("\n");
createIndex('../project1/myCollection.dat', stop_words, './myTitles.dat');