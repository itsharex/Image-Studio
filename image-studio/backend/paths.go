package backend

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"

	"github.com/yuanhua/image-gptcodex/pkg/client"
)

// defaultOutputDir 返回「输出根目录」(不带 images/log 子目录)。
// 实际落盘位置由调用方走 imagesSubdir / logSubdir 拼出来。
// 默认 = %APPDATA%/image-studio,失败回退到 ./image-studio-output
func defaultOutputDir() (string, error) {
	cfg, err := os.UserConfigDir()
	if err != nil {
		return filepath.Join(".", "image-studio-output"), nil
	}
	return filepath.Join(cfg, "image-studio"), nil
}

// imagesSubdir / logSubdir 把根目录拆为「生成的 PNG」和「原始响应/排错日志」两个子文件夹。
// 用户在 SettingsPanel 里可以「打开输出目录」=> 落到根,所以两类内容在同一个文件夹下并列。
func imagesSubdir(root string) string { return filepath.Join(root, "images") }
func logSubdir(root string) string    { return filepath.Join(root, "log") }

// importsDir holds files dropped/pasted into the canvas, plus rotation/flip/
// crop derivatives. Separate from `images/` so the user can manage them apart.
func importsDir() (string, error) {
	cfg, err := os.UserConfigDir()
	if err != nil {
		return filepath.Join(".", "imports"), nil
	}
	return filepath.Join(cfg, "image-studio", "imports"), nil
}

// writeBase64PNG decodes a base64 image and writes it atomically; returns the
// absolute path of the written file.
func writeBase64PNG(b64, path string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", err
	}
	abs, _ := filepath.Abs(path)
	return abs, nil
}

// buildImageName composes the canonical filename for a generated image, e.g.
// `image-generate-cyberpunk-cat-20260518-210500.png`.
// outputFormat 来自 GenerateOptions.OutputFormat,空时回退到 client.OutputFormat。
// 扩展名走 client.FileExtForFormat 标准化(jpeg→jpg)。
func buildImageName(mode client.Mode, prompt, timestamp, outputFormat string) string {
	prefix := "generate"
	if mode == client.ModeEdit {
		prefix = "edit"
	}
	slug := client.Slugify(prompt, "image")
	ext := client.FileExtForFormat(outputFormat)
	return fmt.Sprintf("image-%s-%s-%s.%s", prefix, slug, timestamp, ext)
}
