var getList = function() {
	return new Promise(resolve => setTimeout(function() {
		cli.print('intermediate result');
		setTimeout(function() {
			resolve([
				{title: 'Red', price: 152},
				{title: 'Blue', price: 236},
				{title: 'Green', price: 212}
			]);
		}, 5000);
	}, 5000));
};

// example of self command
cli.command('books_load', 'App command', function() {
	cli.log('execute command books_load');
	return getList().then(function(list) {
		cli.print(list.map(book => book.title + ': ' + book.price + '$').join(', '));
		cli.log('long books_load finished');
	})
});

// example of prompt change
var updatePrompt = function() {
	cli.cache.prompt.innerHTML = '<span class="bracket">[</span>'
		+ '<span class="time">'
		+ new Date().toJSON().replace(/^.+T([\d:]+).+$/, '$1')
		+ '</span>'
		+ '<span class="bracket">]</span>&nbsp;'
		+ cli.settings.prompt
};

document.addEventListener("DOMContentLoaded", () => {
	updatePrompt();
	setInterval(updatePrompt, 1000);
});
