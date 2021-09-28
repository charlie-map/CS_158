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

insert(trie, "at", 0);
insert(trie, "cat", 1);
insert(trie, "cap", 2);
insert(trie, "atter", 3);

console.log(trie.childs);