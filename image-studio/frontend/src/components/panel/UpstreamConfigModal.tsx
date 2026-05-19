import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { useStudioStore } from "../../state/studioStore";

// UpstreamConfigModal — 上游接入的统一配置入口。
//
// 首次启动若 (apiKey || baseURL) 为空会自动弹出;之后可由「设置 → 修改上游配置」
// 或 ControlPanel 顶部的「🔧 上游配置」按钮手动呼起。
// 「保存」只 commit 当前编辑值;「取消」直接关闭(下次启动若仍不完整会再弹)。
export function UpstreamConfigModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    apiMode, baseURL, apiKey, textModelID, imageModelID,
    setField, setAPIKey,
    testAPIKey, isTestingKey,
  } = useStudioStore();

  // 本地草稿态:用户可能改了字段又取消,不应污染全局 state。
  // 弹窗每次打开时同步全局 → 本地。
  const [draftApiMode, setDraftApiMode] = useState<"responses" | "images">(apiMode);
  const [draftBaseURL, setDraftBaseURL] = useState(baseURL);
  const [draftApiKey, setDraftApiKey] = useState(apiKey);
  const [draftTextModel, setDraftTextModel] = useState(textModelID);
  const [draftImageModel, setDraftImageModel] = useState(imageModelID);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftApiMode(apiMode);
      setDraftBaseURL(baseURL);
      setDraftApiKey(apiKey);
      setDraftTextModel(textModelID);
      setDraftImageModel(imageModelID);
    }
  }, [open, apiMode, baseURL, apiKey, textModelID, imageModelID]);

  const canSave = draftBaseURL.trim() && draftApiKey.trim();

  function save() {
    setField("apiMode", draftApiMode);
    setField("baseURL", draftBaseURL.trim());
    setAPIKey(draftApiKey.trim());
    setField("textModelID", draftTextModel.trim());
    setField("imageModelID", draftImageModel.trim());
    onClose();
  }

  // 在 modal 内点「测试连接」需要先把草稿提交,否则测试用的是旧值。
  function testWithCurrentDraft() {
    if (!canSave) return;
    setField("apiMode", draftApiMode);
    setField("baseURL", draftBaseURL.trim());
    setAPIKey(draftApiKey.trim());
    setField("textModelID", draftTextModel.trim());
    setField("imageModelID", draftImageModel.trim());
    // setAPIKey 是异步触发 setState,但 testAPIKey 在下一个 tick 读 get() 时能拿到新值。
    setTimeout(() => testAPIKey(), 0);
  }

  return (
    <Modal open={open} onClose={onClose} title="上游配置" width={520}>
      <div className="upstream-form">
        {/* API 形态 */}
        <div className="upstream-row">
          <label className="head">API 形态</label>
          <div className="api-mode-grid">
            <button
              className={`api-mode-btn ${draftApiMode === "responses" ? "active" : ""}`}
              onClick={() => setDraftApiMode("responses")}
              type="button"
            >
              <span className="api-mode-title">Responses API</span>
              <span className="api-mode-sub">SSE 保活(CF 超时推荐)</span>
            </button>
            <button
              className={`api-mode-btn ${draftApiMode === "images" ? "active" : ""}`}
              onClick={() => setDraftApiMode("images")}
              type="button"
            >
              <span className="api-mode-title">Images API</span>
              <span className="api-mode-sub">标准 generations / edits</span>
            </button>
          </div>
          <div className="settings-hint">
            {draftApiMode === "responses" ? (
              <>
                通过 <code>/v1/responses</code> 调用模型内置的 <code>image_generation</code> 工具,
                SSE 流式接收 —— 能防 Cloudflare 524/504 超时截断。<br />
                <strong>需要 key 绑定到「拥有 gpt-5.5 模型的分组」</strong>(余额/套餐),不是 image-2 分组。
              </>
            ) : (
              <>
                通过标准 <code>/v1/images/generations</code>(文生图)+ <code>/v1/images/edits</code>
                (图生图,multipart 上传)。一次性 JSON 响应,无 SSE 保活,长推理上 CF 524 风险更高,
                但兼容性最广。<br />
                <strong>可使用标准的 image-2 / image API 分组</strong>(不需要 gpt-5.5 权限)。
              </>
            )}
          </div>
        </div>

        {/* BASE_URL */}
        <div className="upstream-row">
          <label className="head">上游 BASE_URL <span className="req">*</span></label>
          <input
            className="input"
            type="text"
            value={draftBaseURL}
            placeholder="https://your-relay.example.com"
            onChange={(e) => setDraftBaseURL(e.target.value)}
            spellCheck={false}
            autoFocus={!draftBaseURL}
          />
        </div>

        {/* API Key */}
        <div className="upstream-row">
          <label className="head">API Key <span className="req">*</span></label>
          <div className="key-input-wrap">
            <input
              className="input"
              type={showKey ? "text" : "password"}
              value={draftApiKey}
              placeholder="sk-..."
              onChange={(e) => setDraftApiKey(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className="key-toggle-btn"
              onClick={() => setShowKey((v) => !v)}
              title={showKey ? "隐藏" : "显示"}
            >
              {showKey ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* 文本模型 ID — 只对 Responses API 有意义 */}
        {draftApiMode === "responses" && (
          <div className="upstream-row">
            <label className="head">文本模型 ID</label>
            <input
              className="input"
              type="text"
              value={draftTextModel}
              placeholder="留空=默认 gpt-5.5"
              onChange={(e) => setDraftTextModel(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}

        {/* 图像模型 ID */}
        <div className="upstream-row">
          <label className="head">图像模型 ID</label>
          <input
            className="input"
            type="text"
            value={draftImageModel}
            placeholder={
              draftApiMode === "responses"
                ? "留空=默认 gpt-image-2(由 image_generation 工具触发)"
                : "留空=默认 gpt-image-2(直接传给 Images API)"
            }
            onChange={(e) => setDraftImageModel(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* 测试连接 */}
        <div className="upstream-row">
          <button
            className="btn secondary"
            type="button"
            onClick={testWithCurrentDraft}
            disabled={!canSave || isTestingKey}
            style={{ width: "100%" }}
          >
            {isTestingKey ? "测试中..." : "🔌 测试连接(会先保存草稿)"}
          </button>
        </div>

        {/* 操作 */}
        <div className="upstream-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            稍后再配
          </button>
          <button
            className="btn"
            type="button"
            onClick={save}
            disabled={!canSave}
          >
            保存
          </button>
        </div>
        {!canSave && (
          <div className="settings-hint" style={{ marginTop: 6 }}>
            BASE_URL 和 API Key 至少要填一次才能开始生成。
          </div>
        )}
      </div>
    </Modal>
  );
}
