// reference https://github.com/noeldelgado/gemini-scrollbar/blob/master/index.js

import {
  addResizeListener,
  removeResizeListener
} from 'element-ui/src/utils/resize-event';
import scrollbarWidth from 'element-ui/src/utils/scrollbar-width';
import { toObject } from 'element-ui/src/utils/util';
import Bar from './bar';

/* istanbul ignore next */
export default {
  name: 'ElScrollbar',

  components: { Bar },

  props: {
    native: Boolean,
    wrapStyle: {},
    wrapClass: {},
    viewClass: {},
    viewStyle: {},
    // 这个属性是禁止框架调整大小
    noresize: Boolean, // 如果 container 尺寸不会发生变化，最好设置它可以优化性能
    tag: {
      type: String,
      default: 'div'
    }
  },

  data() {
    return {
      sizeWidth: '0',
      sizeHeight: '0',
      moveX: 0,
      moveY: 0
    };
  },

  computed: {
    wrap() {
      return this.$refs.wrap;
    }
  },

  render(h) {
    // 获取系统自带的滚动条的宽度
    let gutter = scrollbarWidth();
    let style = this.wrapStyle;

    // 如果滚动条存在
    if (gutter) {
      const gutterWith = `-${gutter}px`;
      const gutterStyle = `margin-bottom: ${gutterWith}; margin-right: ${gutterWith};`;

      if (Array.isArray(this.wrapStyle)) {
        style = toObject(this.wrapStyle);
        style.marginRight = style.marginBottom = gutterWith;
      } else if (typeof this.wrapStyle === 'string') {
        style += gutterStyle;
      } else {
        style = gutterStyle;
      }
    }

    // 这是最外层的 ul
    const view = h(
      this.tag,
      {
        class: ['el-scrollbar__view', this.viewClass],
        style: this.viewStyle,
        ref: 'resize'
      },
      // 子虚拟节点数组
      this.$slots.default
    );
    // ul 外层包裹的 div
    const wrap = (
      <div
        ref='wrap'
        style={style}
        onScroll={this.handleScroll}
        class={[
          this.wrapClass,
          'el-scrollbar__wrap',
          gutter ? '' : 'el-scrollbar__wrap--hidden-default'
        ]}
      >
        {[view]}
      </div>
    );
    let nodes;

    // 是否使用元素滚动条，默认是 false
    // 使用自定义的 Bar 组件
    if (!this.native) {
      nodes = [
        wrap,
        <Bar move={this.moveX} size={this.sizeWidth}></Bar>,
        <Bar vertical move={this.moveY} size={this.sizeHeight}></Bar>
      ];
    } else {
      nodes = [
        <div
          ref='wrap'
          class={[this.wrapClass, 'el-scrollbar__wrap']}
          style={style}
        >
          {[view]}
        </div>
      ];
    }
    return h('div', { class: 'el-scrollbar' }, nodes);
  },

  methods: {
    // onscroll 事件处理函数
    handleScroll() {
      const wrap = this.wrap;

      // 计算出滚动条需要滚动的距离（百分比）
      this.moveY = (wrap.scrollTop * 100) / wrap.clientHeight;
      this.moveX = (wrap.scrollLeft * 100) / wrap.clientWidth;
    },

    // 当触发 resize 事件时，改变滚动条的大小
    update() {
      // 宽高百分比
      let heightPercentage, widthPercentage;
      const wrap = this.wrap;
      if (!wrap) return;

      // 求出可视区域占内容总大小的百分比，这就是滚动条相对于内容的百分比
      heightPercentage = (wrap.clientHeight * 100) / wrap.scrollHeight;
      widthPercentage = (wrap.clientWidth * 100) / wrap.scrollWidth;

      // 滚动条的宽/高
      // 如果可视区域比内容总大小要小，证明需要滚动，把百分比赋值给 sizeXXX
      // 如果不需要滚动 clientHeight = scrollHeight
      this.sizeHeight = heightPercentage < 100 ? heightPercentage + '%' : '';
      this.sizeWidth = widthPercentage < 100 ? widthPercentage + '%' : '';
    }
  },

  mounted() {
    if (this.native) return;
    // update 需要用到更新后的 DOM，所以放在 $nextTick 里
    this.$nextTick(this.update);
    // 如果可以调整框架的大小，就给元素添加一个 resize 监听事件
    !this.noresize && addResizeListener(this.$refs.resize, this.update);
  },

  beforeDestroy() {
    if (this.native) return;
    // 移除元素的 resize 监听事件
    !this.noresize && removeResizeListener(this.$refs.resize, this.update);
  }
};
