const fs = require('fs');

let objk = {
	serializeObject: function(textfile, object) {
		let writer = fs.createWriteStream(textfile);

		let objectKeys = Object.keys(object),
			string, sub_object;

		for (let obKey = 0; obKey < objectKeys.length; obKey++) {
			string = `${objectKeys[obKey]}|`;

			sub_object = object[objectKeys[obKey]].skiplist.values[0]
			for (let grabDocs = 0; grabDocs < sub_object.length - 1; grabDocs++) {
				string += sub_object[grabDocs].value + ":" + sub_object[grabDocs].documents + ";";
			}

			string += "\n";

			writer.write(string);
		}
	}
}

objk.serializeObject("./myIndex.dat", {
	"cat": {
		skiplist: {
			values: [
				[{
					value: 2,
					documents: [5, 10, 88]
				}, {
					value: Infinity
				}]
			]
		}
	},
	"dog": {
		skiplist: {
			values: [
				[{
					value: 4,
					documents: [20, 4]
				}, {
					value: 10,
					documents: [45, 69]
				}, {
					value: 40,
					documents: [10, 45, 32465]
				}, {
					value: Infinity
				}]
			]
		}
	}
});