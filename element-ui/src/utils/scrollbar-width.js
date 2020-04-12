import Vue from 'vue';

let scrollBarWidth;

export default function() {
  if (Vue.prototype.$isServer) return 0;
  // 如果存在 scrollBarWidth 就直接返回
  if (scrollBarWidth !== undefined) return scrollBarWidth;

  const outer = document.createElement('div');
  outer.className = 'el-scrollbar__wrap';
  outer.style.visibility = 'hidden';
  outer.style.width = '100px';
  outer.style.position = 'absolute';
  outer.style.top = '-9999px';
  document.body.appendChild(outer);

  // 没有滚动条时的宽度 = 元素的 offsetWidth
  const widthNoScroll = outer.offsetWidth;
  // 使外层可滚动
  outer.style.overflow = 'scroll';

  const inner = document.createElement('div');
  // 设置 width 为 100% 时，强制子元素的内容宽度等于父元素内容宽度
  // 当子元素内容宽度大于父元素的内容宽度时，就会出现滚动条
  inner.style.width = '100%';
  outer.appendChild(inner);

  const widthWithScroll = inner.offsetWidth;
  outer.parentNode.removeChild(outer);
  scrollBarWidth = widthNoScroll - widthWithScroll;

  return scrollBarWidth;
};
