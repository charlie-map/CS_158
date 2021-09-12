const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const skiplist = require('./skipList');

function findPages(string, pages, stopwords, broken, buffer) {
	stopwords.forEach(stop => {
		string = stop.length ? string.replace(new RegExp(`\\b${stop} \\b`, "g"), "") : page.text;
		string = stop.length ? string.replace(new RegExp(`\\b ${stop}\\b`, "g"), "") : page.text;
	});
	string = string.toLowerCase();

	let word = "";
	for (let runStr = 0; runStr < string.length; runStr++) {

		if (broken == null) {
			if (buffer == null) {
				// we know we're just looking for a "<" tag
				if (string[i] == "<") {
					broken = i;
					i += 2; // trying to skip as much string as possible
				}
			} else {
				// we know we're looking for "</"
				if (string[i] + string[i + 1] == "</") {
					broken = buffer;
					i += 2; // skipping just a wee bit :D
				}

				// if this isn't true, we should be looking for words
				// (only if in the <text> element)
				if (string[i] == " " && buffer == "text") {
					// add the word (after stemming) into the skip list
					// skiplist.insert(stemmer(word), pages[pages.length - 1].id, i);
					word = "";
				} else
					word += string[i];
			}
		} else {
			if (string[i] == ">" && buffer == null) {
				// we've found the end of a tag
				let string_sub = string.substring(broken + 1, i);

				/* there's a chance there's extra stuff inside of string_sub
					ex. <text bytes="10593" xml:space="preserve">
					to just look at the beginning (no excess information)
					we can use substr since substr has O(k) complexity
					where k is string_sub.substr(0, k) length of pulled string
					versus split() which is n where n = string_sub.length */
				
				buffer = string_sub.substring(0, string_sub.indexOf(" "));
				broken = null;
				word = ""; 
			}
		}
	}
}

function createIndex(coll_endpoint, stopwords, outputer) {

	let pages = {}, broken = null, buffer = null;
	let source = fs.createReadStream(coll_endpoint, {
		highWaterMark: 16383
	}, 'utf8');

	fs.truncateSync(outputer, 0);

	let writer = fs.createWriteStream(outputer);

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
	source.on('data', function(chunk) {
		findPages(chunk, pages, stopwords, broken, buffer);
	});
}

let stop_words = fs.readFileSync(`./myStopWords.dat`, 'utf8').split("\n");

createIndex(`./myCollection.dat`, stop_words, `./myIndex.dat`);