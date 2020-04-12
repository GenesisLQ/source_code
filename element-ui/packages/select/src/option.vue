<template>
  <li
    @mouseenter="hoverItem"
    @click.stop="selectOptionClick"
    class="el-select-dropdown__item"
    v-show="visible"
    :class="{
      'selected': itemSelected,
      'is-disabled': disabled || groupDisabled || limitReached,
      'hover': hover
    }"
  >
    <slot>
      <span>{{ currentLabel }}</span>
    </slot>
  </li>
</template>

<script type="text/babel">
import Emitter from "element-ui/src/mixins/emitter";
import { getValueByPath, escapeRegexpString } from "element-ui/src/utils/util";

export default {
  mixins: [Emitter],

  name: "ElOption",

  componentName: "ElOption",

  inject: ["select"],

  props: {
    value: {
      required: true
    },
    label: [String, Number],
    created: Boolean, // 可创建新的条目
    disabled: {
      type: Boolean,
      default: false
    }
  },

  data() {
    return {
      index: -1,
      groupDisabled: false,
      visible: true,
      hitState: false,
      hover: false
    };
  },

  computed: {
    // 是不是对象类型
    isObject() {
      return (
        Object.prototype.toString.call(this.value).toLowerCase() ===
        "[object object]"
      );
    },

    // 当前列表项显示的文字
    currentLabel() {
      return this.label || (this.isObject ? "" : this.value);
    },

    currentValue() {
      return this.value || this.label || "";
    },

    // 某一项被选中时
    itemSelected() {
      // 如果不是多选就判断当前列表项的值和选中的值是否相等
      // 是多选就要
      if (!this.select.multiple) {
        return this.isEqual(this.value, this.select.value);
      } else {
        return this.contains(this.select.value, this.value);
      }
    },

    limitReached() {
      if (this.select.multiple) {
        return (
          !this.itemSelected &&
          (this.select.value || []).length >= this.select.multipleLimit &&
          this.select.multipleLimit > 0
        );
      } else {
        return false;
      }
    }
  },

  watch: {
    currentLabel() {
      // 触发 select 的 setSelected 方法
      if (!this.created && !this.select.remote)
        this.dispatch("ElSelect", "setSelected");
    },
    value(val, oldVal) {
      const { remote, valueKey } = this.select;
      if (!this.created && !remote) {
        if (
          valueKey &&
          typeof val === "object" &&
          typeof oldVal === "object" &&
          val[valueKey] === oldVal[valueKey]
        ) {
          return;
        }
        this.dispatch("ElSelect", "setSelected");
      }
    }
  },

  methods: {
    // 判断两个参数是否相等
    isEqual(a, b) {
      if (!this.isObject) {
        return a === b;
      } else {
        // 拿到 select 组件实例的 valueKey
        // valueKey 是作为 value 唯一标识的键名，绑定值为对象类型时必填
        const valueKey = this.select.valueKey;
        return getValueByPath(a, valueKey) === getValueByPath(b, valueKey);
      }
    },

    // 判断数组中是否以及包含了目标值
    contains(arr = [], target) {
      if (!this.isObject) {
        return arr && arr.indexOf(target) > -1;
      } else {
        const valueKey = this.select.valueKey;
        return (
          arr &&
          arr.some(item => {
            return (
              getValueByPath(item, valueKey) ===
              getValueByPath(target, valueKey)
            );
          })
        );
      }
    },

    handleGroupDisabled(val) {
      this.groupDisabled = val;
    },

    // 鼠标移动时触发的事件监听方法
    hoverItem() {
      // 如果当前项没有被禁用，就设置 select 组件的 hoverIndex
      // 它的值为当前列表项在 options 数组里的索引
      if (!this.disabled && !this.groupDisabled) {
        this.select.hoverIndex = this.select.options.indexOf(this);
      }
    },

    // 处理列表项的点击事件
    selectOptionClick() {
      if (this.disabled !== true && this.groupDisabled !== true) {
        this.dispatch("ElSelect", "handleOptionClick", [this, true]);
      }
    },

    // 启用搜索功能输入框的文字发生改变时执行
    queryChange(query) {
      // RegExp 的第二个参数为 i 表示区分大小写
      // test() 函数测试一个字符串是否包含某个模式
      // escapeRegexpString 转义正则表达式中特殊的字符串
      // 匹配当前列表项中是否存在输入的字符或者开启了可创建列表项功能
      this.visible =
        new RegExp(escapeRegexpString(query), "i").test(this.currentLabel) ||
        this.created;
      if (!this.visible) {
        // 如果当前这一个列表项不显示，就将 筛选出来的列表项 -1
        this.select.filteredOptionsCount--;
      }
    }
  },

  created() {
    this.select.options.push(this);
    this.select.cachedOptions.push(this);
    this.select.optionsCount++;
    this.select.filteredOptionsCount++;

    this.$on("queryChange", this.queryChange);
    this.$on("handleGroupDisabled", this.handleGroupDisabled);
  },

  beforeDestroy() {
    const { selected, multiple } = this.select;
    let selectedOptions = multiple ? selected : [selected];
    let index = this.select.cachedOptions.indexOf(this);
    let selectedIndex = selectedOptions.indexOf(this);

    // if option is not selected, remove it from cache
    if (index > -1 && selectedIndex < 0) {
      this.select.cachedOptions.splice(index, 1);
    }
    this.select.onOptionDestroy(this.select.options.indexOf(this));
  }
};
</script>
