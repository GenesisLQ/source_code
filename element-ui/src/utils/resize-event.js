import ResizeObserver from 'resize-observer-polyfill';

const isServer = typeof window === 'undefined';

/* istanbul ignore next */
// resize 事件的处理函数
const resizeHandler = function(entries) {
  for (let entry of entries) {
    const listeners = entry.target.__resizeListeners__ || [];
    // 执行监听器里面的回调函数
    if (listeners.length) {
      listeners.forEach(fn => {
        fn();
      });
    }
  }
};

/* istanbul ignore next */
/**
 * 给元素添加 resize 事件
 * @param {Element} element 要监听的元素
 * @param {Function} fn 回调函数
 */
export const addResizeListener = function(element, fn) {
  if (isServer) return;
  // 如果 `监听器` 不存在就初始化它
  if (!element.__resizeListeners__) {
    element.__resizeListeners__ = [];
    // 获取 ResizeObserver 的实例
    element.__ro__ = new ResizeObserver(resizeHandler);
    // 开始监听元素
    element.__ro__.observe(element);
  }
  element.__resizeListeners__.push(fn);
};

/* istanbul ignore next */
// 移除元素的 resize 监听事件
export const removeResizeListener = function(element, fn) {
  if (!element || !element.__resizeListeners__) return;
  element.__resizeListeners__.splice(element.__resizeListeners__.indexOf(fn), 1);
  if (!element.__resizeListeners__.length) {
    element.__ro__.disconnect();
  }
};
