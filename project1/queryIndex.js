const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const {
	deserializeObject
} = require('./utils');

let skiplist;
// declaring globally for use through multiple functions

function queryIndexer(query_string, stopwords, docWriter) {
	stopwords = fs.readFileSync(stopwords, 'utf8').split("\n");

	// first determine the type of query string:
	// OWQ if query_string.split(" ").length == 1
	// BQ if query_string CONTAINS "AND" or "OR"
	// PQ if query_string is wrapped in quotes
	// FTQ otherwise

	let query_type = query_string.indexOf(" ") == -1 ? 0 :
		query_string.includes("AND") || query_string.includes("OR") ? 1 :
		query_string[0] == "\"" && query_string[query_string.length - 1] == "\"" ? 2 : 3;

	query_string = query_string.replace(/[^a-zA-Z0-9"() ]/g, "");

	let BQ_amount = 0, qStrings = [];
	let pre = 0;
	for (let run = 0; run < query_string.length + 1; run++) {
		if (query_type == 1 && (query_string[run + 2] == "D" &&
			query_string[run + 1] == "N" && query_string[run] == "A")) {
			qStrings.push(query_string[run] + query_string[run + 1] + query_string[run + 2]);
			BQ_amount++;
			run += 3;
			pre = run;
			continue;
		}

		if (query_type == 1 && (query_string[run] == "O" &&
			query_string[run + 1] == "R")) {
			qStrings.push(query_string[run] + query_string[run + 1]);
			BQ_amount++;
			run += 2;
			pre = run;
			continue;
		}

		if ((query_string[run] == " " || query_string[run] == undefined ||
			query_string[run] == ")") && pre < run) {
			// add to query_length
			qStrings.push(stemmer(query_string.substring(pre, run).replace("(", "")));
			pre = run + 1;
		}

		if (query_type == 1 && (query_string[run] == "(" || 
			query_string[run] == ")")) {
			qStrings.push(query_string[run]);
			BQ_amount++;
		}
	}

	query_string = query_string.toLowerCase();

	// obtained tokens from the stream
	// filter stop words:
	stopwords.forEach(stop => {
		query_string = stop.length ? query_string.replace(new RegExp(`(\\s+)${stop}(\\s+)`, "g"), " ") : query_string;
	});

	// now with the finished array we can compare to our skiplist
	console.log(qStrings);
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

	for (let strRun = 0; strRun < query_string.length; strRun++) {

	}
}

function findQueries(skiplist_file, query_page, stopwords, doc_out) {
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
			skiplist = deserializeObject(chunk.toString(), skiplist);
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