import Vue from 'vue';

/**
 * 使容器滚动到指定的位置
 * @param {HTMLElement} container 存放列表项的容器
 * @param {HTMLElement} selected 每一个列表项 `<li>`
 */
export default function scrollIntoView(container, selected) {
  if (Vue.prototype.$isServer) return;

  if (!selected) {
    container.scrollTop = 0;
    return;
  }

  const offsetParents = [];
  // 如果没有分组，pointer 为 div.scrollbar
  // 如果是分组的，pointer 就是 ul.el-select-group__wrap

  // offsetParent 返回最近的 定位父元素，如果没有就是 body
  let pointer = selected.offsetParent;
  while (pointer && container !== pointer && container.contains(pointer)) {
    offsetParents.push(pointer);
    pointer = pointer.offsetParent;
  }
  // 经过遍历，pointer 最终都会变成 div.scrollbar

  // 将所有的 offsetTop 累加起来得到最终的 top 值
  const top = selected.offsetTop + offsetParents.reduce((prev, curr) => (prev + curr.offsetTop), 0);
  const bottom = top + selected.offsetHeight;
  const viewRectTop = container.scrollTop;
  const viewRectBottom = viewRectTop + container.clientHeight;

  if (top < viewRectTop) {
    container.scrollTop = top;
  } else if (bottom > viewRectBottom) {
    container.scrollTop = bottom - container.clientHeight;
  }
}
