(function()
{
	var w = window;	
	w.controls  = w.controls || {};	
	w.controls.$AutoComplete = function()
	{
		// private variables
		var _$input, _dataSrc, _inputHandler;
		var _this = this;
		
		constr(arguments[0]);
		
		_this.init = function()
		{
			_dataSrc.init();
			attachEvents();
		}	
		
		function constr(p_args)
		{
			_$input = $(p_args.id);	
			_dataSrc = p_args.dataSrc;
			_inputHandler = new w.comp.$InputHandler(_dataSrc, onResultSet);
			_$input.wrap('<div class="autocomplete"></div>');			
		}	
		
		function attachEvents()
		{
			_$input.bind("focus.autocomplete blur.autocomplete", toggleFocus);			
			_$input.bind("keyup.autocomplete", handleKeyup);
			_$input.bind("keydown.autocomplete", handleKeydown);
			$(window).bind("unload beforeunload", function()
			{				
				_$input.unbind(".autocomplete");
			});
		}
		
		function toggleFocus(p_ev)
		{
			if(p_ev.type == "focus")
			{
				_$input.addClass("focus");
			}
			else
			{
				_$input.removeClass("focus");
				toggleSuggestions();
			}
		}
		
		function handleKeyup(p_ev)
		{
			var _input = _$input.val();
			
			console.log("handleinput " + _input + " " + p_ev.type);				
			
			if(_input == "")
			{				
				_inputHandler.reset();
				toggleSuggestions();
			}
			else
			if(p_ev.keyCode == 13) //enter
			{
				
				_inputHandler.reset();
				var _$activeLi = $("#" + _$input.attr("id") + "_ul li.active");				
				if(_$activeLi.length == 1)
				{
					_$input.val(_$activeLi.text());
				}
				toggleSuggestions();
			}
			else if(p_ev.keyCode == 8 || (p_ev.keyCode >=65 && p_ev.keyCode <= 90)) //back arrow or alphabets
			{
				_inputHandler.add(_input);
			}
		}
		
		
		function handleKeydown(p_ev)
		{
			var _input = _$input.val();
			
			console.log("handleinput " + _input + " " + p_ev.type);		
			
			if(p_ev.keyCode == 40) //down
			{
				var _$activeLi = $("#" + _$input.attr("id") + "_ul li.active");
				var _$tobeActive = $("#" + _$input.attr("id") + "_ul li").first();
				if(_$activeLi.length == 1)
				{
					_$activeLi.removeClass("active");
					
					var _$next = _$activeLi.next();
					if(_$next.length == 1)
					{
						_$tobeActive = _$next;
					}
				}
				_$tobeActive.addClass("active").focus();
			}
			else
			if(p_ev.keyCode == 38) //up
			{
				var _$activeLi = $("#" + _$input.attr("id") + "_ul li.active");	
				var _$tobeActive = $("#" + _$input.attr("id") + "_ul li").last();				
				if(_$activeLi.length == 1)
				{
					_$activeLi.removeClass("active");
					
					var _$prev = _$activeLi.prev();
					if(_$prev.length == 1)
					{
						_$tobeActive = _$prev;
					}
				}				
				_$tobeActive.addClass("active").focus();
			}			
		}
		
		function onResultSet(p_data)
		{
			toggleSuggestions(p_data.results);
		}
		
		function toggleSuggestions(p_suggestions)
		{
			// Clean up the dom			
			$("#" + _$input.attr("id") + "_ul").unbind(".menuevents").remove();
			
			// Append the dom with new suggestions
			if(p_suggestions && p_suggestions.length > 0)
			{	
				var _sugDom = $('<ul id=' + _$input.attr("id") + '_ul></ul>')
									.css({"min-width": _$input.width()})									
									.bind("mouseover.menuevents mouseout.menuevents", toggleMenuItemFocus);
									
				$.each(p_suggestions, function()
				{
					_sugDom.append($(["<li>", this, "</li>"].join("")));
				});				
				_$input.parent().append(_sugDom);
			}
		}
		
		function toggleMenuItemFocus(p_ev)
		{			
			$("#" + _$input.attr("id") + "_ul li.active").removeClass("active");
			$(p_ev.srcElement).addClass("active");
		}
	};	
})();

