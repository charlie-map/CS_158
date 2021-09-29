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

	ex. query: c*t

	There are two defining types of wildcards:
		we either have a * with nothing after it,
		or we have a * with a character after it

	If we have that first case, we want to ride that branch of
	the trie all the way to the depths of it
	If we have the second case, we want to keep riding
	UNTIL we see that character

	to implement this we will have the following variables:
	-- buildWord: the current sum of any branches of the trie
				we have gone down - this will be entered into
				our rolling words as we go
	-- trie_level: a certain branch or sub branch of our trie
				which will have letters relative to our current
				build word
	-- query: our inputted user query we will use to make all the
			possible words as we go through our trie: eg. c*t
	-- Qpoint: this will point to where in our user query we are:
			as we go into the sub trie_levels, if there is no wildcard
			we are at the whim of our user query which advances
			at each level of currying based on Qpoint
	-- killWildcardChar: this char will be will be either undefined,
						empty string, or a character. if it is undefined,
						that means we are currently not interacting with
						a *. If it is an empty string, that means we
						are dealing with a wildcard that continues til
						the end of the string: eg. di*. Finally, if there's
						a character, that means we are continuing
						until we find that character again

	Output:
		At the end of this process, strPerms will return a completed
		array of all possible permutations of our wildcard
*/
function strPerms(trie_level, query, Qpoint, killWildcardChar) {

	let trieKeys = Object.keys(trie_level);
	// the immdediate check is our killWildcardChar:
	// if it has a value other than undefined, we need to
	// work through it:
	if (killWildcardChar != undefined) {

		// our first step is that we start moving through trie_level:

		for (let getSubBranches = 0; getSubBranches < trieKeys.length; getSubBranches++) {
			
		}
	}

	// let's check our * cases now:
	if (query[Qpoint] == "*") {

	}
	
	// normal pattern if no killWildcardChar exists:
	return strPerms(trie_level, query, ++Qpoint, killWildcardChar);
}


insert(trie, "at", 0);
insert(trie, "cat", 1);
insert(trie, "cap", 2);
insert(trie, "atter", 3);
insert(trie, "cip", 4);
insert(trie, "catter", 5);

console.log(trie.childs);

console.log(strPerms(trie, "c*p", 0));

// let trieKeys = trie_level ? Object.keys(trie_level.childs) : [];
// 	buildWord = buildWord == undefined ? "" : buildWord;
// 	let finalWords = [];

// 	if (!trieKeys.length) {
// 		// if there's no more positions in word, we can
// 		// go ahead and add buildWord:
// 		return word[pos] == undefined && trie_level ? [buildWord] : [];
// 	}

// 	console.log("\n\tNEW ROUND START", pwe, pos, word[pos], "WITH", buildWord, livestar)

// 	if (livestar) {
// 		// time to star looking for any options while being conscious of our close character:

// 		// check for if we're at a part of a word that we should add:
// 		if (trie_level.finished && trie_level.load > 1)
// 			finalWords.push(buildWord);

// 		for (let j = 0; j < trieKeys.length; j++) {
// 			livestar = true;

// 			console.log(buildWord, trieKeys[j], word[pos], trie_level.childs[trieKeys[j]]);

// 			// console.log("\nchecking for new words", trieKeys[j], word[pos], buildWord);
// 			if (trieKeys[j] == word[pos]) {
// 				console.log('here');
// 				console.log("important info", word[pos + 1], trie_level.childs[word[pos]].childs);

// 				if (trie_level.childs[word[pos]].finished && (word[pos + 1] != undefined ||
// 					Object.keys(trie_level.childs[word[pos]].childs).length))
// 					finalWords.push(buildWord + word[pos]);

// 				livestar = false;
// 			}

// 			// before continuing recursively,
// 			// see if there are added values we should grab

// 			finalWords.push(...strPerms(trie_level.childs[trieKeys[j]], word, pos + (!livestar ? 1 : 0), livestar, buildWord + trieKeys[j], "TEST" + pos));
// 		}

// 		return finalWords;
// 	}

// 	if (word[pos] == "*") {

// 		// now instead we're going to try every single path:

// 		for (let j = 0; j < trieKeys.length; j++) {

// 			// we want to wildcard UNLESS the character is actually
// 			// the one that comes after *

// 			finalWords.push(...strPerms(trie_level.childs[trieKeys[j]], word, pos + 1, trieKeys[j] != word[pos + 1] ? true : false, buildWord + trieKeys[j]));

// 		}

// 		return finalWords;
// 	}

// 	// under general circumstances, we are just go to
// 	// keep going down the word pos:
// 	if (word[pos])
// 		finalWords.push(...strPerms(trie_level.childs[word[pos]], word, pos + 1, false, buildWord + word[pos]));

// 	return finalWords;