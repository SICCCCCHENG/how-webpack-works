

let fs = require("fs");
/**
 * 可以把一个loader从一个绝对路径变成一个loader对象
 */
function createLoaderObject(loaderAbsPath) {
  let normal = require(loaderAbsPath);
  let pitch = normal.pitch;
  // 设置为 true时, loader 的normal 函数参数就是一个buffer, 否则就是一个字符串
  let raw = normal.raw; //决定loader的参数是字符串还是Buffer
  return {
    path: loaderAbsPath, //存放着此loader的绝对路径
    normal,
    pitch,
    raw,
    //每个loader都可以携带一个自定义data对象, 可以用来保存和传递数据
    // loader.pitch(, , data){ data.age = 100 }
    // function loader() { this.data.age // 100 }
    data: {}, 
    pitchExecuted: false, //此loader的pitch函数是否已经 执行过
    normalExecuted: false, //此loader的normal函数是否已经执行过
  };
}

/**
 * 
 * @param {*} args 参数 
 * @param {*} raw 布尔值 表示loader想要字符串还是buffer  true -> buffer
 */
function convertArgs(args, raw) {
  if (raw && !Buffer.isBuffer(args[0])) {
    args[0] = Buffer.from(args[0]);   // 转为buffer
  } else if (!raw && Buffer.isBuffer(args[0])) {
    args[0] = args[0].toString("utf8");
  }
}
function iterateNormalLoaders(
  processOptions,
  loaderContext,
  args,
  pitchingCallback
) {
  if (loaderContext.loaderIndex < 0) {
    return pitchingCallback(null, args);
  }
  let currentLoader = loaderContext.loaders[loaderContext.loaderIndex];
  if (currentLoader.normalExecuted) {
    loaderContext.loaderIndex--;
    return iterateNormalLoaders(
      processOptions,
      loaderContext,
      args,
      pitchingCallback
    );
  }
  let fn = currentLoader.normal;
  currentLoader.normalExecuted = true;
  convertArgs(args, currentLoader.raw);

  // returnArgs 同步确实只传了一个,但异步可以传递多个
  runSyncOrAsync(fn, loaderContext, args, (err, ...returnArgs) => {
    if (err) return pitchingCallback(err);
    return iterateNormalLoaders(
      processOptions,
      loaderContext,
      returnArgs,
      pitchingCallback
    );
  });
}
function processResource(processOptions, loaderContext, pitchingCallback) {
  processOptions.readResource(loaderContext.resource, (err, resourceBuffer) => {
    processOptions.resourceBuffer = resourceBuffer;  // 要加载资源的二进制数组 
    loaderContext.loaderIndex--; //定位到最后一个loader
    iterateNormalLoaders(
      processOptions,
      loaderContext,
      [resourceBuffer],
      pitchingCallback
    );
  });
}
function iteratePitchingLoaders(
  processOptions,
  loaderContext,
  pitchingCallback
) {
  //说所有的loader的pitch都已经执行完成
  if (loaderContext.loaderIndex >= loaderContext.loaders.length) {
    return processResource(processOptions, loaderContext, pitchingCallback);
  }
  // 当前索引对应的loader对象
  let currentLoader = loaderContext.loaders[loaderContext.loaderIndex];
  if (currentLoader.pitchExecuted) {
    loaderContext.loaderIndex++; //如果当前的pitch已经执行过了，就可以让当前的索引加1
    return iteratePitchingLoaders(
      processOptions,
      loaderContext,
      pitchingCallback
    );
  }
  // 需要保证一个loader pitch或者normal只走一次
  // 获取当前loader对应的pitch函数
  let fn = currentLoader.pitch;
  currentLoader.pitchExecuted = true; //表示当前的loader的pitch已经处理过
  if (!fn) {
    return iteratePitchingLoaders(
      processOptions,
      loaderContext,
      pitchingCallback
    );
  }

  //以同步或者异步的方式执行fn
  runSyncOrAsync(
    fn,
    loaderContext,
    [
      loaderContext.remainingRequest,
      loaderContext.previousRequest,
      loaderContext.data,
    ],
    // args 同步确实只传了一个,但异步可以传递多个
    (err, ...args) => {
      //loader 的pitch 如果有返回值，索引减少1，并执行前一个loader的normal
      // 有返回值
      if (args.length > 0 && args.some((item) => item)) {
        loaderContext.loaderIndex--; //索引减少1
        iterateNormalLoaders(
          processOptions,
          loaderContext,
          args,
          pitchingCallback
        );
      } else {
        return iteratePitchingLoaders(
          processOptions,
          loaderContext,
          pitchingCallback
        );
      }
    }
  );
}
function runSyncOrAsync(fn, loaderContext, args, runCallback) {
  let isSync = true; //这个是个标志 符，用来标志fn的执行是同步还是异步，默认是同步
  let isDone = false  // 表示当前函数是否已经完成
  loaderContext.callback = (err, ...args) => {
    if(isDone) throw new Error('已经完成, 不可再次调用')
    isDone = true
    runCallback(err, ...args);
  };
  loaderContext.async = () => {
    isSync = false; //从同步改为异步
    return loaderContext.callback;
  };
  //在执行pitch方法的时候 ，this指向loaderContext
  // 此处就会执行 loader 里面的内容, 如果是异步,就会在下面之前 已经 手动执行了callback!!
  let result = fn.apply(loaderContext, args);
  if (isSync) {
    //如果是同步的执行的话，会立刻向下执行下一个loader
    isDone = true
    runCallback(null, result);
  } //如果是异步的话，那就什么都不要做, 需要手动在loader内部触发callback
}


