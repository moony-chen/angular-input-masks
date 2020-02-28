'use strict';

var StringMask = require('string-mask');
var validators = require('../../helpers/validators');
var PreFormatters = require('../../helpers/pre-formatters');

function MoneyMaskDirective($locale, $parse) {
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
					if (newValue.indexOf("$ 0") === 0) newS--;
				}
				var beforeS = newValue.substring(0, newS)
				beforeSActual = beforeS.replace(/[^\d]+/g,'')
			});

			var decimalDelimiter = $locale.NUMBER_FORMATS.DECIMAL_SEP,
				thousandsDelimiter = $locale.NUMBER_FORMATS.GROUP_SEP,
				currencySym = $locale.NUMBER_FORMATS.CURRENCY_SYM,
				symbolSeparation = ' ',
				decimals = $parse(attrs.uiMoneyMask)(scope),
				backspacePressed = false;

			element.bind('keydown keypress', function(event) {
				backspacePressed = event.which === 8;
			});

			function maskFactory(decimals) {
				var decimalsPattern = decimals > 0 ? decimalDelimiter + new Array(decimals + 1).join('0') : '';
				var maskPattern =  '#' + thousandsDelimiter + '##0' + decimalsPattern;
				if (angular.isDefined(attrs.uiCurrencyAfter)) {
					maskPattern += symbolSeparation;
				} else {
					maskPattern =  symbolSeparation + maskPattern;
				}
				return new StringMask(maskPattern, {reverse: true});
			}

			if (angular.isDefined(attrs.uiDecimalDelimiter)) {
				decimalDelimiter = attrs.uiDecimalDelimiter;
			}

			if (angular.isDefined(attrs.uiThousandsDelimiter)) {
				thousandsDelimiter = attrs.uiThousandsDelimiter;
			}

			if (angular.isDefined(attrs.uiHideGroupSep)) {
				thousandsDelimiter = '';
			}

			if (angular.isDefined(attrs.uiHideSpace)) {
				symbolSeparation = '';
			}

			if (angular.isDefined(attrs.currencySymbol)) {
				currencySym = attrs.currencySymbol;
				if (attrs.currencySymbol.length === 0) {
					symbolSeparation = '';
				}
			}

			if (isNaN(decimals)) {
				decimals = 2;
			}
			decimals = parseInt(decimals);
			var moneyMask = maskFactory(decimals);

			function formatter(value) {
				if (ctrl.$isEmpty(value)) {
					return '';
				}

				if (angular.isDefined(attrs.uiIntegerModel)) {
					value /= Math.pow(10, decimals);
				}

				var prefix = (angular.isDefined(attrs.uiNegativeNumber) && value < 0) ? '-' : '';
				var valueToFormat = PreFormatters.prepareNumberToFormatter(value, decimals);

				if (angular.isDefined(attrs.uiCurrencyAfter)) {
					return prefix + moneyMask.apply(valueToFormat) + currencySym;
				}

				return prefix + currencySym + moneyMask.apply(valueToFormat);
			}

			function parser(value) {
				if (ctrl.$isEmpty(value)) {
					return null;
				}

				var actualNumber = value.replace(/[^\d|^\.]+/g,''), formatedValue;
				actualNumber = (Math.floor(Number.parseFloat(actualNumber)*100)).toFixed(0)
			

				if (backspacePressed && angular.isDefined(attrs.uiCurrencyAfter) && actualNumber !== 0) {
					actualNumber = actualNumber.substring(0, actualNumber.length - 1);
					backspacePressed = false;
				}

				if (angular.isDefined(attrs.uiCurrencyAfter)) {
					formatedValue = moneyMask.apply(actualNumber) + currencySym;
				} else {
					formatedValue = currencySym + moneyMask.apply(actualNumber);
				}

				if (angular.isDefined(attrs.uiNegativeNumber)) {
					var isNegative = (value[0] === '-'),
						needsToInvertSign = (value.slice(-1) === '-');

					//only apply the minus sign if it is negative or(exclusive)
					//needs to be negative and the number is different from zero
					if (needsToInvertSign ^ isNegative && !!actualNumber) {
						actualNumber *= -1;
						formatedValue = '-' + formatedValue;
					}
				}

				var l = beforeSActual.length
				for(var i = 0; i<formatedValue.length && l >0; i++) {
					if (/\d/.test(formatedValue.substring(i,i+1))) {
						l --
					}
				}
				if (i < 2) i = 2


				if (value !== formatedValue) {
					ctrl.$setViewValue(formatedValue);
					ctrl.$render();
				}
				element[0].setSelectionRange(i,i)


				var retValue = parseInt(formatedValue.replace(/[^\d\-]+/g,''));

				if (!isNaN(retValue)) {
					if (!angular.isDefined(attrs.uiIntegerModel)) {
						retValue /= Math.pow(10, decimals);
					}

					return retValue;
				}

				return null;
			}

			ctrl.$formatters.push(formatter);
			ctrl.$parsers.push(parser);

			if (attrs.uiMoneyMask) {
				scope.$watch(attrs.uiMoneyMask, function(_decimals) {
					decimals = isNaN(_decimals) ? 2 : _decimals;
					decimals = parseInt(decimals);
					moneyMask = maskFactory(decimals);

					parser(ctrl.$viewValue);
				});
			}

			if (attrs.currency) {
				scope.$watch(attrs.currency, function(_currency) {
					currencySym = _currency;
					moneyMask = maskFactory(decimals);
					parser(ctrl.$viewValue);
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
MoneyMaskDirective.$inject = ['$locale', '$parse'];

module.exports = MoneyMaskDirective;
