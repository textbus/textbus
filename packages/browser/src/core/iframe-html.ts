export function getIframeHTML() {
  return `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>@textbus/textbus</title>
  <style>
    html {
      height: 100%;
      cursor: text;
    }
    body {
      /*min-height: 100%;*/
      padding: 0 8px;
      margin: 0;
      overflow: hidden;
      text-size-adjust: none;
      cursor: text;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    body::after, body::before {
      content: "";
      display: table;
      clear: both;
    }
    ::selection {
      background-color: rgba(18, 150, 219, .2);
    }
    [textbus-editable=off] > * {
      user-select: none;
      cursor: default;
    }
    [textbus-editable=on] {
      user-select: text;
      cursor: text;
    }
  </style>
</head>
<body>
</body>
</html>
`
}
