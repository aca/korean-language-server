#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const axios_1 = require("axios");
const queryString = require("query-string");
const he = require("he");
const connection = vscode_languageserver_1.createConnection();
const documents = new vscode_languageserver_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
documents.listen(connection);
connection.console.info(`korean language server running in node ${process.version}`);
connection.onInitialize(() => {
    return {
        capabilities: {
            codeActionProvider: true,
            textDocumentSync: {
                openClose: true,
                change: vscode_languageserver_1.TextDocumentSyncKind.Incremental
            },
            executeCommandProvider: {
                commands: ["korean.quickfix"]
            }
        }
    };
});
const getErrorList = async (text) => {
    connection.console.info(`getting error list`);
    if (text == "") {
        return [];
    }
    return axios_1.default
        .post("http://speller.cs.pusan.ac.kr/results", queryString.stringify({ text1: text.replace(/\n/g, "\r") }))
        .then(({ data }) => {
        var _a, _b;
        const startIndex = data.indexOf("data = [{");
        const nextIndex = data.indexOf("}];");
        const rawData = data.substring(startIndex + 7, nextIndex + 2);
        let xxx = JSON.parse(rawData);
        return (_b = (_a = xxx[0]) === null || _a === void 0 ? void 0 : _a.errInfo) === null || _b === void 0 ? void 0 : _b.map((match) => {
            return {
                start: match.start,
                end: match.end,
                msg: `${match.candWord}\n${htmltoString(match.help)}`
            };
        });
    })
        .catch(error => {
        connection.console.error(JSON.stringify(error));
        return [];
    });
};
const getDiagnostics = async (txt) => {
    const errList = await getErrorList(txt.getText());
    return new Promise(resolve => {
        resolve(errList.map(errToDiagnostic(txt)));
    });
};
const errToDiagnostic = txt => ({ start, end, msg }) => ({
    severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
    range: {
        start: txt.positionAt(start),
        end: txt.positionAt(end)
    },
    message: `${msg}`,
    source: "korean"
});
async function validate(document) {
    const diagnosticList = await getDiagnostics(document);
    connection.sendDiagnostics({
        uri: document.uri,
        version: document.version,
        diagnostics: diagnosticList
    });
}
documents.onDidOpen(event => {
    validate(event.document);
});
documents.onDidChangeContent(event => {
    validate(event.document);
});
connection.onCodeAction(params => {
    if (params.context.diagnostics.length == 0) {
        return undefined;
    }
    const textDocument = documents.get(params.textDocument.uri);
    if (textDocument === undefined) {
        return undefined;
    }
    return params.context.diagnostics
        .map((diagnosis) => {
        let msg = diagnosis.message;
        let fixList = msg.substr(0, msg.indexOf("\n")).split("|");
        return fixList.map(newStr => {
            const orgStr = textDocument.getText(diagnosis.range);
            return vscode_languageserver_1.CodeAction.create(`${orgStr} => ${newStr}`, vscode_languageserver_1.Command.create(newStr, "korean.quickfix", textDocument.uri, diagnosis, newStr), vscode_languageserver_1.CodeActionKind.QuickFix);
        });
    })
        .flat();
});
connection.onExecuteCommand(async (params) => {
    if (params.command !== "korean.quickfix" || params.arguments === undefined) {
        return;
    }
    const textDocument = documents.get(params.arguments[0]);
    if (textDocument === undefined) {
        return;
    }
    const diagnosis = params.arguments[1];
    const newStr = params.arguments[2];
    connection.workspace.applyEdit({
        documentChanges: [
            vscode_languageserver_1.TextDocumentEdit.create({ uri: textDocument.uri, version: textDocument.version }, [vscode_languageserver_1.TextEdit.replace(diagnosis.range, newStr)])
        ]
    });
});
connection.listen();
const htmltoString = (rawStr) => {
    let msg = he.unescape(rawStr.replace(/<br\/>/g, `\n`).replace("도움말 정보 없음", ""));
    msg = msg.replace(/^\s*$(?:\r\n?|\n)/gm, "");
    return msg;
};
//# sourceMappingURL=main.js.map