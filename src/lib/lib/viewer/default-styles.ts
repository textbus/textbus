export const defaultStyleSheets = [`
  body {
    font-size: 14px;
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
}`, `table{border-spacing:0;width:100%;min-width:100%;margin-bottom:1em;background-color:#fff}table>thead>tr>th,table>thead>tr>td{text-align:left;padding:8px 15px;border-bottom:1px solid #dddee1;background-color:#f8f8f9}table>tfoot>tr>th,table>tfoot>tr>td{background-color:#f1f2f3}table>tbody>tr>td,table>tfoot>tr>td{font-weight:400;padding:8px 15px;border-bottom:1px solid #e9eaec}table>tbody>tr>th,table>tfoot>tr>th{font-weight:500;text-align:right;padding:8px 15px;border-bottom:1px solid #e9eaec}table>thead:first-child>tr:first-child,table>tbody:first-child>tr:first-child,table>tfoot:first-child>tr:first-child{border-top-left-radius:4px;border-top-right-radius:4px}table>thead:first-child>tr:first-child>td:first-child,table>thead:first-child>tr:first-child>th:first-child,table>tbody:first-child>tr:first-child>td:first-child,table>tbody:first-child>tr:first-child>th:first-child,table>tfoot:first-child>tr:first-child>td:first-child,table>tfoot:first-child>tr:first-child>th:first-child{border-top-left-radius:4px}table>thead:first-child>tr:first-child>td:last-child,table>thead:first-child>tr:first-child>th:last-child,table>tbody:first-child>tr:first-child>td:last-child,table>tbody:first-child>tr:first-child>th:last-child,table>tfoot:first-child>tr:first-child>td:last-child,table>tfoot:first-child>tr:first-child>th:last-child{border-top-right-radius:4px}table>thead:last-child>tr:last-child>td:first-child,table>thead:last-child>tr:last-child>th:first-child,table>tbody:last-child>tr:last-child>td:first-child,table>tbody:last-child>tr:last-child>th:first-child,table>tfoot:last-child>tr:last-child>td:first-child,table>tfoot:last-child>tr:last-child>th:first-child{border-bottom-left-radius:4px}table>thead:last-child>tr:last-child>td:last-child,table>thead:last-child>tr:last-child>th:last-child,table>tbody:last-child>tr:last-child>td:last-child,table>tbody:last-child>tr:last-child>th:last-child,table>tfoot:last-child>tr:last-child>td:last-child,table>tfoot:last-child>tr:last-child>th:last-child{border-bottom-right-radius:4px}table>thead:first-child>tr:first-child>th,table>thead:first-child>tr:first-child>td,table>tbody:first-child>tr:first-child>th,table>tbody:first-child>tr:first-child>td,table>tfoot:first-child>tr:first-child>th,table>tfoot:first-child>tr:first-child>td{border-top:1px solid #e9eaec}table>thead>tr>td,table>thead>tr>th,table>tbody>tr>td,table>tbody>tr>th,table>tfoot>tr>td,table>tfoot>tr>th{border-left:1px solid #e9eaec}table>thead>tr>td:last-child,table>thead>tr>th:last-child,table>tbody>tr>td:last-child,table>tbody>tr>th:last-child,table>tfoot>tr>td:last-child,table>tfoot>tr>th:last-child{border-right:1px solid #e9eaec}`, `a {
      text-decoration: underline;
      color: #449fdb;
    }`]
