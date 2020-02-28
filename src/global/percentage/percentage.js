'use strict';

var validators = require('../../helpers/validators');
var NumberMasks = require('../../helpers/number-mask-builder');
var PreFormatters = require('../../helpers/pre-formatters');

function preparePercentageToFormatter(value, decimals, modelMultiplier) {
	return PreFormatters.clearDelimitersAndLeadingZeros((parseFloat(value)*modelMultiplier).toFixed(decimals));
}

function PercentageMaskDirective($locale) {
	var beforeSActual;
	return {
		restrict: 'A',
		require: 'ngModel',
		link: function(scope, element, attrs, ctrl) {
			element.on('keydown', function(event) {
				// isBackspace = event.keyCode === '8' || event.keyCode === '46';
				var keyCode = event.keyCode;
				var keyChar = String.fromCharCode(keyCode);
				var el = element[0]
				var value = el.value
				var dotPos = value.indexOf(".")
				var s = el.selectionStart
				var e = el.selectionEnd
				var range = e > s
				var newValue = value
				var newS = s
				if (keyCode === 8 || keyCode === 46) {
					if (range) {
						var chars = value.split('')
						chars.splice(s, e-s)
						newValue = chars.join('')
						newS = s
					} else {
						if (s > dotPos+1) {
							var chars = value.split('')
							chars.splice(s + (keyCode===8?-1:0), 1, "0")
							newValue = chars.join('')
							newS=s+(keyCode===8?-1:0)
						} else if (s === dotPos+1 && keyCode === 46) {
							var chars = value.split('')
							chars.splice(s + (keyCode===8?-1:0), 1, "0")
							newValue = chars.join('')
							newS=s
						} else if (s === dotPos+1 && keyCode === 8) {
							event.preventDefault()
							event.stopPropagation()
							newS=s-1
							element[0].setSelectionRange(newS,newS)
						} else if (s === dotPos-1 && keyCode === 46) {
							event.preventDefault()
							event.stopPropagation()
						} else {
							var chars = value.split('')
							chars.splice(s + (keyCode===8?-1:0), 1)
							newValue = chars.join('')
							newS=s+(keyCode===8?-1:0)
						}
						
					}
				} else if (/\d/.test(keyChar)) {
					var chars = value.split('')
					chars.splice(s, e-s, keyChar)
					newValue = chars.join('')
					newS = s+1
					
				}
				var beforeS = newValue.substring(0, newS)
				beforeSActual = beforeS.replace(/[^\d]+/g,'')
			});

			var decimalDelimiter = $locale.NUMBER_FORMATS.DECIMAL_SEP;

			var backspacePressed = false;
			element.bind('keydown keypress', function(event) {
				backspacePressed = event.which === 8;
			});

			var thousandsDelimiter = $locale.NUMBER_FORMATS.GROUP_SEP;
			if (angular.isDefined(attrs.uiHideGroupSep)) {
				thousandsDelimiter = '';
			}

			var percentageSymbol = ' %';
			if (angular.isDefined(attrs.uiHidePercentageSign)) {
				percentageSymbol = '';
			} else if (angular.isDefined(attrs.uiHideSpace)) {
				percentageSymbol = '%';
			}

			var decimals = parseInt(attrs.uiPercentageMask);
			if (isNaN(decimals)) {
				decimals = 2;
			}

			var modelValue = {
				multiplier : 100,
				decimalMask: 2
			};
			if (angular.isDefined(attrs.uiPercentageValue)) {
				modelValue.multiplier  = 1;
				modelValue.decimalMask = 0;
			}

			var numberDecimals = decimals + modelValue.decimalMask;
			var viewMask = NumberMasks.viewMask(decimals, decimalDelimiter, thousandsDelimiter),
				modelMask = NumberMasks.modelMask(numberDecimals);

			function formatter(value) {
				if (ctrl.$isEmpty(value)) {
					return value;
				}
				var prefix = (angular.isDefined(attrs.uiNegativeNumber) && value < 0) ? '-' : '';
				var valueToFormat = preparePercentageToFormatter(value, decimals, modelValue.multiplier);
				var formatedValue = prefix + viewMask.apply(valueToFormat) + percentageSymbol;

				return formatedValue;
			}

			function parser(value) {
				if (ctrl.$isEmpty(value)) {
					return null;
				}

				var valueToFormat = value.replace(/[^\d|^\.]+/g,''), formatedValue;
				valueToFormat = (Math.floor(Number.parseFloat(valueToFormat)*100)).toFixed(0)

				// var valueToFormat = PreFormatters.clearDelimitersAndLeadingZeros(value) || '0';
				if (percentageSymbol !== '' && value.length > 1 && value.indexOf('%') === -1) {
					valueToFormat = valueToFormat.slice(0, valueToFormat.length - 1);
				}

				if (backspacePressed && value.length === 1 && value !== '%') {
					valueToFormat = '0';
				}

				var formatedValue = viewMask.apply(valueToFormat) + percentageSymbol;
				var actualNumber = parseFloat(modelMask.apply(valueToFormat));

				if (angular.isDefined(attrs.uiNegativeNumber)) {
					var isNegative = (value[0] === '-'),
						needsToInvertSign = (value.slice(-1) === '-');

					//only apply the minus sign if it is negative or(exclusive) or the first character
					//needs to be negative and the number is different from zero
					if ((needsToInvertSign ^ isNegative) || value === '-') {
						actualNumber *= -1;
						formatedValue = '-' + ((actualNumber !== 0) ? formatedValue : '');
					}
				}

				var l = beforeSActual.length
				for(var i = 0; i<formatedValue.length && l >0; i++) {
					if (/\d/.test(formatedValue.substring(i,i+1))) {
						l --
					}
				}
				if (formatedValue.indexOf(" %") <i) {
					i=formatedValue.indexOf(" %");
				}

				if (ctrl.$viewValue !== formatedValue) {
					ctrl.$setViewValue(formatedValue);
					ctrl.$render();
				}
				element[0].setSelectionRange(i,i)

				return actualNumber;
			}

			ctrl.$formatters.push(formatter);
			ctrl.$parsers.push(parser);

			if (attrs.uiPercentageMask) {
				scope.$watch(attrs.uiPercentageMask, function(_decimals) {
					decimals = isNaN(_decimals) ? 2 : _decimals;

					numberDecimals = decimals + modelValue.decimalMask;
					viewMask = NumberMasks.viewMask(decimals, decimalDelimiter, thousandsDelimiter);
					modelMask = NumberMasks.modelMask(numberDecimals);

					parser(formatter(ctrl.$modelValue));
				});
			}

			if (attrs.min) {
				var minVal;

				ctrl.$validators.min = function(modelValue) {
					return validators.minNumber(ctrl, modelValue, minVal);
				};

				scope.$watch(attrs.min, function(value) {
					minVal = value;
					ctrl.$validate();
				});
			}

			if (attrs.max) {
				var maxVal;

				ctrl.$validators.max = function(modelValue) {
					return validators.maxNumber(ctrl, modelValue, maxVal);
				};

				scope.$watch(attrs.max, function(value) {
					maxVal = value;
					ctrl.$validate();
				});
			}
		}
	};
}
PercentageMaskDirective.$inject = ['$locale'];

module.exports = PercentageMaskDirective;
