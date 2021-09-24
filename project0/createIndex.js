const fs = require('fs');
const utils = require('./utils');

function createIndex(array) {
	// first go through each word and sort it

	for (let run_arrs = 0; run_arrs < array.length; run_arrs++) {
		let split_string = array[run_arrs].split("");
		utils.quicksort(split_string, 0, split_string.length - 1);
		array[run_arrs] = split_string.join("") + "|" + array[run_arrs];
	}

	utils.quicksort(array, 0, array.length - 1);
	return;
}

/*
	When running, need to access process.argv[2] to see what dictionary to pull from
*/

console.time();
let file = fs.readFileSync(`${process.argv[2]}`, 'utf8').split("\n");
createIndex(file);

let file_string = file.map(item => {return item + "\n"}).join("");
// then load into the chosen argument destination
fs.writeFile(`${process.argv[3]}`, file_string, (err) => {
	if (err) throw err;
});
console.timeEnd();
