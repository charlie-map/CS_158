let trie = {
	load: 0,
	finished: 0, // how many words finish at this character
	childs: []
};

function insert(trie_level, word, bTreeLoc, word_position) {
	word_position = word_position == undefined ? 0 : word_position;

	if (word_position < word.length) {
		//grab first character
		if (typeof trie_level.childs[word[word_position]] == "undefined") {
			let finished = word_position == word.length - 1 ? 1 : 0;
			trie_level.childs[word[word_position]] = {
				load: 0,
				finished: finished,
				bTree: finished ? [bTreeLoc] : [],
				childs: []
			};
		} else if (word_position == word.length - 1) {
			trie_level.childs[word[word_position]].finished++;
			trie_level.childs[word[word_position]].bTree.push(bTreeLoc);
		}

		trie_level.childs[word[word_position]].load++;
		insert(trie_level.childs[word[word_position]], word, bTreeLoc, word_position + 1);
	}

	return trie_level;
}

/*
	The meaty function: Decide Wildcards

	ex. string: c*t

	All considering, we either follow the path of the character
	or we bump into a * and then need to find the subsequent letter (if there is one)
*/
function strPerms(trie_level, word, pos, livestar, buildWord) {

	let trieKeys = trie_level ? Object.keys(trie_level.childs) : [];
	buildWord = buildWord == undefined ? "" : buildWord;
	let finalWords = [];

	console.log("\nfind words? ", trie_level, livestar, buildWord, trieKeys.length);

	if (trieKeys.length == 0)
		return trie_level && (word[word.length - 1] == "*") ? [buildWord] : [];

	if (livestar) {
		// we will keep adding livestar words and we hit "solid"
		// meaning if we run into our word[pos] or the end of a
		// trie, we don't the ones that don't match word[pos]

		for (let j = 0; j < trieKeys.length; j++) {
			if (word[pos] == trieKeys[j]) {// stop the livestar
				console.log("found end?", word, pos, trieKeys[j]);
				finalWords.push(strPerms(trie_level[word[pos]], word, pos + 1, false, buildWord + word[pos]));
				break;
			}

			// otherwise we can continue looking for more possibilities
			finalWords.push(...strPerms(trie_level.childs[trieKeys[j]], word, pos, livestar, buildWord + trieKeys[j]));
		}
	} else if (word[pos] == "*") {
		// quickly check to see if our current trie_level is a word
		if (trie_level.finished) // if it is, we want to add buildWords to our list:
			finalWords.push(buildWord);

		for (let j = 0; j < trieKeys.length; j++) {

			// in this case, we move everything forward no matter what:
			// CASING: if the * is in the first position, we actually need to 
			// skip further

			finalWords.push(...strPerms(trie_level.childs[trieKeys[j]], word, pos + (pos == 0 ? 2 : 1), true, buildWord + trieKeys[j]));
		}
	} else {
		// we need to check on if the word is actually done:
		if (word[word.length - 1] == buildWord[buildWord.length - 1])
			finalWords.push(buildWord);
		else {
			// otherwise, we have a casual move through perms:
			finalWords.push(...strPerms(trie_level.childs[word[pos]], word, pos + 1, false, buildWord + word[pos]));
		}
	}

	return finalWords;
}


insert(trie, "at", 0);
insert(trie, "cat", 1);
insert(trie, "cap", 2);
insert(trie, "atter", 3);
insert(trie, "cip", 4);
insert(trie, "catter", 5);

console.log(trie.childs);

console.log(strPerms(trie, "c*p", 0));

/*
if (livestar) { // CARE WITH LETTERS AFTER *
		let currentChar = word[pos];

		// if livestar is true, we just grab everything and anything:
		for (let j = 0; j < trieKeys.length; j++) {
			// if currentChar has a value, then we need to make sure that our value works against it:
			// if we a c*p, and currentChar was a p, then we would stop
			console.log(currentChar, trieKeys[j]);

			if (currentChar == trieKeys[j]) {
				finalWords.push(...strPerms(trie_level.childs[currentChar], word, pos + 1, false, buildWord + currentChar));
				break;
			}

			// also check for if trie_level is a word:
			if (trie_level.finished)
				finalWords.push(buildWord);

			// otherwise we can continue looking for more possibilities
			finalWords.push(...strPerms(trie_level.childs[trieKeys[j]], word, pos, livestar, buildWord + trieKeys[j]));
		}
	} else if (word[pos] == "*") {
		// quickly check to see if our current trie_level is a word
		if (trie_level.finished) // if it is, we want to add buildWords to our list:
			finalWords.push(buildWord);

		for (let j = 0; j < trieKeys.length; j++) {

			// in this case, we move everything forward no matter what:
			// CASING: if the * is in the first position, we actually need to 
			// skip further

			finalWords.push(...strPerms(trie_level.childs[trieKeys[j]], word, pos + (pos == 0 ? 2 : 1), true, buildWord + trieKeys[j]));
		}

	} else {
		console.log("finish?");
		// we need to check on if the word is actually done:
		if (word[word.length - 1] == buildWord[buildWord.length - 1])
			finalWords.push(buildWord);
		else {
			// otherwise, we have a casual move through perms:
			finalWords.push(...strPerms(trie_level.childs[word[pos]], word, pos + 1, false, buildWord + word[pos]));
		}
	}
	*/