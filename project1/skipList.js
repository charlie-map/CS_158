const probability = 0.5;

module.exports = {
	skipList: function() {
		this.values = [
			[{
				value: Infinity
			}]
		];
	},
	insert: function(skiplist, doc_id, doc_positions) {
		// search for the position it would be in
		let val_height = 0;
		while (Math.random() < probability)
			val_height++;

		if (!skiplist || !skiplist.values) console.log(skiplist);
		while (val_height >= skiplist.values.length) {
			console.log("adding values?", typeof skiplist == "function" ? skiplist() : "");
			skiplist.values.push([{
				value: Infinity
			}]);
		}

		let top = skiplist.values.length - 1,
			index = 0;

		// using the top, we can see when it starts working:
		while (top > -1) {
			if (!skiplist.values[top]) console.log(skiplist, top, index);
			if (doc_id == skiplist.values[top][index].value) {
				skiplist.values[top][index].documents = [...skiplist.values[top][index].documents, ...doc_positions];
				top--;
				continue;
			}

			// if we're on a level that interesects our val_height,
			// build in the new value

			if (doc_id < skiplist.values[top][index].value) {
				if (top <= val_height) {
					// it will splice in between index and index + 1
					skiplist.values[top].splice(index, 0, {
						value: doc_id,
						documents: doc_positions
					});
				}
				top--;
			} else
				index++;
		}
	},
	search: function(skiplist, val) {
		let top = skiplist.values.length - 1,
			index = 0;

		while (top >= 0 && skiplist.values[top][index].value != val) {
			// we pretty much do the same thing as insert

			if (val < skiplist.values[top][index].value) {
				top--;
			} else
				index++;
		}

		return !skiplist.values[top] ? false : skiplist.values[top][index];
	},
	docIDS: function(skiplist) {
		// to return all the document ids, we're going to just pull the bottom
		// row of the array:
		return skiplist.values[0].splice(0, skiplist.values[0].length - 1).map(item => {
			if (item.documents)
				return item.value;
		});
	}
}

// let skip_list2 = new test_obj.skipList();
// test_obj.insert(skip_list2, 4, [34, 345]);
// test_obj.insert(skip_list2, 10, [34]);
// test_obj.insert(skip_list2, 40, [6]);

// console.log(skip_list2.values);
// console.log(skip_list2.docIDs());