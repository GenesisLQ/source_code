/**
 * 广播，就是父组件向后代组件广播事件
 * 通过不断递归子组件，触发所需组件的对应事件
 * @param {*} componentName 目标组件名称
 * @param {*} eventName 要触发的事件名
 * @param {*} params 参数
 */
function broadcast(componentName, eventName, params) {
  // 遍历当前组件实例的所有子组件
  this.$children.forEach((child) => {
    // 拿到子组件名称
    var name = child.$options.componentName;
    // 如果当前子组件就是目标组件
    if (name === componentName) {
      // 通知子组件触发对应事件
      child.$emit.apply(child, [eventName].concat(params));
    } else {
      // 递归遍历深层子组件
      broadcast.apply(child, [componentName, eventName].concat([params]));
    }
  });
}
export default {
  methods: {
    // 派发，就是子组件向父组件派发事件
    dispatch(componentName, eventName, params) {
      // 获取当前组件的父组件
      var parent = this.$parent || this.$root;
      // 拿到父组件名称
      var name = parent.$options.componentName;
      // 通过循环的方式不断向父组件查找目标组件
      while (parent && (!name || name !== componentName)) {
        parent = parent.$parent;
        if (parent) {
          name = parent.$options.componentName;
        }
      }
      // 当循环结束，证明目标父组件已找到（如果存在），就通知父组件触发相应事件
      if (parent) {
        parent.$emit.apply(parent, [eventName].concat(params));
      }
    },
    broadcast(componentName, eventName, params) {
      // 把 this 指向调用它的组件实例身上
      broadcast.call(this, componentName, eventName, params);
    }
  }
};
