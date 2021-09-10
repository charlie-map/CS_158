const fs = require('fs');
const utils = require('./utils');

/*
	Go through queries:
		Sort the string then find matches in index
*/
function anagrams(queries, indeces) {
	let anagrams = [];

	for (let each_query = 0; each_query < queries.length; each_query++) {
		anagrams[each_query] = "";

		let split_query = queries[each_query].split("");
		utils.quicksort(split_query, 0, split_query.length - 1);

		// now with anagrams find any indeces that correspond with it
		for (index in indeces) {
			let index_splice = indeces[index].split("|");
			anagrams[each_query] += (index_splice[0] == split_query.join("") ? index_splice[1] + "|" : "");
		}
	}

	return anagrams.map(anagram => anagram + "\n").join('');
}

let index = fs.readFileSync(`./myIndex.txt`, 'utf8').split("\n");
let query = fs.readFileSync(`./myQueries.txt`, 'utf8').split("\n");

fs.writeFile(`myAnagrams.txt`, anagrams(query, index), (err) => {
	if (err) throw err;
});