#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var axios = require("axios");
var winston = require("winston");
var querystring = require("querystring");
var _a = require("vscode-languageserver"), DiagnosticSeverity = _a.DiagnosticSeverity, TextDocuments = _a.TextDocuments, createConnection = _a.createConnection;
var TextDocument = require("vscode-languageserver-textdocument").TextDocument;
var he = require("he");
// const logger = winston.createLogger({
//   transports: [
//     new winston.transports.File({ filename: "/tmp/korean-lsp.log" })
//   ],
//   format: winston.format.prettyPrint()
// });
var htmltoString = function (rawStr) {
    var msg = he.unescape(rawStr.replace(/<br\/>/g, "\n").replace("도움말 정보 없음", ""));
    msg = msg.replace(/^\s*$(?:\r\n?|\n)/gm, "");
    return msg;
    // return msg.substring(0, 50);
};
var getErrorList = function (text) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, axios
                .post("http://speller.cs.pusan.ac.kr/results", querystring.stringify({ text1: text.replace(/\n/g, "\r") }))
                .then(function (_a) {
                var data = _a.data;
                var _b, _c;
                var startIndex = data.indexOf("data = [{");
                var nextIndex = data.indexOf("}];\n");
                var rawData = data.substring(startIndex + 7, nextIndex + 2);
                var xxx = JSON.parse(rawData);
                return (_c = (_b = xxx[0]) === null || _b === void 0 ? void 0 : _b.errInfo) === null || _c === void 0 ? void 0 : _c.map(function (match) {
                    return {
                        start: match.start,
                        end: match.end,
                        msg: match.candWord + "\n" + htmltoString(match.help)
                    };
                });
            })["catch"](function (error) {
                return [];
            })];
    });
}); };
var errToDiagnostic = function (textDocument) { return function (_a) {
    var start = _a.start, end = _a.end, msg = _a.msg;
    return ({
        severity: DiagnosticSeverity.Warning,
        range: {
            start: textDocument.positionAt(start),
            end: textDocument.positionAt(end)
        },
        message: "" + msg,
        source: "korean"
    });
}; };
var getDiagnostics = function (textDocument) { return __awaiter(void 0, void 0, void 0, function () {
    var errList;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, getErrorList(textDocument.getText())];
            case 1:
                errList = _a.sent();
                return [2 /*return*/, new Promise(function (resolve) {
                        resolve(errList.map(errToDiagnostic(textDocument)));
                    })];
        }
    });
}); };
var connection = createConnection();
var documents = new TextDocuments(TextDocument);
connection.onInitialize(function () { return ({
    capabilities: {
        textDocumentSync: documents.syncKind
    }
}); });
function Diagnostic(change) {
    return __awaiter(this, void 0, void 0, function () {
        var diagnostics;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDiagnostics(change.document)];
                case 1:
                    diagnostics = _a.sent();
                    connection.sendDiagnostics({
                        uri: change.document.uri,
                        diagnostics: diagnostics
                    });
                    return [2 /*return*/];
            }
        });
    });
}
documents.onDidChangeContent(function (change) {
    Diagnostic(change);
});
documents.listen(connection);
connection.listen();
