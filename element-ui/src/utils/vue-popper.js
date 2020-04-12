import Vue from 'vue';
import {
  PopupManager
} from 'element-ui/src/utils/popup';

const PopperJS = Vue.prototype.$isServer ? function() {} : require('./popper');
const stop = e => e.stopPropagation();

/**
 * @param {HTMLElement} [reference=$refs.reference] - The reference element used to position the popper.
 * @param {HTMLElement} [popper=$refs.popper] - The HTML element used as popper, or a configuration used to generate the popper.
 * @param {String} [placement=button] - Placement of the popper accepted values: top(-start, -end), right(-start, -end), bottom(-start, -end), left(-start, -end)
 * @param {Number} [offset=0] - Amount of pixels the popper will be shifted (can be negative).
 * @param {Boolean} [visible=false] Visibility of the popup element.
 * @param {Boolean} [visible-arrow=false] Visibility of the arrow, no style.
 */
export default {
  props: {
    // CSS 属性，用于设置旋转元素的基点位置
    transformOrigin: {
      type: [Boolean, String],
      default: true
    },
    // 弹出菜单的位置，默认是下拉框的底部
    placement: {
      type: String,
      default: 'bottom'
    },
    boundariesPadding: {
      type: Number,
      default: 5
    },
    // 参照哪个元素进行定位
    reference: {},
    // 用来生成弹出菜单的
    popper: {},
    // 弹出菜单偏移距离
    offset: {
      default: 0
    },
    value: Boolean,
    // 弹出菜单的箭头是否可见
    visibleArrow: Boolean,
    // 箭头偏移距离
    arrowOffset: {
      type: Number,
      default: 35
    },
    // 直接加到 body 节点中
    appendToBody: {
      type: Boolean,
      default: true
    },
    popperOptions: {
      type: Object,
      default() {
        return {
          gpuAcceleration: false
        };
      }
    }
  },

  data() {
    return {
      showPopper: false,
      currentPlacement: ''
    };
  },

  watch: {
    value: {
      immediate: true,
      handler(val) {
        this.showPopper = val;
        this.$emit('input', val);
      }
    },

    // 是否显示弹出菜单
    showPopper(val) {
      if (this.disabled) return;
      val ? this.updatePopper() : this.destroyPopper();
      this.$emit('input', val);
    }
  },

  methods: {
    createPopper() {
      if (this.$isServer) return;
      // 当前弹出菜单位置
      this.currentPlacement = this.currentPlacement || this.placement;
      // 正则判断当前位置是否包含正确字符串
      if (!/^(top|bottom|left|right)(-start|-end)?$/g.test(this.currentPlacement)) {
        return;
      }

      const options = this.popperOptions;
      // 拿到弹出菜单元素
      // 往实例和方法内同时添加属性这种写法值得参考一下
      const popper = this.popperElm = this.popperElm || this.popper || this.$refs.popper;
      // 拿到参照元素
      let reference = this.referenceElm = this.referenceElm || this.reference || this.$refs.reference;

      if (!reference &&
        this.$slots.reference &&
        this.$slots.reference[0]) {
        reference = this.referenceElm = this.$slots.reference[0].elm;
      }

      // 如果参照元素或者弹出框元素不存在的话就返回
      if (!popper || !reference) return;
      // 如果显示箭头就参照弹出框添加箭头
      if (this.visibleArrow) this.appendArrow(popper);
      // 向 body 节点上添加弹出框
      if (this.appendToBody) document.body.appendChild(this.popperElm);
      if (this.popperJS && this.popperJS.destroy) {
        this.popperJS.destroy();
      }

      options.placement = this.currentPlacement;
      options.offset = this.offset;
      options.arrowOffset = this.arrowOffset;
      this.popperJS = new PopperJS(reference, popper, options);
      this.popperJS.onCreate(_ => {
        this.$emit('created', this);
        this.resetTransformOrigin();
        this.$nextTick(this.updatePopper);
      });
      if (typeof options.onUpdate === 'function') {
        this.popperJS.onUpdate(options.onUpdate);
      }
      this.popperJS._popper.style.zIndex = PopupManager.nextZIndex();
      this.popperElm.addEventListener('click', stop);
    },

    updatePopper() {
      const popperJS = this.popperJS;
      if (popperJS) {
        popperJS.update();
        if (popperJS._popper) {
          popperJS._popper.style.zIndex = PopupManager.nextZIndex();
        }
      } else {
        this.createPopper();
      }
    },

    // 销毁 popperJS
    doDestroy(forceDestroy) {
      /* istanbul ignore if */
      if (!this.popperJS || (this.showPopper && !forceDestroy)) return;
      this.popperJS.destroy();
      this.popperJS = null;
    },

    destroyPopper() {
      if (this.popperJS) {
        this.resetTransformOrigin();
      }
    },

    // 重新设置基点位置
    resetTransformOrigin() {
      if (!this.transformOrigin) return;
      let placementMap = {
        top: 'bottom',
        bottom: 'top',
        left: 'right',
        right: 'left'
      };
      let placement = this.popperJS._popper.getAttribute('x-placement').split('-')[0];
      let origin = placementMap[placement];
      this.popperJS._popper.style.transformOrigin = typeof this.transformOrigin === 'string'
        ? this.transformOrigin
        : ['top', 'bottom'].indexOf(placement) > -1
          ? `center ${ origin }`
          : `${ origin } center`;
    },

    // 向指定元素上添加箭头
    appendArrow(element) {
      let hash;
      // 为 true 表示已经添加过了
      if (this.appended) {
        return;
      }
      this.appended = true;

      // 遍历元素的属性，如果有 _v- 开头的属性就保存起来当作一个属性名
      // attributes 原生属性，获取元素的所有属性，返回一个类数组（NamedNodeMap）
      // 如 class、style 等
      // name 用于获取属性名
      for (let item in element.attributes) {
        if (/^_v-/.test(element.attributes[item].name)) {
          hash = element.attributes[item].name;
          break;
        }
      }

      const arrow = document.createElement('div');

      if (hash) {
        arrow.setAttribute(hash, '');
      }
      arrow.setAttribute('x-arrow', '');
      arrow.className = 'popper__arrow';
      element.appendChild(arrow);
    }
  },

  // 生命周期钩子
  // 在组件销毁之前执行
  beforeDestroy() {
    this.doDestroy(true);
    // 从 body 节点中移除
    if (this.popperElm && this.popperElm.parentNode === document.body) {
      this.popperElm.removeEventListener('click', stop);
      document.body.removeChild(this.popperElm);
    }
  },

  // call destroy in keep-alive mode
  deactivated() {
    this.$options.beforeDestroy[0].call(this);
  }
};
