// 先提前说明，该变量是为了计算 textarea 的高度而存在的
// 至于为什么要定义一个这样的变量，看完后面就明白了
let hiddenTextarea

// 通过下面定义的样式起到隐藏效果
const HIDDEN_STYLE = `
  height:0 !important;
  visibility:hidden !important;
  overflow:hidden !important;
  position:absolute !important;
  z-index:-1000 !important;
  top:0 !important;
  right:0 !important
`

const CONTEXT_STYLE = [
  'letter-spacing',
  'line-height',
  'padding-top',
  'padding-bottom',
  'font-family',
  'font-weight',
  'font-size',
  'text-rendering',
  'text-transform',
  'width',
  'text-indent',
  'padding-left',
  'padding-right',
  'border-width',
  'box-sizing'
]

function calculateNodeStyling (targetElement) {
  // 拿到目标元素真实的 style 数据（计算后的）
  const style = window.getComputedStyle(targetElement)

  const boxSizing = style.getPropertyValue('box-sizing')

  const paddingSize =
    parseFloat(style.getPropertyValue('padding-bottom')) +
    parseFloat(style.getPropertyValue('padding-top'))

  const borderSize =
    parseFloat(style.getPropertyValue('border-bottom-width')) +
    parseFloat(style.getPropertyValue('border-top-width'))

  // 使它拥有目标元素所有的样式，并转换成以 ; 连接的字符串
  const contextStyle = CONTEXT_STYLE.map(
    name => `${name}:${style.getPropertyValue(name)}`
  ).join(';')

  return { contextStyle, paddingSize, borderSize, boxSizing }
}

/**
 * 动态计算 textarea 的高度
 * @param {*} targetElement 需要计算高度的目标元素
 * @param {*} minRows 最小行，默认 1
 * @param {*} maxRows 最大行，默认 null
 */
export default function calcTextareaHeight (
  targetElement,
  minRows = 1,
  maxRows = null
) {
  // 如果 textarea 不存在就创建一个
  if (!hiddenTextarea) {
    hiddenTextarea = document.createElement('textarea')
    document.body.appendChild(hiddenTextarea)
  }

  // 与数组的解构赋值不同，对象的属性没有次序，变量必须与属性同名，才能取到正确的值
  let {
    paddingSize,
    borderSize,
    boxSizing,
    contextStyle
  } = calculateNodeStyling(targetElement)

  // 通过直接设置 style 属性，使之成为内联样式
  hiddenTextarea.setAttribute('style', `${contextStyle};${HIDDEN_STYLE}`)
  hiddenTextarea.value = targetElement.value || targetElement.placeholder || ''

  // scrollHeight 是一个元素内容高度，包括由于溢出导致的视图中不可见内容（包含 padding）
  let height = hiddenTextarea.scrollHeight
  const result = {}

  // 这里判断一下当前是 IE 盒模型还是标准盒模型
  // IE 盒模型高度包括了内容（包含 padding）和边框
  // 标准盒模型高度只是内容的高度，并且不包含 padding
  if (boxSizing === 'border-box') {
    height = height + borderSize
  } else if (boxSizing === 'content-box') {
    height = height - paddingSize
  }

  // 通过将 textarea 的值设为空字符串来计算单行文本内容所占的高度
  hiddenTextarea.value = ''
  let singleRowHeight = hiddenTextarea.scrollHeight - paddingSize

  if (minRows !== null) {
    let minHeight = singleRowHeight * minRows
    if (boxSizing === 'border-box') {
      minHeight = minHeight + paddingSize + borderSize
    }
    // 最小高度应该取两者最大的，你品，你仔细品！
    height = Math.max(minHeight, height)
    result.minHeight = `${minHeight}px`
  }
  if (maxRows !== null) {
    let maxHeight = singleRowHeight * maxRows
    if (boxSizing === 'border-box') {
      maxHeight = maxHeight + paddingSize + borderSize
    }
    // 最大高度应该取两者最小的
    height = Math.min(maxHeight, height)
  }
  result.height = `${height}px`
  // 在移除 hiddenTextarea 前需要先判断是否有父节点，如果不判断，没有父节点时会报错
  // && 前面的如果为假就不会继续执行后面的表达式
  // 一般我想到的是使用 if 来判断，使用 && 这种写法可以使代码很优雅，学习了！
  hiddenTextarea.parentNode &&
    hiddenTextarea.parentNode.removeChild(hiddenTextarea)
  // 一定要释放变量，否则一直在内存中存在，消耗内存
  hiddenTextarea = null
  return result
}
