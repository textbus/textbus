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
    html { height: 100% }
    body { 
      min-height: 100%; 
      font-size: 14px; 
      padding: 8px;
      margin: 0; 
      box-sizing: border-box; 
      text-size-adjust: none;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    p {
      margin-top: 5px;
      margin-bottom: 5px;
    }
  </style>
</head>
<body contenteditable><p><br></p></body>
</html>
`;
