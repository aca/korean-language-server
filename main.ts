#!/usr/bin/env node
import {
  CodeAction,
  CodeActionKind,
  Command,
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  // Position,
  // Range,
  TextDocumentEdit,
  TextDocuments,
  TextDocumentSyncKind,
  TextEdit
} from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import axios from "axios";
const queryString = require("query-string");
const he = require("he");
const connection = createConnection();
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
documents.listen(connection);

connection.console.info(
  `korean language server running in node ${process.version}`
);

connection.onInitialize(() => {
  return {
    capabilities: {
      codeActionProvider: true,
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental
      },
      executeCommandProvider: {
        commands: ["korean.quickfix"]
      }
    }
  };
});

const getErrorList = async (text: string): Promise<any[]> => {
  connection.console.info(`getting error list`);

  if(text == "") {
    return [];
  }

  return axios
    .post(
      "http://speller.cs.pusan.ac.kr/results",
      queryString.stringify({ text1: text.replace(/\n/g, "\r") })
    )
    .then(({ data }) => {
      const startIndex = data.indexOf("data = [{");
      const nextIndex = data.indexOf("}];");

      const rawData = data.substring(startIndex + 7, nextIndex + 2);
      let xxx: SpellerResponse[] = JSON.parse(rawData);
      return xxx[0]?.errInfo?.map((match: ErrInfo) => {
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

const getDiagnostics = async (txt: any): Promise<any[]> => {
  const errList = await getErrorList(txt.getText());
  return new Promise(resolve => {
    resolve(errList.map(errToDiagnostic(txt)));
  });
};

const errToDiagnostic = txt => ({ start, end, msg }) => ({
  severity: DiagnosticSeverity.Warning,
  range: {
    start: txt.positionAt(start),
    end: txt.positionAt(end)
  },
  message: `${msg}`,
  source: "korean"
});

async function validate(document: TextDocument) {
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
    .map((diagnosis: Diagnostic) => {
      let msg = diagnosis.message;
      let fixList = msg.substr(0, msg.indexOf("\n")).split("|");
      return fixList.map(newStr => {
        const orgStr = textDocument.getText(diagnosis.range);
        return CodeAction.create(
          `${orgStr} => ${newStr}`,
          Command.create(
            newStr,
            "korean.quickfix",
            textDocument.uri,
            diagnosis,
            newStr
          ),
          CodeActionKind.QuickFix
        );
      });
    })
    .flat();
});

connection.onExecuteCommand(async params => {
  if (params.command !== "korean.quickfix" || params.arguments === undefined) {
    return;
  }

  const textDocument = documents.get(params.arguments[0]);
  if (textDocument === undefined) {
    return;
  }

  const diagnosis: Diagnostic = params.arguments[1];
  const newStr = params.arguments[2];

  connection.workspace.applyEdit({
    documentChanges: [
      TextDocumentEdit.create(
        { uri: textDocument.uri, version: textDocument.version },
        [TextEdit.replace(diagnosis.range, newStr)]
      )
    ]
  });
});

connection.listen();

const htmltoString = (rawStr: string) => {
  let msg = he.unescape(
    rawStr.replace(/<br\/>/g, `\n`).replace("도움말 정보 없음", "")
  );
  msg = msg.replace(/^\s*$(?:\r\n?|\n)/gm, "");
  return msg;
};

// Sample response from api
// [
//   {
//     "str": "안뇽",
//     "errInfo": [
//       {
//         "help": "어린이들의 발음을 흉내내어 &apos;안뇽&apos;이라고 말하는 사람들이 종종 있습니다. 특히, 글을 쓸 때는 이러한 단어를 쓰지 않 도록 합시다.",
//         "errorIdx": 0,
//         "correctMethod": 2,
//         "start": 0,
//         "end": 2,
//         "orgStr": "안뇽",
//         "candWord": "안녕"
//       }
//     ],
//     "idx": 0
//   }
// ]

export interface SpellerResponse {
  str: string;
  errInfo: ErrInfo[];
  idx: number;
}

export interface ErrInfo {
  help: string;
  errorIdx: number;
  correctMethod: number;
  start: number;
  end: number;
  orgStr: string;
  candWord: string;
}

