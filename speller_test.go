package main

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

// [
//   {
//     "str": "안뇽\r행뵥하세요",
//     "errInfo": [
//       {
//         "help": "어린이들의 발음을 흉내내어 &apos;안뇽&apos;이라고 말하는 사람들이 종종 있습니다. 특히, 글을 쓸 때는 이러한 단어를 쓰지 않도록 합시다.",
//         "errorIdx": 0,
//         "correctMethod": 2,
//         "start": 0,
//         "end": 2,
//         "orgStr": "안뇽",
//         "candWord": "안녕"
//       },
//       {
//         "help": "철자 검사를 해 보니 이 어절은 분석할 수 없으므로 틀린 말로 판단하였습니다.<br/><br/>후보 어절은 이 철자검사/교정기에서 띄어쓰기, 붙여 쓰기, 음절대 치와 같은 교정방법에 따라 수정한 결과입니다.<br/><br/>후보 어절 중 선택하시거나 오류 어절을  수정하여 주십시오.<br/><br/>* 단, 사전에 없는 단어이거나 사용자가 올바르다고 판단한 어절에 대해서는 통과하세요!!",
//         "errorIdx": 1,
//         "correctMethod": 1,
//         "start": 3,
//         "end": 8,
//         "orgStr": "행뵥하세요",
//         "candWord": "행복하세 요"
//       }
//     ],
//     "idx": 0
//   }
// ]

func TestDiagnostic(t *testing.T) {
	output, err := Diagnostic("안뇽")
	if err != nil {
		t.Fatal(err)
	}

	if len(output) == 0 {
		t.Log(output)
		t.Fatal("len(output) == 0")
	}

	if len(output[0].ErrInfo) == 0 {
		t.Log(output)
		t.Fatal("len(output[0].ErrInfo) == 0 ")
	}

	assert.Equal(t, "안녕", output[0].ErrInfo[0].CandWord)

	json.NewEncoder(os.Stdout).Encode(output)
}

func TestDiagnosticMultiLine(t *testing.T) {
	output, err := Diagnostic("안뇽\n행뵥하세요")
	if err != nil {
		t.Fatal(err)
	}

	if len(output) == 0 {
		t.Log(output)
		t.Fatal("len(output) == 0")
	}

	if len(output[0].ErrInfo) == 0 {
		t.Log(output)
		t.Fatal("len(output[0].ErrInfo) == 0 ")
	}

	assert.Equal(t, "안녕", output[0].ErrInfo[0].CandWord)
	assert.Equal(t, "행복하세요", output[0].ErrInfo[1].CandWord)

	json.NewEncoder(os.Stdout).Encode(output)
}
