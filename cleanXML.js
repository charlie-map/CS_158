const fs = require('fs');

function isGoodTag(tag) {
	if ((tag[0] == "i" && tag[1] == "d") ||
		(tag[0] == "t" && tag[1] == "i" && tag[2] == "t" && tag[3] == "l" && tag[4] == "e") ||
		(tag[0] == "t" && tag[1] == "e" && tag[2] == "x" && tag[3] == "t") ||
		(tag[0] == "p" && tag[1] == "a" && tag[2] == "g" && tag[3] == "e"))
		return true;

	return false;
}

function isDirty(str) {

	let index = str.indexOf("&");
	str = str.substring(0, index == -1 ? str.length : index).replace(/[^A-Za-z0-9'",.|]/g, "");

	str = str.split("|").join(" ");

	if (str.length >= 20)
		return "";

	return str;
}

function clean(string, writeOut) {
	// clear and setup write stream for cleaned file
	fs.truncateSync(writeOut, 0);
	let outStream = fs.createWriteStream(writeOut, {
		mode: 0o755
	});

	let inPageTag = 0;
	let hasTag = 0;
	let buffer = 0;
	let innards = "";

	let subWord = "";

	for (let i = 0; i < string.length; i++) {

		if (buffer == 0) { // looking for an open tag (aka "<")

			if (string[i] == "<" && string[i + 1] == "/") {
				// found an end tag to something we ignored:
				// add that in if it's a certain word
				continue;
			}

			if (string[i] == "<") { // found open tag
				// check what tag is inside:

				let tagEnd = string.indexOf(">", i);
				let innerTag = string.substring(i + 1, tagEnd).split(" ")[0];

				// check to make sure innerTag is a tag we want:
				if (isGoodTag(innerTag)) {
					buffer = innerTag;

					// if it's a page, go ahead and add the tag
					// for that since it's an encompassing
					if (buffer == "page") {

						if (inPageTag && tagType)
							outStream.write("</page>\n");
						outStream.write("<page>\n");
						inPageTag = 1;
						hasTag = 0;
						buffer = 0;
					}
				}

				i = tagEnd;
				subWord = "";
				innards = "";
				continue;
			}
		} else { // add to innards until we hit a </:
			if (string[i] == "<" && string[i + 1] == "/") {
				// time to change

				let tagEnd = string.indexOf(">", i);
				let endInnerTag = string.substring(i + 2, tagEnd);

				// make sure endInnerTag equals buffer
				// otherwise we just want to keep searching
				if (endInnerTag != buffer)
					continue;

				buffer = 0; // close buffer

				if (endInnerTag == "id") {
					hasTag++;

					if (hasTag > 1)
							continue;
				}

				if (endInnerTag == "text") { // need extra cleaning

				}

				// now we can actually add whatever innards is into our file:
				outStream.write("<" + endInnerTag + ">" + (endInnerTag == "text" ? "\n" : "") + innards + (endInnerTag == "text" ? "\n" : "") + (tagType ? "</" + endInnerTag + ">\n" : "\n"));
			}

			if (string[i] == "{") { // remove this: all linkage to stuff in wikipedia language
				let newIndex = string.indexOf("}", i);

				if (newIndex == -1)
					continue;

				i = newIndex + 2;
			}

			if (string[i] == " ") {
				// check the current subWord and make sure it's clean
				subWord = isDirty(subWord);
				if (subWord.length == 0) {
					continue;
				} else {
					// go ahead and add it
					innards += subWord + " ";
					subWord = "";
				}
			} else {
				subWord += string[i];
			}
		}
	}
}

// close tags (has a </page>) is 1, no close tag is 0
// use -open in command line to have no close tags
let tagType = process.argv[4] == "-open" ? 0 : 1;

// process.argv:
// 2 for the XML file
// 3 for the cleaned XML output file
console.time();
clean(fs.readFileSync(process.argv[2]).toString(), process.argv[3]);
console.timeEnd();



// if (open_tag == null) {
// 			if (buffer == null) {
// 				if (string[i] == "<" && string[i + 1] == "/") {
// 					// this is a special case for encapsulating tags,
// 					// if we've reached the end, we don't really care, we
// 					// just need to move past it

// 					// we can also go ahead and augment our pages to have extra values:
// 					// but only if we're closing a page tag:
// 					if (string[i + 2] == "p" && string[i + 3] == "a" && string[i + 4] == "g" && string[i + 5] == "e")
// 						tempPageClear();

// 					// make sure that string.indexOf() is not negative
// 					// if the string.indexOf() is negative, we need to actually
// 					// go to the end of the string instead, since in this case we don't
// 					// care what happens to the data
// 					let string_end = string.indexOf(">", i + 1);
// 					i += string_end == -1 ? string.length - i : string_end - i; // BINGO
// 					continue;
// 				}

// 				// we know we're just looking for a "<" tag
// 				if (string[i] == "<") {
// 					open_tag = i;
// 					i += 2;
// 				}
// 			} else {
// 				// if this isn't true, we should be looking for words
// 				// (only if in the <text> element)
// 				if ((string[i] == " " || string[i] == "\n" || string[i] == "\t" ||
// 						string[i] == "<") && buffer == "text" && word.length) {
// 					if (word.length < 25) {
// 						let stem_page = pages[stem_word];

// 						page_id = parseInt(page_id, 10);
// 						if (!stem_page) {
// 							// adding to our current word object:
// 							// pos 2 = tf
// 							// pos 3 = df
// 							wordTemp[stem_word] = [
// 								page_id, [i], 1, null
// 							]

// 						} else {

// 							stem_page[1].push(i);
// 							wordTemp[stem_word][2]++;
// 						}
// 					}
// 					word = "";
// 				} else {
// 					word += (string[i].charCodeAt(0) >= 97 && string[i].charCodeAt(0) <= 122) ||
// 						(string[i].charCodeAt(0) >= 48 && string[i].charCodeAt(0) <= 57) ?
// 						string[i] : "";
// 				}

// 				// we know we're looking for "</"
// 				if (string[i] == "<" && string[i + 1] == "/") {
// 					open_tag = i;
// 					i += 2;
// 					continue;
// 				}

// 				// we add to the page info if necessary
// 				page_id += !page_idDone && buffer == "id" ? string[i] : "";
// 				page_title += buffer == "title" ? string[i] : "";
// 			}
// 		} else {
// 			if (string[i] == ">" && buffer == null) {
// 				// we've found the end of a tag
// 				let string_sub = string.substring(open_tag + 1, i);
// 				/* there's a chance there's extra stuff inside of string_sub
// 					ex. <text bytes="10593" xml:space="preserve">
// 					to just look at the beginning (no excess information)
// 					we can use substr since substr has O(k) complexity
// 					where k is string_sub.substr(0, k) length of pulled string
// 					versus split() which is n where n = string_sub.length */

// 				let index_ofSpace = string_sub.indexOf(" ");
// 				buffer = string_sub.substring(0, index_ofSpace == -1 ? string_sub.length : index_ofSpace);
// 				// make sure the buffer is a type of tag we want
// 				// ^ we only care about id, title, and text
// 				if (buffer == "page") {

// 					page_id = "";
// 					page_idDone = false;
// 					page_title = "";
// 					buffer = null;
// 				} else if (buffer == "id" || buffer == "title" || buffer == "text") {
// 					// change nothing
// 				} else {
// 					buffer = null;
// 				}
// 				open_tag = null;
// 				word = "";
// 			} else if (string[i] == ">" && buffer) {
// 				// we've found the end of our close tag (aka </id">")

// 				// buffer_place is the beginning of our tag data (the initial <id>"x" after our tag)
// 				// and open_tag is the end of our tag data (the end "<"/id>)

// 				if (!page_idDone && page_id && page_title &&
// 					((string[i - 5] == "t" && string[i - 4] == "i" && string[i - 3] == "t" && string[i - 2] == "l" && string[i - 1] == "e") ||
// 						string[i - 2] == "i" && string[i - 1] == "d")) {
// 					writer.write(`${page_id}|${page_title}\n`);
// 					page_idDone = true;
// 				}

// 				word = "";
// 				open_tag = null;
// 				buffer = null;
// 			}
// 		}