(function(original) {
	angular.modules = [];
	angular.module = function() {
		if (arguments.length > 1) angular.modules.push(arguments[0]);
		return original.apply(null, arguments);
	};
})(angular.module);

angular.module('cli', []).factory('$cli', () => window.cli);