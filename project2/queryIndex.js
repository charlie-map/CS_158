const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const {
	arrAndGate,
	arrOrGate,
	deserializeObject
} = require('../project1/utils');

const {
	trie,
	insert,
	strPerms
} = require('./trie');

const {
	findMatch,
	search,
	sortDocs,
	swap,
	docPart,
	makeBQQuery,
	BQpartition,
	normalChar
} = require('./queryFunc')

let pages, pageAmount;
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

function isPhraseMatch(pointers, qStrings) {
	// first find the document that checks off for all pointers,
	// aka that the word occurs in that document

	// we will loop based off of which pointer has the highest value:
	let match = pages[qStrings[1]][pointers[0]][0],
		falsey = false;

	for (let find = 1; find < qStrings.length - 2; find++) {
		if (pointers[find] == undefined)
			pointers[find] = 0;

		let currPage = pages[qStrings[find + 1]];

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

	let currPage = pages[qStrings[1]][pointers[0]][1]; // UH OH
	let isPair = true,
		buildWordLen;
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

function WQfindDocs(metaDocs, termProduct, qStrings) {
	// just a single query, so we'll go ahead and
	// get all the permutations with:
	let queryWordPerms = strPerms(trie, qStrings[0], 0);

	for (let checkQ = 0; checkQ < queryWordPerms.length; checkQ++) {
		let newDocs = pages[stemmer(queryWordPerms[checkQ])];

		/*
			for a solo word, we want to return all the documents,
			but we need to ensure each document is in order of
			highest weight, so first we will make a metaDoc, and then
			get into the process of sorting each choice based on weight
			AS we are making the metaDoc
			-- POSITION does not matter for single word WQ
		*/

		// for each document in newDocs, we need to see if
		// it's already in metaDocs:

		for (let docI = 0; docI < newDocs.length; docI++) {

			let lowDoc = 0,
				highDoc = metaDocs.length;
			let midDoc = Math.floor((lowDoc + highDoc) / 2);
			// we will search through the current metaDocs
			// to see if our docID is already in there:

			while (lowDoc < highDoc && metaDocs[midDoc] != newDocs[docI][0]) {

				// see if midDoc is too high, or too low:

				lowDoc = metaDocs[midDoc] < newDocs[docI][0] ? lowDoc : midDoc + 1;
				highDoc = metaDocs[midDoc] < newDocs[docI][0] ? midDoc - 1 : highDoc;

				midDoc = Math.floor((lowDoc + highDoc) / 2);
			}

			// now we have either found a doc in metaDocs, or
			// we haven't -- if we have let's add to the weighting
			// for that document:
			if (metaDocs[midDoc] == newDocs[docI][0])
				termProduct[midDoc] += newDocs[docI][2];
			else { // otherwise we start our new term:
				// since midDoc will be where we want to insert
				// our new doc, we can splice into
				// the metaDoc at the position:

				metaDocs.splice(midDoc, 0, newDocs[docI][0]);
				termProduct.splice(midDoc, 0, newDocs[docI][2]);
			}

			// now the metaDoc will have all of the terms
			// and termProduct will have all the weights
		}
	}
}

function queryIndexer(query_string, stopwords, docWriter) {
	// first determine the type of query string:
	// 0: OWQ if query_string.index(" ") == -1
	// 1: BQ if query_string CONTAINS "AND" or "OR"
	// 2: PQ if query_string is wrapped in quotes
	// 3: FTQ otherwise

	// UPDATES: Now need to handle wildcards:
	/*
		UPDATED query decider:
			0: OWQ if query_string.index(" ") == -1 && query_string.index("*") == -1
			1: BQ if query_string CONTAINS "AND" or "OR"
			2: PQ if query_string is wrapped in quotes and 
	*/

	let starIndex = query_string.indexOf("*");
	let spaceIndex = query_string.indexOf(" ");
	let query_type = 0;

	if (starIndex == -1) {
		// now either a OWQ, BQ, PQ, or FTQ
		query_type = spaceIndex == -1 ? 0 :
			query_string.includes("AND") || query_string.includes("OR") ? 1 :
			query_string[0] == "\"" && query_string[query_string.length - 1] == "\"" ? 2 : 3;
	} else {
		// we now know the query is either wildcard query (WQ), or wildcard phrase query (WPQ)
		// WQ is type 4, and WPQ is type 5
		query_type = spaceIndex == -1 ? 4 : 5;
	}

	let qStrings = cleanQuery(query_string, stopwords, query_type);

	let userTermScores = qStrings[1];
	let allWords = qStrings[2];
	qStrings = qStrings[0];
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
	let metaDocs = [],
		termProduct = [];
	if (query_type == 0 || query_type == 1 || query_type == 3)
		metaDocs = findComparatives(qStrings, 0)[0];
	else {
		// with phrase queries, we need to document positions as well, so
		// for that we will also have a second parameter for grabDocs:
		// grabDocs("word", true); to emphasize that we need positions connected

		if (query_type == 2) {

			let pointers = [-1];
			for (let word = 0; word < pages[qStrings[1]].length; word++) {
				pointers[0]++;

				if (!pages[qStrings[1]][pointers[0]])
					break;

				if (isPhraseMatch(pointers, qStrings))
					metaDocs.push(pages[qStrings[1]][pointers[0]][0]);
			}
		} else {
			if (query_type == 4) {
				WQfindDocs(metaDocs, termProduct, qStrings);
			}
		}
	}

	// before we add the docs, go ahead and work out the cosine similarity:
	// first we need to calculate the dot product of
	// ^ this will hold the degree of match with the user query and meta docs
	if (query_type != 4)
		for (let doc = 0; doc < metaDocs.length; doc++) {
			termProduct[doc] = 0;

			for (let s = 0; s < qStrings.length; s++) {
				let qs = qStrings[s];
				if (qs == "*" || qs == "\"" || qs == "(" || qs == ")" || qs == "AND" || qs == "OR")
					continue; // skip if not actual word

				// before we do any big math, need to normalize the user term on all words in query:
				if (doc == 0) // only do this the first time
					userTermScores[qs] /= allWords;

				// now we can do the math for each document:
				// we'll need to find the document position in the page
				let searcher = search(pages[qs], metaDocs[doc]);
				termProduct[doc] += (userTermScores[qs] ? userTermScores[qs] : 0) * (searcher == 0 ? searcher : searcher[0]);
			}
		}


	// sort meta docs on whichever is highest first:
	sortDocs(metaDocs, termProduct, 0, termProduct.length - 1);
	docWriter.write(`${query_string} => ${metaDocs}\n`)
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
			pages = deserializeObject(chunk.toString(), pages, pageAmount, insert, trie);
			pageAmount = pages[1];
			pages = pages[0];
		}
	});

	source.on('end', () => {
		console.log(trie);
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

findQueries("../project1/myIndex.dat", `./myQueries.dat`, `./myStopWords.dat`, `./myDocs.dat`);
// console.log(queryIndexer("(spACE AND odyssey{}) OR orange", "./myStopWords.dat"));;

function cleanQuery(string, stopwords, query_type) {
	let pre = 0;

	// items for tf-idf:
	let tf = Object.create(null),
		totalWords = 0,
		realCharEnd = false;
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
			// realCharEnd = false;

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

			let nWord = word;

			if (word.indexOf("*") == -1)
				nWord = stemmer(word.toLowerCase().replace(/[^a-z0-9]/g, ""));

			let isStopword = false;
			// then stopwords:
			// assuming stopwords is sorted, we can perform a binary search ** NEEDS MAKING:
			// isStopword = searchWords(stopwords, nWord);
			stopwords.forEach(w => {
				if (w == nWord) {
					isStopword = true;
					return;
				}
			});

			// we now decide on what to do with this information:

			// if it's a stopword, we need to go ahead and remove it totally and move run accordingly:
			if (isStopword) {
				// we just want to fully remove the word
				string = string.substring(0, pre) + string.substring(run, string.length);
				run = (run - word.length) + (realCharEnd ? 2 : 0);
			} else {
				totalWords++;
				tf[nWord] = tf[nWord] ? tf[nWord] + 1 : 1;
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

	return [string.split(" "), tf, totalWords];
}