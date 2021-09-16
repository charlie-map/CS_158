const fs = require('fs');
const skipWork = require('./skipList');

function arrAndGate(args) {
	// args can be any number of sub arrays,
	// 1: grab a number from the first array,
	// 2: check the other arrays for the number,
	// 	  a) if one of them doesn't have it, remove it from the array we grabbed it from
	//	  b) if one of them does have it, remove it from that array
	// 3: 
}

function quicksort(array, low, high) {
	if (low < high) {
		let pivot = partition(array, low, high);
		quicksort(array, pivot + 1, high);
		quicksort(array, low, pivot - 1);
	}
}

function partition(array, low, pivot) {
	let lowest = low - 1, buffer;
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

function serializeObject(textfile, object) {
	console.log(roughSizeOfObject(object));
	let writer = fs.createWriteStream(textfile, {
		highWaterMark: 65535
	});

	let objectKeys = Object.keys(object),
		string, sub_object, obKey = 0;

	while (obKey < objectKeys.length) {
		string = `${objectKeys[obKey]}|`;

		sub_object = object[objectKeys[obKey]];
		quicksort(sub_object, 0, sub_object.length - 1);
		for (let grabDocs = 0; grabDocs < sub_object.length; grabDocs++) {
			string += sub_object[grabDocs][0] + ":" + sub_object[grabDocs][1] + ",;";
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

function deserializeObject(input_file, half_doneOBJ) {

	// we are assuming the incoming file has the form:
	/*
		cat|2:5,10,88;
		dog|4:20,4;10:45,69;40:10,45,32465;
	*/
	let newOBJ = half_doneOBJ ? half_doneOBJ : {},
		word, doc_id, position;

	for (let find_str = 0; find_str < input_file.length; find_str++) {
		word = input_file[find_str] == "\n" ? null : word;
		doc_id = input_file[find_str] == "\n" || input_file[find_str] == ";" ? null : doc_id;
		position = input_file[find_str] == "\n" || input_file[find_str] == ";" ? null : position;

		if (input_file[find_str] == "\n" || input_file[find_str] == ";")
			continue;

		// we know we start with the word:
		let end_index;
		if (!word) {
			end_index = input_file.indexOf("|", find_str);
			word = input_file.substring(find_str, end_index);
			find_str += end_index - find_str + 1;

			newOBJ[word] = new skipWork.skipList();
		}

		// then start adding documents:
		if (!doc_id) {
			end_index = input_file.indexOf(":", find_str);
			doc_id = parseInt(input_file.substring(find_str, end_index), 10);
			skipWork.insert(newOBJ[word], doc_id, []);
			find_str += end_index - find_str + 1;
		}

		if (!position) {
			end_index = input_file.indexOf(",", find_str);
			position = parseInt(input_file.substring(find_str, end_index), 10);
			skipWork.insert(newOBJ[word], doc_id, [position]);
			find_str += end_index - find_str;
		}
	}

	return newOBJ;
}

// serializeObject("./myIndex.dat", {
// 	"cat": {
// 		skiplist: {
// 			values: [
// 				[{
// 					value: 2,
// 					documents: [5, 10, 88]
// 				}, {
// 					value: Infinity
// 				}]
// 			]
// 		}
// 	},
// 	"dog": {
// 		skiplist: {
// 			values: [
// 				[{
// 					value: 4,
// 					documents: [20, 4]
// 				}, {
// 					value: 10,
// 					documents: [45, 69]
// 				}, {
// 					value: 40,
// 					documents: [10, 45, 32465]
// 				}, {
// 					value: Infinity
// 				}]
// 			]
// 		}
// 	}
// });

//deserializeObject(`./myIndex.dat`, {} /* above code for example */);

module.exports = {
	serializeObject,
	deserializeObject
}