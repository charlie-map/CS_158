const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
const {
	deserializeObject
} = require('./utils');

function queryIndexer(query_string, stopwords) {
	stopwords = fs.readFileSync(stopwords, 'utf8').split("\n");

	// first determine the type of query string:
	// OWQ if query_string.split(" ").length == 1
	// BQ if query_string CONTAINS "AND" or "OR"
	// PQ if query_string is wrapped in quotes
	// FTQ otherwise

	let pre = 0,
		query_length = 0;
	for (let run = 0; run < query_string.length; run++) {
		// each time we see a space, add one to length

		if (query_string[run] == " " && pre < run) {
			// add to query_length
			query_length++;
			query_string = query_string.substring(0, pre) + stemmer(query_string.substring(pre, run)) + query_string.substring(run, query_string.length);
			pre = run;
		}
	}

	let query_type = query_length == 1 ? 0 :
		query_string.includes("AND") || query_string.includes("OR") ? 1 :
		query_string[0] == "\"" && query_string[query_string.length - 1] == "\"" ? 2 : 3;

	let BQ_works;
	if (query_type == 1) {
		// grab all the AND's and OR's and ()'s
		BQ_works = query_string.match(/\(|\)|(\sAND\s)|(\sOR\s)/g);

		BQ_works.forEach((item, index) => {
			query_string = query_string.replace(item, "\\" + index);
		});
	}

	query_string = query_string.toLowerCase();
	query_string = query_string.replace(/[^a-z0-9\\]/g, "");

	// obtained tokens from the stream
	// filter stop words:
	stopwords.forEach(stop => {
		query_string = stop.length ? query_string.replace(new RegExp(`(\\s+)${stop}(\\s+)`, "g"), " ") : query_string;
	});

	return [query_string, BQ_works];
}

function findQueries(skiplist_file, query_page, stopwords) {
	console.time();
	let stringQueries = fs.readFileSync(query_page);
	let queries = [], page_count = 0, line_start = 0;

	for (let through_strings = 0; through_strings < stringQueries.length; through_strings++) {
		// if we've reached the end of a line (\n), then we need to move to next line
		if (stringQueries[through_strings] == "\n") {
			queries.push(queryIndexer(stringQueries.substring(line_star, through_strings)));
			line_start = through_strings + 1;
		}
	}

	let skiplist;

	let source = fs.createReadStream(skiplist_file, {
		highWaterMark: 131071
	});

	source.on('readable', () => {
		let chunk;

		while (null !== (chunk = source.read())) {
			skiplist = deserializeObject(chunk.toString(), skiplist);
		}
	});

	source.on('end', () => {
		// with our skiplist and queries ready, we can now actually test this process

		console.timeEnd();
	});
}

findQueries("/media/hotboy/DUMP/myIndex.dat", `./myQueries.dat`, `./myStopWords.dat`);
// console.log(queryIndexer("(spACE AND odyssey{}) OR orange", "./myStopWords.dat"));