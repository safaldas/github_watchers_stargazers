var fs = require('fs')


module.exports = {
    JSONParse: function (strJSON) {
        return eval("(function(){return " + strJSON + ";})()");
    },
    makeArray: function (number) {
        let array = []
        for (let i = 1; i <= number; i++) {
            array.push(i)
        }
        return array
    },
    readFile: function (fileName) {
        return new Promise((resolve, reject) => {
            fs.readFile(fileName, 'utf8', (err, data) => {
                if (err) throw err;
                resolve(data.split(','));
            });
        })

    }
}