/**
 * 编辑器外部内容同步判定（CodeEditor 用）。
 *
 * 背景：CodeEditor 的文档只在 tabId/language 变化时重建；运行期 store 的
 * tab.content 还有其它合法变更源——大文件启动回读（reloadOmittedTabs）、
 * 编码切换重读等。需要把这类「外部变更」写进编辑器文档，但绝不能把
 * 编辑器自身防抖回写的内容再灌回来（既浪费又可能丢字）。
 *
 * 判定规则（优先级从上到下）：
 * 1. 编辑器文档与 store 内容一致 → 不需要（含双方都空的初始态）；
 * 2. store 内容 === 上次编辑器回写内容（同一引用，=== 引用比较 O(1)）→
 *    是自己回写的，跳过——这是击键热路径，300ms 防抖一次也不能做成 O(N) 比较；
 * 3. 其余 → 外部变更，需要同步。
 *
 * 注意规则 2 依赖调用方在回写 store 时用同一字符串引用记录 lastSynced：
 * editor 文档有未 flush 的本地编辑时（editorDoc ≠ lastSynced），即使 store
 * 看起来是「旧值」也不回灌，防丢字。
 */
export function shouldApplyExternalContent(
  editorDoc: string,
  storeContent: string,
  lastSynced: string | null
): boolean {
  if (editorDoc === storeContent) return false;
  if (lastSynced !== null && storeContent === lastSynced) return false;
  return true;
}
