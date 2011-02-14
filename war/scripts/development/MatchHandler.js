if (typeof Object.create !== 'function') {
  Object.create = function (o) {
    var F = function () {}
    F.prototype = o;
    return new F();
  }
}

var MatchHandler = {
  foo: 1,
  bar: 2,
}