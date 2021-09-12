const probability = 0.5;

let skipList = {
	values: [
		[{
			value: Infinity
		}]
	],
	insert: function(val, doc_id, doc_positions) {
		// search for the position it would be in
		let val_height = 0;
		while (Math.random() < probability)
			val_height++;

		while (val_height >= skipList.values.length)
			skipList.values.push([{
				value: Infinity
			}]);

		let top = skipList.values.length - 1,
			index = 0;

		// using the top, we can see when it starts working:
		while (top > -1) {
			if (val == skipList.values[top][index].value)
				skipList.values[top][index].documents[doc_id] = [...skipList.values[top][index].documents[doc_id], ...doc_positions]

			// if we're on a level that interesects our val_height,
			// build in the new value

			if (val < skipList.values[top][index].value) {
				if (top <= val_height)
					// it will splice in between index and index + 1
					skipList.values[top].splice(index, 0, {
						value: val,
						documents: {
							[doc_id]: doc_positions
						}
					});
				top--;
			} else
				index++;
		}
	},
	search: function(val) {
		let top = skipList.values.length - 1,
			index = 0;

		while (top >= 0 && skipList.values[top][index].value != val) {
			// we pretty much do the same thing as insert

			if (val < skipList.values[top][index].value) {
				top--;
			} else
				index++;
		}

		return !skipList.values[top] ? false : skipList.values[top][index];
	}
};

// skipList.insert(3, 1, [30, 40, 69]);
// skipList.insert(8, 2, [420, 3, 1]);
// skipList.insert(20, 1, [34, 10, 40]);
// skipList.insert(4, 8, [6, 21, 3]);
// skipList.insert(280);
// skipList.insert(19);

module.exports = skipList;