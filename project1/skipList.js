const probability = 0.5;

function skipList() {
	this.values = [
		[{
			value: Infinity
		}]
	];
	this.insert = function(doc_id, doc_positions) {
		// search for the position it would be in
		let val_height = 0;
		while (Math.random() < probability)
			val_height++;

		while (val_height >= this.values.length)
			this.values.push([{
				value: Infinity
			}]);

		let top = this.values.length - 1,
			index = 0;

		// using the top, we can see when it starts working:
		while (top > -1) {
			if (doc_id == this.values[top][index].value) {
				this.values[top][index].documents = [...this.values[top][index].documents, ...doc_positions];
				top--;
				continue;
			}

			// if we're on a level that interesects our val_height,
			// build in the new value

			if (doc_id < this.values[top][index].value) {
				if (top <= val_height) {
					// it will splice in between index and index + 1
					this.values[top].splice(index, 0, {
						value: doc_id,
						documents: doc_positions
					});
				}
				top--;
			} else
				index++;
		}
	};
	this.search = function(val) {
		let top = this.values.length - 1,
			index = 0;

		while (top >= 0 && this.values[top][index].value != val) {
			// we pretty much do the same thing as insert

			if (val < this.values[top][index].value) {
				top--;
			} else
				index++;
		}

		return !this.values[top] ? false : this.values[top][index];
	}
};

// let skip_list1 = new skipList();
// skip_list1.insert(1, [30, 40, 69]);
// skip_list1.insert(2, [420, 3, 1]);

// let skip_list2 = new skipList();
// skip_list2.insert(1, [34]);
// skip_list2.insert(1, [6]);

module.exports = skipList;