(function()
{
	var w=window;
	w.data = w.data || {};
	w.data.$AutoCompleteDataSrc = function(p_srcUrl)
	{
		var _this = this;
		var _srcUrl = p_srcUrl;
		var _initCb, _webWorker, _isTrieReady, _isInitialized;
		var _deferred;
				
		_this.init = function(p_initCb)
		{
			if(!_isInitialized)
			{
				_isInitialized = true;
				
				// capture the callback
				if(p_initCb)
				{
				   _initCb = p_initCb;
				}
				
				// Make an ajax call and send the data to the webworker for trie generation
				$.ajax("scrabble.txt")
				 .done(function(p_data) 
					  { 						
						// initialize webworker
						if(!_webWorker)
						{
							_webWorker = new Worker("worker.js");
							
							_webWorker.addEventListener("message", onMessageFromWorker, false);
							
							//Send the words to the webworker (remove the first one which is a comment)
							_webWorker.postMessage({"cmd" : "inittrie", "pckg" : {"data" : p_data.split('\n').slice(1)}});								
						}
					  });
			}
		}

		_this.findMatches = function(p_query, p_maxCount)
		{
			if(_this.canFindMatches())
			{
			   _webWorker.postMessage({"cmd" : "findmatches", "pckg" : {"query" : p_query, "max" : p_maxCount}});
			   _deferred = $.Deferred();
			   
			   // return the promise object 
			   // all the callbacks associated with this promise will be executed when the deferred is resolved
			   return _deferred.promise();
			}
			else			
			{
				//worker is busy processing the old query
				//return a dummy promise which executes the callback rightaway
				var dfd = $.Deferred();
				return dfd.resolve({"status":"cannot query","results":[]}).promise();
			}
		}
		
		_this.canFindMatches = function()
		{
			return (_isTrieReady && !_deferred);
		}
		
		_this.dispose = function()
		{
			// dispose the worker
			_worker.terminate();
		}
		
		// handle the message from web worker
		function onMessageFromWorker(p_ev)
		{
			var _data = p_ev.data;
			
			if(!(_data && _data.cmd)) return;
			
			if(_data.cmd === "inittrie" && 
			   _data.status == "success")
			{
				//mark the state
				_isTrieReady = true;
				
				if(_initCb)
				{
				  _initCb.call(window);
				}
			}
			else
			if(_data.cmd === "findmatches")
			{
				if(_deferred && _data.status == "success")
				{
					_deferred.resolve({"status":"success","result":_data.result});
				}
				
				_deferred = null;
			}
		}
	}
})();

(function()
{
	var w=window;
	w.comp = w.comp || {};
	w.comp.$InputHandler = function(p_dataSrc, p_cb)
	{
		var _this = this;
		var _cb = p_cb;
		var _dataSrc = p_dataSrc;
		var _tokens = [];
		var _intervalId;
		
		_this.add = function(p_str)
		{
			_tokens.push(p_str);
			
			if(_tokens.length == 1 && !_intervalId)
			{
				//console.log(p_str + ": create interval");
				_intervalId = w.setInterval(processTokens, 100);
			}
		}
		
		_this.reset = function()
		{
			_tokens.length =0;
			if(_intervalId)
			{
				//console.log("clear interval");
				w.clearInterval(_intervalId);
				_intervalId = null;
			}
		}
		
		function processTokens()
		{
			if(_tokens.length > 0)
			{
				var _recentQuery = _tokens.pop();			
				_dataSrc.findMatches(_recentQuery, 20).then(function(p_data){
					var _results = p_data.status === "success" ? p_data.result : [];
					_tokens.length = 0;
					_cb.call(null, {query:_recentQuery, results:_results});			
				});
			}
			else
			{
				_this.reset();
			}
		}
	}	
})();
