const path = require('path');
module.exports = {
    context: process.cwd(),
    mode: 'development',
    devtool: false,
    // entry: './src/index.js',
    // entry: {
    //     entry1: './src/spilitChunks/entry1.js',
    //     entry2: './src/spilitChunks/entry2.js',
    // },
    entry: './src/loader-supported/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        chunkFilename: '[name].js'
    },
    // 自定义查找loaders模块路径
    resolveLoader: {
        modules: ['loaders', 'node_modules']
    },
    module: {
        rules: [
            {
                test: /\.less$/,
                use: ['style-loader', 'less-loader']
            }
        ]
    },
    optimization: {
        // 设置代码块分割方案
        splitChunks: {
            // 此处是公共配置

            // all / initial / async    默认只分割 async
            // initial -> 同步 import require
            // async -> 异步 import()
            // all -> initial + async
            chunks: 'all',

            // 提取之后的总大小
            minSize: 0,  // 被提取代码块的最小尺寸   默认值 30k(大于30k才会被提取)

            minCHunks: 1,

            // 同一个入口分割出来的最大异步请求数  表示一个入口最多可以分割几个代码块出来(包括自己)
            // 此处看优先级, 优先级高的先分割, 不够了的就放一起
            maxAsyncRequests: 5,  // 同一个入口分割出来的最大异步请求数
            // 同一个入口分割出来的最大同步请求数  表示一个入口最多可以分割几个代码块出来(包括自己)
            // 此处看优先级, 优先级高的先分割, 不够了的就放一起
            maxInitialRequests: 3,

            automaticNameDelimiter: '~',

            // 公共代码块叫  page1~page2
            name: true,  // 设置代码块打包后的名称   默认名称是用分隔符 ~ 分割开的原始代码块

            // 缓存组 可以设置不同的缓存组来满足不同的chunk
            // webpack中有一些默认缓存组, 其优先级是 0
            cacheGroups: {
                // 把符合条件的缓存组都放在 vendors 代码块里
                // 第三方提供的
                vendors: {
                    // chunks: 'all',  // 此处优先级高
                    test: /[\\/]node_modules[\\/]/,   // 条件
                    // 如果一个模块符合多个缓存组的条件
                    priority: -10, //数字越大,优先级越高
                    // reuseExistingChunk: false  // 表示已经生成了, 就不再额外生成了, 共用一份
                },
                // 提取不同代码块之间的公共代码
                // commons~page1~page2
                // commons 名字随便写 default(优先级是 -20) 都可,如果优先级低于 -20, 且配置一样 就会走默认了
                default: {
                    // chunks: 'all',
                    minChunks: 2,  // 个数: 如果一个代码块被两个以及两个以上的代码块引用,就可以提取出来
                    // minSize: 8, // 还要大于8字节 才可以被提取    默认 30000 -> 30k   // 提取之后的总大小
                    priority: -20,
                    // reuseExistingChunk: false  // 表示已经生成了, 就不再额外生成了, 共用一份
                }
            }
        },
        /**
         * 优化持久化缓存 runtime: webpack 的运行环境 (作用是)
         *  
         *  分离运行时代码：将 webpack 的运行时代码（runtime）提取到单独的 chunk 中，而不是内联到每个 bundle 文件中。
            避免重复：当多个入口文件或动态导入时，webpack 的运行时代码可能会重复出现在多个 bundle 中，使用 runtimeChunk 可以避免这种重复。
            提高缓存效率：运行时代码通常变化较少，单独提取后可以利用浏览器缓存，当业务代码变化时，运行时代码的缓存仍然有效。
         */
        // runtimeChunk: true
    },
}