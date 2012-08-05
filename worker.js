self.addEventListener("message", function(p_ev)
{
	var  _data = p_ev.data;
	if (!(_data && _data.cmd && _data.pckg)) return;
	
	if(_data.cmd == "inittrie")
	{
		if(!self._trie)
		{
		   try
		   {
				self._trie = new self.data.$Trie(_data.pckg.data);		   
				self.postMessage({"cmd" : _data.cmd, "status" : "success"});
		   }
		   catch(e)
		   {
				self.postMessage({"cmd" : _data.cmd, "status" : "error", "result" : e.message});
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
				self.postMessage({"cmd" : _data.cmd, "status" : "success", "result" : _results});
			}
			else
			{
				self.postMessage({"cmd" : _data.cmd, "status" : "error", "result" : "invalid input"});
			}
		}
		else
		{
			self.postMessage({"cmd" : _data.cmd, "status" : "error", "result" : "Trie not ready yet"});
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
		
		constr((arguments[0] && arguments[0].constructor === Array) ? arguments[0] : []);
		
		function constr(p_data)
		{
			_this.data = p_data;
			_this.root = {};
			buildTrie();
		}	
		
		function buildTrie()
		{			
			var _index, _count = _this.data.length;
			for(_index = 0;_index < _count; ++_index)
			{
				var _word = _this.data[_index],	_charCount = _word.length;
				var _charIndex, _root = _this.root;
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
			var _results = [], _resultStr = "";
			var _root = this.root, _rootChar;
			for(var _index = 0; _index < p_query.length; ++_index)
			{
				_rootChar = p_query.charAt(_index);
				_root = _root[_rootChar];				
				if(!_root)
				{
				   return [];
				}
			}
			
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