function runLoaders(options, finalCallback) {
  let {
    resource,  // 要处理的资源 (要编译的模块路径)
    loaders = [],  // 处理此路径的loaders
    context = {}, // loader函数在执行的时候this指针
    readResource = fs.readFile,  // 读文件
  } = options; //src\index.js
  // loaders 现在是一个loader模块的绝对路径, 转为一个对象
  let loaderObjects = loaders.map(createLoaderObject);
  let loaderContext = context;  // 这个对象就是loader执行的时候this指针
  loaderContext.resource = resource; //要加载的模块资源
  loaderContext.readResource = readResource; //读取资源的方法
  loaderContext.loaders = loaderObjects; //所有的loader对象数组
  loaderContext.loaderIndex = 0; //当前正在执行的loader索引
  loaderContext.callback = null; //回调  可以手动调用此方法向后执行下一个loader
  loaderContext.async = null; //把loader的执行从同步变成异步运行从同步变为异步, 并返回this.callback
  //所有的loader加上resouce
  Object.defineProperty(loaderContext, "request", {
    get() {
      // 把所有loader的绝对路径和要加载的资源绝对路径用!拼接在一起
      //loader1!loader2!loader3!index.js
      return loaderContext.loaders
        .map((loader) => loader.path)
        .concat(loaderContext.resource)
        .join("!");
    },
  });
  //从当前的loader下一个开始一直到结束 ，加上要加载的资源
  Object.defineProperty(loaderContext, "remainingRequest", {
    get() {
      return loaderContext.loaders
        .slice(loaderContext.loaderIndex + 1)
        .map((loader) => loader.path)
        .concat(loaderContext.resource)
        .join("!");
    },
  });
  //从当前的loader开始一直到结束 ，加上要加载的资源
  Object.defineProperty(loaderContext, "currentRequest", {
    get() {
      return loaderContext.loaders
        .slice(loaderContext.loaderIndex)
        .map((loader) => loader.path)
        .concat(loaderContext.resource)
        .join("!");
    },
  });
  //从第一个到当前的loader的前一个
  Object.defineProperty(loaderContext, "previousRequest", {
    get() {
      return loaderContext.loaders
        .slice(0, loaderContext.loaderIndex)
        .map((loader) => loader.path)
        .join("!");
    },
  });
  Object.defineProperty(loaderContext, "data", {
    get() {
      return loaderContext.loaders[loaderContext.loaderIndex].data;
    },
  });
  console.log(loaderContext.request);
  
  let processOptions = {
    resourceBuffer: null, //将要存放读到的原始文件的原始文件 index.js的内容 Buffer
    readResource,  // 要读取的资源的源代码,是二进制字节数组 buffer
  };
  iteratePitchingLoaders(processOptions, loaderContext, (err, result) => {
    finalCallback(err, {
      result,   // 最终的处理结果, 就是最左侧的loader normal处理的结果返回值
      resourceBuffer: processOptions.resourceBuffer,
    });
  });
}
exports.runLoaders = runLoaders;