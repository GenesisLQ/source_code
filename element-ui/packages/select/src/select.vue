<template>
  <div
    class="el-select"
    :class="[selectSize ? 'el-select--' + selectSize : '']"
    @click.stop="toggleMenu"
    v-clickoutside="handleClose"
  >
    <!-- 显示 tags -->
    <div
      class="el-select__tags"
      v-if="multiple"
      ref="tags"
      :style="{ 'max-width': inputWidth - 32 + 'px', width: '100%' }"
    >
      <span v-if="collapseTags && selected.length">
        <el-tag
          :closable="!selectDisabled"
          :size="collapseTagSize"
          :hit="selected[0].hitState"
          type="info"
          @close="deleteTag($event, selected[0])"
          disable-transitions
        >
          <!-- currentLabel 是当前列表项显示的文字 -->
          <span class="el-select__tags-text">{{ selected[0].currentLabel }}</span>
        </el-tag>
        <el-tag
          v-if="selected.length > 1"
          :closable="false"
          :size="collapseTagSize"
          type="info"
          disable-transitions
        >
          <span class="el-select__tags-text">+ {{ selected.length - 1 }}</span>
        </el-tag>
      </span>
      <transition-group @after-leave="resetInputHeight" v-if="!collapseTags">
        <el-tag
          v-for="item in selected"
          :key="getValueKey(item)"
          :closable="!selectDisabled"
          :size="collapseTagSize"
          :hit="item.hitState"
          type="info"
          @close="deleteTag($event, item)"
          disable-transitions
        >
          <span class="el-select__tags-text">{{ item.currentLabel }}</span>
        </el-tag>
      </transition-group>

      <input
        ref="input"
        type="text"
        class="el-select__input"
        :class="[selectSize ? `is-${selectSize}` : '']"
        :disabled="selectDisabled"
        :autocomplete="autoComplete || autocomplete"
        @focus="handleFocus"
        @blur="softFocus = false"
        @keyup="managePlaceholder"
        @keydown="resetInputState"
        @keydown.down.prevent="navigateOptions('next')"
        @keydown.up.prevent="navigateOptions('prev')"
        @keydown.enter.prevent="selectOption"
        @keydown.esc.stop.prevent="visible = false"
        @keydown.delete="deletePrevTag"
        @keydown.tab="visible = false"
        @compositionstart="handleComposition"
        @compositionupdate="handleComposition"
        @compositionend="handleComposition"
        v-model="query"
        @input="debouncedQueryChange"
        v-if="filterable"
        :style="{
          'flex-grow': '1',
          width: inputLength / (inputWidth - 32) + '%',
          'max-width': inputWidth - 42 + 'px'
        }"
      />
      <!-- 32 是下拉框箭头的宽度 -->
    </div>
    <!-- el-input 只是用来展示选中的选项文字 -->
    <el-input
      ref="reference"
      v-model="selectedLabel"
      type="text"
      :placeholder="currentPlaceholder"
      :name="name"
      :id="id"
      :autocomplete="autoComplete || autocomplete"
      :size="selectSize"
      :disabled="selectDisabled"
      :readonly="readonly"
      :validate-event="false"
      :class="{ 'is-focus': visible }"
      :tabindex="multiple && filterable ? '-1' : null"
      @focus="handleFocus"
      @blur="handleBlur"
      @keyup.native="debouncedOnInputChange"
      @keydown.native.down.stop.prevent="navigateOptions('next')"
      @keydown.native.up.stop.prevent="navigateOptions('prev')"
      @keydown.native.enter.prevent="selectOption"
      @keydown.native.esc.stop.prevent="visible = false"
      @keydown.native.tab="visible = false"
      @paste.native="debouncedOnInputChange"
      @mouseenter.native="inputHovering = true"
      @mouseleave.native="inputHovering = false"
    >
      <template slot="prefix" v-if="$slots.prefix">
        <slot name="prefix"></slot>
      </template>
      <template slot="suffix">
        <i
          v-show="!showClose"
          :class="[
            'el-select__caret',
            'el-input__icon',
            'el-icon-' + iconClass
          ]"
        ></i>
        <i
          v-if="showClose"
          class="el-select__caret el-input__icon el-icon-circle-close"
          @click="handleClearClick"
        ></i>
      </template>
    </el-input>
    <transition name="el-zoom-in-top" @before-enter="handleMenuEnter" @after-leave="doDestroy">
      <el-select-menu
        ref="popper"
        :append-to-body="popperAppendToBody"
        v-show="visible && emptyText !== false"
      >
        <el-scrollbar
          tag="ul"
          wrap-class="el-select-dropdown__wrap"
          view-class="el-select-dropdown__list"
          ref="scrollbar"
          :class="{
            'is-empty': !allowCreate && query && filteredOptionsCount === 0
          }"
          v-show="options.length > 0 && !loading"
        >
          <!-- 如果是启用了创建新条目功能，就将输入的文字作为列表项的内容 -->
          <el-option :value="query" created v-if="showNewOption"></el-option>
          <slot></slot>
        </el-scrollbar>
        <!-- 用来展示空数据时的文字 -->
        <template
          v-if="
            emptyText &&
              (!allowCreate || loading || (allowCreate && options.length === 0))
          "
        >
          <slot name="empty" v-if="$slots.empty"></slot>
          <p class="el-select-dropdown__empty" v-else>{{ emptyText }}</p>
        </template>
      </el-select-menu>
    </transition>
  </div>
