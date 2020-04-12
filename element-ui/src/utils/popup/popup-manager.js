import Vue from 'vue';
import { addClass, removeClass } from 'element-ui/src/utils/dom';

let hasModal = false;
let hasInitZIndex = false;
let zIndex;

/**
 * 获取 modal 层的 DOM 对象
 * @return modalDom
 */
const getModal = function() {
  if (Vue.prototype.$isServer) return;
  let modalDom = PopupManager.modalDom;
  // 如果不存在，modalDom 为 undefined
  if (modalDom) {
    hasModal = true;
  } else {
    // 不存在就创建一个 div 作为 modal
    hasModal = false;
    // 返回的是一个 元素对象
    modalDom = document.createElement('div');
    PopupManager.modalDom = modalDom;

    // 处理移动端的 touchmove 事件
    // 必须使用 addEventListener 进行事件绑定
    // preventDefault() 可以阻止屏幕滚动
    modalDom.addEventListener('touchmove', function(event) {
      event.preventDefault();
      event.stopPropagation();
    });

    // 监听 modal 的点击事件
    modalDom.addEventListener('click', function() {
      PopupManager.doOnModalClick && PopupManager.doOnModalClick();
    });
  }

  return modalDom;
};

// 存放 modal 的实例
const instances = {};

const PopupManager = {
  // 是否有遮罩层
  modalFade: true,
  // 用数组模拟存放 modal 层的栈结构
  modalStack: [],

  // 根据 id 注册一个实例，并在 instances 中添加，形成键值对结构
  register: function(id, instance) {
    if (id && instance) {
      instances[id] = instance;
    }
  },
  // 获取当前实例，返回指定 id 对应的实例
  getInstance: function(id) {
    return instances[id];
  },
  // 删除已添加的实例
  deregister: function(id) {
    if (id) {
      // 将指定的属性设为空对象并且断开这个属性与 instances 的联系
      // 以便于垃圾回收器回收
      instances[id] = null;
      delete instances[id];
    }
  },

  // zIndex ++
  nextZIndex: function() {
    return PopupManager.zIndex++;
  },

  /**
   * 创建一个 modal
   * @param {*} id modal 的 id
   * @param {*} zIndex
   * @param {*} dom Vue 操作的 DOM 元素
   * @param {*} modalClass 传入的 class
   * @param {*} modalFade 是否有遮罩层
   */
  openModal: function(id, zIndex, dom, modalClass, modalFade) {
    if (Vue.prototype.$isServer) return;
    if (!id || zIndex === undefined) return;
    this.modalFade = modalFade;

    const modalStack = this.modalStack;

    // 循环判断 modal 是否已经存在于 modalStack
    for (let i = 0, j = modalStack.length; i < j; i++) {
      const item = modalStack[i];
      if (item.id === id) {
        return;
      }
    }

    const modalDom = getModal();

    // 向 DOM 对象中添加 v-modal 类
    addClass(modalDom, 'v-modal');
    // 有遮罩层但是没有 modal
    if (this.modalFade && !hasModal) {
      addClass(modalDom, 'v-modal-enter');
    }
    if (modalClass) {
      // 通过空格来分割类名
      let classArr = modalClass.trim().split(/\s+/);
      // 向 modal 中添加 传入的 class
      classArr.forEach(item => addClass(modalDom, item));
    }

    // v-modal-enter 是为了在 modal 显示的时候有一个动画效果
    // 0.2s 之后动画结束再移除它，是为了使后面的 className 不受影响
    setTimeout(() => {
      removeClass(modalDom, 'v-modal-enter');
    }, 200);

    // 如果 dom 的父节点是 DocumentFragment，就需要向 body 里面添加 modal
    if (dom && dom.parentNode && dom.parentNode.nodeType !== 11) {
      dom.parentNode.appendChild(modalDom);
    } else {
      document.body.appendChild(modalDom);
    }

    // 设置 z-index 属性
    if (zIndex) {
      modalDom.style.zIndex = zIndex;
    }
    modalDom.tabIndex = 0;
    modalDom.style.display = '';

    // 向 modalStack 里面添加一个新的 modal 实例
    this.modalStack.push({ id: id, zIndex: zIndex, modalClass: modalClass });
  },

  closeModal: function(id) {
    const modalStack = this.modalStack;
    const modalDom = getModal();

    if (modalStack.length > 0) {
      const topItem = modalStack[modalStack.length - 1];
      // 如果需要关闭的 modal 就在最顶层
      // 直接删除 class，并把它从栈里弹出
      if (topItem.id === id) {
        if (topItem.modalClass) {
          let classArr = topItem.modalClass.trim().split(/\s+/);
          classArr.forEach(item => removeClass(modalDom, item));
        }

        modalStack.pop();
        if (modalStack.length > 0) {
          modalDom.style.zIndex = modalStack[modalStack.length - 1].zIndex;
        }
      } else {
        // 如果不在最顶层，需要遍历 modalStack
        // 找到 id 相等的项并把它删除
        for (let i = modalStack.length - 1; i >= 0; i--) {
          if (modalStack[i].id === id) {
            modalStack.splice(i, 1);
            break;
          }
        }
      }
    }

    // 当 modalStack 里面没有任何实例时，添加一个遮罩层消失的动画
    if (modalStack.length === 0) {
      if (this.modalFade) {
        addClass(modalDom, 'v-modal-leave');
      }
      setTimeout(() => {
        if (modalStack.length === 0) {
          // 彻底删除 modal 的 DOM 对象
          if (modalDom.parentNode) modalDom.parentNode.removeChild(modalDom);
          modalDom.style.display = 'none';
          PopupManager.modalDom = undefined;
        }
        removeClass(modalDom, 'v-modal-leave');
      }, 200);
    }
  },

  // 处理 modal 的点击事件
  doOnModalClick: function() {
    // 拿到最顶层的 modal
    // 栈结构最顶层应该是最后进的元素
    const topItem = PopupManager.modalStack[PopupManager.modalStack.length - 1];
    if (!topItem) return;

    const instance = PopupManager.getInstance(topItem.id);
    // 点击 modal 层消失
    if (instance && instance.closeOnClickModal) {
      instance.close();
    }
  }
};

// 在 PopupManager 身上添加一个 zIndex 属性
Object.defineProperty(PopupManager, 'zIndex', {
  configurable: true,
  get() {
    // 初始化 zIndex
    if (!hasInitZIndex) {
      zIndex = zIndex || (Vue.prototype.$ELEMENT || {}).zIndex || 2000;
      hasInitZIndex = true;
    }
    return zIndex;
  },
  set(value) {
    zIndex = value;
  }
});

const getTopPopup = function() {
  if (Vue.prototype.$isServer) return;
  if (PopupManager.modalStack.length > 0) {
    const topPopup = PopupManager.modalStack[PopupManager.modalStack.length - 1];
    if (!topPopup) return;
    const instance = PopupManager.getInstance(topPopup.id);

    return instance;
  }
};

if (!Vue.prototype.$isServer) {
  // handle `esc` key when the popup is shown
  window.addEventListener('keydown', function(event) {
    if (event.keyCode === 27) {
      const topPopup = getTopPopup();

      if (topPopup && topPopup.closeOnPressEscape) {
        topPopup.handleClose
          ? topPopup.handleClose()
          : topPopup.handleAction
            ? topPopup.handleAction('cancel')
            : topPopup.close();
      }
    }
  });
}

export default PopupManager;
