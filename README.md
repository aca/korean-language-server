# korean-language-server
[Language server implementation](https://microsoft.github.io/language-server-protocol/) for Korean,
powered by [한국어 맞춤법/문법 검사기](https://speller.cs.pusan.ac.kr/).  

It's Korean version of [grammarly](http://www.grammarly.com/), famous writing assitant app for English.  
As grammarly does, it detects Korean grammar error, supports quick fix. It also supports some level of english.

![sample](./sample.gif)

---


### Installation
```
npm i -g korean-ls
```

### Development
```
git clone git@github.com:aca/korean-language-server.git && cd korean-language-server 
npm run build
npm link
```
---
### Integration

Should work with any client implementation, vscode/emacs/sublime/vim.

- vim/neovim, [ coc.nvim ](https://github.com/neoclide/coc.nvim)

  Recommend this mapping in your ```.vimrc```
  ```
  " Fix autofix problem of current line
  nmap <leader>qf  <Plug>(coc-fix-current)
  ```

  Configure language server ```$ nvim -c ':CocConfig'```
  ```
  "languageserver": {
    "korean": {
      "command": "korean-ls",
      "args": ["--stdio"],
      "filetypes": ["text"]
    },
  ```
