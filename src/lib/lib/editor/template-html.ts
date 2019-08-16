const styles = require('!!to-string-loader!!css-loader!!sass-loader!./template-style.scss');

export const template = `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>tanbo-editor</title>
  <style>
    ${styles}
  </style>
</head>
<body contenteditable><p>11111<strong>222</strong>3333</p></body>
</html>
`;
