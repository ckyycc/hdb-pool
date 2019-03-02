module.exports = {
    "extends": "standard",
    "parserOptions": {
        "ecmaVersion": 2017
    },
    "rules": {
        'max-len': ["error", { "code": 140 }],
        "semi": [2, "always"],
        "no-new": 0,
        "object-curly-spacing": [2, "never"],
        "space-before-function-paren": 0
    },
    "env": {
        "commonjs": true,
        "node": true,
        "mocha": true,
        "es6": true
    }
};
