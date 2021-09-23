const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const {
	arrAndGate,
	arrOrGate,
	deserializeObject
} = require('../project1/utils');

let pages;
// declaring globally for use through multiple functions

function grabDocs(word, needPos) {
	let docs = [];

	let page_docs = pages[word];
	if (!page_docs)
		return [];
	for (let i = 0; i < page_docs.length; i++) {
		if (needPos)
			docs.push(page_docs[i]);
		else
			docs.push(page_docs[i][0]);
	}

	return docs;
}

function findMatch(pos, range, wordLen, array, low, high) {
	low = low == undefined ? 0 : low;
	high = high == undefined ? array.length : high;
	if (low > high)
		return array[low] - wordLen <= pos + range && array[low] - wordLen >= pos - range;

	// search the array for the pos:
	// find middle:
	let mid = Math.floor((low + high) * 0.5);

	// check middle for if we should go higher or lower:
	if (array[mid] - wordLen <= pos + range && array[mid] - wordLen >= pos - range) {
		// we're done!
		return true;
	} else {
		// decide if we're lower or higher than our range:
		let lower = array[mid] - wordLen < pos - range ? low : mid + 1;
		let higher = array[mid] - wordLen > pos + range ? high : mid - 1;
		return findMatch(pos, range, wordLen, array, lower, higher);
	}
}

function isPhraseMatch(pointers, qStrings) {
	// first find the document that checks off for all pointers,
	// aka that the word occurs in that document

	// we will loop based off of which pointer has the highest value:
	let match = pages[qStrings[1]][pointers[0]][0],
		falsey = false;
	for (let find = 1; find < qStrings.length - 2; find++) {
		if (pointers[find] == undefined)
			pointers[find] = 0;

		let currPage = pages[qStrings[find + 1]]

		while (currPage[pointers[find]] && currPage[pointers[find]][0] < match) {
			pointers[find]++;
		}

		if (currPage[pointers[find]] == undefined || currPage[pointers[find]][0] != match) { // if there's no value, break
			falsey = true;
			break;
		}
	}

	if (falsey)
		return false; // there is no document pairs between our words

	let currPage = pages[qStrings[1]][pointers[0]][1];
	let isPair = true, buildWordLen;
	for (let point = 0; point < currPage.length; point++) {
		buildWordLen = 0;
		let i;
		for (i = 2; i < qStrings.length - 1; i++) {
			buildWordLen += qStrings[i].length + 2; // for spaces
			if (findMatch(currPage[point], 5, buildWordLen, pages[qStrings[i]][pointers[i - 1]][1]))
				break;
		}

		if (i != qStrings.length - 1) {
			// we found one that worked! We can stop
			isPair = true;
			break;
		} else
			isPair = false;
	}

	return isPair;
}

