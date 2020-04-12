<template>
  <div
    class="el-select-dropdown el-popper"
    :class="[{ 'is-multiple': $parent.multiple }, popperClass]"
    :style="{ minWidth: minWidth }"
  >
    <slot></slot>
  </div>
</template>

<script type="text/babel">
import Popper from 'element-ui/src/utils/vue-popper';

export default {
  name: 'ElSelectDropdown',

  componentName: 'ElSelectDropdown',

  mixins: [Popper],

  props: {
    // 显示的位置
    placement: {
      default: 'bottom-start'
    },
    // 边界的 padding 值
    boundariesPadding: {
      default: 0
    },
    // 配置项
    popperOptions: {
      default() {
        return {
          gpuAcceleration: false
        };
      }
    },
    // 箭头是否可见
    visibleArrow: {
      default: true
    },
    // 是否添加到 body 节点中
    appendToBody: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      minWidth: ''
    };
  },

  computed: {
    // 拿到父组件的 popperClass
    popperClass () {
      return this.$parent.popperClass;
    }
  },

  watch: {
    // 监听父组件的 inputWidth
    '$parent.inputWidth' () {
      // getBoundingClientRect 用于获取某个元素相对于视窗的位置集合
      // 返回一个对象，包括 top, lef, right, bottom, width, height 六个属性
      // 参考 https://blog.csdn.net/gao_xu_520/article/details/80365799
      this.minWidth = this.$parent.$el.getBoundingClientRect().width + 'px'
    }
  },

  mounted () {
    // 父组件的 reference 是 el-input
    // 这里获取 el-input 组件的 DOM 元素
    this.referenceElm = this.$parent.$refs.reference.$el
    // 拿到当前组件的 DOM 元素赋值给父组件的 popperElm 属性
    this.$parent.popperElm = this.popperElm = this.$el
    // 监听当前组件的自定义事件
    this.$on('updatePopper', () => {
      if (this.$parent.visible) this.updatePopper()
    })
    this.$on('destroyPopper', this.destroyPopper)
  }
}
</script>
