/*
ALL important general functins for querying
*/

function findMatch(pos, range, wordLen, array, low, high) {
	low = low == undefined ? 0 : low;
	high = high == undefined ? array.length : high;
	if (low > high)
		return array[low] - wordLen <= pos + range && array[low] - wordLen >= pos - range;

	// search the array for the pos:
	// find middle:
	let mid = Math.floor((low + high) * 0.5);

	// check middle for if we should go higher or lower:
	if (array[mid] - wordLen <= pos + range && array[mid] - wordLen >= pos - range) {
		// we're done!
		return true;
	} else {
		// decide if we're lower or higher than our range:
		let lower = array[mid] - wordLen < pos - range ? low : mid + 1;
		let higher = array[mid] - wordLen > pos + range ? high : mid - 1;
		return findMatch(pos, range, wordLen, array, lower, higher);
	}
}

function search(currPage, doc_id, low, high) {
	if (!currPage || !doc_id)
		return 0;
	low = low == undefined ? 0 : low;
	high = high == undefined ? currPage.length : high;

	if (low > high || high >= currPage.length) {
		return currPage[low][0] == doc_id ? currPage[low] : 0;
	}

	// find middle:
	let mid = Math.floor((low + high) * 0.5);

	if (currPage[mid][0] == doc_id)
		return currPage[mid];

	let lower = currPage[mid][0] > doc_id ? low : mid + 1;
	let higher = currPage[mid][0] > doc_id ? mid - 1 : high;
	return search(currPage, doc_id, lower, higher);
}

function sortDocs(docs, dotProds, low, high) {
	if (low < high) {
		let pivot = docPart(docs, dotProds, low, high);
		sortDocs(docs, dotProds, pivot + 1, high);
		sortDocs(docs, dotProds, low, pivot - 1)
	}
}

function swap(arr1, arr2, val1, val2) {
	let b1 = arr1[val1],
		b2 = arr2[val1];

	arr1[val1] = arr1[val2];
	arr2[val1] = arr2[val2];

	arr1[val2] = b1;
	arr2[val2] = b2;
}

function docPart(docs, dotProds, low, pivot) {
	let lowest = low - 1;

	for (let j = low; j < pivot; j++) {
		if (dotProds[j] > dotProds[pivot]) {
			swap(docs, dotProds, ++lowest, j);
		}
	}

	swap(docs, dotProds, ++lowest, pivot);
	return lowest;
}

function makeBQQuery(qString, low, high) {
	if (low < high) {
		let pivot = BQpartition(qString, low, high);
		if (pivot < low)
			return;

		// since pivot could have AND or OR at its position, we need to know because
		// we only want to splice in () if it's an or
		if (qString[pivot] == "OR") {

			// if pivot is a value, we want to put parentheses on both sides, aka:
			// go from ["banana", "OR", "apple"] to
			// ["(", "banana", ")", "OR", "(", "apple", ")"]

			// BUT there is some times when we don't want to add on one side, say:
			// ["apple", "OR", "(", "tree", "AND", "plant", "("]
			// since the parentheses are already there, we don't want to add extras:

			let lower = 0,
				higher = 0;
			if (!(qString[pivot + 1] == "(" && qString[high] == ")")) {
				qString.splice(high + 1, 0, ")"); // high side
				qString.splice(pivot + 1, 0, "("); // high side

				higher = 2;
			}

			if (!(qString[pivot - 1] == ")" && qString[low] == "(")) {
				qString.splice(pivot, 0, ")"); // low side
				qString.splice(low, 0, "("); // low side

				lower = 2;
			}

			high += lower + higher;
			pivot += lower;
		}

		makeBQQuery(qString, pivot + 1, high); // high side
		makeBQQuery(qString, low, pivot - 1); // low side
	}
	return qString;
}

function BQpartition(qString, low, pivot) {
	// a partition point would be either an OR, or it would be on the right side of
	// a ")" or on the left side of an "("
	let close = 0;
	let lowest = [low - 1, Infinity];
	// lowest contains a position and a close level, which corresponds
	// to what level of "depth" we have of parentheses, the lowest the
	// close value the higher likelihood hood of being chosen

	for (let j = low; j < pivot; j++) {
		if (qString[j] == "(")
			close++;
		else if (qString[j] == ")")
			close--;

		if ((qString[j] == "OR" || qString[j] == "AND") && close < lowest[1]) {
			lowest = [j, close];
		}
	}

	return lowest[0];
}

function normalChar(char) {
	if (!char)
		return;
	char = char.charCodeAt(0);
	return (char >= 48 && char <= 57) || (char >= 65 && char <= 90) || (char >= 97 && char <= 122) || char == 42;
}

module.exports = {
	findMatch,
	search,
	sortDocs,
	swap,
	docPart,
	makeBQQuery,
	BQpartition,
	normalChar
}