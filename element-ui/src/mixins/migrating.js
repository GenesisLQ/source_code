import { kebabCase } from 'element-ui/src/utils/util';
/**
 * Show migrating guide in browser console.
 *
 * Usage:
 * import Migrating from 'element-ui/src/mixins/migrating';
 *
 * mixins: [Migrating]
 *
 * add getMigratingConfig method for your component.
 *  getMigratingConfig() {
 *    return {
 *      props: {
 *        'allow-no-selection': 'allow-no-selection is removed.',
 *        'selection-mode': 'selection-mode is removed.'
 *      },
 *      events: {
 *        selectionchange: 'selectionchange is renamed to selection-change.'
 *      }
 *    };
 *  },
 */
export default {
  // 首先是混入生命周期函数 mounted，该函数会在组件自身 mounted 调用之前调用
  mounted() {
    // 如果是生产环境直接返回，因为在实际上线后是不建议使用 console 的
    if (process.env.NODE_ENV === 'production') return;
    // 如果该组件不是一个虚拟 DOM 节点直接返回，因为你都渲染成真实 DOM 了还警告啥
    if (!this.$vnode) return;
    // 解构赋值了解一下
    const { props = {}, events = {} } = this.getMigratingConfig();
    const { data, componentOptions } = this.$vnode;
    // data 中的属性，不要问为什么是 attrs，自己去看抽象语法树
    const definedProps = data.attrs || {};
    // listeners 包含了组件的事件监听器
    const definedEvents = componentOptions.listeners || {};

    // for/in 循环遍历定义的属性
    for (let propName in definedProps) {
      // 把驼峰命名的属性改为以 - 连接的形式
      propName = kebabCase(propName);
      // 如果在 data 中定义了 props 中的属性，控制台会警告
      if (props[propName]) {
        console.warn(
          `[Element Migrating][${this.$options.name}][Attribute]: ${props[propName]}`
        );
      }
    }
    // 这个不解释了，头大
    for (let eventName in definedEvents) {
      eventName = kebabCase(eventName); // compatible with camel case
      if (events[eventName]) {
        console.warn(
          `[Element Migrating][${this.$options.name}][Event]: ${events[eventName]}`
        );
      }
    }
  },
  methods: {
    getMigratingConfig() {
      return {
        props: {},
        events: {}
      };
    }
  }
};
