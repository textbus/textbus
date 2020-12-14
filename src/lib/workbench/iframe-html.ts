export const iframeHTML = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>@tanbo/textbus</title>
  <style>
    html {
      height: 100%
    }
    body {
      padding: 0;
      margin: 0;
      min-height: 100%;
      box-sizing: border-box;
      text-size-adjust: none;
      cursor: text;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    ::selection {
      background-color: rgba(18, 150, 219, .2);
    }
    img.tb-image-loaded {
      animation: tb-fadein 1.2s;
    }
    @keyframes tb-fadein {
      from{opacity: 0} to {opacity: 1}
    }
  </style>
</head>
<body></body>
</html>
`.replace(/\n/g, '').replace(/\s+/g, ' ').replace(/'/g, '\\\'');
