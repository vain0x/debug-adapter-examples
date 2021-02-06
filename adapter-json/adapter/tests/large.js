// node tests/large.js >tests/large.json

const jsonText = JSON.stringify({
  largeArray: [...new Array(10000).keys()]
})

console.log(jsonText)
