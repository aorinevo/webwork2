//  This is the main view for the GradeBook Page.

define(['backbone', 'underscore','views/MainView','config','views/CollectionTableView','models/GradeBook','models/UserSetList'], 
function(Backbone, _,MainView,config,CollectionTableView,GradeBook,UserSetList){
var GradeBookView = MainView.extend({
	initialize: function (options){
		var self = this;
		_(this).bindAll("buildTable","render","changeDisplay","tableSetup");	
		MainView.prototype.initialize.call(this,options);	
		this.state.set({type: 'gradebook'});	
		this.changeDisplay();
		this.tableSetup();			
		this.state.on({
			"change:type": this.changeDisplay, 
			"change:set_id change:user_id change:type": this.tableSetup,
		});
	},
	render: function (){
		var self = this;		
		this.$el.html($("#gradebook-template").html());	
		switch(self.state.get('type')){
			case "gradebook":
				$('h1.title').html('GradeBook');	
				$('a.gradebook-button').addClass('hidden');																
				break;
			case "sets":
				$('h1.title').html(self.state.get('user_id'));
				$('a.gradebook-button').removeClass('hidden');							
				break;				
			case "users":
				$('h1.title').html(self.state.get('set_id'));				
				$('a.gradebook-button').removeClass('hidden');								
				break;
		}				
		this.progressTable = new CollectionTableView({columnInfo: this.cols, collection: this.collection, 
                paginator: {page_size: 10, button_class: "btn btn-default", row_class: "btn-group"}}).render();
		this.progressTable.on("page-changed",function(num){
	        self.state.set({page_num: num});
	        self.showHideColumns();
	    }).gotoPage(this.state.get("page_num")).$el.addClass("table table-bordered table-condensed")
		this.$el.append(this.progressTable.el);
	
	    // set up some styling
	    this.progressTable.$(".paginator-row td").css("text-align","center");
	    this.progressTable.$(".paginator-page").addClass("btn");
		this.progressTable.on("show-set-users", function(setname){		
			self.state.set({set_id: setname});
		   	self.state.set({type: "users"});					
		});		        
		MainView.prototype.render.apply(this);	
		this.$('.gradebook-button').on("click", function(){
		    self.state.set({type: 'gradebook'});
		});		
		// this resets the GradeBook to the gradebook state and triggers  
		// the necessary functions to render the correct table.	
		$(window).unload(function(){
		    self.state.set({type: 'gradebook'});
		});			
	    return this;
	},
	getDefaultState: function () {
		return {page_num: 0};
	},
	changeDisplay: function(){
		var self = this;
		this.$(".collection-table").remove();
		switch(this.state.get("type")){
			case "sets":
				this.tableSetup();
				break;
			case "users":
				this.tableSetup();
				break;
		}
	},	
	buildTable: function () {
		var self = this;
		if (this.state.get("type")==="sets"){
				(this.collection = new UserSetList([],{user: self.state.get("user_id"), type: "sets", loadProblems: true}))
				.fetch({success: function(data){self.render();}});	
		} else if (this.state.get("type")==="users"){
		var _set = this.problemSets.findWhere({set_id: this.state.get("set_id")});				
				(this.collection = new UserSetList([],{problemSet: _set, type: "users", loadProblems: true}))
					.fetch({success: function (data){self.render();}});	
		} else if (this.state.get("type")==="gradebook"){				
				this.collection = new GradeBook([],{type: "gradebook",loadProblems: true});		
				this.collection.fetch({success: function (data){
					var admin_model = self.collection.get("admin");	
					if(admin_model){	
	    	    	var admin_model_keys = _.keys(admin_model['attributes']);
    	    		var setnames = _.without(admin_model_keys,'user_id');  
    	    		setnames = setnames.sort(function(a, b){
    					if(a < b) return -1;
					    if(a > b) return 1;
					    return 0;
					});
       				_.each(setnames, function(name){
	       				self.cols.push({name: name.split('_')[0], key: name, classname: name, datatype: "integer",callback: 1});	       				
		       		});	      	
				self.render();
				}
				}});		
		}
	},	
	getHelpTemplate: function () {
		//Help template goes here?
	},	
	tableSetup: function () {
        var self = this; 
        switch(self.state.get('type')){
        	case "gradebook":
        		this.cols = [{name: "Login Name", key: "user_id", classname: "login-name", datatype: "string",
        		    stickit_options: {update: function($el, val, model, options) {
                    	$el.html("<a href='#' onclick='return false' class='goto-user' data-username='"+val+"'>" + val + "</a>");
                    	$el.children("a").on("click",function() {  
                    		self.state.set({user_id: $(this).data('username')});     	               	                  	
                    		self.state.set({type: "sets"});
                    	});}
                	}
        		}];
        		this.buildTable();        
				break;
			case "users":
				this.cols = [
            		{name: "Login Name", key: "user_id", classname: "login-name", datatype: "string"},
            		{name: "Score", key: "score", classname: "score", datatype: "integer", stickit_options: {
            			update: function($el, val, model, options) {
            				if(model.get("problems").size()===0){
            					$el.html("");
            					return;
            				}
        		 	var status = _(model.get("problems").pluck("status")
        		 			.map(function(s) { return s===""?0:parseFloat(s);})).reduce(function(p,q) {return p+q;});
					var total = _(model.get("problems").pluck("value")).reduce(function(p,q) { return parseFloat(p)+parseFloat(q);}); 
            		$el.html(config.displayFloat(status,2) + "/" + total);
            	}
            }},
            {name: "Problems", key: "problems", classname: "problems", datatype: "string", stickit_options: {
            	update: function($el, val, model, options) {
            		if(model.get("problems").size()===0){
            			$el.html("");
            			return;
            		}
            		$el.html(model.get("problems").map(function(p){
            			var status = p.get("status")===""? 0: parseFloat(p.get("status"));
            			if(p.get("attempted")=="0" || p.get("attempted")==="") { return "  .";}
            			else if(p.get("status")==p.get("value")){ return "  C";}
            			else {
            				return " "+(parseInt(100*status/parseFloat(p.get("value"))));
            			}
            		}).join(""));
            	}
            }},
        ];
               		this.buildTable();   
			  break;	
			case "sets":
			this.cols = [
            		{name: "Set Name", key: "set_id", classname: "set-id", datatype:"string"},
            		{name: "Score", key: "score", classname: "score", datatype: "integer", stickit_options: {
            			update: function($el, val, model, options) {
            				if(model.get("problems").size()===0){
            					$el.html("");
            					return;
            				}
        		 	var status = _(model.get("problems").pluck("status")
        		 			.map(function(s) { return s===""?0:parseFloat(s);})).reduce(function(p,q) {return p+q;});
					var total = _(model.get("problems").pluck("value")).reduce(function(p,q) { return parseFloat(p)+parseFloat(q);}); 
            		$el.html(config.displayFloat(status,2) + "/" + total);
            	}
            }},
            {name: "Problems", key: "problems", classname: "problems", datatype: "string", stickit_options: {
            	update: function($el, val, model, options) {
            		if(model.get("problems").size()===0){
            			$el.html("");
            			return;
            		}
            		$el.html(model.get("problems").map(function(p){
            			var status = p.get("status")===""? 0: parseFloat(p.get("status"));
            			if(p.get("attempted")=="0" || p.get("attempted")==="") { return "  .";}
            			else if(p.get("status")==p.get("value")){ return "  C";}
            			else {
            				return " "+(parseInt(100*status/parseFloat(p.get("value"))));
            			}
            		}).join(""));
            	}
            }},
        	];
                		this.buildTable();  	
			  break;				  
    	}
    }

});

return GradeBookView;
});
