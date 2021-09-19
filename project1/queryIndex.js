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

	let qStrings = cleanQuery(query_string);

	// now with the finished array we can compare to our pages
	let comparitives = [];
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
		console.log(findComparatives(qStrings, comparitives, 0));
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

//findQueries("/media/hotboy/DUMP/myIndex.dat", `./myQueries.dat`, `./myStopWords.dat`, `./myDocs.dat`);
// console.log(queryIndexer("(spACE AND odyssey{}) OR orange", "./myStopWords.dat"));;

function makeQuery(qString, startLeft, startRight) {
	let meta = [];
	let pointers = [startLeft ? startLeft : Math.floor(qString.length * 0.5),
		startRight ? startRight : Math.floor(qString.length * 0.5) + 1
	];

	while (qString[pointers[0]] != " " || qString[pointers[1]] != " ") {
		pointers[0] -= qString[pointers[0]] != " " ? 1 : 0;
		pointers[1] += qString[pointers[1]] != " " ? 1 : 0;
	}

	console.log(pointers, qString.substring(pointers[0], pointers[1]));
	/* cases:
		( - for right side, need to go into a sub process
			for left side, closing some process
		) - for right side, closing some process,
			for left side, need to go into a sub process
		AND - do nothing
		OR - add a ")" on left side, add a "(" on right side, both sides then
			 need to find an appropriate closing place
		otherwise - adding a word (after stemming and lowercasing) into meta
	*/
	let ans = qString.substring(pointers[0], pointers[1]);
	//if ()
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

console.log(cleanQuery("\"space oddyssey\"", fs.readFileSync('./myStopWords.dat', 'utf8').split("\n")));