let async = require('neo-async')
let arr = [1, 2, 3]

console.time('cost');
function forEach(arr, calback, finalCallback){
    let total = arr.length
    function done() {
        if(--total == 0) {
            finalCallback()
        }
    }
    arr.forEach(item => {
        calback(item, done)
    })
}

// 同时开始,全部结束后再打印 console.timeEnd('cost')
forEach(arr, (item, done) => {
    setTimeout(() => {
        console.log(item);
        done()
    }, 1000 * item)
}, () => {
    console.timeEnd('cost');
})