(function()
{
	var w = window;	
	w.controls  = w.controls || {};	
	w.controls.$AutoComplete = function()
	{
		// private variables
		var _$input, _dataSrc;
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
				_dataSrc.clearPendingQueries();
				toggleSuggestions();
			}
			else
			if(p_ev.keyCode == 13) //enter
			{
				
				_dataSrc.clearPendingQueries();
				var _$activeLi = $("#" + _$input.attr("id") + "_ul li.active");				
				if(_$activeLi.length == 1)
				{
					_$input.val(_$activeLi.text());
				}
				toggleSuggestions();
			}
			else if(p_ev.keyCode == 8 || (p_ev.keyCode >=65 && p_ev.keyCode <= 90)) //back arrow or alphabets
			{
				_dataSrc.findMatches(_input)
						.then(onResultSet);
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
			var _result = p_data.status === "success" ? p_data.result : [];								
			toggleSuggestions(p_data.result);
		}
		
		function toggleSuggestions(p_suggestions)
		{
			// Clean up the dom			
			$("#" + _$input.attr("id") + "_ul").unbind(".menuevents").remove();
			
			// Append the dom with new suggestions
			if(p_suggestions && p_suggestions.length > 0)
			{	
				var _sugDom = $('<ul id=' + _$input.attr("id") + '_ul></ul>')
									.css({"min-width": _$input.outerWidth() - 2})									
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
	w.data.$DataHandler = function(p_srcUrl)
	{
		var _this = this;
		var c_MaxResults = 25;
		var _srcUrl = p_srcUrl;
		var _initCb, _webWorker, _isTrieReady, _isInitialized;
		var _deferred;
		var _queuedQueries = [];
				
		_this.init = function()
		{
			if(!_isInitialized)
			{
				_isInitialized = true;
				
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

		_this.findMatches = function(p_query)
		{
			if(_isTrieReady && !_deferred)
			{
			   _webWorker.postMessage({"cmd" : "findmatches", "pckg" : {"query" : p_query, "max" : c_MaxResults}});
			   _deferred = $.Deferred();
			}
			else
			{
				// queue the query requets (worer thread is churning the previous query)
				_queuedQueries.push(p_query);				
			}
			
			// return the promise object 
			// all the callbacks associated with this promise will be executed when the deferred is resolved			   
			return _deferred.promise();
		}
		
		_this.dispose = function()
		{
			// dispose the worker
			_worker.terminate();
		}
		
		_this.clearPendingQueries = function()
		{
			_queuedQueries.length =0;
			if(_deferred)
			{
				_deferred = null;
			}
		}
		
		// handle the message from web worker
		function onMessageFromWorker(p_ev)
		{
			var _data = p_ev.data;
			var _successStr = "success";
			
			if(!(_data && _data.cmd)) return;
			
			if(_data.cmd === "inittrie" && _data.status == _successStr)
			{
				//mark the state
				_isTrieReady = true;
			}
			else
			if(_data.cmd === "findmatches")
			{
				if(_deferred && _data.status == _successStr)
				{
					// handle the client callbacks
					_deferred.resolve({"status":_successStr,"result":_data.result});
					_deferred = null;
				}

				// handle the pending queries
				if(_queuedQueries.length > 0)
				{
					var _recentQuery = _queuedQueries.pop();
					_queuedQueries.length = 0;
					_this.findMatches(_recentQuery);
				}
				
			}
		}
	}
})();

