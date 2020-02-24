# korean-language-server

<b>Experimental !</b> 

Language server implementation for Korean,
powered by [한국어 맞춤법/문법 검사기](https://speller.cs.pusan.ac.kr/).

![record](./record.svg)

---


### Installation
```
npm i -g  korean-language-server
```
or
```
git clone git@github.com:aca/korean-language-server.git && cd korean-language-server 
npm install
npm link
```
---
### Integration

Should work with any client implementation, vscode/emacs/sublime/vim. (But not tested)

- [ coc.nvim ](https://github.com/neoclide/coc.nvim)

  ```
  $ nvim -c ':CocConfig'

  "languageserver": {
    "korean": {
      "command": "korean-ls",
      "args": ["--stdio"],
      "filetypes": ["text"]
    },
  ```
