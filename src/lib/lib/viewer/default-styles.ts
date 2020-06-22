export const defaultStyleSheets = [`
  body {
    padding: 8px;
    margin: 0;
    }
  p { 
    margin-top: 5px; 
    margin-bottom: 5px; 
  }`, `blockquote {
  padding: 10px 15px;
  border-left: 10px solid #dddee1;
  background-color: #f8f8f9;
  margin: 1em 0;
  border-radius: 4px;
}`, `code, pre {
  background-color: rgba(0, 0, 0, .03);
}

pre code {
  padding: 0;
  border: none;
  background: none;
  border-radius: 0;
  vertical-align: inherit;
}

code {
  padding: 1px 5px;
  border-radius: 3px;
  vertical-align: middle;
  border: 1px solid rgba(0, 0, 0, .08);
}

pre {
  line-height: 1.418em;
  padding: 15px;
  border-radius: 5px;
  border: 1px solid #e9eaec;
  word-break: break-all;
  word-wrap: break-word;
  white-space: pre-wrap;

}

code, kbd, pre, samp {
  font-family: Microsoft YaHei Mono, Menlo, Monaco, Consolas, Courier New, monospace;
}`, `[style*=color]:not([style*=background-color]) a {
  color: inherit;
}`, `table {
      border-spacing: 0;
      border-collapse: collapse;
      width: 100%;
      background-color: #fff;
    }
    td, th {
      border: 1px solid #aaa;
}`, `a {
      text-decoration: underline;
      color: #449fdb;
}`]
