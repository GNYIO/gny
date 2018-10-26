"use strict";
var utils = require('./utils.js');
var extend = utils.extend;
var Field = require('./field.js');
module.exports = Validator;
exports.Field = Field;
function Validator(options) {
    options = options || {};
    this.hasError = false;
    this.forceAsync = this.forceAsync || options.forceAsync;
    this.skipMissed = this.skipMissed || options.skipMissed;
    this.execRules = this.execRules || options.execRules;
    this.rules = extend(Object.create(this.rules), options.rules);
    var reporter = this.reporter || options.reporter;
    if (typeof reporter === 'function') {
        reporter = new reporter(this);
    }
    this.reporter = reporter;
    this.onInit();
}
Validator.prototype.forceAsync = false;
Validator.prototype.skipMissed = false;
Validator.prototype.execRules = true;
Validator.prototype.reporter = null;
Validator.prototype.hasRule = function (name) {
    return name in this.rules;
};
Validator.prototype.getRule = function (name) {
    if (name in this.rules === false)
        throw new Error('Rule "' + name + '" doesn\'t defined');
    return this.rules[name];
};
Validator.prototype.validate = function (value, rules, callback) {
    var self = this;
    var field = this.createField(null, value, rules);
    var async, finished, report;
    report = {};
    function finish(err, issues, output) {
        finished = true;
        report.isValid = !issues.length;
        if (self.reporter) {
            issues = self.reporter.convert(issues, rules);
        }
        report.isAsync = async;
        report.issues = issues;
        report.rules = rules;
        report.value = output;
        if (!callback) {
            if (err) {
                throw err;
            }
            else if (async) {
                throw new Error("Async validation without callback");
            }
            return;
        }
        if (async || !callback || !self.forceAsync) {
            self.onEnd();
            callback.call(self, err, report, output);
        }
        else {
            setTimeout(function () {
                self.onEnd();
                callback.call(self, err, report, output);
            }, 1);
        }
    }
    async = false;
    field.validate(finish);
    async = true;
    if (!callback && !finished) {
        throw new Error("Validation not finished");
    }
    return report;
};
Validator.prototype.Field = Field;
Validator.prototype.createField = function (path, value, rules, thisArg) {
    return new this.Field(this, path, value, rules, thisArg);
};
Validator.prototype.rules = {};
Validator.prototype.onInit = function () { };
Validator.prototype.onError = function (field, err) { };
Validator.prototype.onValid = function (field) { };
Validator.prototype.onInvalid = function (field) { };
Validator.prototype.onEnd = function () { };
Validator.addRule = function (name, descriptor) {
    if (typeof descriptor !== 'object') {
        throw new Error("Rule descriptor should be an object");
    }
    var self = this;
    this.prototype.rules[name] = descriptor;
    if (descriptor.hasOwnProperty("aliases")) {
        descriptor.aliases.forEach(function (alias) {
            self.addAlias(alias, name);
        });
    }
};
Validator.addAlias = function (name, origin) {
    Object.defineProperty(this.prototype.rules, name, {
        get: function () {
            return this[origin];
        }
    });
};
Validator.fieldProperty = function (name, value) {
    this.prototype.Field.prototype[name] = value;
};
Validator.options = {
    forceAsync: false,
    skipMissed: false,
    execRules: true,
    reporter: null
};
Validator.validate = function (value, rules, customRules, callback) {
    if (typeof customRules === "function") {
        callback = customRules;
        customRules = {};
    }
    var instance = new this(extend({}, this.options, {
        rules: customRules
    }));
    return instance.validate(value, rules, callback);
};
Validator.addRule("defaults", {
    description: "Set default value if passed value is undefined",
    filter: function (accept, value) {
        if (typeof value === "undefined") {
            return accept;
        }
        else {
            return value;
        }
    }
});
Validator.addRule("type", {
    description: "Check value type",
    validate: function (accept, value) {
        return typeof value === accept;
    }
});
Validator.addRule("equal", {
    description: "Check if value equals acceptable value",
    validate: function (accept, value) {
        return value === accept;
    }
});
Validator.addRule("notEqual", {
    description: "Check if value not equals acceptable value",
    validate: function (accept, value) {
        return typeof value !== accept;
    }
});
Validator.addRule("greater", {
    description: "Check if value is greater then acceptable value",
    aliases: [">", "gt"],
    validate: function (accept, value) {
        return typeof value > accept;
    }
});
Validator.addRule("greaterOrEqual", {
    description: "Check if value is greater then or equal acceptable value",
    aliases: [">=", "gte"],
    validate: function (accept, value) {
        return typeof value >= accept;
    }
});
Validator.addRule("less", {
    description: "Check if value is less then acceptable value",
    aliases: ["<", "lt"],
    validate: function (accept, value) {
        return typeof value < accept;
    }
});
Validator.addRule("lessOrEqual", {
    description: "Check if value is less then or equal acceptable value",
    aliases: ["<=", "lte"],
    validate: function (accept, value) {
        return typeof value <= accept;
    }
});
Validator.fieldProperty("isObject", function () {
    return this.value !== null && typeof this.value === "object";
});
Validator.fieldProperty("isObjectInstance", function () {
    return this.value && typeof this.value === "object" && this.value.constructor === Object;
});
Validator.fieldProperty("isDefault", function () {
    return this.value === this.rules.defaults;
});
Validator.fieldProperty("isUndefined", function () {
    return typeof this.value === 'undefined';
});
Validator.fieldProperty("isEmpty", function () {
    return typeof this.value === 'undefined' || this.value === null || this.value === '';
});
