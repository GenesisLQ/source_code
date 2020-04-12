export default {
  data() {
    return {
      hoverOption: -1
    };
  },

  computed: {
    // 这个计算属性用来判断是不是所有的 option 都被禁用了
    // 先将所有可见的 option 过滤出来
    // 再判断所有可见的 option 是不是都被禁用了
    // 如果是，返回 true，否则返回 false
    optionsAllDisabled() {
      return this.options
        .filter(option => option.visible)
        .every(option => option.disabled);
    }
  },

  watch: {
    hoverIndex(newVal) {
      if (typeof newVal === 'number' && newVal > -1) {
        this.hoverOption = this.options[newVal] || {};
      }
      // 遍历 options 给选中的 option 加上 hover 状态
      this.options.forEach(option => {
        option.hover = this.hoverOption === option;
      });
    }
  },

  methods: {
    // 移动 option 的 hover 状态
    // direction 方向
    navigateOptions(direction) {
      // 在聚焦的状态下会先让下拉框显示出来
      if (!this.visible) {
        this.visible = true;
        return;
      }
      if (this.options.length === 0 || this.filteredOptionsCount === 0) return;
      if (!this.optionsAllDisabled) {
        if (direction === 'next') {
          this.hoverIndex++;
          // 到底了再从头开始
          if (this.hoverIndex === this.options.length) {
            this.hoverIndex = 0;
          }
        } else if (direction === 'prev') {
          this.hoverIndex--;
          // 到头了再从最后一个开始
          if (this.hoverIndex < 0) {
            this.hoverIndex = this.options.length - 1;
          }
        }
        const option = this.options[this.hoverIndex];
        // 如果有禁用选项，直接跳过，转到下一个没有被禁用的选项上
        // 递归思想
        if (
          option.disabled === true ||
          option.groupDisabled === true ||
          !option.visible
        ) {
          this.navigateOptions(direction);
        }
        // 滚动到指定的 option 位置
        this.$nextTick(() => this.scrollToOption(this.hoverOption));
      }
    }
  }
};
