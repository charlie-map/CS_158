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
function strPerms(trie_level, query, Qpoint, buildWord, killWildcardChar) {

	if (!trie_level) // dud word
		return [];

	buildWord = !buildWord ? "" : buildWord;
	let trieKeys = Object.keys(trie_level.childs);
	// console.log(trieKeys.length == 0);

	// if there are no children on trie_level, 
	// we can go ahead and return whereever we are:
	if (trieKeys.length == 0 || (query[Qpoint] == undefined &&
		killWildcardChar == undefined)) {
		// we only want to return base on what killWildcardChar is:
		// if killWildcardChar is undefined or "", 
		// we can just return, but if it's a character
		// we have to make sure the current buildWord ends
		// in said character:
		let needKill = killWildcardChar == undefined || killWildcardChar == "";
		return buildWord && needKill ? [buildWord] :
			buildWord && buildWord[buildWord.length - 1] == killWildcardChar ?
			[buildWord] : [];
	}

	let finalWords = [];

	// another case where we need the sub word that's inside a larger
	// word of our trie:
	if ((killWildcardChar == "" || query[Qpoint] == "*") && trie_level.finished)
		finalWords.push(buildWord);

	// the immdediate check is our killWildcardChar:
	// if it has a value other than undefined, we need to
	// work through it:

	if (killWildcardChar != undefined) {

		// our first step is that we start moving through trie_level:

		for (let getSubBranches = 0; getSubBranches < trieKeys.length; getSubBranches++) {

			// then there's a few options:
			// -- if the killWildcardChar == "", then we want
			// 	to just run all of the options
			// -- if the killWildcardChar == some char, then
			// 	we want to make sure we don't try and run on that char

			let currentTrieKey = trieKeys[getSubBranches];

			let foundKillChar = killWildcardChar != "" && currentTrieKey == killWildcardChar;

			if (foundKillChar && trie_level.childs[currentTrieKey].finished &&
				(query[Qpoint + 1] && trie_level.childs[currentTrieKey].childs[Qpoint + 1])) {
				// we need to keep whatever word we were
				// building ***IF IT WAS A trie.finished VALUE***
				// as in it's a full word:
				finalWords.push(buildWord + currentTrieKey);
			}

			finalWords.push(...strPerms(trie_level.childs[currentTrieKey], query,
				Qpoint + (foundKillChar ? 1 : 0), buildWord + currentTrieKey,
				foundKillChar ? undefined : killWildcardChar));
		}

		return finalWords;
	}

	// let's check our * cases now:
	if (query[Qpoint] == "*") {

		// we know either way we do want to check all of the
		// values in our trie:

		killWildcardChar = query[Qpoint + 1] == undefined ? "" : query[Qpoint + 1];
		Qpoint++;

		for (let allCards = 0; allCards < trieKeys.length; allCards++) {

			finalWords.push(...strPerms(trie_level.childs[trieKeys[allCards]],
				query, Qpoint + (trieKeys[allCards] == killWildcardChar ? 1: 0),
				buildWord + trieKeys[allCards],
				trieKeys[allCards] == killWildcardChar ? undefined : killWildcardChar))
		}
	} else {

		// normal pattern if no killWildcardChar exists:
		finalWords.push(...strPerms(trie_level.childs[query[Qpoint]], query, Qpoint + 1, buildWord + query[Qpoint], killWildcardChar));
	}
	return finalWords;
}


insert(trie, "at", 0);
insert(trie, "cat", 1);
insert(trie, "cap", 2);
insert(trie, "atter", 3);
insert(trie, "cip", 4);
insert(trie, "catter", 5);

//console.log(trie.childs);

console.log("*", strPerms(trie, "*", 0)); // ALL IN TRIE
console.log("*t", strPerms(trie, "*t", 0)); // at, cat
console.log("c*p", strPerms(trie, "c*p", 0)); // cap, cip
console.log("a*", strPerms(trie, "a*", 0)); // at, atter
console.log("*r", strPerms(trie, "*r", 0)); // atter, catter
console.log("c*", strPerms(trie, "c*", 0)); // cat, catter, cap, cip
console.log("*t*", strPerms(trie, "*t*", 0)); // at, atter, cat, catter
console.log("*a*", strPerms(trie, "*a*", 0)); // at, atter, cat, catter, cap
console.log("test*", strPerms(trie, "test*", 0)); // NONE

module.exports = {
	trie,
	insert,
	strPerms
}