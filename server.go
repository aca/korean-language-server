package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"

	"github.com/sourcegraph/go-lsp"
	"github.com/sourcegraph/jsonrpc2"
	"go.uber.org/atomic"
)

type server struct {
	conn           *jsonrpc2.Conn
	rootURI        string // from initliaze param
	rootDir        string
	logger         *log.Logger
	documents      map[lsp.DocumentURI]*atomic.String
	diagnosticChan chan lsp.DocumentURI
}

func (s *server) update(uri lsp.DocumentURI) {
	select {
	case s.diagnosticChan <- lsp.DocumentURI(uri):
	default:
		s.logger.Println("skip diagnostic")
	}
}

func (s *server) handleWorkspaceExecuteCommand(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (result interface{}, err error) {
	if req.Params == nil {
		return nil, &jsonrpc2.Error{Code: jsonrpc2.CodeInvalidParams}
	}

	var params lsp.ExecuteCommandParams
	err = json.Unmarshal(*req.Params, &params)
	if err != nil {
		return nil, err
	}

	// TODO:
	// changes := make(map[string][]lsp.TextEdit)
	//
	// uri, ok := params.Arguments[0].(string)
	// if !ok {
	//   s.logger.Println("not string")
	//   return nil, nil
	// }

	// changes[uri] = []lsp.TextEdit{
	// 	{
	// 		Range: lsp.Range{
	// 			Start: lsp.Position{Line: 1, Character: 1},
	// 			End:   lsp.Position{Line: 1, Character: 2},
	// 		},
	// 		NewText: "new",
	// 	},
	// }
	//
	// editResult := new(json.RawMessage)
	//
	// s.conn.Call(
	// 	context.Background(),
	// 	"workspace/applyEdit",
	// 	&lsp.WorkspaceEdit{
	// 		Changes: changes,
	// 	},
	// 	editResult,
	// )
	//
	// s.logger.Println(editResult)

	return nil, nil
}

func (s *server) handleTextDocumentCodeAction(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (result interface{}, err error) {
	if req.Params == nil {
		return nil, &jsonrpc2.Error{Code: jsonrpc2.CodeInvalidParams}
	}

	var params lsp.CodeActionParams
	err = json.Unmarshal(*req.Params, &params)
	if err != nil {
		return nil, err
	}

	if len(params.Context.Diagnostics) == 0 {
		return nil, nil
	}

	commands := make([]lsp.Command, 0)

	for _, diagnostic := range params.Context.Diagnostics {
		helpmsgs := strings.Split(diagnostic.Message, "\n")
		if len(helpmsgs) == 0 {
			continue
		}

		if helpmsgs[0] == "" {
			continue
		}

		newCmd := lsp.Command{
			Title:   helpmsgs[0],
			Command: "korean.quickfix",
			Arguments: []interface{}{
				params.TextDocument.URI,
			},
		}

		commands = append(commands, newCmd)
	}

	return commands, nil
}

func (s *server) diagnostic() {
	for {
		s.logger.Println("diagnostic start")
		uri, _ := <-s.diagnosticChan

		text := s.documents[uri].Load()
		textRunes := []rune(text)

		spellerResponse, err := Diagnostic(text)
		if err != nil {
			s.logger.Println(err)
			continue
		}

		s.logger.Println(spellerResponse)
		if len(spellerResponse) == 0 {
			s.logger.Println("len(spellerResponse) == 0")
			continue
		}

		if len(spellerResponse[0].ErrInfo) == 0 {
			s.logger.Println("no error found")
			continue
		}

		diagnostics := []lsp.Diagnostic{}

		for _, errInfo := range spellerResponse[0].ErrInfo {
			startL, startC := 0, 0
			endL, endC := 0, 0
			for c := 0; c <= errInfo.Start; c++ {
				if textRunes[c] == '\n' {
					startL += 1
					startC = 0
				} else {
					startC += 1
				}
			}

			endL = startL

			for c := errInfo.Start; c <= errInfo.End; c++ {
				if textRunes[c] == '\n' {
					endL += 1
					endC = 0
				} else {
					endL += 1
				}
			}

			diagnostics = append(diagnostics, lsp.Diagnostic{
				Range: lsp.Range{
					Start: lsp.Position{Line: startL, Character: startC},
					End:   lsp.Position{Line: endL, Character: endC},
				},
				Message:  errInfo.CandWord + "\n" + errInfo.Help,
				Severity: 4,
			})

			s.logger.Println(diagnostics)
		}

		s.conn.Notify(
			context.Background(),
			"textDocument/publishDiagnostics",
			&lsp.PublishDiagnosticsParams{
				URI:         uri,
				Diagnostics: diagnostics,
			})
	}
}

func (s *server) handleTextDocumentDidOpen(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (result interface{}, err error) {
	if req.Params == nil {
		return nil, &jsonrpc2.Error{Code: jsonrpc2.CodeInvalidParams}
	}

	s.logger.Println("handleTextDocumentDidOpen")
	var params lsp.DidOpenTextDocumentParams
	err = json.Unmarshal(*req.Params, &params)
	if err != nil {
		return nil, err
	}

	s.documents[params.TextDocument.URI] = atomic.NewString(params.TextDocument.Text)
	s.logger.Println("error here")
	s.update(params.TextDocument.URI)
	s.logger.Println("handleTextDocumentDidOpen done")
	return nil, nil
}

func (s *server) handleTextDocumentDidChange(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (result interface{}, err error) {
	if req.Params == nil {
		return nil, &jsonrpc2.Error{Code: jsonrpc2.CodeInvalidParams}
	}

	s.logger.Println("handleTextDocumentDidChange")
	defer s.logger.Println("handleTextDocumentDidChange")

	var params lsp.DidChangeTextDocumentParams
	err = json.Unmarshal(*req.Params, &params)
	if err != nil {
		return nil, err
	}

	if len(params.ContentChanges) != 1 {
		return nil, fmt.Errorf("len(params.ContentChanges) = %v", len(params.ContentChanges))
	}

	s.documents[params.TextDocument.URI].Store(params.ContentChanges[0].Text)
	s.update(params.TextDocument.URI)
	return nil, nil
}

func (s *server) handleInitialize(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (result interface{}, err error) {
	s.logger.Print("handleInitialize")
	if req.Params == nil {
		return nil, &jsonrpc2.Error{Code: jsonrpc2.CodeInvalidParams}
	}

	s.conn = conn

	var params lsp.InitializeParams
	if err := json.Unmarshal(*req.Params, &params); err != nil {
		return nil, err
	}

	u, err := url.ParseRequestURI(string(params.RootURI))
	if err != nil {
		return nil, err
	}

	s.rootDir = u.EscapedPath()

	initializeResult := lsp.InitializeResult{
		Capabilities: lsp.ServerCapabilities{
			CodeActionProvider: true,
			ExecuteCommandProvider: &lsp.ExecuteCommandOptions{
				Commands: []string{"korean.quickfix"},
			},
			TextDocumentSync: &lsp.TextDocumentSyncOptionsOrKind{
				Options: &lsp.TextDocumentSyncOptions{
					OpenClose: true,
					Change:    lsp.TDSKFull,
				},
			},
			DefinitionProvider: false,
			HoverProvider:      false,
		},
	}

	go s.diagnostic()

	return initializeResult, nil
}

func (s *server) handle(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (result interface{}, err error) {
	switch req.Method {
	case "initialize":
		return s.handleInitialize(ctx, conn, req)
	case "initialized":
		return
	case "shutdown":
		os.Exit(0)
		return
	case "textDocument/didOpen":
		return s.handleTextDocumentDidOpen(ctx, conn, req)
	case "textDocument/didChange":
		return s.handleTextDocumentDidChange(ctx, conn, req)
	case "textDocument/codeAction":
		return s.handleTextDocumentCodeAction(ctx, conn, req)
	case "workspace/executeCommand":
		return s.handleWorkspaceExecuteCommand(ctx, conn, req)
	}

	return nil, &jsonrpc2.Error{Code: jsonrpc2.CodeMethodNotFound, Message: fmt.Sprintf("method not supported: %s", req.Method)}
}
