export function findCommon<T>(arrays: T[][]): T[] {
  if (arrays.length == 0) {
    return []
  }

  var result: T[] = [];
  var array = arrays.length - 1;
  for (var i = array; i > 0; i--) {
    if (arrays[i].length < arrays[array].length) array = i;
  }
  for (var i = arrays[array].length - 1; i >= 0; i--) {
    var j = arrays.length - 1;
    for (; j > 0; j--) {
      if (arrays[j].indexOf(arrays[array][i]) < 0) break;
    }
    if (j == 0) result.push(arrays[array][i]);
  }
  return result;
}
