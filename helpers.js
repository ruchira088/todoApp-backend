module.exports = {
  runAsync: {
    callbacks: error => generator =>
    {
      const callback = (err, data) => err ? error(err) : iterator.next(data)
      const iterator = generator(callback)
      iterator.next()
    },
    promises(generator)
    {
      const iterator = generator()

      function runPromise({value, done})
      {
        if(!done)
        {
          value.then(data => runPromise(iterator.next(data)))
        }
      }

      runPromise(iterator.next())
    }
  }
}

/*

*** Examples ***

const callbackGenerator = function* (callback)
{
  const value_1 = yield fs.readFile(__dirname + "/package.json", "utf8", callback)
  console.log(value_1)

  const value_2 = yield fs.readFile(__dirname + "/helpers.js", "utf8", callback)
  console.log(value_2)
}

// Converting the callback function into returning a promise
function readFile(path)
{
  return new Promise((resolve, reject) => {
    fs.readFile(path, "utf8", (err, data) =>
    {
      if(err)
      {
        reject(err)
      } else
      {
        resolve(data)
      }
    })
  })
}

const promiseGenerator = function* ()
{
  const value_1 = yield readFile(__dirname + "/helpers.js")
  console.log(value_1)

  const value_2 = yield readFile(__dirname + "/package.json")
  console.log(value_2)
}

*/
