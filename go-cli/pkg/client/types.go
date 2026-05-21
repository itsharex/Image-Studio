package client

import "errors"

const (
	BaseURL            = "" // 不再内置默认上游;调用方必须显式提供 Options.BaseURL
	TextModel          = "gpt-5.5"
	ImageModel         = "gpt-image-2"
	DefaultSize        = "1024x1024"
	DefaultQuality     = "auto"
	OutputFormat       = "png"
	MaxInputImageBytes = 50 * 1024 * 1024
	MaxAttempts        = 3
	// 所有出站请求的 User-Agent。sub2api / 中转站后台会把这串当客户端标识展示。
	// 改这里就同时影响 NativeTransport / CurlTransport / Images API 路径。
	UserAgent = "image-studio/0.1.0"
)

// Tunable knobs (exposed as vars so tests can shrink them).
var (
	RetryBackoffSeconds  = 15
	StatusIntervalSecond = 10
)

var SupportedImageMime = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
}

type SizeOption struct {
	Label string
	Value string
}

var SizeOptions = []SizeOption{
	{"自适应 auto(让上游决定)", "auto"},
	{"正方形 1024x1024", "1024x1024"},
	{"横版 1536x1024", "1536x1024"},
	{"竖版 1024x1536", "1024x1536"},
	{"宽屏 2048x1152", "2048x1152"},
	{"竖屏 1152x2048", "1152x2048"},
}

type QualityOption struct {
	Label string
	Value string
}

var QualityOptions = []QualityOption{
	{"标准 auto(推荐)", "auto"},
	{"高质量 high", "high"},
	{"中等 medium", "medium"},
	{"快速草稿 low", "low"},
}

// OutputFormatOption — gpt-image / Images API 支持的输出格式枚举。
type OutputFormatOption struct {
	Label string
	Value string
}

// OutputFormatOptions 列出可作为 output_format 参数的图像编码。
// "jpeg" 走标准 MIME 名,落盘时映射为 .jpg 扩展名。
var OutputFormatOptions = []OutputFormatOption{
	{"PNG(无损,推荐)", "png"},
	{"JPEG(更小)", "jpeg"},
	{"WebP", "webp"},
}

// FileExtForFormat 把 output_format(如 "jpeg")映射到文件扩展名(不含点)。
// 未知 / 空 → 回退到默认 OutputFormat 常量(png)。
func FileExtForFormat(format string) string {
	switch format {
	case "jpeg":
		return "jpg"
	case "jpg", "png", "webp":
		return format
	}
	return OutputFormat
}

// Mode is "generate" (text-to-image) or "edit" (image-to-image).
type Mode string

const (
	ModeGenerate Mode = "generate"
	ModeEdit     Mode = "edit"
)

// TransportKind selects HTTP implementation.
type TransportKind string

const (
	TransportAuto   TransportKind = "auto"
	TransportNative TransportKind = "native"
	TransportCurl   TransportKind = "curl"
)

// APIMode selects which upstream contract to use.
//
//   - APIModeResponses: 老路径,POST /v1/responses(OpenAI Responses API 形态)
//     模型内置的 image_generation 工具,SSE 流式 → 兼容 Cloudflare 524/504。
//   - APIModeImages: 标准 OpenAI Images API,POST /v1/images/generations(文生图)
//     与 /v1/images/edits(图生图,multipart),一次性 JSON 响应,无 SSE 保活,
//     适合走 cloudflare 比较稳的中转站,或上游不支持 Responses API 的场景。
type APIMode string

const (
	APIModeResponses APIMode = "responses"
	APIModeImages    APIMode = "images"
)

// Options drives a single image request.
type Options struct {
	APIKey  string
	Prompt  string
	Mode    Mode
	Size    string
	Quality string

	// OutputFormat:"png" | "jpeg" | "webp"。空时回退到 OutputFormat 常量。
	// Responses API 会把它放进 image_generation 工具的 output_format 参数;
	// Images API 同名字段(JSON 与 multipart 都支持)。落盘时按此值选扩展名。
	OutputFormat string

	// ImageDataURLs holds one or more data: URLs for edit / multi-reference
	// requests. When non-empty the request switches to "edit" action and each
	// URL becomes its own input_image content block (in order).
	ImageDataURLs []string

	// Deprecated: kept for callers that still pass a single source image.
	// If both are set, ImageDataURLs wins. Single URL is appended to the slice.
	ImageDataURL string

	// ImagePaths holds local filesystem paths of source images. Used by the
	// Images API (multipart upload of the raw file). When both ImageDataURLs
	// and ImagePaths are set, ImagePaths wins for Images API and ImageDataURLs
	// wins for Responses API.
	ImagePaths []string

	// APIMode selects between Responses API (default) and Images API.
	// Empty string is treated as APIModeResponses for back-compat.
	APIMode APIMode

	MaskB64 string // optional, reserved for Phase 3 GUI; omitted from payload when empty

	// Seed pins the random source so users can reproduce a result. 0 means
	// "let the model pick", and the field is then omitted from the payload.
	Seed int64

	// Negative prompt — only included when non-empty. Whether the upstream
	// gptcodex-image tool reads it varies; sent for forward compatibility.
	NegativePrompt string

	// Optional overrides for the URL and model IDs. Empty values fall back
	// to BaseURL / TextModel / ImageModel constants.
	BaseURL         string
	TextModelID     string
	ImageModelID    string

	// NoPromptRevision:Responses API 模式下,默认文本模型会把用户 prompt 改写
	// 一遍再喂给 image_generation 工具(返回里的 revised_prompt 字段就是改写版)。
	// 设为 true 时在 payload 顶层加 instructions 让模型逐字使用,适合用户已经
	// 精修过 prompt、不想被二次发挥的场景。Images API 路径忽略此字段(本来就不重写)。
	NoPromptRevision bool

	Transport TransportKind // auto | native | curl
}

// EffectiveImageDataURLs returns the merged list, deduplicating empty entries.
func (o Options) EffectiveImageDataURLs() []string {
	urls := make([]string, 0, len(o.ImageDataURLs)+1)
	for _, u := range o.ImageDataURLs {
		if u != "" {
			urls = append(urls, u)
		}
	}
	if o.ImageDataURL != "" {
		urls = append(urls, o.ImageDataURL)
	}
	return urls
}

// ImageResult is the extracted image payload.
type ImageResult struct {
	ImageB64      string
	RevisedPrompt string
	SourceEvent   string // "final" | "partial" | "json"
}

// Progress is streamed by Transport.Stream during a request.
type Progress struct {
	Stage   string // human-readable status, e.g. "图片正在生成"
	Elapsed int    // seconds since request start (filled by orchestrator, not Transport)
	Bytes   int64  // bytes received so far (filled by orchestrator)
}

// Request is what the transport actually sends.
type Request struct {
	URL     string
	APIKey  string
	Payload []byte // JSON-encoded payload (UTF-8)
}

// Sentinel errors so callers (and tests) can branch on cause.
var (
	ErrNoImageInResponse = errors.New("no image base64 in response")
	ErrEmptyPrompt       = errors.New("prompt must not be empty")
	ErrEmptyAPIKey       = errors.New("api key must not be empty")
)