function queryIndexer(query_string, stopwords, docWriter) {
	// first determine the type of query string:
	// 0: OWQ if query_string.split(" ").length == 1
	// 1: BQ if query_string CONTAINS "AND" or "OR"
	// 2: PQ if query_string is wrapped in quotes
	// 3: FTQ otherwise

	let query_type = query_string.indexOf(" ") == -1 ? 0 :
		query_string.includes("AND") || query_string.includes("OR") ? 1 :
		query_string[0] == "\"" && query_string[query_string.length - 1] == "\"" ? 2 : 3;

	let qStrings = cleanQuery(query_string, stopwords, query_type);
	if (query_type == 1)
		makeBQQuery(qStrings, 0, qStrings.length - 1);

	/*
		for finding documents, we will need first just a normal array,
		as we go through each term in the query, we will also check
		for if it's part of a boolean query, which will mean that we
		need to start working through documents that work for each separate word
		-- for BQ,
			if there are any parentheses, we will need to construct a sub array
			to work through those sub problems of the query first
	*/
	if (query_type == 0 || query_type == 1 || query_type == 3) {
		function findComparatives(qs, start) {
			let bq_type, cmp = [];
			for (let strRun = start; strRun < qs.length; strRun++) {
				// if we find a close parenthesis, we want to end our current level:
				if (qs[strRun] == ")")
					return [cmp, strRun];

				// our second thing we look for is open parentheses, if we see one,
				// we want to go into a sub findComparatives
				if (qs[strRun] == "(") {
					let cmpRe = findComparatives(qs, strRun + 1);
					if (cmpRe[0].length)
						cmp.push(cmpRe[0][0]);
					else if (!cmpRe[0].length)
						cmp.push(cmpRe[0]);
					strRun = cmpRe[1]
				} else if (qs[strRun] == "AND" || qs[strRun] == "OR") {
					bq_type = qs[strRun] == "AND" ? 2 : qs[strRun] == "OR" ? 1 : undefined;
					continue;
				} else {
					// the next step is constanly adding to cmp if none of the above happen
					cmp.push(grabDocs(qs[strRun]));
				}


				// at this point we need to check bq_type,
				// if it has a value, then we need to do something to the cmp,
				// otherwise nothing happens and we keep going

				// based on the generizability of the gate operations,
				// we can throw whatever is inside of cmp into there

				if (bq_type == 2) {
					cmp = [arrAndGate(cmp)];
				} else if (bq_type == 1)
					cmp = [arrOrGate(cmp)];
			}
			return cmp;
		}
		docWriter.write(`${query_string} => ${findComparatives(qStrings, 0)}\n`)
	} else {
		// with phrase queries, we need to document positions as well, so
		// for that we will also have a second parameter for grabDocs:
		// grabDocs("word", true); to emphasize that we need positions connected

		let pointers = [-1],
			metaDocs = [];
		for (let word = 0; word < pages[qStrings[1]].length; word++) {
			pointers[0]++;

			if (!pages[qStrings[1]][pointers[0]])
				break;

			if (isPhraseMatch(pointers, qStrings))
				metaDocs.push(pages[qStrings[1]][pointers[0]][0]);
		}

		docWriter.write(`${query_string} => ${metaDocs}\n`);
	}
}

function findQueries(skiplist_file, query_page, stopwords, doc_out) {
	stopwords = fs.readFileSync(stopwords, 'utf8').split("\n");
	console.time();

	let source = fs.createReadStream(skiplist_file, {
		highWaterMark: 131071
	});
	let docWriter = fs.createWriteStream(doc_out, {
		mode: 0o755
	})

	source.on('readable', () => {
		let chunk;

		while (null !== (chunk = source.read())) {
			pages = deserializeObject(chunk.toString(), pages);
		}
	});

	source.on('end', () => {
		let stringQueries = fs.readFileSync(query_page, 'utf8');
		let line_start = 0;

		for (let through_string = 0; through_string < stringQueries.length + 1; through_string++) {
			// if we've reached the end of a line (\n), then we need to move to next line
			if (stringQueries[through_string] == undefined || stringQueries[through_string] == "\n") {
				// as we work through these, we will also find all matches at the end of the file
				queryIndexer(stringQueries.substring(line_start, through_string), stopwords, docWriter);
				line_start = through_string + 1;
			}
		}

		console.timeEnd();
	});
}

findQueries("/media/hotboy/DUMP/myIndex.dat", `./myQueries.dat`, `./myStopWords.dat`, `./myDocs.dat`);
// console.log(queryIndexer("(spACE AND odyssey{}) OR orange", "./myStopWords.dat"));;

