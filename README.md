# korean-language-server
[Language server implementation](https://microsoft.github.io/language-server-protocol/) for Korean,
powered by [한국어 맞춤법/문법 검사기](https://speller.cs.pusan.ac.kr/).  

It's Korean version of [grammarly](http://www.grammarly.com/), famous writing assitant app for English.  
As grammarly does, it detects Korean grammar error, supports code action.

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

Should work with any lsp client implementation, vscode/emacs/sublime/vim.

- vim/neovim, [ coc.nvim ](https://github.com/neoclide/coc.nvim)
  ```json
  "languageserver": {
    "korean": {
      "command": "korean-ls",
      "args": ["--stdio"],
      "filetypes": ["text"]
    },
  ```
- nvim-lsp
  ```lua
  local nvim_lsp = require'nvim_lsp'
  local configs = require'nvim_lsp/configs'
  configs.korean_ls = {
    default_config = {
      cmd = {'korean-ls', '--stdio'};
      filetypes = {'text'};
      root_dir = function()
        return vim.loop.cwd()
      end;
      settings = {};
    };
  }

  nvim_lsp.korean_ls.setup{}
  ```
