package main

import (
	"encoding/json"
	"fmt"
	"html"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var httpClient = http.Client{
	Timeout: time.Second * 10,
}

func Diagnostic(text string) ([]SpellerResponse, error) {
	text = strings.ReplaceAll(text, "\n", "\r")
	escapedText := url.QueryEscape(text)

	body := strings.NewReader(fmt.Sprintf("text1=%v", escapedText))

	req, err := http.NewRequest(http.MethodPost, "https://speller.cs.pusan.ac.kr/results", body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()
	response, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var line string
	for _, l := range strings.Split(string(response), "\n") {
		if strings.HasPrefix(l, "\tdata") {
			line = l
			break
		}
	}

	line = strings.Replace(line, "\tdata = ", "", 1)
	line = strings.TrimSuffix(line, ";\r")
	// line = html.UnescapeString(line)

	output := []SpellerResponse{}

	err = json.Unmarshal([]byte(line), &output)
	if err != nil {
		return nil, err
	}

	for _, response := range output {
		for i, errinfo := range response.ErrInfo {
			helpmsg := errinfo.Help
			helpmsg = html.UnescapeString(helpmsg)
			helpmsg = strings.ReplaceAll(helpmsg, "<br/>", "\n")
			response.ErrInfo[i].Help = helpmsg
		}
	}

	return output, nil
}

type SpellerResponse struct {
	Str     string    `json:"str"`
	ErrInfo []ErrInfo `json:"errInfo"`
	Idx     int       `json:"idx"`
}

type ErrInfo struct {
	Help          string `json:"help"`
	ErrorIdx      int    `json:"errorIdx"`
	CorrectMethod int    `json:"correctMethod"`
	Start         int    `json:"start"`
	End           int    `json:"end"`
	OrgStr        string `json:"orgStr"`
	CandWord      string `json:"candWord"`
}