function makeBQQuery(qString, low, high) {
	if (low < high) {
		let pivot = BQpartition(qString, low, high);
		if (pivot < low)
			return;

		// since pivot could have AND or OR at its position, we need to know because
		// we only want to splice in () if it's an or
		if (qString[pivot] == "OR") {

			// if pivot is a value, we want to put parentheses on both sides, aka:
			// go from ["banana", "OR", "apple"] to
			// ["(", "banana", ")", "OR", "(", "apple", ")"]

			// BUT there is some times when we don't want to add on one side, say:
			// ["apple", "OR", "(", "tree", "AND", "plant", "("]
			// since the parentheses are already there, we don't want to add extras:

			let lower = 0,
				higher = 0;
			if (!(qString[pivot + 1] == "(" && qString[high] == ")")) {
				qString.splice(high + 1, 0, ")"); // high side
				qString.splice(pivot + 1, 0, "("); // high side

				higher = 2;
			}

			if (!(qString[pivot - 1] == ")" && qString[low] == "(")) {
				qString.splice(pivot, 0, ")"); // low side
				qString.splice(low, 0, "("); // low side

				lower = 2;
			}

			high += lower + higher;
			pivot += lower;
		}

		makeBQQuery(qString, pivot + 1, high); // high side
		makeBQQuery(qString, low, pivot - 1); // low side
	}
	return qString;
}

function BQpartition(qString, low, pivot) {
	// a partition point would be either an OR, or it would be on the right side of
	// a ")" or on the left side of an "("
	let close = 0;
	let lowest = [low - 1, Infinity];
	// lowest contains a position and a close level, which corresponds
	// to what level of "depth" we have of parentheses, the lowest the
	// close value the higher likelihood hood of being chosen

	for (let j = low; j < pivot; j++) {
		if (qString[j] == "(")
			close++;
		else if (qString[j] == ")")
			close--;

		if ((qString[j] == "OR" || qString[j] == "AND") && close < lowest[1]) {
			lowest = [j, close];
		}
	}

	return lowest[0];
}

function normalChar(char) {
	if (!char)
		return;
	char = char.charCodeAt(0);
	return (char >= 48 && char <= 57) || (char >= 65 && char <= 90) || (char >= 97 && char <= 122);
}

function cleanQuery(string, stopwords, query_type) {
	let pre = 0;
	for (let run = 0; run < string.length + 1; run++) {

		// first case: we have an open something, and we need to make sure it's not a normal character before
		if ((string[run] == "(" || (string[run] == "\"" && !normalChar(string[run - 1]))) &&
			string[run + 1] != " " /*special case for making sure there's not already a space*/ ) {

			string = string.substring(0, run) + string[run] + " " + string.substring(run + 1, string.length);

			run += 2;
			pre = run;
		}

		// second case: looking for a word, if there's some unknown character, we still want the word:
		if (string[run] == " " || string[run] == ")" || string[run] == "\"" || string[run] == undefined) {

			// along with this, if the character we run into is actually a ")" or "\"", we want to keep it
			// just move it out of our way:

			let realCharEnd = false;

			if (string[run] == ")" || string[run] == "\"") {
				string = string.substring(0, run) + " " + string[run] + string.substring(run + 1, string.length);
				realCharEnd = true;
			}

			// now that we've put some space in there, we can continue working:
			let word = string.substring(pre, run);

			// CASE: if the word is OR or AND, just skip past it:
			if (word == "AND" || word == "OR") {
				pre = run + 1;
				continue;
			}

			let nWord = stemmer(word.toLowerCase().replace(/[^a-z0-9]/g, ""));

			let isStopword = false;
			// then stopwords:
			stopwords.forEach(w => {
				if (w == nWord)
					isStopword = true;
			});

			// we now decide on what to do with this information:

			// if it's a stopword, we need to go ahead and remove it totally and move run accordingly:
			if (isStopword) {
				// we just want to fully remove the word
				string = string.substring(0, pre) + string.substring(run, string.length);
				run = (run - word.length) + (realCharEnd ? 2 : 0);
			} else {
				// otherwise we are going to add the cleaned word into its place:
				string = string.substring(0, pre) +
					nWord + (nWord.length && query_type == 3 ? " OR" : "") + string.substring(run, string.length);

				// remove any length lost from stemming:
				run -= word.length - nWord.length;
				run += nWord.length && query_type == 3 ? 3 : 0;

				if (realCharEnd)
					run += 2;
				pre = run + 1;
			}
		}
	}

	return string.split(" ");
}