const m = 5; // The maximum keys for each node - if the amount hits m, the tree splits

let btree = { // This will be considered the root node
	ID: 1, // this keeps track of our auto-increment
	key: [],
	payload: [],
	children: []
};

/* IMPORTANT NOTES:
		-> 0 is the first child (within children) - each node position in the list is the same as the value that
		is to the "left" of them
*/

function find_parent_object(b_tree, key, compare_level, level) {
	if (compare_level == 0) return 0; // This is the root node
	// look at current level and compare to what level we need to be on
	if (level == compare_level - 1) return b_tree;
	// Otherwise keep going down in levels
	// ^ First need to know which subtree to go in
	let child_pos = 0;
	for (bkey in b_tree.key) {
		child_pos += key > b_tree.key[bkey] ? 1 : 0;
	}
	return find_parent_object(b_tree.children[child_pos], key, compare_level, level + 1);
}

function quicksort(array, payload, low, high) {
	if (low < high) {
		let pivot = partition(array, payload, low, high);
		quicksort(array, payload, low, pivot - 1); // low side
		quicksort(array, payload, pivot + 1, high); // high side
	}
	return [array, payload];
}

function swap(arr, v1, v2) {
	let buffer = arr[v1];
	arr[v1] = arr[v2];
	arr[v2] = buffer;
}

function partition(array, payload, startlow, pivot) {
	let lowest = startlow - 1;

	for (let j = startlow; j < pivot; j++) {
		if (array[j] < array[pivot]) {
			swap(array, ++lowest, j);
			// swap payload values
			swap(payload, lowest, j);
		}
	}

	swap(array, ++lowest, pivot);
	// swap payload values
	swap(payload, lowest, pivot);
	return lowest;
}

function split_node(b_tree) {
	let parent_pos = Math.floor(m / 2);
	let parent_key = b_tree.key[parent_pos];
	let parent_payload = b_tree.payload[parent_pos];

	let left_keys = b_tree.key.splice(0, parent_pos);
	let left_payloads = b_tree.payload.splice(0, parent_pos);
	let left_children = b_tree.children.splice(0, parent_pos + 1);

	let right_keys = b_tree.key.splice(1, m - (parent_pos - 1));
	let right_payloads = b_tree.payload.splice(1, m - (parent_pos - 1));
	let right_children = b_tree.children.splice(1 - 1, m - (parent_pos - 1));

	b_tree.key = [parent_key];
	b_tree.payload = [parent_payload];

	b_tree.children[0] = {
		key: left_keys,
		payload: left_payloads,
		children: left_children
	};
	b_tree.children[1] = {
		key: right_keys,
		payload: right_payloads,
		children: right_children
	};
	return;
}

function insert(b_tree, value, key) {
	if (!key)
		key = b_tree.ID++;

	let key_pos = 0;
	let combine_compare = false; // Knowing if there is a need to combine the child up in the parent

	for (let run_through = 0; run_through < b_tree.key.length; run_through++) {
		if (key > b_tree.key[run_through]) key_pos++;
	}

	if (b_tree.children && b_tree.children[key_pos]) {
		combine_compare = insert(b_tree.children[key_pos], value, key);
	} else {
		// insert here and start fixing the tree upward
		b_tree.key.push(key);
		b_tree.payload.push(value);
		quicksort(b_tree.key, b_tree.payload, 0, b_tree.key.length - 1);
		if (b_tree.key.length == m) {
			split_node(b_tree);
			return true;
		}
	}

	if (!combine_compare) return false;
	// Pull up the child into the parent
	b_tree.key.push(b_tree.children[key_pos].key[0]);
	b_tree.payload.push(b_tree.children[key_pos].payload[0]);

	quicksort(b_tree.key, b_tree.payload, 0, b_tree.key.length - 1);

	let right_children = b_tree.children[key_pos].children[1];
	b_tree.children[key_pos] = b_tree.children[key_pos].children[0];

	while (b_tree.children[key_pos + 1]) {
		let buffer = b_tree.children[key_pos + 1];
		b_tree.children[key_pos + 1] = right_children;
		right_children = buffer;
		key_pos++;
	}

	b_tree.children[key_pos + 1] = right_children;

	if (b_tree.key.length == m) {
		split_node(b_tree);
		return true;
	}

	return false;
}

function searchB(b_tree, key) {
	let key_pos = 0;
	for (let i = 0; i < b_tree.key.length; i++) { // searchB through keys and see which child should be traversed to
		if (key == b_tree.key[i]) return b_tree;
		if (key > b_tree.key[i]) key_pos++;
	}
	if (typeof b_tree.children[key_pos] != "undefined") return searchB(b_tree.children[key_pos], key);
	return "No value found";
}

function searchBWord(b_tree, value) {
	let key_pos = 0;

	console.log(b_tree);

	// we're going to run through the keys and check our payloads:
	for (let i = 0; i < b_tree.key.length; i++) {
		if (value == b_tree.payload[i]) return b_tree;
		console.log(value, b_tree.payload[i], value > b_tree.payload[i]);
		if (value > b_tree.payload[i]) key_pos++;
	}

	console.log(key_pos);
	if (typeof b_tree.children[key_pos] != "undefined") return searchB(b_tree.children[key_pos], value);
	return "No value found";
}

function update(b_tree, key, value) {
	let key_pos = -1;
	for (let bkey = 0; bkey < b_tree.key.length; bkey++) { // See if there's a key within the tree that matches the key
		if (key == b_tree.key[bkey]) { // When key_pos != -1, we need to remove something
			key_pos = bkey;
			break;
		} else if (key > b_tree.key[bkey]) {
			key_pos = bkey + 1;
		}
		key_pos = b_tree.key.length - 1 == bkey && key_pos == -1 ? 0 : key_pos;
	}
	if (b_tree.key[key_pos] != key) {
		if (b_tree.children[key_pos]) update(b_tree.children[key_pos], key, value);
		return "No value to update";
	}
	b_tree.payload[key_pos] = value;
	return;
}

console.time();
for (let i = 0; i < 100; i++) {
	insert(btree, "test" + i);
}
console.timeEnd();

console.log(btree);

console.time();
console.log(searchBWord(btree, "test4"));
console.log(searchB(btree, 5));
console.timeEnd();

module.exports = {
	btree,
	insert,
	searchB,
	update
}