package services

import (
	"math"
	"regexp"
	"strings"
	"unicode"

	"github.com/kongxinshitou/taskflow/models"
)

type MatchResult struct {
	Task       models.Task
	Confidence float64
	MatchType  string // "exact", "keyword", "notes"
}

// tokenize splits text into tokens (supports Chinese characters and English words)
func tokenize(text string) []string {
	text = strings.ToLower(text)
	// Split on non-alphanumeric, non-CJK characters
	re := regexp.MustCompile(`[\p{Han}]+|[a-zA-Z0-9]+`)
	matches := re.FindAllString(text, -1)

	tokens := make(map[string]bool)
	for _, m := range matches {
		// For Chinese, split into individual characters and bigrams
		runes := []rune(m)
		isChinese := false
		for _, r := range runes {
			if unicode.Is(unicode.Han, r) {
				isChinese = true
				tokens[string(r)] = true
			}
		}
		if !isChinese && len(m) > 1 {
			tokens[m] = true
		}
		// Add bigrams for Chinese
		if len(runes) >= 2 {
			for i := 0; i < len(runes)-1; i++ {
				if unicode.Is(unicode.Han, runes[i]) && unicode.Is(unicode.Han, runes[i+1]) {
					tokens[string(runes[i])+string(runes[i+1])] = true
				}
			}
		}
	}

	result := make([]string, 0, len(tokens))
	for t := range tokens {
		result = append(result, t)
	}
	return result
}

// keywordOverlap calculates the overlap ratio between two token sets
func keywordOverlap(tokens1, tokens2 []string) float64 {
	if len(tokens1) == 0 || len(tokens2) == 0 {
		return 0
	}

	set1 := make(map[string]bool)
	for _, t := range tokens1 {
		set1[t] = true
	}

	matches := 0
	for _, t := range tokens2 {
		if set1[t] {
			matches++
		}
	}

	return float64(matches) / math.Max(float64(len(tokens1)), float64(len(tokens2)))
}

// MatchTasks matches task descriptions against existing todos
func MatchTasks(description string, tasks []models.Task) []MatchResult {
	descTokens := tokenize(description)
	results := []MatchResult{}

	for _, task := range tasks {
		// 1. Exact title match
		if strings.EqualFold(strings.TrimSpace(task.Title), strings.TrimSpace(description)) {
			results = append(results, MatchResult{
				Task:       task,
				Confidence: 1.0,
				MatchType:  "exact",
			})
			continue
		}

		// 2. Keyword overlap on title
		titleTokens := tokenize(task.Title)
		titleOverlap := keywordOverlap(descTokens, titleTokens)
		if titleOverlap > 0.6 {
			results = append(results, MatchResult{
				Task:       task,
				Confidence: 0.6 + titleOverlap*0.3,
				MatchType:  "keyword",
			})
			continue
		}

		// 3. Check notes
		if task.Notes != "" {
			notesTokens := tokenize(task.Notes)
			notesOverlap := keywordOverlap(descTokens, notesTokens)
			if notesOverlap > 0.5 {
				results = append(results, MatchResult{
					Task:       task,
					Confidence: 0.4 + notesOverlap*0.3,
					MatchType:  "notes",
				})
			}
		}
	}

	// Sort by confidence (simple bubble sort, fine for small lists)
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Confidence > results[i].Confidence {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	return results
}
