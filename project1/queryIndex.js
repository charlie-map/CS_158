const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const {
	arrAndGate,
	arrOrGate,
	deserializeObject
} = require('./utils');

let pages;
// declaring globally for use through multiple functions

function grabDocs(word) {
	let docs = [];

	let page_docs = pages[word];
	for (let i = 0; i < page_docs.length; i++) {
		docs.push(page_docs[i][0]);
	}

	return docs;
}

function queryIndexer(query_string, stopwords, docWriter) {
	// first determine the type of query string:
	// OWQ if query_string.split(" ").length == 1
	// BQ if query_string CONTAINS "AND" or "OR"
	// PQ if query_string is wrapped in quotes
	// FTQ otherwise

	let query_type = query_string.indexOf(" ") == -1 ? 0 :
		query_string.includes("AND") || query_string.includes("OR") ? 1 :
		query_string[0] == "\"" && query_string[query_string.length - 1] == "\"" ? 2 : 3;

	let qStrings = cleanQuery(query_string, stopwords);
	if (query_type == 1)
		makeBQQuery(qStrings, 0, qStrings.length - 1);

	console.log(qStrings);

	// now with the finished array we can compare to our pages
	let comparitives = [];

	return;
	/*
		for finding documents, we will need first just a normal array,
		as we go through each term in the query, we will also check
		for if it's part of a boolean query, which will mean that we
		need to start working through documents that work for each separate word
		-- for BQ,
			if there are any parentheses, we will need to construct a sub array
			to work through those sub problems of the query first
	*/
	if (query_type == 1) {
		function findComparatives(qs, cmp, start) {
			let bq_type;
			for (let strRun = start; strRun < qs.length; strRun++) {
				// if we find a close parenthesis, we want to end our current level:
				if (qs[strRun] == ")")
					return cmp;

				// our second thing we look for is open parentheses, if we see one,
				// we want to go into a sub findComparatives
				console.log(qs[strRun]);
				if (qs[strRun] == "(") {
					let cmpRe = findComparatives(qs, [], strRun + 1)[0];
					console.log("sub problem?", cmpRe);
					if (cmpRe.length)
						cmp.push(cmpRe);
					console.log(cmp, bq_type);
					strRun = qs.indexOf(")", strRun) + 1;
				} else {
					// the next step is constanly adding to cmp if none of the above happen
					console.log(qs[strRun]);
					cmp.push(grabDocs(qs[strRun]));
				}

				if (qs[strRun] == "AND" || qs[strRun] == "OR") {
					bq_type = qs[strRun] == "AND" ? 2 : qs[strRun] == "OR" ? 1 : undefined;
					continue;
				}
				console.log("return");


				// at this point we need to check bq_type,
				// if it has a value, then we need to do something to the cmp,
				// otherwise nothing happens and we keep going

				// based on the generizability of the gate operations,
				// we can throw whatever is inside of cmp into there

				console.log("\npre gate", cmp);
				if (bq_type == 2) {
					cmp = [arrAndGate(cmp)];
					console.log("post", cmp);
				} else if (bq_type == 1)
					cmp = [arrOrGate(cmp)];
			}
			return cmp;
		}
		console.log(qStrings);
		console.log("\nRETURNED?", findComparatives(["space", "OR", "(", "orang", ")"], 0))
		// console.log(findComparatives(qStrings, comparitives, 0));
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

function cleanQuery(string, stopwords) {
	let pre = 0;
	for (let run = 0; run < string.length + 1; run++) {

		if (string[run] == " " || string[run] == "\n" || string[run] == "\t" || string[run] == ")" || string[run] == undefined) {
			// let's take a look at what the word inside of here is:
			let word = string.substring(pre == 0 ? 0 : pre + 1, run);

			// if the word is AND or OR, we want to ignore it,
			// otherwise we need to lowercase, remove if stopword, and stem
			if (word == "AND" || word == "OR") {
				pre = run;
			} else {
				word = word.toLowerCase();
				word = word.replace(/[^a-z0-9]/g, "");

				stopwords.forEach(w => {
					word = word == w ? "" : word;
				});

				let updateWord = stemmer(word);
				string = string.substring(0, pre == 0 ? 0 : pre + 1) + updateWord + string.substring(run, string.length);
				run += updateWord.length - word.length;
				pre = run;
			}
		}

		if (string[run] == "(" || string[run] == ")" || string[run] == "\"") {
			let addString = string[run] == "(" ? "( " : string[run] == ")" ? " )" :
				((string[run - 1] == " " || string[run - 1] == undefined) ? "\" " : " \"");
			string = string.substring(0, run) + addString + string.substring(run + 1, string.length);
			run++;
			pre = run;
		}
	}

	return string.split(" ");
}

//console.log(cleanQuery("\"space oddyssey\"", fs.readFileSync('./myStopWords.dat', 'utf8').split("\n")));