</template>

<script type="text/babel">
import Emitter from "element-ui/src/mixins/emitter";
import Focus from "element-ui/src/mixins/focus";
import Locale from "element-ui/src/mixins/locale";
import ElInput from "element-ui/packages/input";
import ElSelectMenu from "./select-dropdown.vue";
import ElOption from "./option.vue";
import ElTag from "element-ui/packages/tag";
import ElScrollbar from "element-ui/packages/scrollbar";
import debounce from "throttle-debounce/debounce";
import Clickoutside from "element-ui/src/utils/clickoutside";
import {
  addResizeListener,
  removeResizeListener
} from "element-ui/src/utils/resize-event";
import { t } from "element-ui/src/locale";
import scrollIntoView from "element-ui/src/utils/scroll-into-view";
import {
  getValueByPath,
  valueEquals,
  isIE,
  isEdge
} from "element-ui/src/utils/util";
import NavigationMixin from "./navigation-mixin";
import { isKorean } from "element-ui/src/utils/shared";

export default {
  mixins: [Emitter, Locale, Focus("reference"), NavigationMixin],

  name: "ElSelect",

  componentName: "ElSelect",

  inject: {
    elForm: {
      default: ""
    },

    elFormItem: {
      default: ""
    }
  },

  provide() {
    return {
      select: this
    };
  },

  computed: {
    _elFormItemSize() {
      return (this.elFormItem || {}).elFormItemSize;
    },

    // 输入框是否是只读模式
    readonly() {
      return (
        !this.filterable ||
        this.multiple ||
        (!isIE() && !isEdge() && !this.visible)
      );
    },

    // 是否展示清空按钮
    showClose() {
      // 判断输入框里面是否有值
      let hasValue = this.multiple
        ? Array.isArray(this.value) && this.value.length > 0
        : this.value !== undefined && this.value !== null && this.value !== "";
      // 展示的条件：
      // 1. 需要开启可清空功能
      // 2. 不能被禁用
      // 3. 鼠标必须放在输入框上
      // 4. 里面必须有值 
      let criteria =
        this.clearable &&
        !this.selectDisabled &&
        this.inputHovering &&
        hasValue;
      return criteria;
    },

    // 切换箭头的显示样式 => 向上/向下
    // 1. 远程搜索功能没有箭头
    // 2. 普通模式取决于下拉框的显示/隐藏
    iconClass() {
      return this.remote && this.filterable
        ? ""
        : this.visible
        ? "arrow-up is-reverse"
        : "arrow-up";
    },

    // 如果是远程搜索，就需要延迟一定的时间去执行回调函数
    debounce() {
      return this.remote ? 300 : 0;
    },

    // 处理没有数据的情况
    emptyText() {
      // 如果正在从远程加载数据，默认返回 `加载中` 字样
      if (this.loading) {
        return this.loadingText || this.t("el.select.loading");
      }
      // 远程加载结束，或者没有启用远程搜索
      else {
        if (this.remote && this.query === "" && this.options.length === 0)
          return false;
        // 如果没有匹配到，默认返回 `无匹配数据`
        if (
          this.filterable &&
          this.query &&
          this.options.length > 0 &&
          this.filteredOptionsCount === 0
        ) {
          return this.noMatchText || this.t("el.select.noMatch");
        }
        // 远程搜索时，返回的是 `无数据`
        if (this.options.length === 0) {
          return this.noDataText || this.t("el.select.noData");
        }
      }
      return null;
    },

    // 是否展示新的选项
    showNewOption() {
      // 是否存在查询到的列表项
      // 不存在就展示新创建的那一项
      let hasExistingOption = this.options
        .filter(option => !option.created)
        .some(option => option.currentLabel === this.query);
      return (
        this.filterable &&
        this.allowCreate &&
        this.query !== "" &&
        !hasExistingOption
      );
    },

    selectSize() {
      return this.size || this._elFormItemSize || (this.$ELEMENT || {}).size;
    },

    // select 是否是禁用的
    selectDisabled() {
      return this.disabled || (this.elForm || {}).disabled;
    },

    collapseTagSize() {
      return ["small", "mini"].indexOf(this.selectSize) > -1 ? "mini" : "small";
    }
  },

  components: {
    ElInput,
    ElSelectMenu,
    ElOption,
    ElTag,
    ElScrollbar
  },

  directives: { Clickoutside },

  props: {
    name: String,
    id: String,
    value: {
      required: true
    },
    autocomplete: {
      type: String,
      default: "off"
    },
    /** @Deprecated in next major version */
    autoComplete: {
      type: String,
      validator(val) {
        process.env.NODE_ENV !== "production" &&
          console.warn(
            "[Element Warn][Select]'auto-complete' property will be deprecated in next major version. please use 'autocomplete' instead."
          );
        return true;
      }
    },
    automaticDropdown: Boolean,
    size: String,
    disabled: Boolean,
    clearable: Boolean,
    filterable: Boolean,
    allowCreate: Boolean,
    loading: Boolean,
    popperClass: String,
    remote: Boolean,
    loadingText: String,
    noMatchText: String,
    noDataText: String,
    remoteMethod: Function,
    filterMethod: Function,
    multiple: Boolean,
    multipleLimit: {
      type: Number,
      default: 0
    },
    placeholder: {
      type: String,
      default() {
        return t("el.select.placeholder");
      }
    },
    defaultFirstOption: Boolean,
    reserveKeyword: Boolean,
    valueKey: {
      // 作为 value 唯一标识的键名，绑定值为对象类型时必填
      type: String,
      default: "value"
    },
    collapseTags: Boolean,
    popperAppendToBody: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      options: [],
      cachedOptions: [],
      createdLabel: null,
      createdSelected: false,
      selected: this.multiple ? [] : {}, // 被选中的项，多选是数组，否则就是对象
      inputLength: 20,
      inputWidth: 0,
      initialInputHeight: 0, // 初始的 input 高度
      cachedPlaceHolder: "",
      currentPlaceholder: "",
      optionsCount: 0,
      filteredOptionsCount: 0, // 筛选出来的列表项
      visible: false, // 默认下拉框列表不可见
      softFocus: false,
      selectedLabel: "", // 已经选中的条目出现在输入框里的文字
      hoverIndex: -1,
      query: "", // 查询或创建新条目时输入的文字
      previousQuery: null,
      inputHovering: false,
      menuVisibleOnFocus: false, // 在聚焦状态下，下拉菜单的显示与隐藏
      isOnComposition: false,
      isSilentBlur: false
    };
  },

  watch: {
    // 禁用功能发生变化时，重新设置高度
    selectDisabled() {
      this.$nextTick(() => {
        this.resetInputHeight();
      });
    },

    placeholder(val) {
      this.cachedPlaceHolder = this.currentPlaceholder = val;
    },

    value(val, oldVal) {
      if (this.multiple) {
        this.resetInputHeight();
        if (
          (val && val.length > 0) ||
          (this.$refs.input && this.query !== "")
        ) {
          this.currentPlaceholder = "";
        }
        // 没有值的时候，placeholder 需要还原
        else {
          this.currentPlaceholder = this.cachedPlaceHolder;
        }
        // 如果不保存当前的搜索关键词就清空输入框里输过的文字
        if (this.filterable && !this.reserveKeyword) {
          this.query = "";
          this.handleQueryChange(this.query);
        }
      }
      this.setSelected();
      if (this.filterable && !this.multiple) {
        this.inputLength = 20;
      }
      // 触发表单的 change 事件
      if (!valueEquals(val, oldVal)) {
        this.dispatch("ElFormItem", "el.form.change", val);
      }
    },

    // 监听 visible 的变化，用来显示下拉框选择的选项
    visible(val) {
      // visible 为 false 时，下拉框不可见
      if (!val) {
        // 通知父组件销毁下拉框
        this.broadcast("ElSelectDropdown", "destroyPopper");
        // 使可输入的输入框失去焦点
        if (this.$refs.input) {
          this.$refs.input.blur();
        }
        // 将这些变量都变成初始化时候的值
        this.query = "";
        this.previousQuery = null;
        this.selectedLabel = "";
        this.inputLength = 20;
        this.menuVisibleOnFocus = false;
        this.resetHoverIndex();

        // 更新 placeholder
        this.$nextTick(() => {
          if (
            this.$refs.input &&
            this.$refs.input.value === "" &&
            this.selected.length === 0
          ) {
            this.currentPlaceholder = this.cachedPlaceHolder;
          }
        });
        if (!this.multiple) {
          // 如果有选中的选项
          if (this.selected) {
            if (
              this.filterable &&
              this.allowCreate &&
              this.createdSelected &&
              this.createdLabel
            ) {
              this.selectedLabel = this.createdLabel;
            } else {
              // 将输入框里显示的文字变成选择的那一项
              this.selectedLabel = this.selected.currentLabel;
            }
            if (this.filterable) this.query = this.selectedLabel;
          }

          // 如果开启了搜索但是没有选中的，复原 placeholder
          if (this.filterable) {
            this.currentPlaceholder = this.cachedPlaceHolder;
          }
        }
      }

      // visible 为 true 时
      else {
        this.broadcast("ElSelectDropdown", "updatePopper");
        if (this.filterable) {
          this.query = this.remote ? "" : this.selectedLabel;
          this.handleQueryChange(this.query);
          // 如果是多选就要聚焦 `可以输入的输入框`
          if (this.multiple) {
            this.$refs.input.focus();
          }
          // 不是多选
          else {
            if (!this.remote) {
              this.broadcast("ElOption", "queryChange", "");
              this.broadcast("ElOptionGroup", "queryChange");
            }

            // 将已经选择的文字变成 placeholder，然后清空输入框
            if (this.selectedLabel) {
              this.currentPlaceholder = this.selectedLabel;
              this.selectedLabel = "";
            }
          }
        }
      }

      // 下拉框出现/隐藏时触发 visible-change 事件
      this.$emit("visible-change", val);
    },

    options() {
      if (this.$isServer) return;
      // 更新下拉框中选项
      this.$nextTick(() => {
        this.broadcast("ElSelectDropdown", "updatePopper");
      });
      // 多选的时候也要改变高度
      if (this.multiple) {
        this.resetInputHeight();
      }
      let inputs = this.$el.querySelectorAll("input");
      // document.activeElement 返回当前获取焦点的元素
      // 如果当前获取焦点的元素不在
      if ([].indexOf.call(inputs, document.activeElement) === -1) {
        this.setSelected();
      }
      if (
        this.defaultFirstOption &&
        (this.filterable || this.remote) &&
        this.filteredOptionsCount
      ) {
        this.checkDefaultFirstOption();
      }
    }
  },

  methods: {
    // **************************************************************** //
    // *                          工具类的函数                          * //
    // **************************************************************** //
    
    // 点击的地方不在组件身上，直接关闭下拉框
    handleClose() {
      this.visible = false;
    },
    // 管理占位符
    managePlaceholder() {
      // 占位符取决于当前输入框里有没有值
      if (this.currentPlaceholder !== "") {
        this.currentPlaceholder = this.$refs.input.value
          ? ""
          : this.cachedPlaceHolder;
      }
    },
    // 重新设置 el-input 的宽度
    resetInputWidth() {
      this.inputWidth = this.$refs.reference.$el.getBoundingClientRect().width;
    },
    // 重新设置 el-input 的高度
    resetInputHeight() {
      // 如果输入框里面的多选是合并的形式并且不能搜索就不改变
      if (this.collapseTags && !this.filterable) return;
      this.$nextTick(() => {
        // reference 指向的是 el-input 组件
        if (!this.$refs.reference) return;
        let inputChildNodes = this.$refs.reference.$el.childNodes;
        let input = [].filter.call(
          inputChildNodes,
          item => item.tagName === "INPUT"
        )[0];
        const tags = this.$refs.tags;
        const sizeInMap = this.initialInputHeight || 40;
        input.style.height =
          this.selected.length === 0
            ? sizeInMap + "px"
            : Math.max(
                tags
                  ? tags.clientHeight + (tags.clientHeight > sizeInMap ? 6 : 0)
                  : 0,
                sizeInMap
              ) + "px";
        if (this.visible && this.emptyText !== false) {
          this.broadcast("ElSelectDropdown", "updatePopper");
        }
      });
    },
    // 重新设置 hover 状态
    resetHoverIndex() {
      setTimeout(() => {
        if (!this.multiple) {
          // 选中项的索引
          this.hoverIndex = this.options.indexOf(this.selected);
        } else {
          // 默认是选中 多选列表中的第一项
          if (this.selected.length > 0) {
            this.hoverIndex = Math.min.apply(
              null,
              this.selected.map(item => this.options.indexOf(item))
            );
          } else {
            // 没有 hover 状态
            this.hoverIndex = -1;
          }
        }
      }, 300);
    },
    // 重新设置输入框的状态
    resetInputState(e) {
      // keyCode = 8 是退格键（也就是我们常用的删除）
      // 如果按下的不是删除键，那么就不给 tag 加边框
      if (e.keyCode !== 8) this.toggleLastOptionHitState(false);
      this.inputLength = this.$refs.input.value.length * 15 + 20;
      this.resetInputHeight();
    },
    // 获取指定值在数组中的索引
    getValueIndex(arr = [], value) {
      const isObject =
        Object.prototype.toString.call(value).toLowerCase() ===
        "[object object]";
      if (!isObject) {
        // 如果不是对象就直接查找
        return arr.indexOf(value);
      } else {
        const valueKey = this.valueKey;
        let index = -1;
        arr.some((item, i) => {
          // 只要指定的一个属性值相等，就表明这个对象存在于数组中
          if (
            getValueByPath(item, valueKey) === getValueByPath(value, valueKey)
          ) {
            index = i;
            return true;
          }
          return false;
        });
        return index;
      }
    },
    // 获取指定的属性值
    getValueKey(item) {
      if (
        Object.prototype.toString.call(item.value).toLowerCase() !==
        "[object object]"
      ) {
        return item.value;
      }
      // 如果绑定的是一个对象，就需要根据 value-key 去拿到深层次的值
      else {
        return getValueByPath(item.value, this.valueKey);
      }
    },
    // 使选中项能够出现在下拉框的可视区域，通常出现在最后一个
    scrollToOption(option) {
      // 获取 option 的根元素 <li> 标签
      const target =
        Array.isArray(option) && option[0] ? option[0].$el : option.$el;
      if (this.$refs.popper && target) {
        // menu 就是包裹着滚动元素的 div
        const menu = this.$refs.popper.$el.querySelector(
          ".el-select-dropdown__wrap"
        );
        // 滚动到可视区域
        scrollIntoView(menu, target);
      }
      // 执行滚动方法
      this.$refs.scrollbar && this.$refs.scrollbar.handleScroll();
    },
    // 如果在输入框中有多个 tag
    // 切换最后一个 tag 的边框（要么加上要么去掉）
    // 返回的是有没有加上边框
    toggleLastOptionHitState(hit) {
      if (!Array.isArray(this.selected)) return;
      // 最后一个 option
      const option = this.selected[this.selected.length - 1];
      if (!option) return;

      // 如果有 hit，它必须是 true 或者 false
      if (hit === true || hit === false) {
        option.hitState = hit;
        return hit;
      }

      // 如果没有传入 hit
      option.hitState = !option.hitState;
      return option.hitState;
    },
    // 通过传入的 value 获取到它的 option
    getOption(value) {
      let option;
      // 判断这个 option 是不是一个对象
      const isObject =
        Object.prototype.toString.call(value).toLowerCase() ===
        "[object object]";
      // 是不是 null
      const isNull =
        Object.prototype.toString.call(value).toLowerCase() ===
        "[object null]";
      // 是不是 undefined
      const isUndefined =
        Object.prototype.toString.call(value).toLowerCase() ===
        "[object undefined]";

      // 在 一个 option 组件被创建时就被添加到 cachedOptions 里了
      // 遍历数组 找到与指定值相等的那一个 option
      for (let i = this.cachedOptions.length - 1; i >= 0; i--) {
        const cachedOption = this.cachedOptions[i];
        const isEqual = isObject
          ? getValueByPath(cachedOption.value, this.valueKey) ===
            getValueByPath(value, this.valueKey)
          : cachedOption.value === value;
        if (isEqual) {
          option = cachedOption;
          break;
        }
      }
      if (option) return option;

      // 如果 option 不存在，就新创建一个
      const label = !isObject && !isNull && !isUndefined ? value : "";
      let newOption = {
        value: value,
        currentLabel: label
      };
      if (this.multiple) {
        newOption.hitState = false;
      }
      return newOption;
    },
    // 设置被选中的选项
    setSelected() {
      // 如果是单选
      // 将选中的那一项的文字设置为输入框里显示的文字
      if (!this.multiple) {
        let option = this.getOption(this.value);
        if (option.created) {
          this.createdLabel = option.currentLabel;
          this.createdSelected = true;
        } else {
          this.createdSelected = false;
        }
        this.selectedLabel = option.currentLabel;
        this.selected = option;
        if (this.filterable) this.query = this.selectedLabel;
        return;
      }
      // 多选的话就需要将所有选择的放进 selected 数组里
      let result = [];
      if (Array.isArray(this.value)) {
        this.value.forEach(value => {
          result.push(this.getOption(value));
        });
      }
      this.selected = result;
      this.$nextTick(() => {
        this.resetInputHeight();
      });
    },
    
    

    // **************************************************************** //
    // *                        事件相关的函数                          * //
    // **************************************************************** //

    // 处理 composition 事件，主要是解决不同输入法之间的差异
    handleComposition(event) {
      // 获取到输入的文本
      const text = event.target.value;
      if (event.type === "compositionend") {
        this.isOnComposition = false;
        // 输入结束时调用查询方法
        this.$nextTick(_ => this.handleQueryChange(text));
      } else {
        const lastCharacter = text[text.length - 1] || "";
        this.isOnComposition = !isKorean(lastCharacter);
      }
    },
    // 处理 `输入的查询内容发生变化` 的事件
    handleQueryChange(val) {
      // 如果查询出来的或者正在输入就不往下执行
      if (this.previousQuery === val || this.isOnComposition) return;
      if (
        this.previousQuery === null &&
        (typeof this.filterMethod === "function" ||
          typeof this.remoteMethod === "function")
      ) {
        this.previousQuery = val;
        return;
      }
      this.previousQuery = val;
      // 通知下拉框组件更新
      this.$nextTick(() => {
        if (this.visible) this.broadcast("ElSelectDropdown", "updatePopper");
      });
      this.hoverIndex = -1;
      // 多选和可搜索同时启用时
      if (this.multiple && this.filterable) {
        this.$nextTick(() => {
          // this.$refs.input 是可以输入的输入框
          // 多选标记的数字长度是 35
          const length = this.$refs.input.value.length * 15 + 20;
          // 如果输入的超过两个字符，那么就固定长度为 50
          this.inputLength = this.collapseTags ? Math.min(50, length) : length;
          this.managePlaceholder();
          this.resetInputHeight();
        });
      }
      // 如果开启了远程搜索并且传入了 remote-method 函数
      if (this.remote && typeof this.remoteMethod === "function") {
        this.hoverIndex = -1;
        // 执行父组件传过来的远程搜索的逻辑，参数是当前输入的值
        this.remoteMethod(val);
      } else if (typeof this.filterMethod === "function") {
        // 执行搜索逻辑
        this.filterMethod(val);
        this.broadcast("ElOptionGroup", "queryChange");
      } else {
        this.filteredOptionsCount = this.optionsCount;
        this.broadcast("ElOption", "queryChange", val);
        this.broadcast("ElOptionGroup", "queryChange");
      }
      // 开启 在输入框按下回车，选择第一个匹配项 的功能
      // 并且当前列表项中有匹配的项时
      if (
        this.defaultFirstOption &&
        (this.filterable || this.remote) &&
        this.filteredOptionsCount
      ) {
        this.checkDefaultFirstOption();
      }
    },
    // 触发 change 事件
    emitChange(val) {
      // valueEquals 判断两个数组是否相等
      // 如果不相等就触发 change 事件
      if (!valueEquals(this.value, val)) {
        this.$emit("change", val);
      }
    },
    // 使输入框聚焦（el-input 或者 原生 input）
    setSoftFocus() {
      this.softFocus = true;
      const input = this.$refs.input || this.$refs.reference;
      if (input) {
        input.focus();
      }
    },
    // 聚焦事件处理函数
    handleFocus(event) {
      if (!this.softFocus) {
        // 获取焦点后自动弹出下拉框
        if (this.automaticDropdown || this.filterable) {
          this.visible = true;
          if (this.filterable) {
            this.menuVisibleOnFocus = true;
          }
        }
        this.$emit("focus", event);
      } else {
        this.softFocus = false;
      }
    },
    // 使 el-input 失去焦点
    blur() {
      this.visible = false;
      this.$refs.reference.blur();
    },
    // 失去焦点的事件处理函数
    handleBlur(event) {
      setTimeout(() => {
        if (this.isSilentBlur) {
          this.isSilentBlur = false;
        } else {
          this.$emit("blur", event);
        }
      }, 50);
      this.softFocus = false;
    },
    // 点击清空按钮的事件处理函数
    handleClearClick(event) {
      this.deleteSelected(event);
    },
    // 删除已经选中的列表项
    deleteSelected(event) {
      event.stopPropagation();
      // 将 value 清空
      // 并且触发输入框的 input 和 change 事件，使输入框里面的值更新为最新的 value（空）
      const value = this.multiple ? [] : "";
      this.$emit("input", value);
      this.emitChange(value);
      this.visible = false;
      this.$emit("clear");
    },
    // 点击列表项的时候触发的事件处理函数
    handleOptionSelect(option, byClick) {
      if (this.multiple) {
        const value = (this.value || []).slice();
        const optionIndex = this.getValueIndex(value, option.value);
        // 如果已经存在于 value 里面，那么点击的时候就移除它
        if (optionIndex > -1) {
          value.splice(optionIndex, 1);
        }
        // 没找到
        // 如果不限制用户选中的数量
        // 就往 value 里添加当前点击的列表项的值
        else if (
          this.multipleLimit <= 0 ||
          value.length < this.multipleLimit
        ) {
          value.push(option.value);
        }
        this.$emit("input", value);
        this.emitChange(value);

        // 如果当前项是创建出来的
        // 那么点击完之后将一些属性重置
        if (option.created) {
          this.query = "";
          this.handleQueryChange("");
          this.inputLength = 20;
        }
        if (this.filterable) this.$refs.input.focus();
      } 

      // 不是多选，点击了一个列表项就要隐藏下拉框
      else {
        this.$emit("input", option.value);
        this.emitChange(option.value);
        this.visible = false;
      }

      this.isSilentBlur = byClick;
      this.setSoftFocus();
      if (this.visible) return;
      // 在点击完之后将选中的那一项滚动到下拉框可视区域的最后一个
      this.$nextTick(() => {
        this.scrollToOption(option);
      });
    },
    // 结合防抖，处理输入框的 input 事件
    onInputChange() {
      if (this.filterable && this.query !== this.selectedLabel) {
        this.query = this.selectedLabel;
        this.handleQueryChange(this.query);
      }
    },
    // 处理 resize 事件
    handleResize() {
      this.resetInputWidth();
      if (this.multiple) this.resetInputHeight();
    },



    // **************************************************************** //
    // *                          功能函数                             * //
    // **************************************************************** //

    // 选中 hover 状态下的那一项
    selectOption() {
      // 如果不可见就触发下拉框
      if (!this.visible) {
        this.toggleMenu();
      } 
      // 在可见的状态下
      else {
        if (this.options[this.hoverIndex]) {
          this.handleOptionSelect(this.options[this.hoverIndex]);
        }
      }
    },
    // 在输入框按下 delete 键时，删除光标前面的一个 tag
    deletePrevTag(e) {
      // 这里的逻辑分为两步
      // 1. 在按下删除键的时候，去执行 toggleLastOptionHitState 方法，一开始是没有边框的
      //    所以 option.hitState 为 false，取反之后返回 true，最后一个 tag 的边框加了上去
      //    这个方法也就不会执行下去
      // 2. 当第二次按下删除键的时候，已经有边框了，再执行 toggleLastOptionHitState 方法
      //    返回的就是 false，然后 if 语句可以执行了，也就是将最后一个 tag 删除
      if (e.target.value.length <= 0 && !this.toggleLastOptionHitState()) {
        const value = this.value.slice();
        // 将最后一个弹出，并更新 value 的值
        value.pop();
        this.$emit("input", value);
        this.emitChange(value);
      }
    },
    // 点击 Select 组件时触发
    toggleMenu() {
      // 没有被禁用时
      if (!this.selectDisabled) {
        // 如果当前在 foucs 状态下，下拉菜单是显示的，那就隐藏它
        if (this.menuVisibleOnFocus) {
          this.menuVisibleOnFocus = false;
        } else {
          this.visible = !this.visible;
        }
        // 聚焦
        if (this.visible) {
          (this.$refs.input || this.$refs.reference).focus();
        }
      }
    },
    // 高亮某一个选项，将它变成 hover 的状态
    checkDefaultFirstOption() {
      this.hoverIndex = -1;
      // highlight the created option
      let hasCreated = false;
      // 如果是创建的新条目，直接 hover 第一个
      for (let i = this.options.length - 1; i >= 0; i--) {
        if (this.options[i].created) {
          hasCreated = true;
          this.hoverIndex = i;
          break;
        }
      }
      if (hasCreated) return;

      for (let i = 0; i !== this.options.length; ++i) {
        const option = this.options[i];
        // 如果已经输入了查询的字符
        if (this.query) {
          // highlight first options that passes the filter
          // 当前选项和选项组没有被禁用，并且可见
          // 当前列表项被标记为选中的状态
          if (!option.disabled && !option.groupDisabled && option.visible) {
            this.hoverIndex = i;
            break;
          }
        } else {
          // highlight currently selected option
          if (option.itemSelected) {
            this.hoverIndex = i;
            break;
          }
        }
      }
    },
    // 删除 tag 标签
    // 点击 tag 上的删除按钮时触发
    // event 原生事件对象
    // tag 要删除的标签
    deleteTag(event, tag) {
      let index = this.selected.indexOf(tag);
      // 找到了并且下拉框没有被禁用
      // <? 因为禁用了就不能够删除了 >
      if (index > -1 && !this.selectDisabled) {
        const value = this.value.slice();
        value.splice(index, 1);
        this.$emit("input", value);
        this.emitChange(value);
        this.$emit("remove-tag", tag.value);
      }
      event.stopPropagation();
    },
    // 当某一个 选项 需要销毁的时候执行
    // 具体在 option 组件里触发的
    onOptionDestroy(index) {
      if (index > -1) {
        this.optionsCount--;
        this.filteredOptionsCount--;
        this.options.splice(index, 1);
      }
    },
   
    

    // **************************************************************** //
    // *                        动画的钩子函数                          * //
    // **************************************************************** //

    // 在动画开始之前执行
    // 使选中项能够出现在下拉框的可视区域
    handleMenuEnter() {
      this.$nextTick(() => this.scrollToOption(this.selected));
    },
    // 在下拉框动画结束的时候销毁它
    doDestroy() {
      this.$refs.popper && this.$refs.popper.doDestroy();
    }



  },

  created() {
    // 做一些初始化的工作
    this.cachedPlaceHolder = this.currentPlaceholder = this.placeholder;
    if (this.multiple && !Array.isArray(this.value)) {
      this.$emit("input", []);
    }
    if (!this.multiple && Array.isArray(this.value)) {
      this.$emit("input", "");
    }

    // 对用户的输入做了一些防抖的优化
    this.debouncedOnInputChange = debounce(this.debounce, () => {
      this.onInputChange();
    });

    this.debouncedQueryChange = debounce(this.debounce, e => {
      this.handleQueryChange(e.target.value);
    });

    // 监听自定义的事件，这些事件是在 option 组件里触发的
    this.$on("handleOptionClick", this.handleOptionSelect);
    this.$on("setSelected", this.setSelected);
  },

  mounted() {
    if (this.multiple && Array.isArray(this.value) && this.value.length > 0) {
      this.currentPlaceholder = "";
    }
    // 添加 resize 事件的监听
    addResizeListener(this.$el, this.handleResize);

    const reference = this.$refs.reference;
    if (reference && reference.$el) {
      // 初始化输入框的高度
      const sizeMap = {
        medium: 36,
        small: 32,
        mini: 28
      };
      const input = reference.$el.querySelector("input");
      this.initialInputHeight =
        input.getBoundingClientRect().height || sizeMap[this.selectSize];
    }
    if (this.remote && this.multiple) {
      this.resetInputHeight();
    }
    this.$nextTick(() => {
      if (reference && reference.$el) {
        this.inputWidth = reference.$el.getBoundingClientRect().width;
      }
    });
    // 组件一加载出来就去设置选中状态
    this.setSelected();
  },

  beforeDestroy() {
    // 组件销毁使移除 resize 监听
    if (this.$el && this.handleResize)
      removeResizeListener(this.$el, this.handleResize);
  }
};
</script>
