export default {
  name: 'ElRow',

  componentName: 'ElRow',

  props: {
    // 自定义元素标签
    tag: {
      type: String,
      default: 'div'
    },
    // 栅格间距
    gutter: Number,
    // 布局模式，可选 flex
    type: String,
    // flex 布局下的水平排列方式
    justify: {
      type: String,
      default: 'start'
    },
    // flex 布局下的垂直排列方式
    align: {
      type: String,
      default: 'top'
    }
  },

  computed: {
    style () {
      const ret = {}

      // 如果传入了 gutter
      if (this.gutter) {
        // 向左移动间隔的一半
        ret.marginLeft = `-${this.gutter / 2}px`
        // 向右移动间隔的一半
        ret.marginRight = ret.marginLeft
        //
      }

      return ret
    }
  },

  // 渲染函数
  render (h) {
    return h(
      // 默认渲染的是一个 div
      this.tag,
      {
        // 相当于模板中的 :class
        class: [
          'el-row',
          // 如果 flex 布局不是默认的值，就会加上 .is-justify-
          // 就是加上了 justify-content: flex-end
          this.justify !== 'start' ? `is-justify-${this.justify}` : '',
          this.align !== 'top' ? `is-align-${this.align}` : '',
          // 如果开启了 flex 布局模式，则会加上 .el-row--flex
          // 就是加上了 display: flex
          { 'el-row--flex': this.type === 'flex' }
        ],
        style: this.style
      },
      // 子集虚拟节点
      this.$slots.default
    )
  }
}
