<template>
  <label
    class="el-radio"
    :class="[
      border && radioSize ? 'el-radio--' + radioSize : '',
      { 'is-disabled': isDisabled },
      { 'is-focus': focus },
      { 'is-bordered': border },
      { 'is-checked': model === label }
    ]"
    role="radio"
    :aria-checked="model === label"
    :aria-disabled="isDisabled"
    :tabindex="tabIndex"
    @keydown.space.stop.prevent="model = isDisabled ? model : label"
  >
    <span
      class="el-radio__input"
      :class="{
        'is-disabled': isDisabled,
        'is-checked': model === label
      }"
    >
      <span class="el-radio__inner"></span>
      <input
        ref="radio"
        class="el-radio__original"
        :value="label"
        type="radio"
        aria-hidden="true"
        v-model="model"
        @focus="focus = true"
        @blur="focus = false"
        @change="handleChange"
        :name="name"
        :disabled="isDisabled"
        tabindex="-1"
      />
    </span>
    <span class="el-radio__label" @keydown.stop>
      <slot></slot>
      <template v-if="!$slots.default">{{ label }}</template>
    </span>
  </label>
</template>
<script>
import Emitter from 'element-ui/src/mixins/emitter'

export default {
  name: 'ElRadio',

  mixins: [Emitter],

  inject: {
    elForm: {
      default: ''
    },

    elFormItem: {
      default: ''
    }
  },

  componentName: 'ElRadio',

  props: {
    // 响应式数据
    value: {},
    // 原生 value
    label: {},
    disabled: Boolean,
    name: String,
    // 是否显示边框
    border: Boolean,
    size: String
  },

  data () {
    return {
      focus: false
    }
  },
  // 计算属性
  computed: {
    // 判断 radio 标签是否在按钮组里
    isGroup () {
      let parent = this.$parent
      while (parent) {
        if (parent.$options.componentName !== 'ElRadioGroup') {
          parent = parent.$parent
        } else {
          // 将按钮组添加到当前组件实例的 _radioGroup 属性上
          // 并结束循环
          this._radioGroup = parent
          return true
        }
      }
      return false
    },

    // 通过计算得到 radio 组件数据双向绑定的值
    model: {
      get () {
        // 如果在一个单选按钮组里就是按钮组的值
        return this.isGroup ? this._radioGroup.value : this.value
      },
      set (val) {
        // 如果是 radio 包裹在按钮组里，那么 model 的改变就需要触发父组件的 input 事件
        if (this.isGroup) {
          this.dispatch('ElRadioGroup', 'input', [val])
        } else {
          this.$emit('input', val)
        }
        // 如果当前的 model 等于组件的 label 就表示当前这个按钮被选中了
        this.$refs.radio &&
          (this.$refs.radio.checked = this.model === this.label)
      }
    },
    _elFormItemSize () {
      return (this.elFormItem || {}).elFormItemSize
    },
    radioSize () {
      const temRadioSize =
        this.size || this._elFormItemSize || (this.$ELEMENT || {}).size
      return this.isGroup
        ? this._radioGroup.radioGroupSize || temRadioSize
        : temRadioSize
    },
    isDisabled () {
      return this.isGroup
        ? this._radioGroup.disabled ||
            this.disabled ||
            (this.elForm || {}).disabled
        : this.disabled || (this.elForm || {}).disabled
    },
    tabIndex () {
      return this.isDisabled || (this.isGroup && this.model !== this.label)
        ? -1
        : 0
    }
  },

  methods: {
    handleChange () {
      // 这里不太清楚为什么使用 nextTick() 
      this.$nextTick(() => {
        this.$emit('change', this.model)
        this.isGroup &&
          this.dispatch('ElRadioGroup', 'handleChange', this.model)
      })
    }
  }
}
</script>
