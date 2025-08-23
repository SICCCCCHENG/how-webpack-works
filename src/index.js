// let title = require('./title');
// console.log(title);

// 放到dependenciess数组中
const async = require('./sync')
console.log(async);


// 如果 import 调用了一个模块, 那么这个模块和他依赖的模块会成一个单独的异步代码块, 里面所有的async都为true
// 放到blocks数组中
//  如果遇到了import, import 模块会成为一个单独的入口, 会生成一个单独的代码块(文件) 
import(/* webpackChunkName: 'title' */ './title').then(result => {
    console.log(result.default);
});

import(/* webpackChunkName: 'sum' */ './sum').then(result => {
    console.log(result.default);
});