const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;

function queryIndexer(query_string, stopwords) {
	stopwords = fs.readFileSync(stopwords, 'utf8').split("\n");

	// first determine the type of query string:
	// OWQ if query_string.split(" ").length == 1
	// BQ if query_string CONTAINS "AND" or "OR"
	// PQ if query_string is wrapped in quotes
	// FTQ otherwise

	let pre = 0, query_length = 0;
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
	console.log(query_string.match(/([^\\])([^a-z0-9])/g));
	query_string = query_string.replace(/(?=[^\\])(?=[^a-z0-9])/g, "");
	console.log(query_string);

	// obtained tokens from the stream
	// filter stop words:
	stopwords.forEach(stop => {
		query_string = stop.length ? query_string.replace(new RegExp(`\\b${stop} \\b`, "g"), "") : query_string;
		query_string = stop.length ? query_string.replace(new RegExp(`\\b ${stop}\\b`, "g"), "") : query_string;
	});

	return [query_string, BQ_works];
}

console.log(queryIndexer("(spACE AND odyssey{}) OR orange", "./myStopWords.dat"));