export function buildPreviewHtml(params: {
  vendorAbs: string
  viewflyAbs: string
  userModuleUrl: string
  /** 用户样式（blob: URL），由编辑器内 style.css 生成 */
  userStylesheetUrl?: string
}): string {
  const { vendorAbs, viewflyAbs, userModuleUrl, userStylesheetUrl } = params
  const importMap = {
    imports: {
      'reflect-metadata': vendorAbs,
      '@textbus/core': vendorAbs,
      '@textbus/platform-browser': vendorAbs,
      '@textbus/adapter-viewfly': vendorAbs,
      '@viewfly/core': viewflyAbs,
      /** automatic JSX 会 import 子路径；须单独映射（与主入口共用同一 viewfly.mjs） */
      '@viewfly/core/jsx-runtime': viewflyAbs,
      '@viewfly/core/jsx-dev-runtime': viewflyAbs,
      '@viewfly/platform-browser': viewflyAbs,
    },
  }

  const userCssLink = userStylesheetUrl
    ? `  <link rel="stylesheet" href="${userStylesheetUrl}" />\n`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${userCssLink}  <script type="importmap">${JSON.stringify(importMap)}</script>
</head>
<body>
  <div id="boot-error"></div>
  <div id="root"></div>
  <script type="module">
    const errEl = document.getElementById('boot-error');
    window.addEventListener('error', e => {
      errEl.textContent = (errEl.textContent || '') + e.message + '\\n' + (e.error?.stack || '') + '\\n';
    });
    window.addEventListener('unhandledrejection', e => {
      errEl.textContent = (errEl.textContent || '') + String(e.reason) + '\\n';
    });
    try {
      await import(${JSON.stringify(userModuleUrl)});
    } catch (e) {
      errEl.textContent = (errEl.textContent || '') + (e?.stack || String(e));
    }
  </script>
</body>
</html>`
}
