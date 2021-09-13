const fs = require('fs');
const skiplist = require('./skipList');

function serializeObject(textfile, object) {
	let writer = fs.createWriteStream(textfile, {
		highWaterMark: 65535
	});

	let objectKeys = Object.keys(object),
		string, sub_object, obKey = 0;

	do {
		string = `${objectKeys[obKey]}|`;

		sub_object = object[objectKeys[obKey]].skiplist.values[0]
		for (let grabDocs = 0; grabDocs < sub_object.length - 1; grabDocs++) {
			string += sub_object[grabDocs].value + ":" + sub_object[grabDocs].documents + ",;";
		}

		string += "\n";
		writer.write(string);

		obKey++;
	} while (obKey < objectKeys.length);

	if (obKey < objectKeys.length) {
		// Had to stop early!

		writer.once('drain', serializeObject);
	}
}

function deserializeObject(input_file) {
	let file = fs.readFileSync(input_file).toString();;

	// we are assuming the incoming file has the form:
	/*
		cat|2:5,10,88;
		dog|4:20,4;10:45,69;40:10,45,32465;
	*/
	let newOBJ = {},
		word, doc_id, position;

	for (let find_str = 0; find_str < file.length; find_str++) {
		word = file[find_str] == "\n" ? null : word;
		doc_id = file[find_str] == "\n" || file[find_str] == ";" ? null : doc_id;
		position = file[find_str] == "\n" || file[find_str] == ";" ? null : position;

		if (file[find_str] == "\n" || file[find_str] == ";")
			continue;

		// we know we start with the word:
		let end_index;
		if (!word) {
			end_index = file.indexOf("|", find_str);
			word = file.substring(find_str, end_index);
			find_str += end_index - find_str + 1;

			newOBJ[word] = {
				skiplist: new skiplist()
			}
		}

		// then start adding documents:
		if (!doc_id) {
			end_index = file.indexOf(":", find_str);
			doc_id = parseInt(file.substring(find_str, end_index), 10);
			newOBJ[word].skiplist.insert(doc_id, []);
			find_str += end_index - find_str + 1;
		}

		if (!position) {
			end_index = file.indexOf(",", find_str);
			position = parseInt(file.substring(find_str, end_index), 10);
			newOBJ[word].skiplist.insert(doc_id, [position]);
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

deserializeObject(`./myIndex.dat`);

module.exports = {
	serializeObject,
	deserializeObject
}