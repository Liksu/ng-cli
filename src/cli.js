window.cli = new (function() {
	this.cache = {
		commandInput: null,
		buffer: null,
		panel: null,
		show: false
	};
	this.history = [];
	this.settings = {
		prompt: '> ',
		debug: 0
	};
	this.workers = {
		pre: [],
		commands: {},
		post: [],
		keys: {}
	};

	/* templates */

	this.templates = {};

	this.addHtml = function(name, content, selector) {
		this.templates[name] = {
			html: content,
			selector: selector || 'body'
		};
	}.bind(this);

	document.addEventListener("DOMContentLoaded", function() {
		var templates = this.templates;
		var fragments = {};

		Object.keys(templates).forEach(function(name) {
			var selector = templates[name].selector;
			if (!fragments[selector]) {
				fragments[selector] = document.createElement('div');
				fragments[selector].innerHTML = '';
			}
			fragments[selector].innerHTML += templates[name].html;
		});

		Object.keys(fragments).forEach(function(selector) {
			document.querySelector(selector).appendChild( fragments[selector] );
		});

		this.cache.panel = document.querySelector('.cli .cli-panel');
		this.cache.commandInput = this.cache.panel.querySelector('.cli .cli-line .cli-command');
		this.cache.buffer = this.cache.panel.querySelector('.cli-buffer');
		this.cache.prompt = this.cache.panel.querySelector('.cli-prompt');
		this.cache.prompt.innerHTML = this.settings.prompt;

		this.toggle(this.cache.show);
	}.bind(this));

	/* keyboard */

	document.addEventListener('keydown', function(e) {
		var isInCommandLine = e.target === this.cache.commandInput;

		if (this.workers.keys[e.keyCode]) this.workers.keys[e.keyCode].forEach(stored => stored.worker(e, isInCommandLine));
		if (this.workers.keys[0]) this.workers.keys[0].forEach(stored => stored.worker(e, isInCommandLine));
	}.bind(this));


	/* ui helpers */

	this.show = function() {
		this.cache.panel.className += ' show';
		this.cache.show = true;
		this.focus();
	}.bind(this);

	this.hide = function() {
		this.cache.panel.className = this.cache.panel.className.replace(/\s*show/g, '');
		this.cache.show = false;
	}.bind(this);

	this.toggle = function(show){
		if (show === undefined) show = !this.cache.show;
		show ? this.show() : this.hide();
	}.bind(this);

	this.mouseUp = function() {
		var selectedText = "";
		if (window.getSelection) selectedText = window.getSelection().toString();
		else if (document.selection && document.selection.type != "Control") {
			selectedText = document.selection.createRange().text;
		}
		if (!selectedText) this.focus();
	}.bind(this);

	this.focus = function() {
		var input = this.cache.commandInput;
		setTimeout(function() {
			var len = input.value.length;
			if(input.setSelectionRange){
				input.setSelectionRange(len, len);
			} else if (typeof input.selectionStart == "number") {
				input.selectionStart = input.selectionEnd = len;
			} else if (typeof input.createTextRange != "undefined") {
				input.focus();
				var range = input.createTextRange();
				range.collapse(true);
				range.moveEnd(len);
				range.moveStart(len);
				range.select();
			}
			input.focus();
		}, 0);
	}.bind(this);

	/* stuff */

	this.log = (...arg) => {
		if (cli.settings.debug) console.log.apply(console, arg);
	};

	/* API */

	this.print = function(string) {
		this.cache.buffer.innerHTML += string.replace(/\t/g, '    ') + '\n';
	}.bind(this);

	this.run = function(command) {
		if (command) this.history.push(command.trim());
		var commandObject = {
			input: command.trim(),
			original: command,
			command: null,
			argv: {},
			result: null
		};
		// run over all
		// each step is promise

		var pipeline = new Promise((resolve, reject) => resolve(commandObject));

		this.workers.pre.forEach(ordered => ordered.forEach(processsor => {
			cli.log('promise pre', processsor);
			pipeline = pipeline.then(commandObject => processsor.worker(commandObject) || commandObject);
		}));

		pipeline = pipeline.then(commandObject => new Promise((resolve, reject) => {
			cli.log('promise command', commandObject);
			var command;
			if (commandObject.command && (command = this.workers.commands[commandObject.command])) {
				cli.log('promise run command', command);
				return resolve(command.worker(commandObject) || commandObject)
			}
			return resolve(commandObject);
		})).then(result => result || commandObject);

		this.workers.post.forEach(ordered => ordered.forEach(processsor => {
			cli.log('promise post', processsor);
			pipeline = pipeline.then(commandObject => processsor.worker(commandObject) || commandObject);
		}));

		return pipeline;
	}.bind(this);

	/**
	 *
	 * @param type
	 * @param name
	 * @param [description]
	 * @param worker
	 */
	var store = function store(type, name, description, worker, order) {
		if (!order) order = 0;

		if (worker === undefined && typeof description === 'function') {
			worker = description;
			description = null;
		}

		var storeObject = {
			name: name,
			description: description,
			// worker: worker
			worker(...arg) {
				cli.log('call worker', type, name, 'with arguments:', arg);
				var result = worker.apply(null, arg);
				cli.log('and result:', result);
				return result;
			}
		};

		if (type === 'command') this.workers.commands[name] = storeObject;
		else if (type === 'keys') {
			if (!this.workers.keys[name]) this.workers.keys[name] = [];
			this.workers.keys[name].push(storeObject);
		}
		else {
			if (!this.workers[type][order]) this.workers[type][order] = [];
			this.workers[type][order].push(storeObject);
		}
	}.bind(this);

	this.command = store.bind(this, 'command');
	this.preprocessor = store.bind(this, 'pre');
	this.postprocessor = store.bind(this, 'post');
	this.registerKey = store.bind(this, 'keys');

})();