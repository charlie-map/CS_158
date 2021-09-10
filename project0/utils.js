/* quicksort:
	using charCodeAt() we can figure out how to sort the word
	each item will have a certain location in ascii,
	so we can use this to sort the entire word
	item:
		some array (can be a string) of values that can be sorted based on content
*/
function quicksort(item, low, high) {
	if (low > high) return;

	let pivot = partition(item, low, high);
	quicksort(item, pivot + 1, high); // high side
	quicksort(item, low, pivot - 1); // low side
}

function partition(item, low, pivot) {
	let lowest = low - 1;

	for (let j = low; j < pivot; j++) {
		if (lower(item, j, pivot)) {
			lowest++;
			swap(item, lowest, j);
		}
	}

	lowest++;
	swap(item, lowest, pivot);
	return lowest;
}

function swap(array, v1, v2) {
	let buffer = array[v1];
	array[v1] = array[v2];
	array[v2] = buffer;

	return;
}

/*
	LOWER:
		This function is fascinating: array is either a list of strings, or a string
		The difference will ultimately decide how it compares item1 and item2
*/
function lower(array, item1, item2) {
	// either string or array:
	if (typeof array == "string")
		return array.charCodeAt(item1) < array.charCodeAt(item2);

	/* now we check for the meat:
		Ex1.
			["act", "bblz"]

			1. Go through the distance of the shorter word
			2. Look at each position:
				a. for 'a' and 'b', since 'a' is lower, we now know which one is lower
					return that array[item1] < array[item2] is true
		Ex2.
			["alz", "all"]

			1. Go through the distance of the shorter word
			2. Look at each position:
				a. for 'a' and 'a', since they are the same, we need to continue
					since we don't know which word is lower yet
				b. for 'l' and 'l', since they are the same, we need to continue
				c. for 'z' and 'l', since 'l' is lower, we now know which one is lower
					return that array[item1] < array[item2] is false
		Ex3.
			["atc", "atcl"]
			1. We go through the first three and they are the same,
				we have reached the end of our loop
			2. If one is longer, then we can guarentee that that was is higher,
				so we return array[item1] < array[item2] is true
	*/
	let lesser, check_nums;
	let shorter = array[item1].length < array[item2].length ? item1 : item2;
	for (check_nums = 0; check_nums < array[shorter].length; check_nums++) {
		if (array[item1].charCodeAt(check_nums) == array[item2].charCodeAt(check_nums))
			continue;

		lesser = array[item1].charCodeAt(check_nums) < array[item2].charCodeAt(check_nums) ? true : false;
		if (typeof lesser == "boolean")
			break;
	}

	/*
		cases:
			1. lesser is true, return true (the value has already been found smaller)
			2. lesser is false, return false
			3. check_nums == array[shorter].length,
				breakes into two more:
					a. if the two arrays are the same length, the return false
						(they are the same exact string)
					b. if one is larger, just return array[item1].length < array[item2].length
						Ex. ["abcde", "abc"] -- clearly "abcde" !< "abc"
	*/

	if (check_nums == array[shorter].length) // when we found they were same characters
		return array[item1].length < array[item2].length;
	/* we can correctly pull the two cases together,
		because if they are the same length the above would
		return false
	*/

	// otherwise, we return the value of lesser
	return lesser;
}

module.exports = {quicksort};