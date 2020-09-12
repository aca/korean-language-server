package main

import (
	"context"
	"io/ioutil"
	"log"
	"net"
	"os"
	"time"

	"github.com/sourcegraph/go-lsp"
	"github.com/sourcegraph/jsonrpc2"
	"go.uber.org/atomic"
)

type DebugLogger struct {
	conn net.Conn
}

func main() {
	var connOpt []jsonrpc2.ConnOpt

	// Setup a debug logger,
	// You can send a log to client, but each clients implement different way to see / debug log.
	// So we just use simple trick to debug server.
	//
	// $ nc -lp 3000
	// Use netcat on the terminal like this, and this server would write log to it.
	logConn, err := net.Dial("tcp", "localhost:3000")
	var logger *log.Logger
	if err == nil {
		logger = log.New(logConn, "", log.LstdFlags|log.Lshortfile)
	} else {
		logger = log.New(ioutil.Discard, "", log.LstdFlags)
	}

	connOpt = append(connOpt, jsonrpc2.LogMessages(logger))

	s := &server{
		logger:         logger,
		documents:      make(map[lsp.DocumentURI]*atomic.String),
		diagnosticChan: make(chan lsp.DocumentURI),
	}

	s.logger.Print("start")

	go func() {
		for {
			s.logger.Print("ping")
			time.Sleep(time.Second * 20)
		}
	}()

	handler := jsonrpc2.HandlerWithError(s.handle)

	<-jsonrpc2.NewConn(
		context.Background(),
		jsonrpc2.NewBufferedStream(stdrwc{}, jsonrpc2.VSCodeObjectCodec{}),
		handler, connOpt...).DisconnectNotify()

	s.logger.Print("shutdown")
}

type stdrwc struct{}

func (stdrwc) Read(p []byte) (int, error) {
	return os.Stdin.Read(p)
}

func (c stdrwc) Write(p []byte) (int, error) {
	return os.Stdout.Write(p)
}

func (c stdrwc) Close() error {
	if err := os.Stdin.Close(); err != nil {
		return err
	}
	return os.Stdout.Close()
}
