let less = require('less');

 function loader (source) {
    // let css
    // // 同步方法
    // less.render(source, (err, output) => {
    //     css = output.css
    // })
    // return css

    const callback = this.async()

    less.render(source, (err, output) => {
        callback(err, output.css)
    })
}

module.exports = loader

// console.log(module.exports(`  
// @color: red;

// body {
//     background-color: @color;
// }`));
