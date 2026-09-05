import{_ as s,c as a,a as e,o as i}from"./app-ElaRWWOj.js";const l={};function c(d,n){return i(),a("div",null,[...n[0]||(n[0]=[e(`<hr><h1 id="vue3-实战-解决深拷贝导致的-maximum-call-stack-size-与-函数丢失-问题" tabindex="-1"><a class="header-anchor" href="#vue3-实战-解决深拷贝导致的-maximum-call-stack-size-与-函数丢失-问题"><span>Vue3 实战：解决深拷贝导致的“Maximum call stack size”与“函数丢失”问题</span></a></h1><p>在 Vue3 项目开发中，我们经常会遇到需要深度克隆（Deep Clone）响应式对象的情况。传统的 <code>lodash.cloneDeep</code> 或 <code>JSON.parse(JSON.stringify())</code> 在面对复杂业务场景时，经常会触发以下两个痛点：</p><ol><li><strong>RangeError: Maximum call stack size exceeded</strong>：由于对象中存在循环引用（Circular Reference）或嵌套过深。</li><li><strong>TypeError: xxx is not a function</strong>：克隆后的对象丢失了原对象原型链上的方法（例如第三方插件实例的方法）。</li></ol><p>本文将分享一个高度自定义的 <code>deepSafeClone</code> 工具函数，支持<strong>手动脱壳（toRaw）</strong>、<strong>防循环引用</strong>、以及<strong>原型方法自动补全</strong>。</p><h2 id="核心代码实现" tabindex="-1"><a class="header-anchor" href="#核心代码实现"><span>核心代码实现</span></a></h2><p>你可以将以下代码直接复制到你的工具类文件（如 <code>utils/clone.js</code>）中：</p><p>JavaScript</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">/**</span>
<span class="line"> * 深度安全克隆 (支持 Vue3 toRaw、防循环引用、保留原型方法)</span>
<span class="line"> * @param {Object} obj - 要克隆的目标对象</span>
<span class="line"> * @param {Function} myRaw - 外部传入的脱壳函数 (如 Vue3 的 toRaw)</span>
<span class="line"> * @param {WeakMap} hash - 用于处理循环引用，内部递归使用</span>
<span class="line"> */</span>
<span class="line">export function deepSafeClone(obj, myRaw = (v) =&gt; v, hash = new WeakMap()) {</span>
<span class="line">  // 1. 处理基本类型、null 以及 undefined</span>
<span class="line">  if (obj === null || typeof obj !== &#39;object&#39;) {</span>
<span class="line">    return obj;</span>
<span class="line">  }</span>
<span class="line"></span>
<span class="line">  // 2. 防御循环引用：如果该对象已经处理过，直接返回对应的副本</span>
<span class="line">  // 解决 &quot;Maximum call stack size exceeded&quot; 的核心逻辑</span>
<span class="line">  if (hash.has(obj)) {</span>
<span class="line">    return hash.get(obj);</span>
<span class="line">  }</span>
<span class="line"></span>
<span class="line">  // 3. 使用传入的 myRaw 函数脱掉响应式外壳 (防止 Proxy 递归导致的溢出)</span>
<span class="line">  const rawObj = myRaw(obj);</span>
<span class="line"></span>
<span class="line">  // 4. 特殊内置对象处理</span>
<span class="line">  if (rawObj instanceof Date) return new Date(rawObj);</span>
<span class="line">  if (rawObj instanceof RegExp) return new RegExp(rawObj.source, rawObj.flags);</span>
<span class="line"></span>
<span class="line">  // 5. 函数处理：保持引用以防止 &quot;is not a function&quot; 报错</span>
<span class="line">  if (typeof rawObj === &#39;function&#39;) {</span>
<span class="line">    return rawObj;</span>
<span class="line">  }</span>
<span class="line"></span>
<span class="line">  // 6. 安全过滤：跳过 DOM 节点和 Window 等全局对象</span>
<span class="line">  if (rawObj instanceof Node || rawObj === window) {</span>
<span class="line">    return undefined;</span>
<span class="line">  }</span>
<span class="line"></span>
<span class="line">  // 7. 初始化容器 (区分数组和对象)</span>
<span class="line">  const clone = Array.isArray(rawObj) ? [] : {};</span>
<span class="line">  </span>
<span class="line">  // 记录引用映射</span>
<span class="line">  hash.set(obj, clone);</span>
<span class="line"></span>
<span class="line">  // 8. 深度递归遍历自身属性</span>
<span class="line">  const keys = Object.keys(rawObj);</span>
<span class="line">  for (const key of keys) {</span>
<span class="line">    try {</span>
<span class="line">      const value = rawObj[key];</span>
<span class="line">      // 递归调用，持续透传 myRaw 和 hash</span>
<span class="line">      clone[key] = deepSafeClone(value, myRaw, hash);</span>
<span class="line">    } catch (err) {</span>
<span class="line">      console.warn(\`[DeepClone] 属性 \${key} 读取失败，已跳过:\`, err);</span>
<span class="line">    }</span>
<span class="line">  }</span>
<span class="line"></span>
<span class="line">  // 9. 原型链补全：解决某些实例方法（如 getCurrentState）丢失的问题</span>
<span class="line">  if (!Array.isArray(rawObj)) {</span>
<span class="line">    const proto = Object.getPrototypeOf(rawObj);</span>
<span class="line">    // 如果原型上存在业务方法，且当前克隆对象没有，则进行挂载</span>
<span class="line">    if (proto &amp;&amp; proto !== Object.prototype) {</span>
<span class="line">      // 针对特定方法的补齐逻辑</span>
<span class="line">      if (typeof proto.getCurrentState === &#39;function&#39; &amp;&amp; !clone.getCurrentState) {</span>
<span class="line">        // 使用 bind 确保调用时 this 指向正确</span>
<span class="line">        clone.getCurrentState = proto.getCurrentState.bind(rawObj);</span>
<span class="line">      }</span>
<span class="line">      </span>
<span class="line">      /* // 如果需要更激进的原型恢复，可以开启下方代码：</span>
<span class="line">      Object.setPrototypeOf(clone, proto); </span>
<span class="line">      */</span>
<span class="line">    }</span>
<span class="line">  }</span>
<span class="line"></span>
<span class="line">  return clone;</span>
<span class="line">}</span>
<span class="line"></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="在-vue3-中的使用方式" tabindex="-1"><a class="header-anchor" href="#在-vue3-中的使用方式"><span>在 Vue3 中的使用方式</span></a></h2><p>JavaScript</p><div class="language-text line-numbers-mode" data-highlighter="prismjs" data-ext="text"><pre><code class="language-text"><span class="line">import { toRaw } from &#39;vue&#39;;</span>
<span class="line">import { deepSafeClone } from &#39;@/utils/clone&#39;;</span>
<span class="line"></span>
<span class="line">const originalData = { /* 响应式数据或复杂实例 */ };</span>
<span class="line"></span>
<span class="line">// 传入 toRaw 作为第二个参数，确保彻底切断响应式追踪</span>
<span class="line">const newCopy = deepSafeClone(originalData, toRaw);</span>
<span class="line"></span>
<span class="line">// 此时 newCopy.getCurrentState() 可以正常调用</span>
<span class="line"></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><h2 id="为什么这个版本更强大" tabindex="-1"><a class="header-anchor" href="#为什么这个版本更强大"><span>为什么这个版本更强大？</span></a></h2><h3 id="_1-彻底解决递归溢出" tabindex="-1"><a class="header-anchor" href="#_1-彻底解决递归溢出"><span>1. 彻底解决递归溢出</span></a></h3><p>通过 <code>WeakMap</code> 记录每一个处理过的对象地址。当递归遇到循环引用时，直接从 Map 中取出已有的副本，不会陷入无限循环。</p><h3 id="_2-解决-vue3-proxy-干扰" tabindex="-1"><a class="header-anchor" href="#_2-解决-vue3-proxy-干扰"><span>2. 解决 Vue3 Proxy 干扰</span></a></h3><p>Vue3 的响应式对象是 Proxy。在深拷贝时，如果直接操作 Proxy，可能会触发多余的 <code>getter</code>。通过参数化传入 <code>toRaw</code>，我们在每一层递归都优先获取原始数据，既提高了性能又增加了稳定性。</p><h3 id="_3-原型方法-精准降级" tabindex="-1"><a class="header-anchor" href="#_3-原型方法-精准降级"><span>3. 原型方法“精准降级”</span></a></h3><p>很多第三方库的对象（如编辑器、地图、图表配置）将方法定义在原型上。普通的克隆会只拷贝数据而丢失方法。我们在函数末尾加入了原型检查，发现 <code>getCurrentState</code> 等关键函数缺失时，会自动通过 <code>.bind()</code> 重新挂载，确保克隆后的对象“功能完备”。</p><hr><p><strong>希望这篇文章能帮你解决深拷贝的各种坑！如果有更复杂的实例克隆需求，欢迎在评论区讨论。</strong></p><hr><blockquote><p><strong>💡 小提示</strong>：如果你的业务场景中，<code>getCurrentState</code> 内部需要修改克隆后的数据，建议将 <code>.bind(rawObj)</code> 改为 <code>.bind(clone)</code>。</p></blockquote>`,23)])])}const r=s(l,[["render",c],["__file","vue3-deep-clone-solution.html.vue"]]),t=JSON.parse('{"path":"/blog/vue3-deep-clone-solution.html","title":"Vue3 实战：解决深拷贝导致的“Maximum call stack size”与“函数丢失”问题","lang":"zh-CN","frontmatter":{},"filePathRelative":"blog/vue3-deep-clone-solution.md","git":{"createdTime":1774270097000,"updatedTime":1774270097000,"contributors":[{"name":"黄玉洛","email":"huangyuluo@huangyuluodeMacBook-Pro.local","commits":1}]}}');export{r as comp,t as data};
