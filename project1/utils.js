const fs = require('fs');
const skipWork = require('./skipList');

function arrAndGate(args) {
	// args can be any number of sub arrays,
	// 1: grab a number from the first array,
	// 2: check the other arrays for the number,
	// 	  a) if one of them doesn't have it, remove it from the array we grabbed it from
	//	  b) if one of them does have it, we're good to keep checking
	// 3: any elements remaining are the finalists

	let main_test = args[0];

	for (let i = 0; i < main_test.length; i++) {
		// grabbing number from first array

		let argCheck;
		// check the other arrays:
		for (argCheck = 1; argCheck < args.length; argCheck++) {
			let contains = false;

			for (let findMatch = 0; findMatch < args[argCheck].length; findMatch++) {
				if (args[argCheck][findMatch] == main_test[i]) {
					contains = true;
				}
			}

			if (!contains)
				break;
		}

		if (argCheck < args.length) { // remove from array
			main_test.splice(i, 1);
			i--;
		}
	}

	return main_test;
}

function arrOrGate(args) {
	let pointers = [0],
		meta = [];
	let metaPlace = 0;

	while (args[metaPlace] && pointers[metaPlace] < args[metaPlace].length + 1) {
		let lowest = args[metaPlace][pointers[metaPlace]] != undefined ? metaPlace : metaPlace += 1;

		// look at each other pointer to find the final value;
		for (let checkP = metaPlace + 1; checkP < args.length; checkP++) {
			if (!pointers[checkP])
				pointers[checkP] = 0;

			let checkPoint = args[checkP][pointers[checkP]];
			let lowestVal = lowest != -1 ? args[lowest][pointers[lowest]] : -1;

			pointers[checkP] += checkPoint == lowestVal ? 1 : 0;
			lowest = checkPoint < lowestVal || lowest == -1 ? checkP : lowest;
		}

		if (pointers[lowest] == undefined || args[lowest][pointers[lowest]] == undefined) {
			metaPlace++;
			continue;
		}
		meta.push(args[lowest][pointers[lowest]]);
		pointers[lowest]++;
	}

	return meta;
}

function quicksort(array, low, high) {
	if (low < high) {
		let pivot = partition(array, low, high);
		quicksort(array, pivot + 1, high);
		quicksort(array, low, pivot - 1);
	}
}

function partition(array, low, pivot) {
	let lowest = low - 1,
		buffer;
	for (let j = low; j < pivot; j++) {
		if (array[j][0] < array[pivot][0]) {
			lowest++;
			buffer = array[j];
			array[j] = array[lowest];
			array[lowest] = buffer;
		}
	}

	lowest++;
	buffer = array[pivot];
	array[pivot] = array[lowest];
	array[lowest] = buffer;
	return lowest;
}

function roughSizeOfObject(object) {

	var objectList = [];
	var stack = [object];
	var bytes = 0;

	while (stack.length) {
		var value = stack.pop();

		if (typeof value === 'boolean') {
			bytes += 4;
		} else if (typeof value === 'string') {
			bytes += value.length * 2;
		} else if (typeof value === 'number') {
			bytes += 8;
		} else if (
			typeof value === 'object' &&
			objectList.indexOf(value) === -1
		) {
			objectList.push(value);

			for (var i in value) {
				stack.push(value[i]);
			}
		}
	}
	return bytes;
}

const A = 0.4;

function serializeObject(textfile, object, pageAmount) {
	let writer = fs.createWriteStream(textfile, {
		highWaterMark: 65535
	});

	if (pageAmount) {
		writer.write(`💦${pageAmount}💦\n`);
	}

	let objectKeys = Object.keys(object),
		string, sub_object, obKey = 0;

	while (obKey < objectKeys.length) {
		string = `${objectKeys[obKey]}|`;

		sub_object = object[objectKeys[obKey]];
		quicksort(sub_object, 0, sub_object.length - 1);
		console.log(objectKeys[obKey], sub_object);
		if (pageAmount) {
			// make document frequency
			let df = sub_object.length;

			for (let grabDocs = 0; grabDocs < df; grabDocs++) {
				let grabSub = sub_object[grabDocs];
				if (!grabSub[0] || !grabSub[1] || !grabSub[2] || !grabSub[3])
					continue;

				string += `${grabSub[0]}:${grabSub[2]}😊${grabSub[3]}🌈${df}💩${grabSub[1]},;`;
			}
		} else {
			for (let grabDocs = 0; grabDocs < sub_object.length; grabDocs++) {
				string += sub_object[grabDocs][0] + ":" + sub_object[grabDocs][1] + ",;";
			}
		}

		string += "\n";
		writer.write(string);

		obKey++;
	};

	if (obKey < objectKeys.length) {
		// Had to stop early!

		writer.once('drain', serializeObject);
	}
}

