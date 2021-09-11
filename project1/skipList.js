const probability = 0.5;

let skipList = {
	values: [
		[{
			value: Infinity
		}]
	],
	insert: function(val) {
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
		while (top > -1)
			// if we're on a level that interesects our val_height,
			// build in the new value

			if (val < skipList.values[top][index].value) {
				if (top <= val_height)
					// it will splice in between index and index + 1
					skipList.values[top].splice(index, 0, {
						value: val
					});
				top--;
			} else
				index++;
	}
};

skipList.insert(3);
skipList.insert(8);
skipList.insert(20);
skipList.insert(4);
skipList.insert(280);
skipList.insert(19);
console.log(skipList.values);

//module.exports = skipList;