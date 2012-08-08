self.addEventListener("message", function(p_ev)
{
	var  _data = p_ev.data;
	if (!(_data && _data.cmd && _data.pckg)) return;
	
	// helper method to post the message to UI thread
	var _postMessage = function(p_cmd, p_status, p_result)
					   {
						  self.postMessage({"cmd" : p_cmd, "status" : p_status, "result" : p_result});
					   }
	
	if(_data.cmd == "inittrie")
	{
		if(!self._trie)
		{
		   try
		   {
				self._trie = new self.data.$Trie(_data.pckg.data);		   
				_postMessage(_data.cmd, "success");
		   }
		   catch(e)
		   {
				_postMessage(_data.cmd, "error", e.message);
		   }
	    }		
		
	}
	else
	if(_data.cmd == "findmatches")
	{		
		if(self._trie)
		{
			if(_data.pckg.query && _data.pckg.max)
			{
				var _results = self._trie.findMatches(_data.pckg.query, _data.pckg.max);
				_postMessage(_data.cmd, "success", _results);
			}
			else
			{
				_postMessage(_data.cmd, "error", "invalid input");
			}
		}
		else
		{
			_postMessage(_data.cmd, "error", "trie not ready yet");
		}
	}	
}, false);



(function()
{
	var w = self;	
	w.data  = w.data || {};	
	w.data.$Trie = function(p_data)
	{		
		var _this = this;		
		
		// capture the argument and build the Trie
		constr((arguments[0] && arguments[0].constructor === Array) ? arguments[0] : []);
		
		function constr(p_data)
		{
			_this.data = p_data;
			_this.root = {};
			buildTrie();
		}	
		
		function buildTrie()
		{	
			// build the trie structure for the input array
			var _index, _count = _this.data.length;			
			for(_index = 0;_index < _count; ++_index)
			{
				var _word = _this.data[_index],	_charCount = _word.length;
				var _charIndex, _root = _this.root;
				
				// for each character in the word, create a chain of nodes from the root
				for(_charIndex = 0;_charIndex < _charCount; ++_charIndex)
				{
					var _char = _word.charAt(_charIndex);
					if(!_root[_char])
					{
						_root[_char] = {};
					}					
					_root = _root[_char];
				}
			}			
		}
		
		_this.findMatches = function(p_query, p_maxCount)
		{
			//find all the words in the Trie that starts with p_query ("ba" -> "bat", "balm", "bad", "badge"....)
			var _results = [], _resultStr = "";
			var _root = this.root, _rootChar;
			
			// go down the tree to find a root node which matches the p_query
			for(var _index = 0; _index < p_query.length; ++_index)
			{
				_rootChar = p_query.charAt(_index);
				_root = _root[_rootChar];				
				if(!_root)
				{
				   return [];
				}
			}
			
			// if such root exists - find all the words from this root (traverse the sub-tree using DFS)
			if(_root)
			{
				var _subResults = getResultsForSubtree(_rootChar, _root);
				for(var i=0;i<_subResults.length;++i)
				{
					_results.push(p_query.slice(0, p_query.length - 1) + _subResults[i]);
				}
			}
			
			return typeof(p_maxCount != undefined && p_maxCount < _results.length) ? _results.slice(0, p_maxCount) : _results;			
		}

		function getResultsForSubtree(p_rootText, p_root)
		{
			// find all the words from p_rootText (traverse all the nodes from this root using DFS)
			var _results = [];			
			for(var _p in p_root)
			{
				if(p_root.hasOwnProperty(_p))
				{				   
				   var _tempResults = getResultsForSubtree(_p, p_root[_p]);
				   for(var i=0;i<_tempResults.length;++i)
				   {
					  _results.push(p_rootText + _tempResults[i]);
				   }
				}
			}			
			return _results.length > 0 ? _results : [p_rootText];
		}
	};	
})();
