/**
 * 合并对象的属性，相当于 ES6 的 Object.assign()
 * 是浅拷贝，注意引用类型
 * @param {*} target 目标对象
 */
export default function(target) {
  // 从第二个实参开始遍历
  for (let i = 1, j = arguments.length; i < j; i++) {
    // 把拿到的实参当作源对象
    let source = arguments[i] || {};
    // 遍历源对象身上的属性
    for (let prop in source) {
      // 必须保证是源对象自身的属性
      if (source.hasOwnProperty(prop)) {
        // 如果这个属性值不是 undefined 就把它添加到目标对象中
        // 注意，同名属性会覆盖
        let value = source[prop];
        if (value !== undefined) {
          target[prop] = value;
        }
      }
    }
  }
  return target;
}
