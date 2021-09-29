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
function strPerms(trie_level, word, pos, livestar, buildWord, pwe) {

	let trieKeys = trie_level ? Object.keys(trie_level.childs) : [];
	buildWord = buildWord == undefined ? "" : buildWord;
	let finalWords = [];

	if (!trieKeys.length) {
		console.log('unfinished', trie_level, word[pos], buildWord);
		// if there's no more positions in word, we can
		// go ahead and add buildWord:
		return word[pos] == undefined ? [buildWord] : [];
	}

	console.log("\n\tNEW ROUND START", pwe, pos, word[pos], "WITH", buildWord, livestar)

	if (livestar) {
		// time to star looking for any options while being conscious of our close character:
	
		// check for if we're at a part of a word that we should add:
		if (trie_level.finished && trie_level.load > 1)
			finalWords.push(buildWord);

		for (let j = 0; j < trieKeys.length; j++) {

			console.log("\nchecking for new words", trieKeys[j], word[pos], buildWord);
			if (trieKeys[j] == word[pos]) {
				finalWords.push(buildWord + word[pos]);

				livestar = false;
			}

				// before continuing recursively,
				// see if there are added values we should grab

			console.log(j, 'adding new portions', buildWord + trieKeys[j], trie_level.childs[trieKeys[j]], pos)
			finalWords.push(...strPerms(trie_level.childs[trieKeys[j]], word, pos + (!livestar ? 1 : 0), livestar, buildWord + trieKeys[j], "TEST" + pos));
		}

		return finalWords;
	}

	if (word[pos] == "*") {

		// now instead we're going to try every single path:

		for (let j = 0; j < trieKeys.length; j++) {

			finalWords.push(...strPerms(trie_level.childs[trieKeys[j]], word, pos + 1, true, buildWord + trieKeys[j]));
		
		}

		return finalWords;
	}

	// under general circumstances, we are just go to
	// keep going down the word pos:
	if (word[pos])
		finalWords.push(...strPerms(trie_level.childs[word[pos]], word, pos + 1, false, buildWord + word[pos]));

	return finalWords;
}


insert(trie, "at", 0);
insert(trie, "cat", 1);
insert(trie, "cap", 2);
insert(trie, "atter", 3);
insert(trie, "cip", 4);
insert(trie, "catter", 5);

console.log(trie.childs);

console.log(strPerms(trie, "ca*", 0));