function deserializeObject(input_file, half_doneOBJ, pageAmount) {
	let start = !pageAmount && !half_doneOBJ ? input_file.indexOf("\n") : 0;
	start = start == -1 ? 0 : start;
	pageAmount = !pageAmount && !half_doneOBJ ? parseInt(input_file.substring(2, start - 2), 10) : pageAmount;


	// we are assuming the incoming file has the form:
	/*
		space|2:1😊4🌈4💩180,;3:1😊8🌈4💩262,;8:1😊5🌈4💩587,;
		odyssei|3:1😊8🌈3💩270,;12:1😊2🌈3💩832,;

		TERMS:
			term after | -- the doc_id
			term after : -- the term frequency in that doc
			term after 😊 -- the total words in that document
			term after 🌈 -- the document frequency
			term after 💩 -- positions
	*/
	let newOBJ = half_doneOBJ ? half_doneOBJ : {},
		word, doc_id, tf, totalWords, df, position;

	for (let find_str = start + 1; find_str < input_file.length; find_str++) {
		word = input_file[find_str] == "\n" ? undefined : word;
		doc_id = input_file[find_str] == ";" || input_file[find_str] == "\n" ? undefined : doc_id;
		tf = input_file[find_str] == ";" ? undefined : tf;
		totalWords = input_file[find_str] == ";" ? undefined : totalWords;
		df = input_file[find_str] == ";" ? undefined : df;
		//position = input_file[find_str] == "," || input_file[find_str] == ";" || input_file[find_str] == "\n" ? undefined : position;

		if (input_file[find_str] == "\n" || input_file[find_str] == ";")
			continue;

		// we know we start with the word:
		let end_index;
		if (word == undefined) {
			end_index = input_file.indexOf("|", find_str);
			word = input_file.substring(find_str, end_index);
			find_str += end_index - find_str + 1;

			newOBJ[word] = [];
		}

		// then start adding documents:
		if (doc_id == undefined) {
			end_index = input_file.indexOf(":", find_str);
			doc_id = parseInt(input_file.substring(find_str, end_index), 10);
			newOBJ[word].push([doc_id, []])
			find_str += end_index - find_str + 1;
		}

		if (tf == undefined) {
			end_index = input_file.indexOf("😊", find_str);
			tf = parseInt(input_file.substring(find_str, end_index), 10);
			// take the tf and add into the OBJ
			find_str += (end_index - find_str) + 2;
		}

		if (totalWords == undefined) {
			end_index = input_file.indexOf("🌈", find_str);
			totalWords = parseInt(input_file.substring(find_str, end_index), 10);

			// with this we can then normalize tf:
			tf = tf / totalWords;
			// jump past end of number:
			find_str += (end_index - find_str) + 2;
		}

		if (df == undefined) {
			end_index = input_file.indexOf("💩", find_str);
			df = parseInt(input_file.substring(find_str, end_index), 10);

			// then we want to find our inverse document frequency
			df = Math.log(pageAmount / df);
			newOBJ[word][newOBJ[word].length - 1][2] = tf * df;
			find_str += end_index - find_str + 2;
		}

		if (position == undefined) {
			end_index = input_file.indexOf(",", find_str);
			position = parseInt(input_file.substring(find_str, end_index), 10);

			newOBJ[word][newOBJ[word].length - 1][1].push(position);
			position = undefined;
			find_str += end_index - find_str;
		}
	}

	return [newOBJ, pageAmount];
}

module.exports = {
	arrAndGate,
	arrOrGate,
	serializeObject,
	deserializeObject
}