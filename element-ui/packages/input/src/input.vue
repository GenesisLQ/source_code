<template>
  <div
    :class="[
      type === 'textarea' ? 'el-textarea' : 'el-input',
      inputSize ? 'el-input--' + inputSize : '',
      {
        'is-disabled': inputDisabled,
        'is-exceed': inputExceed,
        'el-input-group': $slots.prepend || $slots.append,
        'el-input-group--append': $slots.append,
        'el-input-group--prepend': $slots.prepend,
        'el-input--prefix': $slots.prefix || prefixIcon,
        'el-input--suffix':
          $slots.suffix || suffixIcon || clearable || showPassword
      }
    ]"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <!-- 非多行文本框 -->
    <template v-if="type !== 'textarea'">
      <!-- 前置元素 -->
      <!-- 如果传递了 prepend 插槽就显示，并把传进来的模板或者字符串渲染到 slot 中 -->
      <div class="el-input-group__prepend" v-if="$slots.prepend">
        <slot name="prepend"></slot>
      </div>
      <input
        :tabindex="tabindex"
        v-if="type !== 'textarea'"
        class="el-input__inner"
        v-bind="$attrs"
        :type="showPassword ? (passwordVisible ? 'text' : 'password') : type"
        :disabled="inputDisabled"
        :readonly="readonly"
        :autocomplete="autoComplete || autocomplete"
        ref="input"
        @compositionstart="handleCompositionStart"
        @compositionupdate="handleCompositionUpdate"
        @compositionend="handleCompositionEnd"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @change="handleChange"
        :aria-label="label"
      />
      <!-- 前置内容 -->
      <!-- 支持通过 slot 和 prefi-icon 传值 -->
      <span class="el-input__prefix" v-if="$slots.prefix || prefixIcon">
        <!-- 当没有传递插槽时，这个是不会渲染的 -->
        <slot name="prefix"></slot>
        <i class="el-input__icon" v-if="prefixIcon" :class="prefixIcon"> </i>
      </span>
      <!-- 后置内容 -->
      <span class="el-input__suffix" v-if="getSuffixVisible()">
        <span class="el-input__suffix-inner">
          <!-- 该模板渲染的是后置图标 -->
          <template v-if="!showClear || !showPwdVisible || !isWordLimitVisible">
            <slot name="suffix"></slot>
            <i class="el-input__icon" v-if="suffixIcon" :class="suffixIcon">
            </i>
          </template>
          <!-- 清空按钮 -->
          <i
            v-if="showClear"
            class="el-input__icon el-icon-circle-close el-input__clear"
            @mousedown.prevent
            @click="clear"
          ></i>
          <!-- 显示密码按钮 -->
          <i
            v-if="showPwdVisible"
            class="el-input__icon el-icon-view el-input__clear"
            @click="handlePasswordVisible"
          ></i>
          <!-- 输入长度限制 -->
          <span v-if="isWordLimitVisible" class="el-input__count">
            <span class="el-input__count-inner">
              {{ textLength }}/{{ upperLimit }}
            </span>
          </span>
        </span>
        <i
          class="el-input__icon"
          v-if="validateState"
          :class="['el-input__validateIcon', validateIcon]"
        >
        </i>
      </span>
      <!-- 后置元素 -->
      <div class="el-input-group__append" v-if="$slots.append">
        <slot name="append"></slot>
      </div>
    </template>
    <textarea
      v-else
      :tabindex="tabindex"
      class="el-textarea__inner"
      @compositionstart="handleCompositionStart"
      @compositionupdate="handleCompositionUpdate"
      @compositionend="handleCompositionEnd"
      @input="handleInput"
      ref="textarea"
      v-bind="$attrs"
      :disabled="inputDisabled"
      :readonly="readonly"
      :autocomplete="autoComplete || autocomplete"
      :style="textareaStyle"
      @focus="handleFocus"
      @blur="handleBlur"
      @change="handleChange"
      :aria-label="label"
    >
    </textarea>
    <!-- 输入长度限制 -->
    <span
      v-if="isWordLimitVisible && type === 'textarea'"
      class="el-input__count"
      >{{ textLength }}/{{ upperLimit }}</span
    >
  </div>
</template>
<script>
import emitter from 'element-ui/src/mixins/emitter'
import Migrating from 'element-ui/src/mixins/migrating'
import calcTextareaHeight from './calcTextareaHeight'
import merge from 'element-ui/src/utils/merge'
import { isKorean } from 'element-ui/src/utils/shared'

