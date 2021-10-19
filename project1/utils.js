const fs = require('fs');
const stemmer = require('porter-stemmer').stemmer;
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

function quickDe(textPath, currObj) {
	let prevObject = {};
	let wordCount = 0;

	return new Promise((resolve, reject) => {

		// we start by going through our
		// inputted textfil chunk by chunk:

		let source = fs.createReadStream(textPath, {
			highWaterMark: 131071
		});

		source.on("readable", () => {
			let chunk;

			while (null !== (chunk = source.read())) {
				chunk = chunk.toString();

				let buildInputs = [0, []];
				let word, wordTally;
				let docLoc = 0;
				let strEnder;
				let currLen;

				// when we get our chunk we initialize going through:
				for (let runChu = chunk.indexOf("\n") + 1; runChu < chunk.length; runChu++) {

					// first get the beginning word:
					if (!word) {
						strEnder = chunk.indexOf("|", runChu)

						word = chunk.substring(runChu, strEnder);

						currLen = currObj[word];
						
						prevObject[word] = currLen ? currLen : [];

						currLen = currLen ? currLen.length : 0;
						delete currObj[word];

						runChu = ++strEnder;
					}

					// wait to find docID:
					if (chunk[runChu] == ":") {

						// strEnder is going to be at
						// one + "|", so we can substring the two:
						buildInputs[0] = parseInt(chunk.substring(strEnder, runChu));

						strEnder = ++runChu;
					}

					if (chunk[runChu] + chunk[runChu + 1] == "🌈") {

						// one + "🌈" mean we need to add 2 after
						buildInputs[3] = parseInt(chunk.substring(strEnder, runChu));

						strEnder = runChu + 2;
					}

					// we want to skip this (since we can
					// calculate it with the position array)
					if (chunk[runChu] + chunk[runChu + 1] == "😊" || chunk[runChu] + chunk[runChu + 1] == "💩") {

						strEnder = runChu + 2;
						continue;
					}

					// the final step is looking at positions:
					// which are separated by commas:
					if (chunk[runChu] == ",") {

						buildInputs[1].push(parseInt(chunk.substring(strEnder, runChu)));

						strEnder = ++runChu;
					}

					// when we hit the end of this docID, we
					// need to reset:
					if (chunk[runChu] == ";") {

						// need to add positions into our
						// running pages:
						buildInputs[2] = buildInputs[1].length;

						searchFindInsert(prevObject[word], buildInputs, 0, currLen, word=="2011");
						
						strEnder = ++runChu;
						currLen = prevObject[word].length;
					}

					if (chunk[runChu] == "\n") {

						// reset everything
						buildInputs = [0, []];
						wordCount++;
						word = "";
					}
				}

				strEnder = 0;
			}
		});

		source.on("end", () => {

			resolve([wordCount, prevObject]);
		});
	});
}

const A = 0.4;

function searchFindInsert(mainObj, insertArr, left, right, isTrue) {
	left = left ? left : 0;
	right = right != undefined ? right : mainObj.length;

	if (left == right || right < 0) {
		// we splice in new value wherever we are:
		mainObj.splice(left, 0, insertArr);

		return;
	}

	// first look for the position it goes in:
	let mid = Math.floor((left + right) * 0.5);

	if (mainObj[mid][0] == insertArr[0]) {
		// we want to insert here, which means
		// altering some values and combining
		// the positions:

		mainObj[mid][1] = [...mainObj[mid][1], ...insertArr[1]];
		mainObj[mid][2] = mainObj[mid][1].length
		//mainObj[mid].push(insertArr); // WHAT??

		return;
	}

	// otherwise we search a subpath:
	if (mainObj[mid][0] > insertArr[0])
		searchFindInsert(mainObj, insertArr, left, mid - 1);
	else
		searchFindInsert(mainObj, insertArr, mid + 1, right);

	return;
}

function writeTo(object, objectKeys, writer) {
	let sub_object, string = "",
		obKey = 0;

	while (obKey < objectKeys.length) {

		// while we're going through, we're adding them
		// to our full object:

		string = `${objectKeys[obKey]}|`;

		sub_object = object[objectKeys[obKey]];

		for (let eachDoc = 0; eachDoc < sub_object.length; eachDoc++) {

			string += `${sub_object[eachDoc][0]}:${sub_object[eachDoc][1].length}😊${sub_object[eachDoc][3]}🌈${sub_object.length}💩${sub_object[eachDoc][1]},;`;
		}

		writer.write(string + "\n");

		obKey++;
	}

	return;
}

async function serializeObject(textfile, object, pageAmount) {

	// first grab the object and deserialize whatever is currently
	// in there:
	let prevObject = await quickDe(textfile, object);
	let wordCount = prevObject[0];
	prevObject = prevObject[1];

	fs.truncateSync(textfile);

	let writer = fs.createWriteStream(textfile, {
		highWaterMark: 65535
	});

	writer.write(`💦${pageAmount}💦\n`);

	let prevKeys = Object.keys(prevObject),
		currKeys = Object.keys(object);

	// first write in previous object into the file
	let prevStream = writeTo(prevObject, prevKeys, writer);

	// then write in the new words
	let currStream = writeTo(object, currKeys, writer);

	if (prevStream < prevKeys.length || currStream < currKeys.length) {
		// Had to stop early!

		writer.once('drain', function() {
			serializeObject(textfile, object, pageAmount);
		});
	}

	return;
}

/*
	insert and trie are related to our trie:
	-- trie is the current trie will be inserting on,
	-- insert is a function that takes in the trie
		and adds to it
*/
function deserializeObject(input_file, half_doneOBJ, pageAmount, insert, trie, docFrequency) {
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

		if (doc_id != undefined)
			docFrequency[doc_id] = input_file[find_str] == ";" || input_file[find_str] == "\n" ?
			Math.pow(docFrequency[doc_id], 2) : docFrequency[doc_id];
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

			insert(trie, word); // load into our trie UNSTEMMED
			word = stemmer(word); // then stem and load into our object
			newOBJ[word] = [];
		}

		// then start adding documents:
		if (doc_id == undefined) {
			end_index = input_file.indexOf(":", find_str);
			doc_id = parseInt(input_file.substring(find_str, end_index), 10);
			newOBJ[word].push([doc_id, []]);

			if (!docFrequency[doc_id])
				docFrequency[doc_id] = 0;
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

			// also store solely the df for use in querying:
			newOBJ[word][newOBJ[word].length - 1][3] = df;

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

			// we will also add to our overall document frequency for use in querying:
			docFrequency[doc_id]++;
			find_str += end_index - find_str;
		}
	}

	return [newOBJ, pageAmount, docFrequency];
}

module.exports = {
	arrAndGate,
	arrOrGate,
	serializeObject,
	deserializeObject,
	searchFindInsert
}