export default {
  name: 'ElInput',

  componentName: 'ElInput',

  mixins: [emitter, Migrating],

  // 不渲染没有通过 props 传递的属性
  inheritAttrs: false,

  // 依赖注入
  inject: {
    elForm: {
      default: ''
    },
    elFormItem: {
      default: ''
    }
  },

  data () {
    return {
      textareaCalcStyle: {},
      hovering: false,
      focused: false,
      isComposing: false,
      passwordVisible: false
    }
  },

  props: {
    value: [String, Number],
    size: String,
    resize: String,
    form: String,
    disabled: Boolean,
    readonly: Boolean,
    type: {
      type: String,
      default: 'text'
    },
    autosize: {
      type: [Boolean, Object],
      default: false
    },
    autocomplete: {
      type: String,
      default: 'off'
    },
    /** @Deprecated in next major version */
    autoComplete: {
      type: String,
      validator (val) {
        process.env.NODE_ENV !== 'production' &&
          console.warn(
            "[Element Warn][Input]'auto-complete' property will be deprecated in next major version. please use 'autocomplete' instead."
          )
        return true
      }
    },
    validateEvent: {
      type: Boolean,
      default: true
    },
    suffixIcon: String,
    prefixIcon: String,
    label: String,
    clearable: {
      type: Boolean,
      default: false
    },
    showPassword: {
      type: Boolean,
      default: false
    },
    showWordLimit: {
      type: Boolean,
      default: false
    },
    tabindex: String
  },

  computed: {
    _elFormItemSize () {
      return (this.elFormItem || {}).elFormItemSize
    },
    validateState () {
      return this.elFormItem ? this.elFormItem.validateState : ''
    },
    needStatusIcon () {
      return this.elForm ? this.elForm.statusIcon : false
    },
    validateIcon () {
      return {
        validating: 'el-icon-loading',
        success: 'el-icon-circle-check',
        error: 'el-icon-circle-close'
      }[this.validateState]
    },
    textareaStyle () {
      return merge({}, this.textareaCalcStyle, { resize: this.resize })
    },
    inputSize () {
      return this.size || this._elFormItemSize || (this.$ELEMENT || {}).size
    },
    inputDisabled () {
      return this.disabled || (this.elForm || {}).disabled
    },
    nativeInputValue () {
      return this.value === null || this.value === undefined
        ? ''
        : String(this.value)
    },
    showClear () {
      return (
        this.clearable &&
        !this.inputDisabled &&
        !this.readonly &&
        this.nativeInputValue &&
        (this.focused || this.hovering)
      )
    },
    showPwdVisible () {
      return (
        this.showPassword &&
        !this.inputDisabled &&
        !this.readonly &&
        (!!this.nativeInputValue || this.focused)
      )
    },
    isWordLimitVisible () {
      return (
        this.showWordLimit &&
        this.$attrs.maxlength &&
        (this.type === 'text' || this.type === 'textarea') &&
        !this.inputDisabled &&
        !this.readonly &&
        !this.showPassword
      )
    },
    upperLimit () {
      return this.$attrs.maxlength
    },
    textLength () {
      if (typeof this.value === 'number') {
        return String(this.value).length
      }

      return (this.value || '').length
    },
    inputExceed () {
      // show exceed style if length of initial value greater then maxlength
      return this.isWordLimitVisible && this.textLength > this.upperLimit
    }
  },

  watch: {
    // 监听 value 的变化
    value (val) {
      // 当 value 变化了需要重新改变文本域的大小
      // 这个属于 DOM 操作，所以放在 $nextTick() 中
      this.$nextTick(this.resizeTextarea)
      // 如果需要校验，那就要通知父组件触发 change 方法
      if (this.validateEvent) {
        this.dispatch('ElFormItem', 'el.form.change', [val])
      }
    },
    // sorry
    nativeInputValue () {
      this.setNativeInputValue()
    },
    // 监听 type 的变化，type 为 input 或者 textarea
    type () {
      // 同样当 type 变化时，DOM 也会发生变化
      this.$nextTick(() => {
        this.setNativeInputValue()
        this.resizeTextarea()
        this.updateIconOffset()
      })
    }
  },

  methods: {
    // 获取 input 组件的实例
    getInput () {
      return this.$refs.input || this.$refs.textarea
    },
    // =========================================

    // input 的方法
    // 使 input 获取焦点
    focus () {
      this.getInput().focus()
    },
    blur () {
      this.getInput().blur()
    },
    select () {
      this.getInput().select()
    },
    // ==========================================

    // 配置相关 API 不可用警告
    getMigratingConfig () {
      return {
        props: {
          icon: 'icon is removed, use suffix-icon / prefix-icon instead.',
          'on-icon-click': 'on-icon-click is removed.'
        },
        events: {
          click: 'click is removed.'
        }
      }
    },
    // 改变文本域的大小
    resizeTextarea () {
      // 如果是运行在服务端则返回
      if (this.$isServer) return
      const { autosize, type } = this
      if (type !== 'textarea') return
      // 如果没有打开自适应高度默认就是单行文本的高度
      if (!autosize) {
        this.textareaCalcStyle = {
          minHeight: calcTextareaHeight(this.$refs.textarea).minHeight
        }
        return
      }
      const minRows = autosize.minRows
      const maxRows = autosize.maxRows

      // 当传入的是布尔值时，maxRows 就是 null，即没有最大高度限制
      // 传入对象时，就会出现最小高度和最大高度
      this.textareaCalcStyle = calcTextareaHeight(
        this.$refs.textarea,
        minRows,
        maxRows
      )
    },
    // ==========================================

    // input 事件,处理子组件定义的 focus 方法
    // input 获得焦点时触发该事件
    handleFocus (event) {
      this.focused = true
      this.$emit('focus', event)
    },
    handleBlur (event) {
      this.focused = false
      this.$emit('blur', event)
      // 失去焦点是校验
      if (this.validateEvent) {
        this.dispatch('ElFormItem', 'el.form.blur', [this.value])
      }
    },
    handleInput (event) {
      // should not emit input during composition
      // see: https://github.com/ElemeFE/element/issues/10516
      // 如果正在输入就不触发 input 事件
      if (this.isComposing) return
      // hack for https://github.com/ElemeFE/element/issues/8548
      // should remove the following line when we don't support IE
      // 没懂这个 nativeInputValue 是啥意思
      if (event.target.value === this.nativeInputValue) return

      // 通知父组件触发 input 方法
      this.$emit('input', event.target.value)
      // ensure native input value is controlled
      // see: https://github.com/ElemeFE/element/issues/12850
      this.$nextTick(this.setNativeInputValue)
    },
    handleChange (event) {
      this.$emit('change', event.target.value)
    },
    handleCompositionStart () {
      // 正在输入
      this.isComposing = true
    },
    handleCompositionUpdate (event) {
      // 获取敲击键盘的值
      const text = event.target.value
      // 获取最后一个输入的字符
      const lastCharacter = text[text.length - 1] || ''
      // 这个和韩文有关，暂时没搞清楚是啥意思
      this.isComposing = !isKorean(lastCharacter)
    },
    handleCompositionEnd (event) {
      // 如果输入结束并选择了字词，就触发 input 事件
      if (this.isComposing) {
        this.isComposing = false
        this.handleInput(event)
      }
    },
    // ==========================================

    // 处理清空逻辑
    clear () {
      this.$emit('input', '')
      this.$emit('change', '')
      this.$emit('clear')
    },
    // 显示或者隐藏密码
    handlePasswordVisible () {
      this.passwordVisible = !this.passwordVisible
      this.focus()
    },
    // 后置内容是否可见
    getSuffixVisible () {
      return (
        this.$slots.suffix ||
        this.suffixIcon ||
        this.showClear ||
        this.showPassword ||
        this.isWordLimitVisible ||
        (this.validateState && this.needStatusIcon)
      )
    },
    // ===========================================

    // 计算图标的横向偏移量
    calcIconOffset (place) {
      // 找到 class 为 .el-input__suffix 和 .el-input__prefix 的元素
      // 并把他们转换为数组
      let elList = [].slice.call(
        this.$el.querySelectorAll(`.el-input__${place}`) || []
      )
      if (!elList.length) return
      let el = null
      // 通过循环判断 .el-input__suffix/prefix 是否是 input 的直接子元素
      for (let i = 0; i < elList.length; i++) {
        // $el 表示当前组件的根元素
        // $root 表示组件树的根元素
        // 如果本次循环的 DOM 元素的父元素就是当前实例的根元素，把它赋给 el
        if (elList[i].parentNode === this.$el) {
          el = elList[i]
          break
        }
      }
      if (!el) return
      // 此时 el 应该是 .el-input__suffix/prefix 元素
      // 定义前缀后缀
      const pendantMap = {
        suffix: 'append',
        prefix: 'prepend'
      }

      const pendant = pendantMap[place]
      // pendant: append/prepend
      // 如果在组件中添加了前置或后置元素
      if (this.$slots[pendant]) {
        // 设置 .el-input__suffix/prefix 元素的行内样式
        // 如果是后置元素，那平移的距离就是负的（向左）
        // 平移的距离就是前置或后置元素的宽度
        el.style.transform = `translateX(${place === 'suffix' ? '-' : ''}${
          this.$el.querySelector(`.el-input-group__${pendant}`).offsetWidth
        }px)`
      } else {
        el.removeAttribute('style')
      }
    },
    // 更新图标偏移量
    updateIconOffset () {
      this.calcIconOffset('prefix')
      this.calcIconOffset('suffix')
    },
    // ==============================================

    // TODO: 不明白
    setNativeInputValue () {
      const input = this.getInput()
      if (!input) return
      if (input.value === this.nativeInputValue) return
      input.value = this.nativeInputValue
    }
  },

  created () {
    this.$on('inputSelect', this.select)
  },
  mounted () {
    this.setNativeInputValue()
    this.resizeTextarea()
    this.updateIconOffset()
  },
  updated () {
    // 只要 data 中的数据更新了就会触发这个钩子函数
    this.$nextTick(this.updateIconOffset)
  }
}
</script>
